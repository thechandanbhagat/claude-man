import { homedir } from "node:os";
import { join } from "node:path";

export const CLAUDE_DIR_NAME = ".claude";
export const CREDENTIALS_FILE_NAME = ".credentials.json";
export const CLAUDE_CONFIG_FILE_NAME = ".claude.json";
export const STORE_DIR_NAME = ".claude-man";

export const PROFILES_DIR_NAME = "profiles";
export const BACKUPS_DIR_NAME = "backups";
export const STATE_FILE_NAME = "state.json";

export const PROFILE_CREDENTIALS_FILE = "credentials.json";
export const PROFILE_IDENTITY_FILE = "oauthAccount.json";

export interface Paths {
  readonly home: string;
  readonly credentialsFile: string;
  readonly claudeConfigFile: string;
  readonly storeDir: string;
  readonly profilesDir: string;
  readonly backupsDir: string;
  readonly stateFile: string;
}

export interface PathOverrides {
  readonly home?: string;
  readonly storeDir?: string;
}

export const resolvePaths = (overrides: PathOverrides = {}): Paths => {
  const home = overrides.home ?? homedir();
  const storeDir = overrides.storeDir ?? join(home, STORE_DIR_NAME);
  return {
    home,
    credentialsFile: join(home, CLAUDE_DIR_NAME, CREDENTIALS_FILE_NAME),
    claudeConfigFile: join(home, CLAUDE_CONFIG_FILE_NAME),
    storeDir,
    profilesDir: join(storeDir, PROFILES_DIR_NAME),
    backupsDir: join(storeDir, BACKUPS_DIR_NAME),
    stateFile: join(storeDir, STATE_FILE_NAME),
  };
};

export const profileDir = (paths: Paths, name: string): string =>
  join(paths.profilesDir, name);

export const profileCredentialsFile = (paths: Paths, name: string): string =>
  join(profileDir(paths, name), PROFILE_CREDENTIALS_FILE);

export const profileIdentityFile = (paths: Paths, name: string): string =>
  join(profileDir(paths, name), PROFILE_IDENTITY_FILE);
