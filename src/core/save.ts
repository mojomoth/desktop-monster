// Save schema & tolerant parsing — SPEC F10/F29, Assumptions 7/21. Pure
// TypeScript, zero imports of electron/DOM/node. The app must never fail to
// boot because of a bad save: parseSave() NEVER throws — junk, missing and
// wrong-typed fields fall back per-field to DEFAULT_SAVE values. Disk always
// holds v2; v1 files are migrated on the way in (upgradeSave).

import { bigField } from './bignum.js';
import { monsterMaxHp } from './formulas.js';
import { SPECIES_IDS } from './monsters.js';

/** Roster cap (GAME_DESIGN_V2 §2/§3); collection.ts owns the gameplay copy. */
const ROSTER_CAP = 30;

/** A captured boss (GAME_DESIGN_V2 §2). Ids are minted from nextCompanionId. */
export interface Companion {
  /** 'c1', 'c2' … — deterministic, never a uuid. */
  id: string;
  /** SpeciesId of the captured boss. */
  speciesId: string;
  /** Global monster index it was captured at → base power. */
  bossIndex: number;
  /** 1..COMPANION_MAX_LEVEL (10). */
  level: number;
  stars: number;
}

/** Legacy save shape (v1). Accepted as input, never written. */
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

/**
 * Persisted save-file schema, version 2. The engine's toSave() emits exactly
 * this shape; createEngine(save) resumes from it (SPEC F11/F29).
 */
export interface SaveFileV2 {
  version: 2;
  level: number;
  /** XP into the current level. */
  xp: number;
  killCount: number;
  coins: number;
  /** Trinket id → count (positive integers only). */
  items: Record<string, number>;
  /** 0-based global index of the monster that was on screen. */
  monsterIndex: number;
  /** Decimal digits, ≥ '1' — HP is unbounded (SPEC F30). */
  monsterHp: string;
  /** Captured bosses, at most ROSTER_CAP entries. */
  companions: Companion[];
  nextCompanionId: number;
  souls: number;
  rebirths: number;
  /** Deepest monsterIndex ever reached. */
  bestIndex: number;
}

/** The current schema. */
export type SaveFile = SaveFileV2;

/** Fresh-game values; also the per-field fallback for junk input. */
export const DEFAULT_SAVE: Readonly<SaveFileV2> = Object.freeze({
  version: 2 as const,
  level: 1,
  xp: 0,
  killCount: 0,
  coins: 0,
  items: Object.freeze({}) as Record<string, number>,
  monsterIndex: 0,
  monsterHp: String(monsterMaxHp(0)),
  companions: Object.freeze([] as Companion[]) as Companion[],
  nextCompanionId: 1,
  souls: 0,
  rebirths: 0,
  bestIndex: 0,
});

/** Migrate a well-formed save to v2. v1 had no roster, souls or best depth. */
export function upgradeSave(save: SaveFileV1 | SaveFileV2): SaveFileV2 {
  if (save.version === 2) return save;
  return {
    version: 2,
    level: save.level,
    xp: save.xp,
    killCount: save.killCount,
    coins: save.coins,
    items: { ...save.items },
    monsterIndex: save.monsterIndex,
    monsterHp: String(Math.max(1, Math.floor(save.monsterHp))),
    companions: [],
    nextCompanionId: 1,
    souls: 0,
    rebirths: 0,
    bestIndex: save.monsterIndex,
  };
}

/**
 * Stable JSON: fixed top-level key order, items keys sorted, companions in
 * array order with fixed key order. Serializing the same logical save always
 * yields byte-identical text. v1 input is upgraded first.
 */
