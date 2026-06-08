import { spawnSync } from "node:child_process";
import { fail } from "./errors.js";
import type {
  AuthLoginOptions,
  AuthRunner,
  AuthStatus,
} from "./profile.js";

const CLAUDE_BIN = "claude";
const LOGGED_OUT: AuthStatus = {
  loggedIn: false,
  email: undefined,
  subscriptionType: undefined,
};

const buildLoginArgs = (options: AuthLoginOptions): string[] => {
  const args = ["auth", "login", options.console ? "--console" : "--claudeai"];
  if (options.sso) args.push("--sso");
  if (options.email) args.push("--email", options.email);
  return args;
};

export const parseAuthStatus = (raw: string): AuthStatus => {
  const start = raw.indexOf("{");
  if (start === -1) return LOGGED_OUT;
  try {
    const parsed = JSON.parse(raw.slice(start)) as {
      loggedIn?: boolean;
      email?: string;
      subscriptionType?: string;
    };
    return {
      loggedIn: parsed.loggedIn === true,
      email: parsed.email,
      subscriptionType: parsed.subscriptionType,
    };
  } catch {
    return LOGGED_OUT;
  }
};

export const claudeAuthRunner: AuthRunner = {
  login(options) {
    const result = spawnSync(CLAUDE_BIN, buildLoginArgs(options), {
      stdio: "inherit",
      shell: true,
    });
    if (result.error) {
      fail(`Could not launch \`claude auth login\`: ${result.error.message}`);
    }
    if (result.status !== 0) {
      fail(`\`claude auth login\` exited with code ${result.status ?? "unknown"}.`);
    }
  },
  status() {
    const result = spawnSync(CLAUDE_BIN, ["auth", "status"], {
      encoding: "utf8",
      shell: true,
    });
    if (result.error || typeof result.stdout !== "string") return LOGGED_OUT;
    return parseAuthStatus(result.stdout);
  },
};
