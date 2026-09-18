import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameSettings, SettingsResult } from '../shared/ipc.js';

/** Multipliers relative to the original 400×260 overlay. */
export const GAME_SCALES = [2, 1.5, 1, 2 / 3, 1 / 2] as const;
export const SCALE_LABELS = ['2×', '1.5×', '1× (기본)', '2/3×', '1/2×'] as const;

export function isGameScale(value: unknown): value is number {
  return typeof value === 'number' && (GAME_SCALES as readonly number[]).includes(value);
}

/** Preferences are separate from progress, so Reset Progress keeps the scale. */
export function readGameScale(userDataDir: string): number {
  return readSettings(userDataDir).gameScale;
}

/** Legacy saves retain the pre-v0.8 automatic input connection. */
export function readSettings(userDataDir: string, legacySave = false): GameSettings {
  const settings: GameSettings = { gameScale: 1, muted: false, screenShake: true,
    welcomeSeen: legacySave, globalInputRequested: legacySave };
  try {
    const raw: unknown = JSON.parse(readFileSync(join(userDataDir, 'settings.json'), 'utf8'));
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const object = raw as Record<string, unknown>;
      if (isGameScale(object['gameScale'])) settings.gameScale = object['gameScale'];
      for (const key of ['muted', 'screenShake', 'welcomeSeen', 'globalInputRequested'] as const) {
        if (typeof object[key] === 'boolean') settings[key] = object[key];
      }
    }
  } catch {
    // Missing or malformed preferences cannot prevent safe local play.
  }
  return settings;
}

export function writeGameScale(userDataDir: string, gameScale: number): boolean {
  return updateSettings(userDataDir, { gameScale }).ok;
}

/** Validate the whole patch before one atomic write; failure preserves prior preferences. */
export function updateSettings(userDataDir: string, patch: unknown, legacySave = false): SettingsResult {
  const previous = readSettings(userDataDir, legacySave);
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { ok: false, settings: previous };
  const entries = Object.entries(patch);
  if (!entries.length || entries.some(([key, value]) => key === 'gameScale' ? !isGameScale(value)
    : !['muted', 'screenShake', 'welcomeSeen', 'globalInputRequested'].includes(key) || typeof value !== 'boolean')) {
    return { ok: false, settings: previous };
  }
  const settings = { ...previous, ...patch } as GameSettings;
  try {
    mkdirSync(userDataDir, { recursive: true });
    const file = join(userDataDir, 'settings.json');
    writeFileSync(`${file}.tmp`, JSON.stringify(settings), 'utf8');
    renameSync(`${file}.tmp`, file);
    return { ok: true, settings };
  } catch {
    return { ok: false, settings: previous };
  }
}
