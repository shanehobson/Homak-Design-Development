# Handoff — homak.dev, 2026-09-09

For the next agent picking this up.
Read this, then `SEO-PLAN.md` and
`EMAIL-PLAN.md`, which carry the tick-by-tick state.

## Release status — live since 2026-09-09

Everything in this file is committed on `main` (commits `6fc3942`..`af283be`
on top of `0a95e65`), pushed, and deployed with `cdk deploy`. Verified after
the deploy: homepage and `/work/zaera/` return 200, an unknown path returns
404 with the built 404 page, `www.homak.dev` 301s to the apex, the sitemap
and `/llms.txt` are served, the apex MX points at SES, and the `hello` rule
set is the active one with both actions on it.

For the next release: `npm run build && cd infra && npx cdk deploy` with
`AWS_PROFILE` exported (infra README). A content-only release should show
only `DeploySite/CustomResource` changing in `cdk diff`.

## Ground rules that apply here

- **Do not commit or deploy unless Shane asks.** Both plans mark deploy as a
  `[you]` step. No `Co-Authored-By: Claude` trailers on commits.
- **Personal addresses stay out of tracked files.** They live only in the
  gitignored `infra/config.local.ts` (`toEmails`, `forwardTo`). Grep the repo
  for the mail provider's domain before committing; it should find nothing.
- **Dev server:** `astro dev --background`, then `astro dev stop`. First hit
  on each page compiles and is slow; screenshots taken inside ~3 s of a first
  load show unrevealed content. Wait or reload before judging a page.
- `PLAN*.md` is gitignored (holds private details). `SEO-PLAN.md`,
  `EMAIL-PLAN.md` and this file are named so they are tracked.
- Spelling in site copy is British (`colour`), matching the existing text.

## Decisions Shane made today (do not reopen)

- **No pricing** anywhere on the site.
- **No phone number, opening hours, or social profiles** on the site.
- **Google Business Profile** is parked as a separate later task.
- **Hero stays exactly as it was:** h1 is "Design meets engineering." A
  keyword eyebrow above it was tried and reverted as clutter.
- **Team bio approved** as written in `src/data/team.ts`.
- **Services list:** marketing websites, booking & payments, web
  applications, design & branding, hosting & maintenance. E-commerce left
  out because no shipped project shows it.
- **Nightingale Nails** has no live link; the old Vercel preview URL 404s.
- **hello@homak.dev** forwards to the existing enquiry inbox; hello@ only,
  not a catch-all. Replies must go out as hello@ (Gmail "Send mail as").
- **No client or founder names in case study copy**, and nothing described
  as built for the studio itself. See "Copy rule" below.

## What changed today

### Site (`src/`)
- `src/pages/work/[slug].astro` — one case study page per project, with
  breadcrumb, category, h1, video or poster, body copy, live-site link,
  prev/next, and the Contact section. JSON-LD per page: `WebPage`,
  `BreadcrumbList`, `CreativeWork`, `VideoObject` (with `uploadDate`).
- `src/data/projects.ts` — `Project` gained `seoTitle`, `summary`, `body`
  (paragraph array), `published`. All eight have 300–345 words of copy,
  drafted from the live sites and posters. `published` is 2026-08-27 for all
  (the date the case studies went live on this site, per git), not the
  client launch date.
- `src/components/sections/Services.astro` + `src/data/services.ts`;
  `src/components/sections/FAQ.astro` + `src/data/faq.ts` (8 Q&As, no
  pricing). Both feed JSON-LD in `Base.astro`: `OfferCatalog` on the studio
  node everywhere, `FAQPage` only when `Astro.url.pathname === '/'`.
- `src/pages/404.astro` — noindex, built to `dist/404.html`.
- `src/layouts/Base.astro` — new props: `ogImage`, `ogImageAlt`,
  `ogImageWidth/Height`, `ogType`, `robots`, `graph` (extra JSON-LD nodes).
  Shared node ids come from `ids` in `src/data/site.ts`.
- `src/components/sections/Projects.astro` — cards are `<a href="/work/…">`
  with alt text `title — category`. `VideoModal.astro` intercepts plain
  clicks to open the preview (modified clicks pass through) and adds a
  "Read the case study" link.
- `src/data/site.ts` — nav hrefs rooted at `/` (`/#about`, `/#services`,
  `/#work`, `/#contact`) so the header works off the homepage; `ids`.
- `src/scripts/reveal.ts` — the `.reveal` IntersectionObserver, imported by
  every page's `<script>`. Any new page using `.reveal` must import it or
  the copy stays invisible.
