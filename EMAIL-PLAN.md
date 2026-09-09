# Email plan — hello@homak.dev

`hello@homak.dev` is published on the site (contact block, `mailto:` fallbacks,
enquiry-modal fallback, JSON-LD, llms.txt) but `homak.dev` has no MX record, so
anything sent to it bounces. This plan makes the address real by receiving mail
in SES and forwarding it to a Gmail inbox, all inside the existing CDK stack.

Legend: **[code]** can be done in this repo. **[you]** needs a decision, an
account, or a console step only Shane can do.

The Gmail address itself never goes in tracked source. It lives in the
gitignored `infra/config.local.ts`, like the enquiry recipients already do.

---

## What already exists (nothing to do)

- The stack deploys to **us-east-1**, one of the regions where SES email
  receiving is available.
- `ses.EmailIdentity` for the sending domain (the hosted zone), with DKIM
  CNAMEs and a custom MAIL FROM at `mail.<domain>`, already in Route 53.
- DMARC `p=quarantine; adkim=s; aspf=s` on the sending domain. This matters
  below: forwarded mail has to be re-sent *from* `hello@homak.dev`, not from
  the original sender, or Gmail will reject it under the sender's own DMARC.
- The contact Lambda already sends through SES v2 with `SendEmail`, so the
  forwarder can copy its client setup and IAM shape.
- The SES account is in the **sandbox**. Receiving works in the sandbox; the
  only constraint is that the forward-to address must be a verified identity,
  which the enquiry recipients already are.

---

## Section 1 — Receive

### 1.1 Decide the addresses
- [x] **[you]** Which Gmail inbox receives the forwards. Decided 2026-09-09: the existing enquiry inbox, already verified; `forwardTo` set in `config.local.ts`. Add it as `forwardTo` in `config.local.ts`. If it is not already one of `toEmails`, verify it in SES (console → Identities → Create → email address, click the link Amazon sends).
- [x] **[you]** `hello@` only, or a catch-all for `@homak.dev`? Went with **`hello@` only**. A catch-all means `shane@`, `ksenia@`, and typos all arrive; it also means every spam probe to the domain arrives. Recommendation: **`hello@` only** to start, add `shane@` and `ksenia@` as explicit recipients later if wanted.

### 1.2 DNS
- [x] **[code]** Add an MX record on the apex in Route 53: `10 inbound-smtp.us-east-1.amazonaws.com`. Goes in `site-stack.ts` next to the DMARC record. The MAIL FROM MX is on `mail.<domain>`, a different name, so the two do not collide.

### 1.3 Storage for raw mail
- [x] **[code]** An S3 bucket `MailBucket`: block public access, SSE-S3, `RETAIN`, lifecycle rule expiring objects after 30 days. The bucket policy must allow `ses.amazonaws.com` to `s3:PutObject` with `aws:SourceAccount` = this account; the CDK `S3` receipt action writes that policy itself.

### 1.4 Receipt rule
- [x] **[code]** `ses.ReceiptRuleSet` with one rule: recipients `['hello@homak.dev']`, `scanEnabled: true`, `tlsPolicy: OPTIONAL`, actions in order: (1) `S3` into `MailBucket` under `inbox/`, (2) `Lambda` invoking the forwarder, `invocationType: EVENT`.
- [x] **[code]** Activate the rule set. CDK creates rule sets but does not activate them, and SES ignores an inactive set. Use an `AwsCustomResource` that calls `ses:SetActiveReceiptRuleSet` on create/update and `ses:SetActiveReceiptRuleSet` with no name on delete. Without this step mail bounces with "554 no MX" style errors even though DNS is right.

---

## Section 2 — Forward

### 2.1 Forwarder Lambda
- [x] **[code]** `infra/lambda/forward/handler.ts`, a `NodejsFunction` like the contact one. Triggered by the SES action with `mail.messageId` in the event; reads `inbox/<messageId>` from `MailBucket`.
- [x] **[code]** Drop the message (log and return) when any of `X-SES-Spam-Verdict`, `X-SES-Virus-Verdict` is `FAIL`, taken from the receipt in the event rather than by parsing headers.
- [x] **[code]** Rewrite headers and re-send the raw message so attachments and HTML survive untouched:
  - `From:` → `"<original display name> via Homak" <hello@homak.dev>`
  - `Reply-To:` → the original `From` address, so a reply from Gmail goes back to the sender
  - `To:` → `forwardTo`
  - keep `Subject`, `Date`, `Message-ID`, `In-Reply-To`, `References`, all MIME parts
  - remove `Return-Path`, `Sender`, `DKIM-Signature`, and any existing `Reply-To`, which would otherwise fail verification or override the one above
  - add `X-Original-To: hello@homak.dev` and `X-Original-From: <original>` so the raw addresses are visible in "Show original"
