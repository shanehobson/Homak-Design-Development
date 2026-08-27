// Copy this file to `config.local.ts` (gitignored) and fill in real values.
export const localConfig = {
  account: "000000000000",
  hostedZoneId: "Z000000000000000000000",
  /** Profile name in ~/.aws/credentials used by the media sync scripts. */
  profile: "default",
} as const;
