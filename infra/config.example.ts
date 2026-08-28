// Copy this file to `config.local.ts` (gitignored) and fill in real values.
export const localConfig = {
  account: "000000000000",
  hostedZoneId: "Z000000000000000000000",
  /**
   * Profile name in ~/.aws/credentials. The media sync scripts read this
   * automatically; `cdk` does not, so deploys need it exported as
   * AWS_PROFILE — see the Deploy section of README.md.
   */
  profile: "default",
} as const;
