import { Command } from "commander";
import { claudeAuthRunner } from "./claudeAuth.js";
import { resolvePaths } from "./paths.js";
import {
  addProfile,
  createNewProfile,
  currentProfile,
  listProfiles,
  removeProfile,
  renameProfile,
  useProfile,
} from "./profile.js";
import { formatIdentity, formatProfilesTable } from "./render.js";
import { runInteractiveMenu } from "./menu.js";

const out = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

export const buildProgram = (): Command => {
  const program = new Command();
  program
    .name("claude-man")
    .description("Switch between multiple Claude Code accounts, nvm-style.")
    .version("0.1.0");

  program
    .command("add")
    .argument("<name>", "profile name")
    .description("Snapshot the account you are logged into now")
    .action((name: string) => {
      const identity = addProfile(resolvePaths(), name);
      out(`Added "${name}" → ${formatIdentity(identity)}`);
    });

  program
    .command("new")
    .argument("<name>", "profile name")
    .option("--email <email>", "pre-fill the email on the login page")
    .option("--console", "log into Anthropic Console (API billing) instead of Claude", false)
    .option("--sso", "force the SSO login flow", false)
    .description("Log into a new account, save it as <name>, and switch to it")
    .action(
      (name: string, options: { email?: string; console: boolean; sso: boolean }) => {
        const identity = createNewProfile(resolvePaths(), name, claudeAuthRunner, {
          email: options.email,
          console: options.console,
          sso: options.sso,
        });
        out(`Created "${name}" → ${formatIdentity(identity)} and switched to it.`);
      },
    );

  program
    .command("use")
    .alias("switch")
    .argument("<name>", "profile to activate")
    .description("Switch the active Claude account")
    .action((name: string) => {
      const identity = useProfile(resolvePaths(), name);
      out(`Switched to "${name}" → ${formatIdentity(identity)}`);
    });

  program
    .command("ls")
    .alias("list")
    .description("List saved profiles")
    .action(() => {
      out(formatProfilesTable(listProfiles(resolvePaths())));
    });

  program
    .command("current")
    .alias("whoami")
    .description("Show the active profile and live account")
    .action(() => {
      const { name, identity } = currentProfile(resolvePaths());
      out(
        name
          ? `${name} → ${formatIdentity(identity)}`
          : `No active profile. Live account: ${formatIdentity(identity)}`,
      );
    });

  program
    .command("rm")
    .alias("remove")
    .argument("<name>", "profile to delete")
    .option("-f, --force", "delete even if it is the active profile", false)
    .description("Delete a saved profile")
    .action((name: string, options: { force: boolean }) => {
      removeProfile(resolvePaths(), name, options.force);
      out(`Removed "${name}".`);
    });

  program
    .command("rename")
    .argument("<old>", "current name")
    .argument("<new>", "new name")
    .description("Rename a saved profile")
    .action((from: string, to: string) => {
      renameProfile(resolvePaths(), from, to);
      out(`Renamed "${from}" → "${to}".`);
    });

  program.action(async () => {
    await runInteractiveMenu();
  });

  return program;
};
