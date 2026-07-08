// Save schema & tolerant parsing — SPEC F10/F11, Assumption 7. Pure
// TypeScript, zero imports of electron/DOM/node. The app must never fail to
// boot because of a bad save: parseSave() NEVER throws — junk, missing and
// wrong-typed fields fall back per-field to DEFAULT_SAVE values.

import { monsterMaxHp } from './formulas.js';

/**
 * Persisted save-file schema, version 1. The engine's toSave() emits exactly
 * this shape; createEngine(save) resumes from it (SPEC F11).
 */
export interface SaveFileV1 {
  version: 1;
  level: number;
  /** XP into the current level. */
  xp: number;
  killCount: number;
  coins: number;
  /** Trinket id → count (positive integers only). */
  items: Record<string, number>;
  /** 0-based global index of the monster that was on screen. */
  monsterIndex: number;
  monsterHp: number;
}

/** Fresh-game values; also the per-field fallback for junk input. */
export const DEFAULT_SAVE: Readonly<SaveFileV1> = Object.freeze({
  version: 1 as const,
  level: 1,
  xp: 0,
  killCount: 0,
  coins: 0,
  items: Object.freeze({}) as Record<string, number>,
  monsterIndex: 0,
  monsterHp: monsterMaxHp(0),
});

/**
 * Stable JSON: fixed top-level key order, items keys sorted. Serializing the
 * same logical save always yields byte-identical text.
 */
export function serializeSave(save: SaveFileV1): string {
  const items: Record<string, number> = {};
  for (const id of Object.keys(save.items).sort()) {
    items[id] = save.items[id] ?? 0;
  }
  return JSON.stringify({
    version: 1,
    level: save.level,
    xp: save.xp,
    killCount: save.killCount,
    coins: save.coins,
    items,
    monsterIndex: save.monsterIndex,
    monsterHp: save.monsterHp,
  });
}

/** Finite number → floored int clamped to `min`; anything else → fallback. */
function intField(value: unknown, fallback: number, min: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.floor(value));
}

/** Keep only entries whose count is a finite number that floors to ≥ 1. */
function itemsField(value: unknown): Record<string, number> {
  const items: Record<string, number> = {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return items;
  }
  for (const [id, count] of Object.entries(value)) {
    if (typeof count === 'number' && Number.isFinite(count) && Math.floor(count) >= 1) {
      items[id] = Math.floor(count);
    }
  }
  return items;
}

/**
 * Tolerant parse of untrusted save data (SPEC F10). Accepts anything —
 * pre-parsed JSON values (what main's load-state hands over) or raw JSON
 * text — and NEVER throws. Every invalid field independently falls back to
 * its DEFAULT_SAVE value; range clamping beyond that (e.g. monsterHp vs the
 * monster's maxHp) is the engine's job. Always returns fresh objects.
 */
export function parseSave(raw: unknown): SaveFileV1 {
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      value = null;
    }
  }
  const record: Record<string, unknown> =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    version: 1,
    level: intField(record['level'], DEFAULT_SAVE.level, 1),
    xp: intField(record['xp'], DEFAULT_SAVE.xp, 0),
    killCount: intField(record['killCount'], DEFAULT_SAVE.killCount, 0),
    coins: intField(record['coins'], DEFAULT_SAVE.coins, 0),
    items: itemsField(record['items']),
    monsterIndex: intField(record['monsterIndex'], DEFAULT_SAVE.monsterIndex, 0),
    monsterHp: intField(record['monsterHp'], DEFAULT_SAVE.monsterHp, 1),
  };
}
