import { describe, expect, it } from "vitest";
import { ClaudeManError } from "../src/errors.js";
import {
  assertValidProfileName,
  removeProfileMeta,
  renameProfileMeta,
  setActiveProfile,
  upsertProfileMeta,
} from "../src/store.js";
import { EMPTY_STATE, type ProfileMeta, type State } from "../src/types.js";

const meta = (email: string): ProfileMeta => ({
  email,
  subscriptionType: "max",
  addedAt: "2026-01-01T00:00:00.000Z",
  lastUsedAt: undefined,
});

describe("assertValidProfileName", () => {
  it.each(["work", "personal-2", "a.b_c"])("accepts %s", (name) => {
    expect(() => assertValidProfileName(name)).not.toThrow();
  });

  it.each(["", ".", "..", "has space", "slash/name", "../escape"])(
    "rejects %s",
    (name) => {
      expect(() => assertValidProfileName(name)).toThrow(ClaudeManError);
    },
  );
});

describe("state transitions", () => {
  it("upsert adds and overwrites profile meta", () => {
    const one = upsertProfileMeta(EMPTY_STATE, "work", meta("w@x.com"));
    expect(one.profiles.work?.email).toBe("w@x.com");
    const two = upsertProfileMeta(one, "work", meta("w2@x.com"));
    expect(two.profiles.work?.email).toBe("w2@x.com");
  });

  it("removing the active profile clears the active pointer", () => {
    const state: State = setActiveProfile(
      upsertProfileMeta(EMPTY_STATE, "work", meta("w@x.com")),
      "work",
    );
    const after = removeProfileMeta(state, "work");
    expect(after.activeProfile).toBeUndefined();
    expect(after.profiles.work).toBeUndefined();
  });

  it("renaming the active profile carries the active pointer and meta", () => {
    const state = setActiveProfile(
      upsertProfileMeta(EMPTY_STATE, "old", meta("o@x.com")),
      "old",
    );
    const after = renameProfileMeta(state, "old", "new");
    expect(after.activeProfile).toBe("new");
    expect(after.profiles.new?.email).toBe("o@x.com");
    expect(after.profiles.old).toBeUndefined();
  });
});
