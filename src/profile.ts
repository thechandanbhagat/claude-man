import {
  identityFromAccount,
  readLiveCredentials,
  readLiveOauthAccount,
  requireLiveCredentials,
  writeLiveCredentials,
  writeLiveOauthAccount,
} from "./claudeFiles.js";
import { fail } from "./errors.js";
import {
  copyJson,
  ensureDir,
  movePath,
  pathExists,
  readJson,
  readJsonIfExists,
  removePath,
  writeJsonAtomic,
} from "./fsx.js";
import {
  profileCredentialsFile,
  profileDir,
  profileIdentityFile,
  type Paths,
} from "./paths.js";
import {
  assertValidProfileName,
  profileExists,
  readState,
  removeProfileMeta,
  renameProfileMeta,
  requireProfile,
  setActiveProfile,
  upsertProfileMeta,
  writeState,
} from "./store.js";
import type {
  AccountIdentity,
  CredentialsFile,
  OauthAccount,
  ProfileMeta,
} from "./types.js";

const nowIso = (): string => new Date().toISOString();

const liveIdentity = (paths: Paths): AccountIdentity =>
  identityFromAccount(readLiveOauthAccount(paths));

const captureLiveInto = (paths: Paths, name: string): AccountIdentity => {
  const credentials = requireLiveCredentials(paths);
  ensureDir(profileDir(paths, name));
  writeJsonAtomic(profileCredentialsFile(paths, name), credentials);
  const account = readLiveOauthAccount(paths);
  writeJsonAtomic(profileIdentityFile(paths, name), account ?? {});
  return identityFromAccount(account);
};

const applyProfile = (paths: Paths, name: string): void => {
  const credentials = readJson<CredentialsFile>(
    profileCredentialsFile(paths, name),
  );
  writeLiveCredentials(paths, credentials);
  const account = readJsonIfExists<OauthAccount>(profileIdentityFile(paths, name));
  if (account && Object.keys(account).length > 0) {
    writeLiveOauthAccount(paths, account);
  }
};

const ensureFirstRunBackup = (paths: Paths): void => {
  const marker = `${paths.backupsDir}/credentials.json`;
  if (pathExists(marker) || !pathExists(paths.credentialsFile)) return;
  ensureDir(paths.backupsDir);
  copyJson(paths.credentialsFile, marker);
  if (pathExists(paths.claudeConfigFile)) {
    const account = readLiveOauthAccount(paths);
    writeJsonAtomic(`${paths.backupsDir}/oauthAccount.json`, account ?? {});
  }
};

const metaFromIdentity = (
  identity: AccountIdentity,
  addedAt: string,
  lastUsedAt: string | undefined,
): ProfileMeta => ({
  email: identity.email,
  subscriptionType: identity.subscriptionType,
  addedAt,
  lastUsedAt,
});

export const addProfile = (paths: Paths, name: string): AccountIdentity => {
  assertValidProfileName(name);
  if (profileExists(paths, name)) {
    fail(`Profile "${name}" already exists. Pick another name or remove it first.`);
  }
  ensureFirstRunBackup(paths);
  const identity = captureLiveInto(paths, name);
  const state = readState(paths);
  writeState(
    paths,
    upsertProfileMeta(state, name, metaFromIdentity(identity, nowIso(), undefined)),
  );
  return identity;
};

const syncActiveProfile = (paths: Paths): void => {
  const { activeProfile } = readState(paths);
  // Re-capture the live (possibly token-refreshed) credentials so the rotated
  // refresh token is never lost when we overwrite the file.
  if (activeProfile && profileExists(paths, activeProfile)) {
    captureLiveInto(paths, activeProfile);
  }
};

export const useProfile = (paths: Paths, name: string): AccountIdentity => {
  assertValidProfileName(name);
  requireProfile(paths, name);
  ensureFirstRunBackup(paths);
  syncActiveProfile(paths);
  applyProfile(paths, name);
  const identity = liveIdentity(paths);
  const state = readState(paths);
  const previous = state.profiles[name];
  const next = upsertProfileMeta(
    state,
    name,
    metaFromIdentity(identity, previous?.addedAt ?? nowIso(), nowIso()),
  );
  writeState(paths, setActiveProfile(next, name));
  return identity;
};

