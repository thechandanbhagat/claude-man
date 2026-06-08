import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const DIR_MODE = 0o700;
const FILE_MODE = 0o600;
const TEMP_SUFFIX_BYTES = 6;

export const pathExists = (path: string): boolean => existsSync(path);

export const ensureDir = (path: string): void => {
  mkdirSync(path, { recursive: true, mode: DIR_MODE });
};

const tryChmod = (path: string, mode: number): void => {
  // chmod is a no-op on some Windows configs; lock down where the OS honors it.
  try {
    chmodSync(path, mode);
  } catch {
    // Permission model not POSIX-like; the file lives under the user profile regardless.
  }
};

export const readJson = <T>(path: string): T => {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
};

export const readJsonIfExists = <T>(path: string): T | undefined =>
  existsSync(path) ? readJson<T>(path) : undefined;

export const writeJsonAtomic = (path: string, value: unknown): void => {
  ensureDir(dirname(path));
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const tempPath = join(
    dirname(path),
    `.${randomBytes(TEMP_SUFFIX_BYTES).toString("hex")}.tmp`,
  );
  writeFileSync(tempPath, serialized, { mode: FILE_MODE });
  tryChmod(tempPath, FILE_MODE);
  renameSync(tempPath, path);
  tryChmod(path, FILE_MODE);
};

export const copyJson = (source: string, destination: string): void => {
  writeJsonAtomic(destination, readJson(source));
};

export const removePath = (path: string): void => {
  rmSync(path, { recursive: true, force: true });
};

export const movePath = (source: string, destination: string): void => {
  ensureDir(dirname(destination));
  renameSync(source, destination);
};