export function serializeSave(save: SaveFileV1 | SaveFileV2): string {
  const v2 = upgradeSave(save);
  const items: Record<string, number> = {};
  for (const id of Object.keys(v2.items).sort()) {
    items[id] = v2.items[id] ?? 0;
  }
  return JSON.stringify({
    version: 2,
    level: v2.level,
    xp: v2.xp,
    killCount: v2.killCount,
    coins: v2.coins,
    items,
    monsterIndex: v2.monsterIndex,
    monsterHp: v2.monsterHp,
    companions: v2.companions.map((c) => ({
      id: c.id,
      speciesId: c.speciesId,
      bossIndex: c.bossIndex,
      level: c.level,
      stars: c.stars,
    })),
    nextCompanionId: v2.nextCompanionId,
    souls: v2.souls,
    rebirths: v2.rebirths,
    bestIndex: v2.bestIndex,
  });
}

/** Finite number → floored int clamped to `min`; anything else → fallback. */
function intField(value: unknown, fallback: number, min: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.floor(value));
}

/** Integer in [min, max] — the companion fields have no fallback, they drop. */
function isInt(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
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
 * Keep only fully valid companions (GAME_DESIGN_V2 §2): a bad entry is
 * dropped, it never defaults — a half-made companion would be worse than
 * none. Duplicate ids: first wins. At most ROSTER_CAP kept.
 */
function companionsField(value: unknown): Companion[] {
  const kept: Companion[] = [];
  if (!Array.isArray(value)) return kept;
  const seen = new Set<string>();
  for (const raw of value) {
    if (kept.length >= ROSTER_CAP) break;
    if (typeof raw !== 'object' || raw === null) continue;
    const c = raw as Record<string, unknown>;
    const id = c['id'];
    const speciesId = c['speciesId'];
    if (typeof id !== 'string' || id === '' || seen.has(id)) continue;
    if (typeof speciesId !== 'string' || !(SPECIES_IDS as readonly string[]).includes(speciesId)) {
      continue;
    }
    if (!isInt(c['bossIndex'], 0) || !isInt(c['level'], 1, 10) || !isInt(c['stars'], 0)) continue;
    seen.add(id);
    kept.push({ id, speciesId, bossIndex: c['bossIndex'], level: c['level'], stars: c['stars'] });
  }
  return kept;
}

/**
 * Tolerant parse of untrusted save data (SPEC F10/F29). Accepts anything —
 * pre-parsed JSON values (what main's load-state hands over) or raw JSON
 * text — and NEVER throws. Every invalid field independently falls back to
 * its DEFAULT_SAVE value; the input `version` is ignored (the shape decides)
 * and the output is always v2. Range clamping beyond that (e.g. monsterHp vs
 * the monster's maxHp) is the engine's job. Always returns fresh objects.
 */
export function parseSave(raw: unknown): SaveFileV2 {
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
  const companions = companionsField(record['companions']);
  // Re-minting must never collide with an id already on the roster.
  let nextCompanionId = intField(record['nextCompanionId'], DEFAULT_SAVE.nextCompanionId, 1);
  for (const c of companions) {
    nextCompanionId = Math.max(nextCompanionId, Number(c.id.replace(/\D/g, '') || 0) + 1);
  }
  return {
    version: 2,
    level: intField(record['level'], DEFAULT_SAVE.level, 1),
    xp: intField(record['xp'], DEFAULT_SAVE.xp, 0),
    killCount: intField(record['killCount'], DEFAULT_SAVE.killCount, 0),
    coins: intField(record['coins'], DEFAULT_SAVE.coins, 0),
    items: itemsField(record['items']),
    monsterIndex: intField(record['monsterIndex'], DEFAULT_SAVE.monsterIndex, 0),
    monsterHp: (bigField(record['monsterHp']) ?? DEFAULT_SAVE.monsterHp).replace(/^0$/, '1'),
    companions,
    nextCompanionId,
    souls: intField(record['souls'], DEFAULT_SAVE.souls, 0),
    rebirths: intField(record['rebirths'], DEFAULT_SAVE.rebirths, 0),
    bestIndex: intField(record['bestIndex'], DEFAULT_SAVE.bestIndex, 0),
  };
}
