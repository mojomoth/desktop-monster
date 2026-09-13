import type { Sprite } from './sprite.js';

export interface HeroLook { idle: Sprite; attack: Sprite }

/** Shared original 14px skeleton: one-pixel breathing bob, planted boots. */
export function makeHeroLook(
  colors: Record<string, string>, idle: string, attack: readonly string[], iris: 'a' | 'h' | 't' = 'a',
): HeroLook {
  // Iris has its own role but shares a costume color: seven unique colors.
  const palette = { ...colors, i: colors[iris]! };
  const standing = idle.split('/');
  return {
    idle: { w: 14, h: 14, palette, frames: [standing, ['..............', ...standing.slice(0, 10), ...standing.slice(11)]] },
    attack: { w: 14, h: 14, palette, frames: attack.map(frame => frame.split('/')) },
  };
}
