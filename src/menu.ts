import { input, select } from "@inquirer/prompts";
import { claudeAuthRunner } from "./claudeAuth.js";
import { resolvePaths } from "./paths.js";
import {
  addProfile,
  createNewProfile,
  currentProfile,
  DEFAULT_LOGIN_OPTIONS,
  listProfiles,
  useProfile,
} from "./profile.js";
import { formatIdentity } from "./render.js";

const ADD_ACTION = " add";
const NEW_ACTION = " new";

const write = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

const promptProfileName = (message: string): Promise<string> =>
  input({
    message,
    validate: (value) => (value.trim().length > 0 ? true : "Name required"),
  });

export const runInteractiveMenu = async (): Promise<void> => {
  const paths = resolvePaths();
  const entries = listProfiles(paths);
  const current = currentProfile(paths);

  const choices = [
    ...entries.map((entry) => ({
      name: `${entry.active ? "* " : "  "}${entry.name}${
        entry.meta?.email ? `  (${entry.meta.email})` : ""
      }`,
      value: entry.name,
    })),
    { name: "+ log into a NEW account and switch to it", value: NEW_ACTION },
    { name: "+ save the account I'm logged into now", value: ADD_ACTION },
  ];

  const picked = await select({
    message: "Switch Claude account:",
    choices,
    default: current.name,
  });

  if (picked === NEW_ACTION) {
    const name = (await promptProfileName("Name for the new profile:")).trim();
    const identity = createNewProfile(
      paths,
      name,
      claudeAuthRunner,
      DEFAULT_LOGIN_OPTIONS,
    );
    write(`Created "${name}" → ${formatIdentity(identity)} and switched to it.`);
    return;
  }

  if (picked === ADD_ACTION) {
    const name = (await promptProfileName("Name for this profile:")).trim();
    const identity = addProfile(paths, name);
    write(`Added "${name}" → ${formatIdentity(identity)}`);
    return;
  }

  const identity = useProfile(paths, picked);
  write(`Switched to "${picked}" → ${formatIdentity(identity)}`);
};
