import { fail } from "./errors.js";
import { pathExists, readJsonIfExists, writeJsonAtomic } from "./fsx.js";
import { profileCredentialsFile, type Paths } from "./paths.js";
import { EMPTY_STATE, type ProfileMeta, type State } from "./types.js";

const NAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const RESERVED_NAMES = new Set([".", ".."]);

export const assertValidProfileName = (name: string): void => {
  if (name.length === 0 || !NAME_PATTERN.test(name) || RESERVED_NAMES.has(name)) {
    fail(
      `Invalid profile name "${name}". Use letters, digits, dot, dash, or underscore.`,
    );
  }
};

export const readState = (paths: Paths): State =>
  readJsonIfExists<State>(paths.stateFile) ?? EMPTY_STATE;

export const writeState = (paths: Paths, state: State): void => {
  writeJsonAtomic(paths.stateFile, state);
};

export const profileExists = (paths: Paths, name: string): boolean =>
  pathExists(profileCredentialsFile(paths, name));

export const requireProfile = (paths: Paths, name: string): void => {
  if (!profileExists(paths, name)) {
    fail(`Profile "${name}" does not exist. Run \`claude-man ls\` to list profiles.`);
  }
};

export const upsertProfileMeta = (
  state: State,
  name: string,
  meta: ProfileMeta,
): State => ({
  ...state,
  profiles: { ...state.profiles, [name]: meta },
});

export const removeProfileMeta = (state: State, name: string): State => {
  const next = { ...state.profiles };
  delete next[name];
  return {
    activeProfile: state.activeProfile === name ? undefined : state.activeProfile,
    profiles: next,
  };
};

export const renameProfileMeta = (
  state: State,
  from: string,
  to: string,
): State => {
  const meta = state.profiles[from];
  if (!meta) return state;
  const next = { ...state.profiles, [to]: meta };
  delete next[from];
  return {
    activeProfile: state.activeProfile === from ? to : state.activeProfile,
    profiles: next,
  };
};

export const setActiveProfile = (state: State, name: string | undefined): State => ({
  ...state,
  activeProfile: name,
});
