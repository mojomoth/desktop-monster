// Save-file persistence (SPEC F22, main half). Deliberately electron-free:
// the userData directory is injected (src/main/ipc.ts passes
// `app.getPath('userData')`), which lets vitest exercise real filesystem
// round-trips. NEVER throws — a missing/corrupt save must never prevent boot.
// Parsing/validating the CONTENT is core's job (SaveFileV1 lands in T08).

import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const SAVE_FILE_NAME = 'save.json';

/** Absolute path of save.json inside the given userData directory. */
export function saveFilePath(userDataDir: string): string {
  return join(userDataDir, SAVE_FILE_NAME);
}

/**
 * Read and JSON-parse save.json. Returns the raw parsed value, or null on ANY
 * error (missing file, unreadable, corrupt JSON, ...).
 */
export function readSaveFile(userDataDir: string): unknown {
  try {
    return JSON.parse(readFileSync(saveFilePath(userDataDir), 'utf8')) as unknown;
  } catch {
    return null;
  }
}

export type SaveFileReadResult = { kind: 'missing' } | { kind: 'loaded'; value: unknown }
  | { kind: 'error'; reason: 'read' | 'format' | 'unsupported-version' };

/** Disk failures must not silently become a new game that overwrites the original. */
export function readSaveFileResult(userDataDir: string): SaveFileReadResult {
  let text: string;
  try { text = readFileSync(saveFilePath(userDataDir), 'utf8'); }
  catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT'
      ? { kind: 'missing' } : { kind: 'error', reason: 'read' };
  }
  let value: unknown;
  try { value = JSON.parse(text) as unknown; }
  catch { return { kind: 'error', reason: 'format' }; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { kind: 'error', reason: 'format' };
  if (![1, 2, 3, 4].includes((value as { version: number }).version)) return { kind: 'error', reason: 'unsupported-version' };
  return { kind: 'loaded', value };
}

/**
 * Atomically persist `data` as JSON: write a tmp file in the same directory,
 * then rename it over save.json — rename on the same volume is atomic, so a
 * crash mid-write can never leave a truncated save.json behind. Creates the
 * directory if missing. Returns false (never throws) on any error.
 */
export function writeSaveFile(userDataDir: string, data: unknown): boolean {
  const target = saveFilePath(userDataDir);
  const tmp = `${target}.tmp`;
  try {
    mkdirSync(userDataDir, { recursive: true });
    writeFileSync(tmp, JSON.stringify(data), 'utf8');
    renameSync(tmp, target);
    return true;
  } catch {
    try {
      unlinkSync(tmp);
    } catch {
      // best effort: the tmp file may never have been created
    }
    return false;
  }
}
