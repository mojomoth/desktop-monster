// T38 — identity.json read/write (SPEC F47). identity.ts is electron-free (dir
// and randomUUID are injected), so these are real filesystem round-trips in a
// per-test temp directory, like tests/persistence.test.ts.

import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  IDENTITY_FILE_NAME,
  defaultName,
  identityFilePath,
  isValidName,
  readIdentity,
  writeIdentity,
} from '../src/main/identity.js';

let dir: string;
let uuidCount: number;

/** Deterministic stand-in for crypto.randomUUID: 3f9a0000-…, 3f9a0001-…, … */
const nextUUID = (): string => `3f9a${String(uuidCount++).padStart(4, '0')}-0000-4000-8000-000000000000`;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'desmon-identity-'));
  uuidCount = 0;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('readIdentity', () => {
  it('creates a Knight-xxxx identity with no credentials when identity.json is missing', () => {
    expect(IDENTITY_FILE_NAME).toBe('identity.json');
    expect(identityFilePath(dir)).toBe(join(dir, 'identity.json'));
    expect(readIdentity(dir, nextUUID)).toEqual({
      name: 'Knight-3f9a',
      playerId: null,
      token: null,
    });
  });

  it('never throws on corrupt identity.json', () => {
    for (const junk of ['{"name": ', '[]', 'null', '"Knight-1234"', '{"name":42,"playerId":7,"token":true}']) {
      writeFileSync(identityFilePath(dir), junk, 'utf8');
      expect(readIdentity(dir, nextUUID)).toEqual({
        name: 'Knight-3f9a',
        playerId: null,
        token: null,
      });
      uuidCount = 0;
    }
  });

  it('keeps a stored name but drops an invalid one', () => {
    writeIdentity(dir, { name: 'not a nickname!', playerId: 'p1', token: 't1' });
    expect(readIdentity(dir, nextUUID)).toEqual({ name: 'Knight-3f9a', playerId: 'p1', token: 't1' });
  });
});

describe('writeIdentity', () => {
  it('round-trips playerId and token through identity.json', () => {
    const identity = { name: 'Sir_Bongo-9', playerId: 'p-123', token: 'deadbeefdeadbeefdeadbeefdeadbeef' };
    expect(writeIdentity(dir, identity)).toBe(true);
    expect(readdirSync(dir)).toEqual([IDENTITY_FILE_NAME]);
    expect(readIdentity(dir, nextUUID)).toEqual(identity);
  });

  it('returns false instead of throwing on an unwritable destination', () => {
    const blocker = join(dir, 'blocker');
    writeFileSync(blocker, 'a plain file where a directory is needed', 'utf8');
    expect(writeIdentity(blocker, { name: 'Knight-0000', playerId: null, token: null })).toBe(false);
  });
});

describe('defaultName / isValidName', () => {
  it('names a fresh knight after the first 4 uuid characters', () => {
    expect(defaultName(nextUUID)).toBe('Knight-3f9a');
    expect(defaultName(nextUUID)).toBe('Knight-3f9a');
    expect(isValidName(defaultName(nextUUID))).toBe(true);
  });

  it('rejects names longer than 16 or with characters outside the nickname rule', () => {
    expect(isValidName('A'.repeat(16))).toBe(true);
    expect(isValidName('A'.repeat(17))).toBe(false);
    expect(isValidName('')).toBe(false);
    for (const bad of ['has space', 'emoji🐱', 'dot.name', 'slash/name', 42, null, undefined]) {
      expect(isValidName(bad)).toBe(false);
    }
  });
});