- [x] **[code]** Send with SES v2 `SendEmail` using `Content.Raw`. Because `From` is on the verified domain, SES signs it with the domain's DKIM and it passes DMARC on `homak.dev`; Gmail shows it as from `hello@homak.dev`.
- [x] **[code]** IAM: `s3:GetObject` on `MailBucket/inbox/*`; `ses:SendRawEmail` and `ses:SendEmail` on the domain identity, with a `ses:FromAddress` condition pinned to `hello@homak.dev`.
- [x] **[code]** Env vars from `config.local.ts`: `FORWARD_TO`, `FORWARD_FROM` (`hello@homak.dev`), `MAIL_BUCKET`. Timeout 30 s, memory 256 MB. Failure handling: on any error, throw so the invocation lands in CloudWatch as an error; the raw message is still in S3 for 30 days, so nothing is lost. Add a `DeadLetterQueue` (SQS) so failed forwards are visible without reading logs.
- [x] **[code]** Size: SES receiving caps inbound at 40 MB and `SendEmail` raw at 40 MB, so pass-through is safe. If a message is over the v2 limit, forward a short notice with a link to the S3 key instead of failing silently.

### 2.2 Config
- [x] **[code]** `config.example.ts` gains `forwardTo: "to@example.com"` with a comment; `SiteStackProps` gains `forwardTo`.
- [x] **[code]** `infra/README.md`: a short "Inbound mail" section covering the rule-set activation and the sandbox verification requirement.

### 2.3 Deploy
- [x] **[you]** Deployed 2026-09-09. MX resolves and the `hello` rule set is active. The diff should show the MX record, the mail bucket, the rule set, the custom resource, and the forwarder Lambda, and nothing touching the site bucket or distribution beyond the pending 404 and www changes.

---

## Section 3 — Gmail side

### 3.1 Receiving
- [ ] **[you]** After the first test message arrives, add a Gmail filter: `to:(hello@homak.dev)` → label **Homak**, never send to spam. The `X-Original-To` header is what to search on if a message lands somewhere unexpected.

### 3.2 Replying as hello@ (optional, recommended)
Without this, replies go out from the Gmail address and the client sees a
personal inbox. With it, Gmail sends *as* `hello@homak.dev` through SES.
- [ ] **[you]** Request **SES production access** — decided 2026-09-09 that replies must come from hello@, so this is required. (console → Account dashboard → Request production access). The sandbox only allows sending to verified addresses, so replies to clients from Gmail-as-hello@ would fail until this is granted. Usually approved within a day; use case: "transactional replies to customer enquiries for a two-person web studio".
- [x] **[code]** An IAM user `ses-smtp-gmail` with a single policy: `ses:SendRawEmail` on the domain identity, `ses:FromAddress` condition `hello@homak.dev`. Output the access key ID; the SMTP password is derived from the secret key with the documented SigV4 algorithm (`infra/scripts/ses-smtp-password.mjs`, one-off, prints and does not store).
- [ ] **[you]** Gmail → Settings → Accounts and Import → "Send mail as" → Add: name `Homak`, address `hello@homak.dev`, untick "treat as alias" if you want replies to keep the original To; SMTP `email-smtp.us-east-1.amazonaws.com`, port 587, TLS, username = access key ID, password = derived SMTP password. Gmail emails a confirmation code to `hello@`, which now forwards to you; paste it back.
- [ ] **[you]** Set "Reply from the same address the message was sent to", so replies to forwarded mail go out as hello@ automatically.

---

## Section 4 — Test and verify

- [ ] **[you]** Send a plain message from a non-Gmail address (or a second Gmail) to `hello@homak.dev`. It should arrive within a few seconds, from `"<name> via Homak" <hello@homak.dev>`, with Reply-To set to the sender.
- [ ] **[you]** In Gmail, "Show original": `SPF: PASS`, `DKIM: PASS` with `homak.dev`, `DMARC: PASS`.
- [ ] **[you]** Reply from Gmail; confirm the reply reaches the original sender, and (if 3.2 is done) that it shows from `hello@homak.dev`.
- [ ] **[you]** Send one with a PDF attachment and one with HTML formatting; both should survive.
- [ ] **[code]** Send to `nobody@homak.dev`; with `hello@` only it should bounce from SES with 550, which is the correct behaviour and the difference from a catch-all.
- [ ] **[code]** Check the forwarder's CloudWatch log group has one clean invocation per message and the DLQ is empty.
- [ ] **[code]** Confirm the contact form still delivers; it shares the SES identity and must be unaffected.

---

## Section 5 — Site

Nothing on the site changes: `hello@homak.dev` is already the published
address everywhere. Once mail is flowing, one optional addition:
- [ ] **[code]** Add a `contactPoint` to the studio JSON-LD (`contactType: "sales"`, `email: hello@homak.dev`, `availableLanguage: ["English", "Ukrainian"]`) now that the address is real. Left until it is.

---

## Cost

SES receiving: first 1,000 messages a month free, then $0.10 per 1,000. Sending
the forward: $0.10 per 1,000. S3 and Lambda at this volume round to zero.
Google Workspace was the alternative at ~$7 per user per month; this route
costs nothing and keeps the mailbox in the account that already hosts the site.

---

## Execution order

1. **[you]** 1.1: choose the inbox and whether it is hello@-only. Put `forwardTo` in `config.local.ts`.
2. **[code]** 1.2 to 2.2 in one change to `site-stack.ts` plus the new Lambda.
3. **[you]** 2.3: deploy.
4. **[you]** 4: send the test messages; **[code]** checks the logs.
5. **[you]** 3.1 filter, then 3.2 if you want to reply as hello@ (production access first).
6. **[code]** 5 once everything above is confirmed.
