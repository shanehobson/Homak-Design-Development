import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { SESEvent } from "aws-lambda";

/* Inbound mail forwarder. SES receives a message for hello@, stores the raw
   RFC 822 bytes in S3 and invokes this with the message id. The message is
   re-sent to the Gmail inbox with its headers rewritten so that:

   - `From` is hello@ on our own domain. The domain's DMARC is strict, and so
     is Gmail's policy on forwarded mail, so passing the original `From`
     through would fail authentication and land in spam or be rejected.
     Sending as hello@ lets SES sign it with our DKIM key.
   - `Reply-To` is the original sender, so a reply from Gmail goes back to
     them rather than to us.

   Everything below the headers — text, HTML, attachments — is passed through
   byte for byte. */

const s3 = new S3Client({});
const ses = new SESv2Client({});

const MAIL_BUCKET = process.env.MAIL_BUCKET!;
const MAIL_PREFIX = process.env.MAIL_PREFIX ?? "";
const FORWARD_TO = process.env.FORWARD_TO!;
const FORWARD_FROM = process.env.FORWARD_FROM!;

/* SES v2 SendEmail accepts up to 40 MB of raw message. Receiving is capped at
   the same figure, so this is belt and braces; the notice path below only
   runs if the limits ever diverge. */
const MAX_RAW_BYTES = 39 * 1024 * 1024;

/* Headers that must not survive forwarding. `Return-Path` and `Sender` are
   set by the receiving hop and would name a domain we cannot sign for;
   `DKIM-Signature` covers the original `From` and would fail once that is
   rewritten; `Reply-To` is replaced with our own; `From` and `To` likewise.
   `Message-ID`, `Date`, `Subject`, `In-Reply-To` and `References` are kept so
   Gmail threads the conversation the way the sender's client did. */
const STRIP = new Set([
  "from",
  "to",
  "cc",
  "bcc",
  "reply-to",
  "return-path",
  "sender",
  "dkim-signature",
  "received-spf",
  "authentication-results",
  "x-original-to",
  "x-original-from",
]);

interface Header {
  name: string;
  /* Raw value including any folded continuation lines and the CRLFs between
     them, so a multi-line header is re-emitted unchanged. */
  raw: string;
}

/* Split the raw message into headers and body at the first blank line,
   unfolding nothing: each header is kept as the exact bytes it arrived as. */
function splitMessage(raw: string): { headers: Header[]; body: string; eol: string } {
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const sep = eol + eol;
  const idx = raw.indexOf(sep);
  const head = idx === -1 ? raw : raw.slice(0, idx);
  const body = idx === -1 ? "" : raw.slice(idx + sep.length);

  const headers: Header[] = [];
  for (const line of head.split(eol)) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && headers.length) {
      headers[headers.length - 1].raw += eol + line;
      continue;
    }
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    headers.push({ name: line.slice(0, colon), raw: line });
  }
  return { headers, body, eol };
}

/* The unfolded value of a header, for reading only. */
function headerValue(h: Header): string {
  return h.raw
    .slice(h.name.length + 1)
    .replace(/\r?\n[ \t]+/g, " ")
    .trim();
}

/* Decode RFC 2047 encoded words (`=?UTF-8?B?...?=`, `=?UTF-8?Q?...?=`) in a
   display name, so the label built below is not encoded a second time and
   shown to the reader as the raw token. Headers arrive here as Latin-1 code
   units (see `readRaw`), so a name sent as bare 8-bit UTF-8, which is not
   allowed but common, is re-read as UTF-8 too. */
function decodeWords(value: string): string {
  const decoded = value.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (_m, charset: string, enc: string, text: string) => {
      const bytes =
        enc.toUpperCase() === "B"
          ? Buffer.from(text, "base64")
          : Buffer.from(
              text.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_h, hex: string) =>
                String.fromCharCode(parseInt(hex, 16)),
              ),
              "latin1",
            );
      const cs = charset.toLowerCase();
      return bytes.toString(cs === "utf-8" || cs === "utf8" ? "utf8" : "latin1");
    },
  );
  /* Adjacent encoded words are joined without the whitespace between them. */
  const joined = decoded !== value ? decoded.replace(/(\S)\s+(?==\?)/g, "$1") : decoded;
  if (/[\x80-\xff]/.test(joined) && !/[\u0100-\uffff]/.test(joined)) {
    const asUtf8 = Buffer.from(joined, "latin1").toString("utf8");
    if (!asUtf8.includes("\ufffd")) return asUtf8;
  }
  return joined;
}

