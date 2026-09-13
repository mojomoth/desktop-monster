import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Multipliers relative to the original 400×260 overlay. */
export const GAME_SCALES = [2, 1.5, 1, 2 / 3, 1 / 2] as const;
export const SCALE_LABELS = ['2×', '1.5×', '1× (Default)', '2/3×', '1/2×'] as const;

export function isGameScale(value: unknown): value is number {
  return typeof value === 'number' && (GAME_SCALES as readonly number[]).includes(value);
}

/** Preferences are separate from progress, so Reset Progress keeps the scale. */
export function readGameScale(userDataDir: string): number {
  try {
    const raw: unknown = JSON.parse(readFileSync(join(userDataDir, 'settings.json'), 'utf8'));
    const scale = raw && typeof raw === 'object' ? (raw as Record<string, unknown>)['gameScale'] : null;
    return isGameScale(scale) ? scale : 1;
  } catch {
    return 1;
  }
}

export function writeGameScale(userDataDir: string, gameScale: number): boolean {
  if (!isGameScale(gameScale)) return false;
  try {
    mkdirSync(userDataDir, { recursive: true });
    const file = join(userDataDir, 'settings.json');
    writeFileSync(`${file}.tmp`, JSON.stringify({ gameScale }), 'utf8');
    renameSync(`${file}.tmp`, file);
    return true;
  } catch {
    return false;
  }
}
