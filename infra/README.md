# homak infra

CDK app for the homak.dev static site and its hosted media.

## One-time setup

```bash
cd infra
cp config.example.ts config.local.ts   # then edit with real account / zone / profile
npm install
```

`config.local.ts` is gitignored — it holds the AWS account ID, the Route 53
hosted zone ID, the local AWS profile name, and the enquiry form's mail
settings (`sendingDomain`, `fromEmail`, `toEmails`). See `config.example.ts`
for the schema. The account is already CDK-bootstrapped in `us-east-1`.

The recipient addresses are personal inboxes and deliberately live only there,
never in tracked source — grepping the repo for the mail provider's
domain should turn up nothing.

Note that `profile` is read automatically **only** by the media scripts, which
source it in `scripts/_common.sh`. The CDK app itself never reads
`config.local.ts` for credentials — it takes only `account` and `hostedZoneId`
from there, and resolves credentials the way any AWS SDK client does. So a
`cdk` command needs the profile in the environment; see below.

## Deploy

From the repo root:

```bash
npm run build                 # astro build -> dist/
cd infra
export AWS_PROFILE=<the `profile` from config.local.ts>
npx cdk diff                  # review changes
npx cdk deploy
```

Without `AWS_PROFILE` (or a `--profile` flag), `cdk` fails before it reaches the
stack:

```
Need to perform AWS calls for account <account>, but no credentials have been configured
```

That is expected rather than a broken setup — unlike `media:push` / `media:pull`,
`cdk` does not read the profile out of `config.local.ts`. To avoid typing it,
pull it from the same place the media scripts do:

```bash
export AWS_PROFILE="$(sed -n 's/.*profile: *"\([^"]*\)".*/\1/p' config.local.ts)"
```

The deploy uploads `dist/` to the site bucket, prunes anything it did not
upload, and invalidates the distribution.

A content-only release — new or changed pages and assets, no infrastructure
edits — shows up in `cdk diff` as a single changed `SourceObjectKeys` hash on
`DeploySite/CustomResource`, and nothing else. Anything touching the
distribution, certificate, DNS records or the buckets means the stack itself
changed, so read it carefully before deploying.

## Stack

`HomakSite` in `us-east-1`:

- **`SiteBucket`** — private, holds the Astro build
- **`MediaBucket`** — private, holds videos (see below)
- **CloudFront distribution** with OAC on both buckets, aliased to `homak.dev`
  and `www.homak.dev`
- **ACM certificate** (us-east-1) DNS-validated through the hosted zone
- **Route 53** A/AAAA aliases for apex and www
- **CloudFront Function** rewriting pretty URLs to `/index.html`
- **`SiteEmailIdentity`** — SES domain identity for `homak.dev`, with a
  `mail.homak.dev` custom MAIL FROM, plus a `_dmarc` TXT record
- **`ContactRateLimitTable`** — DynamoDB, per-IP submission counter, TTL'd
- **`ContactFunction`** — Node 20 Lambda behind a Function URL, reached only
  through the `/api/contact` CloudFront behaviour (so the browser call is
  same-origin and there is no CORS config, and the Function URL never has to
  be committed)

Both buckets are `RETAIN` — `cdk destroy` leaves them behind, so a teardown
never silently deletes the media.

## Enquiry form

The "Start a project" modal POSTs JSON to `/api/contact`. CloudFront routes
that path to the Lambda, which validates the payload, checks a per-IP rate
limit (5 per 10 minutes) and a honeypot field, then sends one SES mail with
the enquirer's address as `Reply-To`.

**The SES account is in the sandbox** (`aws sesv2 get-account` reports
`ProductionAccessEnabled: false`), which means mail is only delivered to
*verified* identities. Every address in `toEmails` must therefore already be a
verified SES identity in `us-east-1`; the two configured ones are. Adding a
recipient that is not verified makes the send fail with a 502 from the Lambda
— either verify it first, or request production access.

For local dev, take the `ContactFunctionUrl` stack output and put it in a
`.env` at the repo root:

```bash
CONTACT_FN_URL=https://<id>.lambda-url.us-east-1.on.aws/
```

`astro.config.mjs` proxies `/api/contact` there in dev, so the same fetch works
against the real Lambda without CORS. Without the variable there is no proxy
and submissions fail in dev only. `.env` is gitignored; see `.env.example`.

## Media

Videos are **not** in git. They live in the media bucket and are served through
the same distribution as the site, on the `/videos/*` behaviour. Because it is
the same origin, `src/data/projects.ts` keeps using plain `/videos/x.mp4` paths
— there is no media hostname to configure and no CORS to get wrong.

`public/videos/` is gitignored but still the working directory for media: Astro
serves it in dev, and the site deployment excludes it so the bytes are not
duplicated into the site bucket.

```bash
npm run media:pull   # S3 -> public/videos/   (do this after a fresh clone)
npm run media:push   # public/videos/ -> S3, then invalidate /videos/*
```

`media:push` syncs with `--delete`, so the bucket ends up mirroring
`public/videos/` exactly. Objects are uploaded `immutable` with a one-year
max-age; the invalidation is what makes a replaced file visible right away.

Both scripts read the AWS profile from `config.local.ts` unless `AWS_PROFILE`
is already set, and resolve the bucket and distribution from the stack's
CloudFormation outputs — so there is nothing to keep in sync by hand.
