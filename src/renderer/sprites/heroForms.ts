// The approved original-size SD style: fifty 14×14 appearances, all sharing
// the starter's eye/hand/foot anchors and two idle + three attack frames.
// Save identities and the public drawing helpers remain unchanged.
import { heroAttack, heroIdle } from './hero.js';
import { HERO_AGILE_LOOKS } from './heroAgileLooks.js';
import { HERO_ARCANE_LOOKS } from './heroArcaneLooks.js';
import { HERO_RARE_LOOKS } from './heroRareLooks.js';
import { HERO_KNIGHT_LOOKS } from './heroKnightLooks.js';
import { drawSprite, registerSprites } from './sprite.js';
import type { DrawSpriteOptions, Sprite, SpriteCanvas } from './sprite.js';
import type { HeroLook } from './heroLook.js';

export const HERO_FORM_IDS: readonly string[] = Array.from(
  { length: 70 }, (_, i) => 'h' + String(i + 1).padStart(2, '0'),
);
const jobs: Readonly<Record<number, readonly HeroLook[]>> = {
  ...HERO_KNIGHT_LOOKS, ...HERO_AGILE_LOOKS, ...HERO_ARCANE_LOOKS,
};
const forms = new Map<string, HeroLook>();
const registry: Record<string, Sprite> = {};
for (const [index, id] of HERO_FORM_IDS.entries()) {
  const look = index < 50 ? jobs[index % 10]![Math.floor(index / 10)]! : HERO_RARE_LOOKS[id]!;
  forms.set(id, look);
  registry[`hero.${id}.idle`] = look.idle;
  registry[`hero.${id}.attack`] = look.attack;
}
registerSprites(registry);

export function heroFormSprite(formId: string, attacking = false): Sprite {
  const form = forms.get(formId);
  return form === undefined ? (attacking ? heroAttack : heroIdle) : attacking ? form.attack : form.idle;
}

/** One source for field, reincarnation choices, collection and PvP portraits. */
export function drawHeroForm(
  ctx: SpriteCanvas, formId: string, x: number, y: number, options?: DrawSpriteOptions,
): void {
  drawSprite(ctx, heroFormSprite(formId), 0, x, y, options);
}
