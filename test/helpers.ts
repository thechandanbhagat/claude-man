import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolvePaths, type Paths } from "../src/paths.js";
import type { CredentialsFile, OauthAccount } from "../src/types.js";

export const makeSandbox = (): Paths => {
  const home = mkdtempSync(join(tmpdir(), "claude-man-test-"));
  mkdirSync(join(home, ".claude"), { recursive: true });
  return resolvePaths({ home, storeDir: join(home, ".claude-man") });
};

export const credentials = (accessToken: string, refreshToken: string): CredentialsFile => ({
  claudeAiOauth: {
    accessToken,
    refreshToken,
    expiresAt: 1780937563010,
    scopes: ["a", "b"],
    subscriptionType: "max",
  },
});

export const account = (email: string): OauthAccount => ({
  accountUuid: `uuid-${email}`,
  emailAddress: email,
  subscriptionType: "max",
  displayName: email.split("@")[0],
  organizationName: "Acme",
});

export const writeLiveLogin = (
  paths: Paths,
  creds: CredentialsFile,
  acct: OauthAccount,
  extraConfig: Record<string, unknown> = {},
): void => {
  writeFileSync(paths.credentialsFile, JSON.stringify(creds));
  writeFileSync(
    paths.claudeConfigFile,
    JSON.stringify({ ...extraConfig, oauthAccount: acct }),
  );
};
