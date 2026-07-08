// T03 — save-file persistence (SPEC F22, main half). persistence.ts is
// deliberately electron-free (the userData directory is injected), so these
// are real filesystem round-trip tests in a per-test temp directory.

import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  SAVE_FILE_NAME,
  readSaveFile,
  saveFilePath,
  writeSaveFile,
} from '../src/main/persistence.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'desmon-persist-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('save file location', () => {
  it('targets save.json inside the given userData dir', () => {
    expect(SAVE_FILE_NAME).toBe('save.json');
    expect(saveFilePath(dir)).toBe(join(dir, 'save.json'));
  });
});

describe('writeSaveFile', () => {
  it('round-trips data through save.json', () => {
    const data = { version: 1, level: 3, coins: 42, items: { bone: 2 } };
    expect(writeSaveFile(dir, data)).toBe(true);
    expect(readSaveFile(dir)).toEqual(data);
  });

  it('creates the userData dir when missing', () => {
    const nested = join(dir, 'not', 'yet', 'created');
    expect(writeSaveFile(nested, { a: 1 })).toBe(true);
    expect(readSaveFile(nested)).toEqual({ a: 1 });
  });

  it('leaves no tmp file behind (atomic tmp write + rename)', () => {
    expect(writeSaveFile(dir, { a: 1 })).toBe(true);
    expect(readdirSync(dir)).toEqual([SAVE_FILE_NAME]);
  });

  it('overwrites an existing save completely', () => {
    writeSaveFile(dir, { level: 1, old: true });
    writeSaveFile(dir, { level: 2 });
    expect(readSaveFile(dir)).toEqual({ level: 2 });
  });

  it('returns false instead of throwing on an unwritable destination', () => {
    const blocker = join(dir, 'blocker');
    writeFileSync(blocker, 'a plain file where a directory is needed', 'utf8');
    expect(writeSaveFile(blocker, { a: 1 })).toBe(false);
  });
});

describe('readSaveFile', () => {
  it('returns null when the file does not exist', () => {
    expect(readSaveFile(dir)).toBeNull();
  });

  it('returns null when the userData dir itself does not exist', () => {
    expect(readSaveFile(join(dir, 'nope'))).toBeNull();
  });

  it('returns null for corrupt JSON', () => {
    writeFileSync(saveFilePath(dir), '{"level": ', 'utf8');
    expect(readSaveFile(dir)).toBeNull();
  });

  it('returns raw parsed JSON without validating its shape (validation is T08)', () => {
    writeFileSync(saveFilePath(dir), '{"level":"x"}', 'utf8');
    expect(readSaveFile(dir)).toEqual({ level: 'x' });
  });
});
