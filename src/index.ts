#!/usr/bin/env node
import { buildProgram } from "./cli.js";
import { ClaudeManError } from "./errors.js";

const main = async (): Promise<void> => {
  await buildProgram().parseAsync(process.argv);
};

main().catch((error: unknown) => {
  if (error instanceof ClaudeManError) {
    process.stderr.write(`claude-man: ${error.message}\n`);
    process.exitCode = 1;
    return;
  }
  // Inquirer raises this when the user aborts the menu with Ctrl-C.
  if (error instanceof Error && error.name === "ExitPromptError") {
    process.exitCode = 130;
    return;
  }
  throw error;
});
