import { sizeOf } from '../../core/index.js';
import type { Companion, MonsterType } from '../../core/index.js';
import { drawText } from './font.js';
import { monsterSprites } from './monsters.js';
import { COLORS, paletteForTier } from './palette.js';
import { drawSprite } from './sprite.js';
import type { SpriteCanvas } from './sprite.js';

export const PARTY_X = 8;
export const PARTY_STEP_X = 14;
export const PARTY_STEP_Y = 3;

export const TYPE_COLORS: Record<MonsterType, string> = {
  fire: COLORS.red,
  wind: COLORS.cyan,
  earth: COLORS.brown,
  water: COLORS.blue,
  dark: COLORS.maroon,
};

const TYPE_INITIALS: Record<MonsterType, string> = {
  fire: 'F',
  wind: 'W',
  earth: 'E',
  water: 'A',
  dark: 'D',
};

/** Lay out a back-to-front party; y is each member's feet position. */
export function partySlots(
  party: readonly { speciesId: string }[],
  groundY: number,
): { x: number; y: number; scale: number }[] {
  return party.map(({ speciesId }, r) => ({
    x: PARTY_X + r * PARTY_STEP_X,
    y: groundY - (party.length - 1 - r) * PARTY_STEP_Y,
    scale: sizeOf(speciesId),
  }));
}

/** Paint a back-to-front party, mirrored around originX for an opponent group. */
export function drawParty(
  ctx: SpriteCanvas,
  party: readonly Companion[],
  frame: number,
  groundY: number,
  opts?: { flipX?: boolean; originX?: number },
): void {
  const slots = partySlots(party, groundY);
  for (let r = 0; r < party.length; r++) {
    const member = party[r];
    const slot = slots[r];
    if (member === undefined || slot === undefined) continue;
    const idle = (monsterSprites[member.speciesId as keyof typeof monsterSprites] ?? monsterSprites.slime).idle;
    const x = opts?.originX === undefined
      ? slot.x
      : opts.originX - (slot.x - PARTY_X) - idle.w * slot.scale;
    drawSprite(
      ctx,
      { ...idle, palette: paletteForTier(idle.palette, member.stars) },
      frame,
      x,
      slot.y - idle.h * slot.scale,
      { flipX: opts?.flipX ?? true, scale: slot.scale },
    );
  }
}

/** Paint the only visible elemental marker: a colored 5x5 badge and initial. */
export function drawTypeBadge(ctx: SpriteCanvas, type: MonsterType, x: number, y: number): void {
  ctx.fillStyle = TYPE_COLORS[type];
  ctx.fillRect(x, y, 5, 5);
  drawText(ctx, TYPE_INITIALS[type], x + 1, y);
}
