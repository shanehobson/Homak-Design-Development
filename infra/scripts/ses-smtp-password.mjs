#!/usr/bin/env node
/* Prints the SMTP credentials Gmail's "Send mail as" needs to send through SES
   as hello@. The IAM access key lives in Secrets Manager (written by the
   stack); the SMTP password is derived from its secret key with the
   algorithm SES documents, so it is never stored anywhere.

   Usage, from infra/ with AWS_PROFILE exported as for `cdk`:

     node scripts/ses-smtp-password.mjs

   Output is meant to be pasted into Gmail and then closed; nothing is written
   to disk. */

import { createHmac } from "node:crypto";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const REGION = "us-east-1";
const SECRET_NAME = "homak/ses-smtp-gmail";

/* https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html#smtp-credentials-convert */
function smtpPassword(secretAccessKey, region) {
  const hmac = (key, msg) => createHmac("sha256", key).update(msg, "utf8").digest();
  const kDate = hmac(`AWS4${secretAccessKey}`, "11111111");
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "ses");
  const kTerminal = hmac(kService, "aws4_request");
  const signature = hmac(kTerminal, "SendRawEmail");
  return Buffer.concat([Buffer.from([0x04]), signature]).toString("base64");
}

const client = new SecretsManagerClient({ region: REGION });
const res = await client.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
const { accessKeyId, secretAccessKey } = JSON.parse(res.SecretString);

console.log(`SMTP server:  email-smtp.${REGION}.amazonaws.com`);
console.log(`Port:         587 (TLS / STARTTLS)`);
console.log(`Username:     ${accessKeyId}`);
console.log(`Password:     ${smtpPassword(secretAccessKey, REGION)}`);
