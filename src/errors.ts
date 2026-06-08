export class ClaudeManError extends Error {
  override readonly name = "ClaudeManError";
  constructor(message: string) {
    super(message);
  }
}

export const fail = (message: string): never => {
  throw new ClaudeManError(message);
};
