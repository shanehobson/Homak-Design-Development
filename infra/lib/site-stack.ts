import { Stack, StackProps, RemovalPolicy, Duration, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as path from "path";

export interface SiteStackProps extends StackProps {
  domainName: string;
  hostedZoneId: string;
  /** Astro build output, relative to the infra package root. */
  siteDistPath: string;
}

export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    const { domainName, hostedZoneId, siteDistPath } = props;
    const wwwDomain = `www.${domainName}`;

    const hostedZone = route53.PublicHostedZone.fromPublicHostedZoneAttributes(
      this,
      "HostedZone",
      { hostedZoneId, zoneName: domainName },
    );

    /* The built Astro site. Wiped and re-uploaded on every deploy. */
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    /* Videos live here rather than in the site bucket: the site deployment
       prunes anything it did not upload, and media is not part of the build. */
    const mediaBucket = new s3.Bucket(this, "MediaBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    const certificate = new acm.Certificate(this, "SiteCertificate", {
      domainName,
      subjectAlternativeNames: [wwwDomain],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const prettyUrlFunction = new cloudfront.Function(this, "PrettyUrlFunction", {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var req = event.request;
  var uri = req.uri;
  if (uri.endsWith('/')) {
    req.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    req.uri = uri + '/index.html';
  }
  return req;
}
      `),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    const distribution = new cloudfront.Distribution(this, "SiteDistribution", {
      defaultRootObject: "index.html",
      domainNames: [domainName, wwwDomain],
      certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: [
          {
            function: prettyUrlFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
      ],
    });

    /* Served from the same origin as the site, so markup can keep using plain
       `/videos/...` paths — no absolute media host, no CORS. Already-compressed
       media skips CloudFront compression. */
    distribution.addBehavior(
      "/videos/*",
      origins.S3BucketOrigin.withOriginAccessControl(mediaBucket),
      {
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: false,
      },
    );

    for (const [suffix, recordName] of [
      ["Apex", domainName],
      ["Www", wwwDomain],
    ] as const) {
      const target = route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      );
      new route53.ARecord(this, `Alias${suffix}`, { zone: hostedZone, recordName, target });
      new route53.AaaaRecord(this, `Alias${suffix}Aaaa`, { zone: hostedZone, recordName, target });
    }

    new s3deploy.BucketDeployment(this, "DeploySite", {
      /* `videos/` is excluded: a developer's local copy of the media sits in
         `public/`, so the build emits it, but it is served from the media
         bucket. Shipping it here too would duplicate the bytes.

         `.DS_Store` is excluded because Finder writes one into `dist/` on a
         developer's machine and the deployment would otherwise serve it: it
         was reachable at https://homak.dev/.DS_Store, publishing local file
         and folder names. `prune` removes the already-uploaded copy. */
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "..", siteDistPath), {
          exclude: ["videos", "videos/**", ".DS_Store", "**/.DS_Store"],
        }),
      ],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
      prune: true,

      /* Without this the objects carry no `Cache-Control` at all, and a
         browser given neither that nor `Expires` falls back to heuristic
         freshness — roughly 10% of the age since `Last-Modified`, so the
         longer a file sits unchanged the longer a phone holds it. The
         invalidation above only clears CloudFront, never a copy already in
         someone's browser, which is why deploys appeared not to land.

         One value covers every object. Only `index.html` actually needs it:
         everything under `_astro/` is content-hashed, so a stale copy is
         harmless by construction and could be cached forever. Splitting the
         two would take a second BucketDeployment, and with `prune` on, two
         unscoped deployments delete each other's files. At 1.9 MB of assets
         that revalidate to a 304 on their ETag, the split is not worth the
         footgun. */
      cacheControl: [s3deploy.CacheControl.fromString("max-age=60, must-revalidate")],
    });

    new CfnOutput(this, "DistributionId", { value: distribution.distributionId });
    new CfnOutput(this, "DistributionDomain", { value: distribution.distributionDomainName });
    new CfnOutput(this, "SiteBucketName", { value: siteBucket.bucketName });
    new CfnOutput(this, "MediaBucketName", {
      value: mediaBucket.bucketName,
      description: "Upload videos here under videos/ — see infra/scripts/media-push.sh",
    });
  }
}
