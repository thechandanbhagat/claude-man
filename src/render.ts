import Table from "cli-table3";
import type { ProfileListEntry } from "./profile.js";
import type { AccountIdentity } from "./types.js";

const DASH = "—";

export const formatProfilesTable = (
  entries: readonly ProfileListEntry[],
): string => {
  if (entries.length === 0) {
    return "No profiles yet. Add one with `claude-man add <name>`.";
  }
  const table = new Table({
    head: ["", "Profile", "Email", "Plan", "Last used"],
    style: { head: [], border: [] },
  });
  for (const entry of entries) {
    table.push([
      entry.active ? "*" : "",
      entry.name,
      entry.meta?.email ?? DASH,
      entry.meta?.subscriptionType ?? DASH,
      entry.meta?.lastUsedAt?.slice(0, 10) ?? DASH,
    ]);
  }
  return table.toString();
};

export const formatIdentity = (identity: AccountIdentity): string => {
  const email = identity.email ?? "unknown";
  const plan = identity.subscriptionType ? ` (${identity.subscriptionType})` : "";
  return `${email}${plan}`;
};
