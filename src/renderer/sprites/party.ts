import { typeOf } from '../../core/index.js';
import type { Companion, MonsterType } from '../../core/index.js';
import { drawText } from './font.js';
import { monsterSprites } from './monsters.js';
import { COLORS, paletteForTier } from './palette.js';
import { drawSprite, UNIT_SCALE } from './sprite.js';
import type { SpriteCanvas } from './sprite.js';

export const PARTY_X = 8;
export const PARTY_STEP_X = 11;
/** 0 since 2026-09-05 (user change): every member's feet sit on the ground line — the 3-px depth lift read as floating at 2×. */
export const PARTY_STEP_Y = 0;

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
  // Uniform pixel scale (2026-09-04): size variety is in the native art, so
  // every member draws at UNIT_SCALE like the hero and the field monster.
  const slots: { x: number; y: number; scale: number }[] = [];
  for (let r = 0; r < party.length; r++) {
    slots.push({
      x: PARTY_X + r * PARTY_STEP_X,
      y: groundY - (party.length - 1 - r) * PARTY_STEP_Y,
      scale: UNIT_SCALE,
    });
  }
  return slots;
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

/**
 * Paint the elemental marker: a colored 5x5 badge and initial. `outline` adds
 * a 1-px void frame (7x7 footprint) so the badge reads on the ground strip.
 */
export function drawTypeBadge(
  ctx: SpriteCanvas,
  type: MonsterType,
  x: number,
  y: number,
  opts?: { outline?: boolean },
): void {
  if (opts?.outline === true) {
    ctx.fillStyle = COLORS.void;
    ctx.fillRect(x - 1, y - 1, 7, 7);
  }
  ctx.fillStyle = TYPE_COLORS[type];
  ctx.fillRect(x, y, 5, 5);
  drawText(ctx, TYPE_INITIALS[type], x + 1, y);
}

/** Rows below the ground line where a monster's type badge sits (user change 2026-09-06). */
export const TYPE_BADGE_DY = 3;

/** An outlined type badge centred under a monster whose box starts at `x` (width `w` canvas px). */
export function drawFootBadge(ctx: SpriteCanvas, type: MonsterType, x: number, w: number, groundY: number): void {
  drawTypeBadge(ctx, type, Math.round(x + w / 2) - 2, groundY + TYPE_BADGE_DY, { outline: true });
}

/** One outlined type badge under each party member's feet — same slots and mirroring as drawParty. */
export function drawPartyBadges(
  ctx: SpriteCanvas,
  party: readonly Companion[],
  groundY: number,
  opts?: { originX?: number },
): void {
  const slots = partySlots(party, groundY);
  for (let r = 0; r < party.length; r++) {
    const member = party[r];
    const slot = slots[r];
    if (member === undefined || slot === undefined) continue;
    const idle = (monsterSprites[member.speciesId as keyof typeof monsterSprites] ?? monsterSprites.slime).idle;
    const w = idle.w * slot.scale;
    const x = opts?.originX === undefined ? slot.x : opts.originX - (slot.x - PARTY_X) - w;
    drawFootBadge(ctx, typeOf(member.speciesId), x, w, slot.y);
  }
}