- `src/pages/llms.txt.ts` — now lists services, full case study text, FAQ,
  and links each project to its `/work/` page. `public/robots.txt` comment
  updated.

### Infra (`infra/`)
- `lib/site-stack.ts`:
  - CloudFront error responses now serve `/404.html` with a **404** (were
    `index.html` with 200 — the soft-404 problem).
  - The viewer-request function 301s `www.homak.dev` → `homak.dev`.
  - **Inbound mail:** apex MX → `inbound-smtp.us-east-1.amazonaws.com`,
    `MailBucket` (30-day expiry), `ReceiptRuleSet` for hello@ with S3 then
    Lambda actions, `AwsCustomResource` that activates the rule set,
    `ForwardFunction` with an SQS dead-letter queue and IAM pinned to
    `ses:FromAddress = hello@`.
  - **SMTP for Gmail:** IAM user limited to `SendRawEmail` as hello@, access
    key stored in Secrets Manager as `homak/ses-smtp-gmail`.
  - Both Lambdas moved from `NODEJS_20_X` to `NODEJS_22_X` (synth warned
    Node 20 is deprecated).
- `lambda/forward/handler.ts` — rewrites `From` to
  `"<sender name> via Homak" <hello@…>`, sets `Reply-To` to the original
  sender, strips `Return-Path`/`Sender`/`DKIM-Signature`/old `Reply-To`,
  passes the body through byte for byte, drops spam/virus FAILs, sends a
  notice instead of a >39 MB message. RFC 2047 names are decoded before
  re-encoding (a double-encoding bug was found and fixed by the test).
- `scripts/ses-smtp-password.mjs` — reads the secret, derives the SES SMTP
  password, prints the four Gmail settings. Nothing stored.
- `config.example.ts`, `bin/homak.ts`, `SiteStackProps` — `forwardTo` added.
  `config.local.ts` already has the real value.
- `package.json` — added `@aws-sdk/client-s3`, `@aws-sdk/client-secrets-manager`.
- `README.md` — "Inbound mail" section.

## Verified

- `npx astro build` — 10 pages, clean. Sitemap lists `/` plus eight
  `/work/<slug>/`. Homepage JSON-LD has `FAQPage` with 8 questions whose text
  matches the visible DOM, and a 5-item `OfferCatalog`.
- Homepage, a case study, Services, FAQ, and the 404 checked in Chrome.
- `infra`: `tsc --noEmit` clean; `cdk synth` clean (needs `AWS_PROFILE`
  exported from `config.local.ts`'s `profile`). Template contains the MX,
  rule set, custom resource, forwarder, SMTP user, secret, queue.
- Forwarder header rewrite has a permanent test:
  `infra/lambda/forward/handler.test.ts`, run with `npm test` from `infra/`
  (Node's built-in runner through ts-node). Nine cases: encoded and bare
  8-bit names, folded headers, byte-identical body, stripped headers,
  missing From, LF-only endings. All pass.

## Not verified

- End-to-end mail: the rule set is active and the MX resolves, but no real
  message has been sent to hello@ yet (Shane's queue, item 2).
- Odyssey's site could not be fetched (browser permission), so its copy is
  from the existing description and the login-screen poster only.

## Copy rule decided 2026-09-09

Case study copy stays at the level of the original card copy: what was built,
for what kind of business, in which city. No client names, no founder
biographies, no claim that a project was built for the studio itself, and no
linking two projects to the same client. The earlier drafts had all four;
they were removed before the first commit.

Also worth a read by Shane: the FAQ answers describe process and stack
(Figma first, Astro, Stripe, AWS). `src/data/faq.ts`.

## Shane's queue (all `[you]`)

1. ~~Commit, push, deploy.~~ Done 2026-09-09.
2. Send a test message to hello@; check DKIM/DMARC pass and Reply-To.
3. Request SES production access (needed for Gmail-as-hello@ replies to
   unverified addresses).
4. `node scripts/ses-smtp-password.mjs` → Gmail "Send mail as"; set "Reply
   from the same address the message was sent to". Gmail filter/label.
5. Search Console property + analytics choice (SEO-PLAN 3.1). Once chosen,
   the snippet goes in `Base.astro`.
6. Google Business Profile, later, as its own task.

## Sensible next code tasks (none blocked)

- Optional `contactPoint` on the studio JSON-LD once mail is confirmed
  flowing (EMAIL-PLAN §5).
- Analytics/Search Console verification tag in `Base.astro` when Shane
  picks a provider.
- Consider a `cdk diff` review helper: a content-only release should show
  only `DeploySite/CustomResource` changing (see infra README).
