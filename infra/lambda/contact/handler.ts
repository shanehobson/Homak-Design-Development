import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  DynamoDBClient,
  UpdateItemCommand,
  ConditionalCheckFailedException,
} from "@aws-sdk/client-dynamodb";
import { z } from "zod";

const ses = new SESv2Client({});
const ddb = new DynamoDBClient({});

const TO_EMAILS = process.env.TO_EMAILS!;
const FROM_EMAIL = process.env.FROM_EMAIL!;
const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE!;

const IP_WINDOW_SECONDS = 10 * 60;
const IP_MAX_PER_WINDOW = 5;

/* Only name and email are required: the form asks for a description but a
   phone number and a one-line "call me" are a perfectly good enquiry. */
const payloadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  /* Honeypot: hidden from people, irresistible to form-filling bots. */
  website: z.string().optional(),
});

interface FunctionUrlEvent {
  requestContext?: {
    http?: { method?: string; sourceIp?: string };
  };
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
}

interface FunctionUrlResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

function json(
  statusCode: number,
  body: Record<string, unknown>,
): FunctionUrlResponse {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

/* One counter item per IP per fixed 10-minute window, incremented under a
   condition so the read and the write cannot race. Fails open: a DynamoDB
   outage should not take the form down with it. */
async function checkRateLimit(sourceIp: string): Promise<boolean> {
  const nowSec = Math.floor(Date.now() / 1000);
  const window = Math.floor(nowSec / IP_WINDOW_SECONDS);
  const pk = `ip#${sourceIp}#${window}`;
  const ttl = (window + 1) * IP_WINDOW_SECONDS + 60;

  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: RATE_LIMIT_TABLE,
        Key: { pk: { S: pk } },
        UpdateExpression: "SET #ttl = if_not_exists(#ttl, :ttl) ADD #c :one",
        ConditionExpression: "attribute_not_exists(#c) OR #c < :max",
        ExpressionAttributeNames: { "#c": "count", "#ttl": "ttl" },
        ExpressionAttributeValues: {
          ":one": { N: "1" },
          ":max": { N: String(IP_MAX_PER_WINDOW) },
          ":ttl": { N: String(ttl) },
        },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    console.error("rate_limit_check_failed", err);
    return true;
  }
}

/* Every real visitor arrives through the CloudFront `/api/contact` behaviour,
   where `sourceIp` is the edge server's address — so keying the rate limit on
   it would put everyone sharing a POP in one bucket, 429ing strangers for each
   other. CloudFront appends the viewer's address to `x-forwarded-for`, so the
   last entry is the one it actually observed. `sourceIp` remains the fallback
   for direct calls to the Function URL, which is how the dev proxy arrives. */
function clientIp(event: FunctionUrlEvent): string | undefined {
  // Function URLs lower-case incoming header names.
  const forwarded = event.headers?.["x-forwarded-for"];
  const viewer = forwarded?.split(",").pop()?.trim();
  return viewer || event.requestContext?.http?.sourceIp;
}

export async function handler(event: FunctionUrlEvent): Promise<FunctionUrlResponse> {
  const method = event.requestContext?.http?.method ?? "POST";

  if (method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const sourceIp = clientIp(event);
  if (sourceIp) {
    const allowed = await checkRateLimit(sourceIp);
    if (!allowed) {
      return json(429, { error: "rate_limited" });
    }
  }

  let parsedBody: unknown;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64").toString("utf8")
      : event.body ?? "";
    parsedBody = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const result = payloadSchema.safeParse(parsedBody);
  if (!result.success) {
    return json(400, { error: "invalid_payload" });
  }

  const payload = result.data;

  /* A filled honeypot gets the same 200 a real submission does, so the bot
     has nothing to learn from the response. */
  if (payload.website && payload.website.trim().length > 0) {
    return json(200, { ok: true });
  }

  const subject = `Homak — new project enquiry from ${payload.name}`;

  const lines: string[] = [`Name: ${payload.name}`, `Email: ${payload.email}`];
  if (payload.phone) lines.push(`Phone: ${payload.phone}`);
  lines.push("", payload.description || "(no description)");
  const text = lines.join("\n");

  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: FROM_EMAIL,
        Destination: { ToAddresses: TO_EMAILS.split(",") },
        /* So a reply from either inbox goes straight to the enquirer. */
        ReplyToAddresses: [payload.email],
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Text: { Data: text, Charset: "UTF-8" } },
          },
        },
      }),
    );
  } catch (err) {
    console.error("ses_send_failed", err);
    return json(502, { error: "send_failed" });
  }

  return json(200, { ok: true });
}