export interface AuthLoginOptions {
  readonly email: string | undefined;
  readonly console: boolean;
  readonly sso: boolean;
}

export const DEFAULT_LOGIN_OPTIONS: AuthLoginOptions = {
  email: undefined,
  console: false,
  sso: false,
};

export interface AuthStatus {
  readonly loggedIn: boolean;
  readonly email: string | undefined;
  readonly subscriptionType: string | undefined;
}

export interface AuthRunner {
  login(options: AuthLoginOptions): void;
  status(): AuthStatus;
}

const restoreLive = (
  paths: Paths,
  credentials: CredentialsFile | undefined,
  account: OauthAccount | undefined,
): void => {
  if (credentials) writeLiveCredentials(paths, credentials);
  if (account) writeLiveOauthAccount(paths, account);
};

export const createNewProfile = (
  paths: Paths,
  name: string,
  runner: AuthRunner,
  options: AuthLoginOptions = DEFAULT_LOGIN_OPTIONS,
): AccountIdentity => {
  assertValidProfileName(name);
  if (profileExists(paths, name)) {
    fail(`Profile "${name}" already exists. Pick another name or remove it first.`);
  }
  ensureFirstRunBackup(paths);

  const previousActive = readState(paths).activeProfile;
  // Preserve the currently-active account (including any background-rotated
  // token) before `claude auth login` overwrites the live credentials.
  if (previousActive && profileExists(paths, previousActive)) {
    captureLiveInto(paths, previousActive);
  }
  const liveBefore = readLiveCredentials(paths);
  const accountBefore = readLiveOauthAccount(paths);

  try {
    runner.login(options);
  } catch (error) {
    restoreLive(paths, liveBefore, accountBefore);
    throw error;
  }

  const status = runner.status();
  if (!status.loggedIn) {
    restoreLive(paths, liveBefore, accountBefore);
    fail(
      "Login did not complete; no new profile was saved. Your previous account is unchanged.",
    );
  }

  const captured = captureLiveInto(paths, name);
  const identity: AccountIdentity = {
    email: status.email ?? captured.email,
    displayName: captured.displayName,
    subscriptionType: status.subscriptionType ?? captured.subscriptionType,
    accountUuid: captured.accountUuid,
  };
  const next = upsertProfileMeta(
    readState(paths),
    name,
    metaFromIdentity(identity, nowIso(), nowIso()),
  );
  writeState(paths, setActiveProfile(next, name));
  return identity;
};

export const removeProfile = (
  paths: Paths,
  name: string,
  force: boolean,
): void => {
  requireProfile(paths, name);
  const state = readState(paths);
  if (state.activeProfile === name && !force) {
    fail(
      `Profile "${name}" is the active account. Switch away first, or pass --force.`,
    );
  }
  removePath(profileDir(paths, name));
  writeState(paths, removeProfileMeta(state, name));
};

export const renameProfile = (paths: Paths, from: string, to: string): void => {
  requireProfile(paths, from);
  assertValidProfileName(to);
  if (profileExists(paths, to)) {
    fail(`Profile "${to}" already exists.`);
  }
  movePath(profileDir(paths, from), profileDir(paths, to));
  writeState(paths, renameProfileMeta(readState(paths), from, to));
};

export interface ProfileListEntry {
  readonly name: string;
  readonly active: boolean;
  readonly meta: ProfileMeta | undefined;
}

export const listProfiles = (paths: Paths): readonly ProfileListEntry[] => {
  const state = readState(paths);
  return Object.keys(state.profiles)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      active: state.activeProfile === name,
      meta: state.profiles[name],
    }));
};

export const currentProfile = (
  paths: Paths,
): { readonly name: string | undefined; readonly identity: AccountIdentity } => ({
  name: readState(paths).activeProfile,
  identity: liveIdentity(paths),
});
