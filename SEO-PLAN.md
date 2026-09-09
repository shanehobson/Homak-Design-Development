# SEO plan

Follow-up to the markup pass (structured data, canonical, sitemap, OG, crawlable
prose). That layer is done. What remains is content, local entity signals, and
measurement. Sections are ordered by expected impact and are meant to be
executed one at a time. Tick items off as they land.

Legend: **[code]** can be done in this repo. **[you]** needs a decision,
copy, or an account only Shane can provide.

---

## Section 1 — Content levers

The site is one URL with ~640 words. Nothing states what services are offered,
there is no pricing signal, no FAQ, and all eight case studies share the
homepage. This section is the biggest ranking lever left.

### 1.1 Case study pages
- [x] **[code]** Add `src/pages/work/[slug].astro`, driven by `src/data/projects.ts`.
- [x] **[code]** Each page gets its own `<title>`, `<h1>`, meta description, poster, video, and outbound link to the live site.
- [x] **[code]** Add `BreadcrumbList` and `CreativeWork` (or `WebSite`) JSON-LD per page.
- [x] **[code]** Add `VideoObject` JSON-LD per page using the existing poster and `/videos/*.mp4` paths.
- [x] **[code]** `published` set to 2026-08-27 on every project (the date the case studies went live on this site, per git); emitted as `uploadDate` and the page's `datePublished`.
- [x] **[code]** Homepage cards link to the case study page (modal can remain as the in-page preview).
- [x] **[code]** Extend the `Project` type with `seoTitle`, `summary`, and a `body` (or MDX) field for the long-form write-up.
- [x] **[code]** Drafted 300–500 words per project from the live sites and the posters. Reviewed 2026-09-09: client names, founder details and cross-project links removed; copy stays generic (business type and city only).
- [x] **[code]** Dropped the Nightingale Nails live link; the Vercel preview URL 404s.
- Target queries the pages should own, e.g. "nail salon website design Naples", "dance studio web design", "booking platform for service businesses".

### 1.2 Services section
- [x] **[you]** Services list: marketing websites, booking & payments, web applications, design & branding, hosting & maintenance (`src/data/services.ts`). E-commerce left out because no shipped project shows it.
- [x] **[code]** Add a `Services` section to the homepage with one short paragraph per service.
- [x] **[code]** Add `Service` / `OfferCatalog` entries to the `LocalBusiness` JSON-LD.

### 1.3 Rewrite the h1
- ~~Change the h1 to a keyword-bearing line.~~ Tried as an eyebrow above the slogan and reverted 2026-09-09: it cluttered the hero. The h1 stays "Design meets engineering."; the `<title>` and the Services section carry the keywords instead.

### 1.4 FAQ and pricing signal
- [x] **[you]** No pricing on the site. Decided 2026-09-09.
- [x] **[code]** Eight questions drafted in `src/data/faq.ts` (no pricing). **[you]** Read through and correct.
- [x] **[code]** Add an FAQ section with `FAQPage` JSON-LD.

### 1.5 Team bio
- [x] **[you]** Bio approved 2026-09-09.
- [x] **[code]** Remove the placeholder flag.

---

## Section 2 — Local entity signals

NAP (name, address, phone) is half-built and Google has nothing to consolidate
the studio as an entity. The dominant factor here is off-site.

### 2.1 Phone number
- ~~Not publishing a phone number.~~ Decided 2026-09-09.

### 2.2 Social profiles
- ~~No social profiles on the site.~~ Decided 2026-09-09.

### 2.3 Google Business Profile
**Parked as a separate task, to be done later.**
- [ ] **[you]** Create the profile as a **service-area business** with the address hidden. Pegasus Way reads as residential; a storefront listing there risks suspension.
- [ ] **[you]** Match name, address, and hours exactly to what the site shows (one spelling everywhere).
- [ ] **[you]** Add the same services list as Section 1.2.

### 2.4 Reviews
- [ ] **[you]** Once the profile exists, ask two or three past clients for Google reviews.
- [ ] **[code]** Add `AggregateRating` markup only after real reviews exist.

### 2.5 Opening hours
- ~~No published hours.~~ Decided 2026-09-09.

### 2.6 Directory citations
- [ ] **[you]** List the studio on Bing Places, Apple Business Connect, Clutch, and Yelp with identical NAP.

---

## Section 3 — Measurement and cleanup

Nothing can be confirmed as landing yet, and a few small structural items
remain.

### 3.1 Search Console and analytics
- [ ] **[you]** Create the Search Console property for `homak.dev` (or confirm it is already verified via DNS).
- [ ] **[code]** Add the verification meta tag if HTML verification is used.
- [ ] **[you]** Choose an analytics provider (Plausible, Fathom, GA4).
- [ ] **[code]** Add the snippet to `src/layouts/Base.astro`.
- [ ] **[code]** Submit `sitemap-index.xml` in Search Console after verification.

### 3.2 Image alt text
- [x] **[code]** Fill in `alt` on the eight project posters from the project data (title + category).

### 3.3 404 page
- [x] **[code]** Add `src/pages/404.astro` so unknown paths stop soft-404ing into the homepage.
- [x] **[code]** Point the CloudFront 403/404 error responses at `/404.html` with a 404 status (`infra/lib/site-stack.ts`); they rewrote to `index.html` with a 200.
- [ ] **[you]** Deploy the stack (`cdk deploy` in `infra/`) so the change reaches the distribution.

### 3.4 www → apex redirect
- [x] **[code]** The existing viewer-request function now 301s `www.homak.dev` to `homak.dev` (`infra/lib/site-stack.ts`). Goes live with the next `cdk deploy`.

### 3.5 Video transcripts
- [x] The videos are silent screen captures; the case study body is the written walkthrough.

---

## Execution order

1. Section 1.3, 3.2, 3.3, and the scaffold for 1.1 — no input needed.
2. In parallel: you create the Google Business Profile (2.3) and send the phone number, social links, services list, and approved bio.
3. Flesh out 1.1 case studies, 1.2 services, and 1.4 FAQ with your copy.
4. Section 2 code items as the inputs arrive.
5. Section 3.1 once the Search Console property exists.
