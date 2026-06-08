import { describe, expect, it } from "vitest";
import {
  hasOauthTokens,
  identityFromAccount,
  mergeOauthAccount,
  requireLiveCredentials,
} from "../src/claudeFiles.js";
import { ClaudeManError } from "../src/errors.js";
import { writeFileSync } from "node:fs";
import { account, credentials, makeSandbox } from "./helpers.js";

describe("identityFromAccount", () => {
  it("extracts the labeling fields", () => {
    expect(identityFromAccount(account("a@x.com"))).toEqual({
      email: "a@x.com",
      displayName: "a",
      subscriptionType: "max",
      accountUuid: "uuid-a@x.com",
    });
  });

  it("returns all-undefined for a missing account", () => {
    expect(identityFromAccount(undefined)).toEqual({
      email: undefined,
      displayName: undefined,
      subscriptionType: undefined,
      accountUuid: undefined,
    });
  });
});

describe("hasOauthTokens", () => {
  it("is true only when an access token string is present", () => {
    expect(hasOauthTokens(credentials("t", "r"))).toBe(true);
    expect(hasOauthTokens({})).toBe(false);
    expect(hasOauthTokens({ claudeAiOauth: {} })).toBe(false);
  });
});

describe("mergeOauthAccount", () => {
  it("replaces oauthAccount while preserving every other key", () => {
    const config = { numStartups: 42, oauthAccount: account("old@x.com"), tipsHistory: { a: 1 } };
    const merged = mergeOauthAccount(config, account("new@x.com"));
    expect(merged.oauthAccount?.emailAddress).toBe("new@x.com");
    expect(merged.numStartups).toBe(42);
    expect(merged.tipsHistory).toEqual({ a: 1 });
  });
});

describe("requireLiveCredentials", () => {
  it("throws a friendly error when no credentials file exists", () => {
    const paths = makeSandbox();
    expect(() => requireLiveCredentials(paths)).toThrow(ClaudeManError);
  });

  it("throws when the file has no OAuth tokens (e.g. Keychain placeholder)", () => {
    const paths = makeSandbox();
    writeFileSync(paths.credentialsFile, JSON.stringify({}));
    expect(() => requireLiveCredentials(paths)).toThrow(/no OAuth tokens/);
  });

  it("returns the parsed credentials when valid", () => {
    const paths = makeSandbox();
    writeFileSync(paths.credentialsFile, JSON.stringify(credentials("tok", "ref")));
    expect(requireLiveCredentials(paths).claudeAiOauth?.accessToken).toBe("tok");
  });
});
