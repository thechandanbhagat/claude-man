import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readLiveCredentials, readLiveOauthAccount } from "../src/claudeFiles.js";
import { ClaudeManError } from "../src/errors.js";
import { pathExists, readJson } from "../src/fsx.js";
import type { ClaudeConfigFile } from "../src/types.js";
import {
  addProfile,
  currentProfile,
  listProfiles,
  removeProfile,
  renameProfile,
  useProfile,
} from "../src/profile.js";
import type { Paths } from "../src/paths.js";
import { account, credentials, makeSandbox, writeLiveLogin } from "./helpers.js";

const liveToken = (paths: Paths): string | undefined =>
  readLiveCredentials(paths)?.claudeAiOauth?.accessToken;

const rotateLiveToken = (paths: Paths, token: string): void => {
  const live = readLiveCredentials(paths) ?? {};
  writeFileSync(
    paths.credentialsFile,
    JSON.stringify({
      ...live,
      claudeAiOauth: { ...live.claudeAiOauth, accessToken: token },
    }),
  );
};

const setupTwoAccounts = (paths: Paths): void => {
  writeLiveLogin(paths, credentials("work-tok", "work-ref"), account("work@x.com"));
  addProfile(paths, "work");
  writeLiveLogin(paths, credentials("home-tok", "home-ref"), account("home@x.com"));
  addProfile(paths, "home");
};

describe("addProfile", () => {
  it("snapshots the live account and records its identity", () => {
    const paths = makeSandbox();
    writeLiveLogin(paths, credentials("t", "r"), account("a@x.com"));
    const identity = addProfile(paths, "work");
    expect(identity.email).toBe("a@x.com");
    expect(listProfiles(paths)).toHaveLength(1);
  });

  it("refuses a duplicate name", () => {
    const paths = makeSandbox();
    writeLiveLogin(paths, credentials("t", "r"), account("a@x.com"));
    addProfile(paths, "work");
    expect(() => addProfile(paths, "work")).toThrow(/already exists/);
  });

  it("fails loudly when not logged in", () => {
    const paths = makeSandbox();
    expect(() => addProfile(paths, "work")).toThrow(ClaudeManError);
  });

  it("creates a first-run backup of the original login", () => {
    const paths = makeSandbox();
    writeLiveLogin(paths, credentials("t", "r"), account("a@x.com"));
    addProfile(paths, "work");
    expect(pathExists(`${paths.backupsDir}/credentials.json`)).toBe(true);
  });
});

describe("useProfile", () => {
  it("applies the target credentials and identity", () => {
    const paths = makeSandbox();
    setupTwoAccounts(paths);
    useProfile(paths, "work");
    expect(liveToken(paths)).toBe("work-tok");
    expect(readLiveOauthAccount(paths)?.emailAddress).toBe("work@x.com");
  });

  it("preserves unrelated claude.json config during the identity swap", () => {
    const paths = makeSandbox();
    writeLiveLogin(paths, credentials("t", "r"), account("a@x.com"), {
      numStartups: 99,
    });
    addProfile(paths, "work");
    writeLiveLogin(paths, credentials("t2", "r2"), account("b@x.com"), {
      numStartups: 99,
    });
    addProfile(paths, "home");
    useProfile(paths, "work");
    expect(readLiveOauthAccount(paths)?.emailAddress).toBe("a@x.com");
    const config = readJson<ClaudeConfigFile>(paths.claudeConfigFile);
    expect(config.numStartups).toBe(99);
  });

  it("does not lose a refreshed token when switching away and back", () => {
    const paths = makeSandbox();
    setupTwoAccounts(paths);
    useProfile(paths, "work");

    // Claude rotates the access token in the background while work is active.
    rotateLiveToken(paths, "work-rotated");

    useProfile(paths, "home");
    expect(liveToken(paths)).toBe("home-tok");

    useProfile(paths, "work");
    expect(liveToken(paths)).toBe("work-rotated");
  });

  it("marks exactly one profile active", () => {
    const paths = makeSandbox();
    setupTwoAccounts(paths);
    useProfile(paths, "home");
    const active = listProfiles(paths).filter((p) => p.active);
    expect(active).toHaveLength(1);
    expect(active[0]?.name).toBe("home");
    expect(currentProfile(paths).name).toBe("home");
  });
});

describe("removeProfile", () => {
  it("refuses to remove the active profile without force", () => {
    const paths = makeSandbox();
    setupTwoAccounts(paths);
    useProfile(paths, "work");
    expect(() => removeProfile(paths, "work", false)).toThrow(/active account/);
  });

  it("removes the active profile with force and clears the pointer", () => {
    const paths = makeSandbox();
    setupTwoAccounts(paths);
    useProfile(paths, "work");
    removeProfile(paths, "work", true);
    expect(listProfiles(paths).map((p) => p.name)).toEqual(["home"]);
    expect(currentProfile(paths).name).toBeUndefined();
  });
});

describe("renameProfile", () => {
  it("moves the profile and keeps it switchable", () => {
    const paths = makeSandbox();
    setupTwoAccounts(paths);
    renameProfile(paths, "work", "office");
    useProfile(paths, "office");
    expect(liveToken(paths)).toBe("work-tok");
  });

  it("refuses to clobber an existing name", () => {
    const paths = makeSandbox();
    setupTwoAccounts(paths);
    expect(() => renameProfile(paths, "work", "home")).toThrow(/already exists/);
  });
});
