/* Unit tests for the header rewrite in `handler.ts`. Run from `infra/` with
   `npm test`. Only `rewrite()` is covered: it is the part with rules in it,
   and the S3 read and SES send around it are one call each. */

process.env.FORWARD_TO = "inbox@example.net";
process.env.FORWARD_FROM = "hello@homak.dev";

import { test } from "node:test";
import assert from "node:assert/strict";
import { rewrite } from "./handler";

const CRLF = "\r\n";

/* A multipart message the way SES writes it to S3: CRLF line endings, a
   folded Content-Type, trace headers from the receiving hop, and a body
   with its own MIME boundary. The From name is RFC 2047 encoded. */
const body = [
  "--b1",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Hi there é",
  "--b1",
  "Content-Type: application/pdf; name=quote.pdf",
  "Content-Transfer-Encoding: base64",
  "",
  "JVBERi0xLjQK",
  "--b1--",
  "",
].join(CRLF);

const headers = [
  "Return-Path: <bounce@example.org>",
  "Received: from mail.example.org (mail.example.org [203.0.113.5])",
  " by inbound-smtp.us-east-1.amazonaws.com with SMTP id abc123",
  " for hello@homak.dev; Tue, 09 Sep 2026 10:00:00 +0000",
  "DKIM-Signature: v=1; a=rsa-sha256; d=example.org; s=sel;",
  " h=from:to:subject; bh=abc=; b=def=",
  "Authentication-Results: amazonses.com; spf=pass",
  "From: =?UTF-8?B?SsO2cmcgTcO8bGxlcg==?= <jorg@example.org>",
  "Reply-To: someone-else@example.org",
  "To: hello@homak.dev",
  "Cc: cc@example.org",
  "Subject: =?UTF-8?Q?Caf=C3=A9_quote?=",
  "Date: Tue, 09 Sep 2026 09:59:58 +0000",
  "Message-ID: <m1@example.org>",
  "In-Reply-To: <m0@example.org>",
  "MIME-Version: 1.0",
  "Content-Type: multipart/mixed;",
  '\tboundary="b1"',
];

const raw = headers.join(CRLF) + CRLF + CRLF + body;

const parse = (message: string) => {
  const idx = message.indexOf(CRLF + CRLF);
  const head = message.slice(0, idx).split(CRLF);
  const lines: string[] = [];
  for (const line of head) {
    if (/^[ \t]/.test(line)) lines[lines.length - 1] += CRLF + line;
    else lines.push(line);
  }
  return { lines, body: message.slice(idx + 4) };
};

const header = (lines: string[], name: string) =>
  lines.filter((l) => l.toLowerCase().startsWith(`${name.toLowerCase()}:`));

test("rewrites From to hello@ with the sender's decoded name", () => {
  const { message } = rewrite(raw);
  const { lines } = parse(message);
  const from = header(lines, "From");
  assert.equal(from.length, 1);
  /* "Jörg Müller via Homak", base64 encoded because of the umlauts. */
  const expected = Buffer.from("Jörg Müller via Homak", "utf8").toString("base64");
  assert.equal(from[0], `From: =?UTF-8?B?${expected}?= <hello@homak.dev>`);
});

test("sets Reply-To to the original sender and records the originals", () => {
  const { message, originalFrom } = rewrite(raw);
  const { lines } = parse(message);
  assert.equal(originalFrom, "=?UTF-8?B?SsO2cmcgTcO8bGxlcg==?= <jorg@example.org>");
  assert.deepEqual(header(lines, "Reply-To"), [`Reply-To: ${originalFrom}`]);
  assert.deepEqual(header(lines, "To"), ["To: inbox@example.net"]);
  assert.deepEqual(header(lines, "X-Original-To"), ["X-Original-To: hello@homak.dev"]);
  assert.deepEqual(header(lines, "X-Original-From"), [`X-Original-From: ${originalFrom}`]);
});

test("strips the headers SES cannot sign for and keeps the threading ones", () => {
  const { message } = rewrite(raw);
  const { lines } = parse(message);
  for (const gone of ["Return-Path", "DKIM-Signature", "Authentication-Results", "Cc"]) {
    assert.equal(header(lines, gone).length, 0, `${gone} should be stripped`);
  }
  assert.deepEqual(header(lines, "Subject"), ["Subject: =?UTF-8?Q?Caf=C3=A9_quote?="]);
  assert.deepEqual(header(lines, "Message-ID"), ["Message-ID: <m1@example.org>"]);
  assert.deepEqual(header(lines, "In-Reply-To"), ["In-Reply-To: <m0@example.org>"]);
  assert.deepEqual(header(lines, "Date"), ["Date: Tue, 09 Sep 2026 09:59:58 +0000"]);
  assert.deepEqual(header(lines, "MIME-Version"), ["MIME-Version: 1.0"]);
});

test("keeps folded headers folded and the body byte for byte", () => {
  const { message } = rewrite(raw);
  const { lines, body: out } = parse(message);
  assert.deepEqual(header(lines, "Content-Type"), [
    `Content-Type: multipart/mixed;${CRLF}\tboundary="b1"`,
  ]);
  assert.deepEqual(header(lines, "Received"), [
    [
      "Received: from mail.example.org (mail.example.org [203.0.113.5])",
      " by inbound-smtp.us-east-1.amazonaws.com with SMTP id abc123",
      " for hello@homak.dev; Tue, 09 Sep 2026 10:00:00 +0000",
    ].join(CRLF),
  ]);
  assert.equal(out, body);
});

test("quotes a plain ASCII display name without encoding it", () => {
  const { message } = rewrite(
    ['From: "Jane Doe" <jane@example.org>', "Subject: hi", "", "body"].join(CRLF),
  );
  const { lines } = parse(message);
  assert.deepEqual(header(lines, "From"), ['From: "Jane Doe via Homak" <hello@homak.dev>']);
});

test("falls back to the address when there is no display name", () => {
  const { message } = rewrite(["From: jane@example.org", "Subject: hi", "", "body"].join(CRLF));
  const { lines } = parse(message);
  assert.deepEqual(header(lines, "From"), [
    'From: "jane@example.org via Homak" <hello@homak.dev>',
  ]);
  assert.deepEqual(header(lines, "Reply-To"), ["Reply-To: jane@example.org"]);
});

test("decodes a name sent as bare 8-bit UTF-8", () => {
  /* `readRaw` hands the message over as Latin-1 code units, so a UTF-8 name
     arrives as its individual bytes. */
  const name = Buffer.from("Zoë", "utf8").toString("latin1");
  const { message } = rewrite([`From: ${name} <zoe@example.org>`, "", "body"].join(CRLF));
  const { lines } = parse(message);
  const expected = Buffer.from("Zoë via Homak", "utf8").toString("base64");
  assert.deepEqual(header(lines, "From"), [`From: =?UTF-8?B?${expected}?= <hello@homak.dev>`]);
});

test("omits Reply-To when the original has no From", () => {
  const { message, originalFrom } = rewrite(["Subject: hi", "", "body"].join(CRLF));
  const { lines } = parse(message);
  assert.equal(originalFrom, "");
  assert.equal(header(lines, "Reply-To").length, 0);
  assert.equal(header(lines, "X-Original-From").length, 0);
  assert.equal(header(lines, "From").length, 1);
});

test("preserves LF-only line endings", () => {
  const { message } = rewrite("From: a@example.org\nSubject: hi\n\nline 1\nline 2\n");
  assert.ok(!message.includes("\r"), "no CR should be introduced");
  assert.ok(message.endsWith("\n\nline 1\nline 2\n"));
});
