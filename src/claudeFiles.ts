import { fail } from "./errors.js";
import {
  pathExists,
  readJson,
  readJsonIfExists,
  writeJsonAtomic,
} from "./fsx.js";
import type { Paths } from "./paths.js";
import type {
  AccountIdentity,
  ClaudeConfigFile,
  CredentialsFile,
  OauthAccount,
} from "./types.js";

export const identityFromAccount = (
  account: OauthAccount | undefined,
): AccountIdentity => ({
  email: account?.emailAddress,
  displayName: account?.displayName,
  subscriptionType: account?.subscriptionType,
  accountUuid: account?.accountUuid,
});

export const hasOauthTokens = (credentials: CredentialsFile): boolean =>
  typeof credentials.claudeAiOauth?.accessToken === "string";

export const requireLiveCredentials = (paths: Paths): CredentialsFile => {
  if (!pathExists(paths.credentialsFile)) {
    fail(
      `No Claude credentials found at ${paths.credentialsFile}. Log in with Claude Code first (run \`claude\`), then try again.`,
    );
  }
  const credentials = readJson<CredentialsFile>(paths.credentialsFile);
  if (!hasOauthTokens(credentials)) {
    fail(
      `Credentials at ${paths.credentialsFile} contain no OAuth tokens. This tool only supports token-file (Windows/Linux) auth, not the macOS Keychain.`,
    );
  }
  return credentials;
};

export const readLiveCredentials = (
  paths: Paths,
): CredentialsFile | undefined =>
  readJsonIfExists<CredentialsFile>(paths.credentialsFile);

export const writeLiveCredentials = (
  paths: Paths,
  credentials: CredentialsFile,
): void => {
  writeJsonAtomic(paths.credentialsFile, credentials);
};

export const readLiveOauthAccount = (
  paths: Paths,
): OauthAccount | undefined => {
  const config = readJsonIfExists<ClaudeConfigFile>(paths.claudeConfigFile);
  return config?.oauthAccount;
};

export const mergeOauthAccount = (
  config: ClaudeConfigFile,
  account: OauthAccount,
): ClaudeConfigFile => ({ ...config, oauthAccount: account });

export const writeLiveOauthAccount = (
  paths: Paths,
  account: OauthAccount,
): void => {
  const config =
    readJsonIfExists<ClaudeConfigFile>(paths.claudeConfigFile) ?? {};
  writeJsonAtomic(paths.claudeConfigFile, mergeOauthAccount(config, account));
};
