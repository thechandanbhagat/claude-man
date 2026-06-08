import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAuthStatus } from "../src/claudeAuth.js";
import { readLiveCredentials } from "../src/claudeFiles.js";
import { ClaudeManError } from "../src/errors.js";
import type { Paths } from "../src/paths.js";
import {
  addProfile,
  createNewProfile,
  currentProfile,
  DEFAULT_LOGIN_OPTIONS,
  listProfiles,
  useProfile,
  type AuthRunner,
  type AuthStatus,
} from "../src/profile.js";
import {
  account,
  credentials,
  makeSandbox,
  writeLiveLogin,
} from "./helpers.js";
import type { CredentialsFile, OauthAccount } from "../src/types.js";

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

interface FakeOptions {
  readonly fail?: boolean;
  readonly status?: AuthStatus;
}

const okStatus = (email: string): AuthStatus => ({
  loggedIn: true,
  email,
  subscriptionType: "max",
});

const fakeRunner = (
  paths: Paths,
  newCreds: CredentialsFile,
  newAccount: OauthAccount,
  status: AuthStatus,
  options: FakeOptions = {},
): AuthRunner => ({
  login() {
    if (options.fail) throw new Error("user aborted login");
    writeLiveLogin(paths, newCreds, newAccount);
  },
  status: () => options.status ?? status,
});

const withActiveOldAccount = (paths: Paths): void => {
  writeLiveLogin(paths, credentials("old-tok", "old-ref"), account("old@x.com"));
  addProfile(paths, "old");
  useProfile(paths, "old");
};

describe("createNewProfile", () => {
  it("logs in, saves the new account, and switches to it", () => {
    const paths = makeSandbox();
    withActiveOldAccount(paths);
    const runner = fakeRunner(
      paths,
      credentials("new-tok", "new-ref"),
      account("new@x.com"),
      okStatus("new@x.com"),
    );

    const identity = createNewProfile(paths, "fresh", runner, DEFAULT_LOGIN_OPTIONS);

    expect(identity.email).toBe("new@x.com");
    expect(liveToken(paths)).toBe("new-tok");
    expect(currentProfile(paths).name).toBe("fresh");
    expect(listProfiles(paths).map((p) => p.name).sort()).toEqual(["fresh", "old"]);
  });

  it("keeps the old account switchable after creating a new one", () => {
    const paths = makeSandbox();
    withActiveOldAccount(paths);
    const runner = fakeRunner(
      paths,
      credentials("new-tok", "new-ref"),
      account("new@x.com"),
      okStatus("new@x.com"),
    );

    createNewProfile(paths, "fresh", runner, DEFAULT_LOGIN_OPTIONS);
    useProfile(paths, "old");
    expect(liveToken(paths)).toBe("old-tok");
  });

  it("preserves a token the old account rotated while it was active", () => {
    const paths = makeSandbox();
    withActiveOldAccount(paths);
    rotateLiveToken(paths, "old-rotated");
    const runner = fakeRunner(
      paths,
      credentials("new-tok", "new-ref"),
      account("new@x.com"),
      okStatus("new@x.com"),
    );

    createNewProfile(paths, "fresh", runner, DEFAULT_LOGIN_OPTIONS);
    useProfile(paths, "old");
    expect(liveToken(paths)).toBe("old-rotated");
  });

  it("rolls back to the previous account when the login is aborted", () => {
    const paths = makeSandbox();
    withActiveOldAccount(paths);
    const runner = fakeRunner(
      paths,
      credentials("new-tok", "new-ref"),
      account("new@x.com"),
      okStatus("new@x.com"),
      { fail: true },
    );

    expect(() => createNewProfile(paths, "fresh", runner, DEFAULT_LOGIN_OPTIONS)).toThrow(
      /user aborted login/,
    );
    expect(liveToken(paths)).toBe("old-tok");
    expect(listProfiles(paths).map((p) => p.name)).toEqual(["old"]);
  });

  it("rolls back when login claims success but status reports logged out", () => {
    const paths = makeSandbox();
    withActiveOldAccount(paths);
    const runner = fakeRunner(
      paths,
      credentials("new-tok", "new-ref"),
      account("new@x.com"),
      okStatus("new@x.com"),
      { status: { loggedIn: false, email: undefined, subscriptionType: undefined } },
    );

    expect(() => createNewProfile(paths, "fresh", runner, DEFAULT_LOGIN_OPTIONS)).toThrow(
      ClaudeManError,
    );
    expect(liveToken(paths)).toBe("old-tok");
    expect(listProfiles(paths).map((p) => p.name)).toEqual(["old"]);
  });

  it("refuses a duplicate name without attempting a login", () => {
    const paths = makeSandbox();
    withActiveOldAccount(paths);
    const runner: AuthRunner = {
      login: () => {
        throw new Error("login should not run");
      },
      status: () => okStatus("x@x.com"),
    };

    expect(() => createNewProfile(paths, "old", runner, DEFAULT_LOGIN_OPTIONS)).toThrow(
      /already exists/,
    );
  });
});

describe("parseAuthStatus", () => {
  it("parses a logged-in JSON payload", () => {
    const status = parseAuthStatus(
      '{"loggedIn":true,"email":"a@x.com","subscriptionType":"pro"}',
    );
    expect(status).toEqual({
      loggedIn: true,
      email: "a@x.com",
      subscriptionType: "pro",
    });
  });

  it("ignores leading non-JSON noise from the CLI", () => {
    const status = parseAuthStatus('Some banner\n{"loggedIn":true,"email":"a@x.com"}');
    expect(status.loggedIn).toBe(true);
    expect(status.email).toBe("a@x.com");
  });

  it("treats logged-out, brace-less, and malformed output as logged out", () => {
    expect(parseAuthStatus('{"loggedIn":false}').loggedIn).toBe(false);
    expect(parseAuthStatus("not json at all").loggedIn).toBe(false);
    expect(parseAuthStatus("{broken").loggedIn).toBe(false);
  });
});