/* "Jane Doe" <jane@example.com>  ->  { name: "Jane Doe", address: "jane@example.com" }
   Good enough for a display name; anything odd falls back to the address. */
function parseAddress(value: string): { name: string; address: string } {
  const angle = value.match(/^(.*?)<([^>]+)>\s*$/);
  if (angle) {
    const name = decodeWords(
      angle[1].trim().replace(/^"(.*)"$/, "$1").replace(/\\(.)/g, "$1"),
    );
    return { name, address: angle[2].trim() };
  }
  return { name: "", address: value.trim() };
}

/* RFC 2047 encode a display name when it is not plain printable ASCII. */
function encodeDisplayName(name: string): string {
  if (/^[\x20-\x7e]*$/.test(name) && !/["\\]/.test(name)) return `"${name}"`;
  return `=?UTF-8?B?${Buffer.from(name, "utf8").toString("base64")}?=`;
}

export function rewrite(raw: string): { message: string; originalFrom: string } {
  const { headers, body, eol } = splitMessage(raw);

  const fromHeader = headers.find((h) => h.name.toLowerCase() === "from");
  const originalFrom = fromHeader ? headerValue(fromHeader) : "";
  const { name, address } = parseAddress(originalFrom);
  const label = `${name || address} via Homak`;

  const kept = headers.filter((h) => !STRIP.has(h.name.toLowerCase()));

  const added = [
    `From: ${encodeDisplayName(label)} <${FORWARD_FROM}>`,
    `To: ${FORWARD_TO}`,
    originalFrom ? `Reply-To: ${originalFrom}` : null,
    `X-Original-To: ${FORWARD_FROM}`,
    originalFrom ? `X-Original-From: ${originalFrom}` : null,
  ].filter((line): line is string => line !== null);

  const message = [...kept.map((h) => h.raw), ...added].join(eol) + eol + eol + body;
  return { message, originalFrom };
}

async function readRaw(key: string): Promise<string> {
  const obj = await s3.send(new GetObjectCommand({ Bucket: MAIL_BUCKET, Key: key }));
  if (!obj.Body) throw new Error(`empty object ${key}`);
  const bytes = await obj.Body.transformToByteArray();
  /* Latin-1 keeps every byte as one code unit, so the round trip back to a
     Buffer below is lossless whatever charset the parts declare. */
  return Buffer.from(bytes).toString("latin1");
}

async function send(message: string): Promise<string | undefined> {
  const res = await ses.send(
    new SendEmailCommand({
      Destination: { ToAddresses: [FORWARD_TO] },
      Content: { Raw: { Data: Buffer.from(message, "latin1") } },
    }),
  );
  return res.MessageId;
}

/* A short plain-text stand-in for a message that cannot be re-sent whole. */
function notice(subject: string, lines: string[]): string {
  const eol = "\r\n";
  return (
    [
      `From: "Homak mail" <${FORWARD_FROM}>`,
      `To: ${FORWARD_TO}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
    ].join(eol) +
    eol +
    eol +
    lines.join(eol) +
    eol
  );
}

export async function handler(event: SESEvent): Promise<void> {
  for (const record of event.Records) {
    const { mail, receipt } = record.ses;
    const key = `${MAIL_PREFIX}${mail.messageId}`;
    const verdicts = {
      spam: receipt.spamVerdict?.status,
      virus: receipt.virusVerdict?.status,
    };

    if (verdicts.spam === "FAIL" || verdicts.virus === "FAIL") {
      console.log(JSON.stringify({ dropped: key, verdicts, from: mail.source }));
      continue;
    }

    const raw = await readRaw(key);

    if (raw.length > MAX_RAW_BYTES) {
      const id = await send(
        notice(`[Homak] Message too large to forward (${Math.round(raw.length / 1e6)} MB)`, [
          `A message for ${FORWARD_FROM} could not be forwarded because of its size.`,
          `From: ${mail.source}`,
          `Subject: ${mail.commonHeaders?.subject ?? "(none)"}`,
          `Stored at s3://${MAIL_BUCKET}/${key} for 30 days.`,
        ]),
      );
      console.log(JSON.stringify({ oversized: key, bytes: raw.length, sent: id }));
      continue;
    }

    const { message, originalFrom } = rewrite(raw);
    const id = await send(message);
    console.log(
      JSON.stringify({ forwarded: key, from: originalFrom, bytes: raw.length, sent: id }),
    );
  }
}
