import { Stack, StackProps, RemovalPolicy, Duration, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ses from "aws-cdk-lib/aws-ses";
import * as sesActions from "aws-cdk-lib/aws-ses-actions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cr from "aws-cdk-lib/custom-resources";
import { SecretValue } from "aws-cdk-lib";
import * as path from "path";

export interface SiteStackProps extends StackProps {
  domainName: string;
  hostedZoneId: string;
  /** Astro build output, relative to the infra package root. */
  siteDistPath: string;
  /** Domain SES signs enquiry mail for — the hosted zone above. */
  sendingDomain: string;
  /** Envelope From for enquiry mail; an address on `sendingDomain`. */
  fromEmail: string;
  /**
   * Enquiry recipients. The SES account is in the sandbox, so each of these
   * has to be a verified identity in this region. Supplied from the
   * gitignored `config.local.ts` — personal inboxes stay out of the repo.
   */
  toEmails: readonly string[];
  /**
   * Inbox that mail to hello@<domainName> is forwarded to. Same sandbox rule
   * as `toEmails`. Supplied from `config.local.ts`.
   */
  forwardTo: string;
}

export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    const {
      domainName,
      hostedZoneId,
      siteDistPath,
      sendingDomain,
      fromEmail,
      toEmails,
      forwardTo,
    } = props;
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

    /* Domain identity for the enquiry form's Lambda. CDK writes the DKIM
       CNAMEs and the custom MAIL FROM MX/SPF records into the hosted zone,
       so the mail is aligned on both SPF and DKIM. */
    const emailIdentity = new ses.EmailIdentity(this, "SiteEmailIdentity", {
      identity: ses.Identity.publicHostedZone(hostedZone),
      mailFromDomain: `mail.${sendingDomain}`,
    });

    /* Strict alignment, and aggregate reports to the first enquiry recipient
       — the one inbox we know is already watched. */
    new route53.TxtRecord(this, "DmarcRecord", {
      zone: hostedZone,
      recordName: `_dmarc.${sendingDomain}`,
      values: [
        `v=DMARC1; p=quarantine; rua=mailto:${toEmails[0]}; adkim=s; aspf=s; pct=100`,
      ],
    });

    /* Two jobs on the viewer request. First, www -> apex as a 301, so the
       two hostnames stop serving duplicate 200s and every link and ranking
       signal consolidates on one. Second, the pretty-URL rewrite that maps
       directory paths onto the index.html files Astro emits. */
    const prettyUrlFunction = new cloudfront.Function(this, "PrettyUrlFunction", {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var req = event.request;
  var host = req.headers.host && req.headers.host.value;
  if (host === '${wwwDomain}') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://${domainName}' + req.uri } },
    };
  }
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
      /* Unknown paths get the built 404 page with a real 404 status. These
         used to rewrite to index.html with a 200, which made every bad URL a
         soft 404 that search engines index as a duplicate of the homepage.
         S3 behind OAC answers a missing key with 403, not 404, so both
         statuses have to map. */
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
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

    /* Per-IP submission counter for the enquiry form. Items carry a TTL and
       are worthless once expired, so the table is disposable. */
    const rateLimitTable = new dynamodb.Table(this, "ContactRateLimitTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const contactFn = new NodejsFunction(this, "ContactFunction", {
      entry: path.join(__dirname, "..", "lambda", "contact", "handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        TO_EMAILS: toEmails.join(","),
        FROM_EMAIL: fromEmail,
        RATE_LIMIT_TABLE: rateLimitTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: "node22",
        /* Provided by the Node 22 runtime; bundling them only inflates the
           artefact. */
        externalModules: ["@aws-sdk/client-sesv2", "@aws-sdk/client-dynamodb"],
      },
    });

    rateLimitTable.grantReadWriteData(contactFn);

    contactFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: [
          emailIdentity.emailIdentityArn,
          ...toEmails.map(
            (email) => `arn:aws:ses:${this.region}:${this.account}:identity/${email}`,
          ),
        ],
      }),
    );

    /* ---- Inbound mail for hello@ ------------------------------------------
       See EMAIL-PLAN.md. SES receives for the apex, drops the raw message in
       S3, and a Lambda re-sends it to `forwardTo` as hello@ with Reply-To set
       to the original sender. */
    const helloAddress = `hello@${domainName}`;

    /* Receiving is per region, and this is the only MX on the apex. The MAIL
       FROM MX that the identity above writes is on `mail.<domain>`, a
       different name, so the two do not collide. */
    new route53.MxRecord(this, "InboundMx", {
      zone: hostedZone,
      recordName: domainName,
      values: [{ priority: 10, hostName: `inbound-smtp.${this.region}.amazonaws.com` }],
    });

    /* Raw messages, kept a month so a failed forward can be recovered by
       hand. The S3 receipt action adds the bucket policy SES needs. */
    const mailBucket = new s3.Bucket(this, "MailBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      lifecycleRules: [{ expiration: Duration.days(30) }],
    });
    const mailPrefix = "inbox/";

    /* Anything the forwarder throws on lands here with the SES event, so a
       failed forward is visible in the console rather than only in a log. */
    const forwardDlq = new sqs.Queue(this, "ForwardDeadLetterQueue", {
      retentionPeriod: Duration.days(14),
    });

    const forwardFn = new NodejsFunction(this, "ForwardFunction", {
      entry: path.join(__dirname, "..", "lambda", "forward", "handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      deadLetterQueue: forwardDlq,
      environment: {
        MAIL_BUCKET: mailBucket.bucketName,
        MAIL_PREFIX: mailPrefix,
        FORWARD_TO: forwardTo,
        FORWARD_FROM: helloAddress,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: "node22",
        externalModules: ["@aws-sdk/client-sesv2", "@aws-sdk/client-s3"],
      },
    });

    mailBucket.grantRead(forwardFn, `${mailPrefix}*`);

    /* Pinned to hello@ as the From address: this role can forward mail, not
       send as anyone else on the domain. */
    forwardFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: [
          emailIdentity.emailIdentityArn,
          `arn:aws:ses:${this.region}:${this.account}:identity/${forwardTo}`,
        ],
        conditions: { StringEquals: { "ses:FromAddress": helloAddress } },
      }),
    );

    /* hello@ only, not a catch-all. The S3 action must run before the Lambda
       one: the function reads the object the action wrote. */
    const inboundRuleSet = new ses.ReceiptRuleSet(this, "InboundRuleSet", {
      rules: [
        {
          receiptRuleName: "hello",
          recipients: [helloAddress],
          enabled: true,
          scanEnabled: true,
          tlsPolicy: ses.TlsPolicy.OPTIONAL,
          actions: [
            new sesActions.S3({ bucket: mailBucket, objectKeyPrefix: mailPrefix }),
            new sesActions.Lambda({
              function: forwardFn,
              invocationType: sesActions.LambdaInvocationType.EVENT,
            }),
          ],
        },
      ],
    });

    /* CloudFormation creates rule sets but cannot activate one, and SES
       ignores an inactive set: without this call mail to hello@ bounces even
       with the MX in place. Deactivated again on stack delete. */
    const activateRuleSet = new cr.AwsCustomResource(this, "ActivateInboundRuleSet", {
      onCreate: {
        service: "SES",
        action: "setActiveReceiptRuleSet",
        parameters: { RuleSetName: inboundRuleSet.receiptRuleSetName },
        physicalResourceId: cr.PhysicalResourceId.of("ActiveReceiptRuleSet"),
      },
      onUpdate: {
        service: "SES",
        action: "setActiveReceiptRuleSet",
        parameters: { RuleSetName: inboundRuleSet.receiptRuleSetName },
        physicalResourceId: cr.PhysicalResourceId.of("ActiveReceiptRuleSet"),
      },
      onDelete: {
        service: "SES",
        action: "setActiveReceiptRuleSet",
        parameters: {},
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
    activateRuleSet.node.addDependency(inboundRuleSet);

    /* ---- Replying as hello@ from Gmail ------------------------------------
       Gmail's "Send mail as" talks SMTP to SES with an IAM access key. The
       user can do one thing: send raw mail from hello@. The key pair goes
       to Secrets Manager, never to a stack output; `scripts/ses-smtp-
       password.mjs` reads it and derives the SMTP password on demand. */
    const smtpUser = new iam.User(this, "SesSmtpGmailUser");
    smtpUser.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendRawEmail"],
        resources: [emailIdentity.emailIdentityArn],
        conditions: { StringEquals: { "ses:FromAddress": helloAddress } },
      }),
    );
    const smtpKey = new iam.AccessKey(this, "SesSmtpGmailKey", { user: smtpUser });
    new secretsmanager.Secret(this, "SesSmtpGmailSecret", {
      secretName: "homak/ses-smtp-gmail",
      description: `IAM access key Gmail uses to send as ${helloAddress} through SES`,
      secretObjectValue: {
        accessKeyId: SecretValue.unsafePlainText(smtpKey.accessKeyId),
        secretAccessKey: smtpKey.secretAccessKey,
      },
    });

    /* No CORS block: the browser only ever reaches this through the
       CloudFront behaviour below, which makes the call same-origin. The
       Function URL itself stays out of the repo. */
    const fnUrl = contactFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    /* The distribution's 403/404 -> 404.html rewrites are scoped to those
       two statuses, so the Lambda's own 400/405/429/502 pass through intact.
       ALL_VIEWER_EXCEPT_HOST_HEADER forwards the body and content-type while
       leaving Host as the Function URL's own, which its SigV4-less auth
       still requires. */
    distribution.addBehavior(
      "/api/contact",
      new origins.FunctionUrlOrigin(fnUrl),
      {
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
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

    new CfnOutput(this, "ContactFunctionUrl", {
      value: fnUrl.url,
      description: "Put in .env at the repo root as CONTACT_FN_URL for local dev",
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
