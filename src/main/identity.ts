// Player identity persistence (SPEC F47; SERVER_ARCHITECTURE §6). Same shape as
// persistence.ts: electron-free, the userData directory and randomUUID are
// injected, and nothing here ever throws — a corrupt identity.json must never
// prevent boot. The auth token lives ONLY in this file: never in save.json,
// never in an IPC payload.

import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NICK_RE } from '../shared/api.js';

export const IDENTITY_FILE_NAME = 'identity.json';

export interface Identity {
  name: string;
  playerId: string | null;
  token: string | null;
}

/** Absolute path of identity.json inside the given userData directory. */
export function identityFilePath(userDataDir: string): string {
  return join(userDataDir, IDENTITY_FILE_NAME);
}

/** A fresh unregistered nickname: 'Knight-' + the first 4 chars of a uuid. */
export function defaultName(randomUUID: () => string): string {
  return `Knight-${randomUUID().slice(0, 4)}`;
}

/** True when `name` satisfies the nickname rule (1–16 of A–Z a–z 0–9 _ -). */
export function isValidName(name: unknown): name is string {
  return typeof name === 'string' && NICK_RE.test(name);
}

/**
 * Read identity.json. Missing, unreadable, corrupt or wrongly shaped content
 * yields a fresh `{ name: 'Knight-xxxx', playerId: null, token: null }`.
 * Never throws.
 */
export function readIdentity(dir: string, randomUUID: () => string): Identity {
  let raw: unknown = null;
  try {
    raw = JSON.parse(readFileSync(identityFilePath(dir), 'utf8')) as unknown;
  } catch {
    raw = null;
  }
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    name: isValidName(o.name) ? o.name : defaultName(randomUUID),
    playerId: typeof o.playerId === 'string' ? o.playerId : null,
    token: typeof o.token === 'string' ? o.token : null,
  };
}

/** Atomically persist `identity` (tmp + rename). Returns false, never throws. */
export function writeIdentity(dir: string, identity: Identity): boolean {
  const target = identityFilePath(dir);
  const tmp = `${target}.tmp`;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(tmp, JSON.stringify(identity), 'utf8');
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
