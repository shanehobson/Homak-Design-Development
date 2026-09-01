#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SiteStack } from "../lib/site-stack";
import { localConfig } from "../config.local";

const app = new cdk.App();

new SiteStack(app, "HomakSite", {
  env: {
    account: localConfig.account,
    region: "us-east-1",
  },
  domainName: "homak.dev",
  hostedZoneId: localConfig.hostedZoneId,
  siteDistPath: "../dist",
  sendingDomain: localConfig.sendingDomain,
  fromEmail: localConfig.fromEmail,
  toEmails: localConfig.toEmails,
});
