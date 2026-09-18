// Scene orchestration (SPEC F21 + F20 presentation, T14/T15): full repaint
// every frame — field strip, hero left, tier-tinted monster right, HUD,
// floating damage numbers. The core FSMs from src/core/fsm.ts drive the
// hero's 3-frame attack (restarting on spam), the monster's white hit flash,
// the death pixel-scatter (dying) and the bottom-up spawn pop-in. Item drops
// arc + bounce then fly to the coin counter; level-ups flash the "LEVEL UP!"
// banner with hero sparkles (Manual M3).
// v2 (SPEC F36): update() also drives the engine clock, so companion volleys
// and fever come back as events through the SAME router as attack()'s —
// A-Z damage floats, per-species hit effects, crowned bosses, the party group
// and the fever aura/banner/blip all hang off that router.
// v3 (SPEC F64): the field is 200x130 and every sprite draws at the uniform SPRITE_SCALE
// (2; size variety is in the native art), the field monster carries a type badge, and the
// party is re-read from state every frame so the type match-up re-picks it.
// v3 (SPEC F66): playReplay() takes over the field for the PvP battle scene —
// the opponent's party mirrored on the right, one blow per BLOW_MS off a
// separate presentation clock. Hunting and all field animation stay paused
// until the replay queue hands back the exact interrupted scene.
// DOM-free on purpose — draws through GameCanvas (SpriteCanvas + clearRect)
// so tests run under vitest's node environment.

import {
  activeCompanions,
  createEngine,
  effectiveness,
  FEVER_MS,
  format,
  partyOrder,
  isSpeciesId,
  SPECIES_IDS,
  typeOf,
} from '../core/index.js';
import type {
  CollectionAction,
  Companion,
  Engine,
  GameEvent,
  GameState,
  InputSource,
  MonsterDef,
  Rng,
  SaveFile,
  SpeciesId,
  WireBlow,
} from '../core/index.js';
import type { BattleReplay, HeroCombatSnapshot, PvpPresentation, WireFighter } from '../shared/api.js';
import { equipmentTemplate } from '../core/equipment.js';
import {
  createHeroAnim,
  createMonsterAnim,
  HERO_ATTACK_MS,
  heroInput,
  MONSTER_SPAWNING_MS,
  monsterHit,
  monsterKilled,
  tickHero,
  tickMonster,
} from '../core/fsm.js';
import type { HeroAnim, MonsterAnim } from '../core/fsm.js';
import {
  COLORS,
  drawBoss,
  drawFeverAura,
  drawEquippedHero,
  equippedHeroSprite,
  EQUIPPED_HERO_PADDING,
  drawFootBadge,
  drawParty,
  drawPartyBadges,
  drawSprite,
  drawText,
  HERO_RIVAL_PALETTE,
  heroAttack,
  heroIdle,
  heroSlash,
  itemSprites,
  monsterSprites,
  paletteForTier,
  PARTY_X,
  partySlots,
  textWidth,
  TRANSPARENT,
} from './sprites/index.js';
import type { SpeciesSprites, Sprite, SpriteCanvas } from './sprites/index.js';
import { heroFormSprite } from './sprites/heroForms.js';
import { createGameAudio } from './audio.js';
import type { GameAudio } from './audio.js';
import {
  COMPANION_ATTACK, EFFECTS, companionImpactOf, createImpactQueue, heroImpactOf,
  spawnEffect, spawnImpact, tickImpacts,
} from './effects.js';
import {
  createDropPool,
  createParticlePool,
  drawParticles,
  dropPosition,
  easeOutQuad,
  spawnDrop,
  spawnSparkles,
  spawnSpriteScatter,
  tickDrops,
  tickParticles,
} from './anim.js';
import {
  COUNTER_POP_MS,
  COIN_COUNTER_X,
  COIN_COUNTER_Y,
  BAG_FULL_Y,
  createBanner,
  createFloatPool,
  DEFEAT_TEXT,
  drawBanner,
  drawCounters,
  drawFloats,
  drawHpBar,
  drawLevelHud,
  LEVEL_UP_TEXT,
  floatColor,
  showBanner,
  spawnFieldFloat,
  spawnFloat,
  tickBanner,
  tickFloats,
  VICTORY_TEXT,
} from './hud.js';

/** Internal canvas size in game pixels (CSS-scaled 2x, see static/). */
export const VIEW_W = 200;
export const VIEW_H = 130;
/** Top of the ground strip; entities stand on it (120 since 2026-09-06: a thin 10-px strip — 2 grass + 8 earth rows — under the feet). */
export const GROUND_Y = 120;
/**
 * Uniform pixel scale (Assumption 17; user changes 2026-09-04). EVERY world
 * sprite — hero, party, monster, boss — draws at this one integer scale, so a
 * pixel is the same size across the whole scene. 2× = chunky retro pixels
 * (one art pixel = 2 canvas px = 4 screen px). Size differences come from
 * each sprite's NATIVE art dimensions (hero 14×14; monsters 13×10 → 20×17 by
 * species; 2026-09-04..06 redesigns), not from a per-entity scale multiplier. Mirrors sprite.ts
 * UNIT_SCALE (kept literal here for the F64 AC grep).
 */
export const SPRITE_SCALE = 2;
/**
 * Hero sprite position (left side, feet on the ground). 66 since 2026-09-06
 * (user change): the hero stands in front of its party on the left third, and
 * the PvP scene mirrors it exactly across the field centre (OPPONENT_HERO_X).
 */
export const HERO_X = 66;
export const HERO_Y = GROUND_Y - heroIdle.h * SPRITE_SCALE;
/** Monster sprite left edge (right side; species art faces left already). */
export const MONSTER_X = 150;
/** Health bar follows the species' head, with room for a boss crown. */
export const HP_BAR = { w: 40, h: 5, gap: 3 } as const;
export function monsterHpBarY(monster: MonsterDef): number {
  const art = speciesSpritesFor(monster.speciesId).idle;
  const crown = monster.boss ? itemSprites.crown.h * SPRITE_SCALE : 0;
  return GROUND_Y - art.h * SPRITE_SCALE - crown - HP_BAR.gap - HP_BAR.h;
}
/** ms per idle bob frame (GAME_ARCHITECTURE §4: 2-frame bob, 500 ms/frame). */
export const IDLE_FRAME_MS = 500;
/** ms per hero attack frame: 3 frames (wind-up/slash/recover) over 180 ms. */
export const ATTACK_FRAME_MS = HERO_ATTACK_MS / 3;
/** The attack frame during which the slash-arc overlay shows. */
export const SLASH_FRAME = 1;
/** Where item drops land after their arc + bounce (the gap between the hero's box and the monster; later drops stagger to the right). */
export const DROP_LAND_X = 125;
/** Horizontal stagger between simultaneous drops so they never stack. */
export const DROP_STAGGER_PX = 8;
/** Drop flight destination: the fixed top-left coin icon. */
export const DROP_TARGET_X = COIN_COUNTER_X;
export const DROP_TARGET_Y = COIN_COUNTER_Y;
/** Sparkle burst size when a collected drop pops the counter. */
const COLLECT_SPARKLE_COUNT = 6;
/**
 * Top of the slash-arc overlay relative to the hero's top: the arc is centred
 * on the blade of the slash frame (2026-09-06 hero: blade at art rows
 * 6-6, centre 6; the arc is 7 rows tall → its top sits 3 rows
 * down), at the uniform scale.
 */
export const SLASH_OVERLAY_DY = 3 * SPRITE_SCALE;
/** Where the slash arc lands — the origin of the hero slash effect (F36). */
export const SWORD_TIP_X = HERO_X + heroAttack.w * SPRITE_SCALE;
export const SWORD_TIP_Y = HERO_Y + SLASH_OVERLAY_DY + (heroSlash.h * SPRITE_SCALE) / 2;

/** Spears, guns, spells and fists have their own strike poses. */
const usesHeroSlash = (formId: string): boolean =>
  heroFormSprite(formId) === heroIdle || [0, 4, 5, 8].includes((Number(formId.slice(1)) - 1) % 10);
const usesEquippedSlash = (state: Readonly<GameState>): boolean => {
  if (!state.equipment) return usesHeroSlash(state.hero?.equipped.formId ?? 'h00');
  const id = state.equipment.loadout.weapon?.templateId;
  const type = id ? equipmentTemplate(id)?.weaponType : undefined;
  return type === 'sword' || type === 'greatsword' || type === 'dagger' || type === 'hammer';
};

/** All hero forms share the starter's 14px skeleton and forward strike anchor. */
const heroSlashPosition = (sprite: Sprite): { x: number; y: number } => ({
  x: HERO_X + (heroIdle.w + sprite.w) * SPRITE_SCALE / 2,
  y: GROUND_Y - sprite.h * SPRITE_SCALE + SLASH_OVERLAY_DY,
});
/** One fever aura sparkle burst per this many ms while fever burns (F36). */
export const FEVER_SPARKLE_MS = 100;
/** Camera shake after a critical hit (user change 2026-09-06, toned down the same day): a very light 1-px, 120 ms tremor. */
export const SHAKE_MS = 120;
export const SHAKE_PX = 1;
/**
 * Deterministic camera offset `ageMs` into a shake: the amplitude decays
 * linearly to 0 over SHAKE_MS while the sign flips every 30 ms (x) / 60 ms (y).
 */
export function shakeOffset(ageMs: number): { dx: number; dy: number } {
  const amp = Math.ceil(SHAKE_PX * Math.max(0, 1 - ageMs / SHAKE_MS));
  const phase = Math.floor(ageMs / 30);
  return { dx: (phase % 2 === 0 ? 1 : -1) * amp, dy: (phase % 4 < 2 ? 1 : -1) * Math.ceil(amp / 2) };
}

/** Presentation switches (the renderer turns the shake on; tests keep it off for exact rects). */
export interface GameOptions {
  screenShake?: boolean;
  onReplayStatus?: (presentation: PvpPresentation | null) => void;
  onReplayComplete?: (battleId: string) => void;
}

/** Every draw call shifted by (dx, dy): the whole world moves as one during a shake. */
function shifted(ctx: GameCanvas, dx: number, dy: number): GameCanvas {
  return {
    get fillStyle() {
      return ctx.fillStyle;
    },
    set fillStyle(v) {
      ctx.fillStyle = v;
    },
    fillRect: (x, y, w, h) => {
      ctx.fillRect(x + dx, y + dy, w, h);
    },
    clearRect: (x, y, w, h) => {
      ctx.clearRect(x, y, w, h);
    },
  };
}

// --- PvP battle scene (SPEC F66, GAME_DESIGN_V3 §6) ---------------------
/** Hard presentation limit, including the final result hold. */
export const REPLAY_MS = 12_000;
/** Preferred beat range; long battles accelerate to honor REPLAY_MS. */
export const BLOW_MS_MIN = 250;
export const BLOW_MS_MAX = 600;
/** Beat between the last blow and the VICTORY!/DEFEAT banner. */
export const REPLAY_END_MS = 600;
/** Main delivers at most five pending defenses and one attack. */
export const REPLAY_QUEUE_SIZE = 6;
/** Covers retained server receipts and delayed completion acknowledgements. */
const REPLAY_HISTORY_SIZE = 128;
/** Right edge the mirrored opponent group and its name hang from. */
export const OPPONENT_ORIGIN_X = VIEW_W - 8;
/** Baseline of the opponent's name, clear of its tallest member. */
export const OPPONENT_NAME_Y = 58;
/**
 * Left edge of the opponent's hero in the battle scene (user change
 * 2026-09-06): the exact mirror of my hero across the field centre, so the two
 * heroes square off symmetrically with their parties behind them.
 */
export const OPPONENT_HERO_X = VIEW_W - HERO_X - heroIdle.w * SPRITE_SCALE;
/** How far a blow's damage float sits above the target's centre. */
export const BLOW_FLOAT_LIFT = 6;

/** Per-blow pacing of a replay of `blows` blows, ms (§6). */
export function blowMs(blows: number): number {
  const count = Number.isFinite(blows) ? Math.max(0, Math.floor(blows)) : 0;
  return Math.min(BLOW_MS_MAX, Math.max(BLOW_MS_MIN, REPLAY_MS / Math.max(1, count)),
    (REPLAY_MS - REPLAY_END_MS) / Math.max(1, count - 1));
}

/** Wire damage is a decimal string — a corrupt one must never throw mid-frame. */
function wireDamage(damage: string): bigint {
  return /^\d+$/.test(damage) ? BigInt(damage) : 0n;
}

/** A single shot in the actor species' hit colour (no new preset, §6). */
/**
 * A companion's attack, styled per species (F35/F63). Melee 'slash' bursts ON
 * the target; the ranged styles fire FROM the actor toward `dirX`. Shared by
 * the field volley and the PvP replay so both read the same way (§4/§6).
 */
function spawnCompanionAttack(
  pool: Parameters<typeof spawnEffect>[0],
  speciesId: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  dirX: 1 | -1,
): void {
  const { style, preset } = COMPANION_ATTACK[speciesKey(speciesId)];
  const origin = style === 'slash' ? to : from;
  spawnEffect(pool, preset, origin.x, origin.y, dirX);
}

/**
 * The minimal canvas surface the scene needs — a real 2D context satisfies
 * it structurally, and tests use a recording fake.
 */
export type GameCanvas = SpriteCanvas & Pick<CanvasRenderingContext2D, 'clearRect'>;

// Species idle art tinted per tier (60° hue per tier), cached per pair so
// the render loop never re-tints palettes frame after frame.
const tintedIdleCache = new Map<string, Sprite>();

/**
 * Art/effect key for a runtime species id (MonsterDef.speciesId and
 * Companion.speciesId are plain strings); unknown ids fall back to slime.
 */
function speciesKey(speciesId: string): SpeciesId {
  return isSpeciesId(speciesId) ? speciesId : SPECIES_IDS[0];
}

/** Species art for a runtime species id (unknown ids fall back to slime). */
function speciesSpritesFor(speciesId: string): SpeciesSprites {
  return monsterSprites[speciesKey(speciesId)];
}

/**
 * The party on the field, back → front: the five companions with the best
 * type-adjusted power against THIS monster. Never cached — the auto-change
 * has to be visible the frame after a new monster spawns (§6).
 */
function fieldParty(state: GameState): Companion[] {
  return partyOrder(activeCompanions(state.companions, state.monster.type, state.hero?.equipped));
}

/** Where a member of `party` stands, or null when it is not on the field. */
function partySlotOf(
  party: readonly Companion[],
  id: string,
): { x: number; y: number; scale: number } | null {
  return partySlots(party, GROUND_Y)[party.findIndex((c) => c.id === id)] ?? null;
}

/**
 * Where a member of the mirrored opponent group stands: drawParty's own
 * originX rule (x measured leftwards from the origin), so the slots the blows
 * shoot at stay glued to the art.
 */
function opponentSlotOf(
  party: readonly Companion[],
  id: string,
): { x: number; y: number; scale: number } | null {
  const index = party.findIndex((c) => c.id === id);
  const slot = partySlots(party, GROUND_Y)[index];
  const member = party[index];
  if (slot === undefined || member === undefined) {
    return null;
  }
  const art = speciesSpritesFor(member.speciesId).idle;
  return { ...slot, x: OPPONENT_ORIGIN_X - (slot.x - PARTY_X) - art.w * slot.scale };
}

/** The battle scene in flight; null whenever the field owns the canvas. */
interface BattleScene {
  name: string;
  ownHero?: PvpPresentation['ownHero'];
  opponentHero?: BattleReplay['opponentHero'];
  ownCombat?: HeroCombatSnapshot;
  opponentCombat?: HeroCombatSnapshot;
  heroic: boolean;
  ownFighters: (WireFighter & { remaining: bigint })[];
  opponentFighters: (WireFighter & { remaining: bigint })[];
  heroStartedAt: number;
  rivalStartedAt: number;
  heroHitUntil: number;
  rivalHitUntil: number;
  pendingHits: { blow: WireBlow; at: number }[];
  presentation: PvpPresentation | null;
  heroAnim: HeroAnim;
  rivalAnim: HeroAnim;
  floats: ReturnType<typeof createFloatPool>;
  particles: ReturnType<typeof createParticlePool>;
  impacts: ReturnType<typeof createImpactQueue>;
  banner: ReturnType<typeof createBanner>;
  hitCount: number;
  resultShown: boolean;
  /** My side ('A') and theirs ('D'), back → front; a KO leaves its group. */
  mine: Companion[];
  theirs: Companion[];
  blows: readonly WireBlow[];
  blowMs: number;
  /** Index of the next blow to play. */
  next: number;
  ageMs: number;
  endsAt: number;
  /** The pvpResolved presentation this scene owes the field (F53). */
  after: (() => void) | null;
}

/** Centre of a drawn party member — where its shots and sparkles start. */
function slotCentre(
  slot: { x: number; y: number; scale: number },
  speciesId: string,
): { x: number; y: number } {
  const art = speciesSpritesFor(speciesId).idle;
  return { x: slot.x + (art.w * slot.scale) / 2, y: slot.y - (art.h * slot.scale) / 2 };
}

/** Uniform draw scale (SPRITE_SCALE): size variety is in the native art now,
 * so a boss reads as a boss from its crown + aura, not a bigger pixel grid. */
function monsterScale(): number {
  return SPRITE_SCALE;
}

/** Centre of the monster's drawn art — where its hit effects burst. */
function monsterCentre(monster: MonsterDef): { x: number; y: number } {
  const scale = monsterScale();
  const art = speciesSpritesFor(monster.speciesId).idle;
  return { x: MONSTER_X + (art.w * scale) / 2, y: GROUND_Y - (art.h * scale) / 2 };
}

/** Damage clears the head, boss crown and HP bar without drifting off target. */
export function monsterFloatAnchor(monster: MonsterDef): { x: number; y: number } {
  return { x: monsterCentre(monster).x, y: monsterHpBarY(monster) - 8 };
}

/** Idle silhouette keeps the label stack stable during all attack poses. */
export function heroHudTop(formId: string): number {
  const idle = heroFormSprite(formId);
  return GROUND_Y - idle.h * SPRITE_SCALE + Math.max(0,
    idle.frames[0]?.findIndex(row => /[^.]/.test(row)) ?? 0) * SPRITE_SCALE;
}

function tintedIdleSprite(monster: MonsterDef): Sprite {
  const key = `${monster.speciesId}:${String(monster.tier)}`;
  const cached = tintedIdleCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const base = speciesSpritesFor(monster.speciesId);
  const tinted: Sprite = {
    ...base.idle,
    palette: paletteForTier(base.idle.palette, monster.tier),
  };
  tintedIdleCache.set(key, tinted);
  return tinted;
}

/** The field strip: grass line over packed earth, full width. */
function drawField(ctx: SpriteCanvas): void {
  ctx.fillStyle = COLORS.forest;
  ctx.fillRect(0, GROUND_Y, VIEW_W, 2);
  ctx.fillStyle = COLORS.maroon;
  ctx.fillRect(0, GROUND_Y + 2, VIEW_W, VIEW_H - GROUND_Y - 2);
}

/** Item art for a runtime item id (unknown ids fall back to the coin). */
function itemSpriteFor(itemId: string): Sprite {
  // ItemDef.id is a plain string — widen the record to index it.
  const byId: Partial<Record<string, Sprite>> = itemSprites;
  return byId[itemId] ?? itemSprites.coin;
}

/**
 * Draw only the bottom `visibleRows` rows of a sprite frame — the spawn
 * pop-in reveals the new monster bottom-up out of the ground (Manual M3).
 * Same skip rules as drawSprite: unknown chars/rows never throw.
 */
function drawSpriteBottomRows(
  ctx: SpriteCanvas,
  sprite: Sprite,
  frame: number,
  x: number,
  y: number,
  visibleRows: number,
  scale = 1,
): void {
  const rows = sprite.frames[frame];
  if (rows === undefined) {
    return;
  }
  const firstRow = Math.max(0, sprite.h - visibleRows);
  for (let ry = firstRow; ry < sprite.h; ry++) {
    const row = rows[ry];
    if (row === undefined) {
      continue;
    }
    for (let rx = 0; rx < sprite.w; rx++) {
      const ch = row.charAt(rx);
      if (ch === TRANSPARENT || ch === '') {
        continue;
      }
      const color = sprite.palette[ch];
      if (color === undefined) {
        continue;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
    }
  }
}

export interface Game {
  /**
   * One input → one engine step, plus presentation (floating damage number).
   * Returns the engine events so callers can react (the T16 save scheduler
   * feeds on them).
   */
  attack(source: InputSource): GameEvent[];
  /**
   * Advance presentation and the engine clock by dtMs (invalid dt is 0).
   * During replay only its scene advances; hunting emits no events or time.
   * Otherwise return tick events so the save scheduler sees field progress.
   */
  update(dtMs: number): GameEvent[];
  /**
   * Apply one Collection & Battle action from the menu window (SPEC F53).
   * Its engine events run through the SAME presentation router as attack()'s
   * — VICTORY/DEFEAT banner, steal pop-in, loss scatter, rebirth — and come
   * back so the caller can persist them; a rejected action returns [].
   */
  apply(a: CollectionAction): GameEvent[];
  lastActionError(): string | null;
  beginEquipmentBatch(): void;
  endEquipmentBatch(): GameEvent[];
  refreshShop(now: number): GameEvent[];
  /**
   * Take the field for a PvP battle scene (SPEC F66): the opponent's party
   * stands mirrored on the right under its name, one blow per BLOW_MS off
   * `update(dt)`, preserving the live engine and field presentation until
   * the queue drains. Legacy callers retain their end-of-replay banner.
   */
  playReplay(replay: BattleReplay, won?: boolean): void;
  /** Queue an already committed result; playback never applies its gold delta. */
  enqueueReplay(presentation: PvpPresentation): void;
  isReplaying(): boolean;
  /** Repaint the full VIEW_W×VIEW_H scene. */
  draw(ctx: GameCanvas): void;
  getState(): Readonly<GameState>;
  /** Snapshot of the current progress for persistence (SPEC F22). */
  toSave(): SaveFile;
  /**
   * Reset Progress (SPEC F22): swap in a fresh default engine and clear all
   * in-flight presentation (floats, particles, drops, banner, anims). The
   * caller persists the fresh state immediately (renderer boot does).
   */
  reset(rng?: Rng): void;
  /** Presentation snapshot of the hero animation FSM (tests / T15). */
  getHeroAnim(): HeroAnim;
  /** Presentation snapshot of the monster animation FSM (tests / T15). */
  getMonsterAnim(): MonsterAnim;
}

/**
 * Wrap an engine with the scene/HUD presentation state.
 * `audio` defaults to the real WebAudio blips (SPEC F24) — lazy and fully
 * guarded, so the default is a silent no-op under node/tests and can never
 * break the loop; tests inject a recording fake to pin the triggers.
 */
export function createGame(
  initialEngine: Engine,
  audio: GameAudio = createGameAudio(),
  options: GameOptions = {},
): Game {
  let engine = initialEngine;
  let timeMs = 0;
  let heroAnim = createHeroAnim();
  // Boot straight into idle: the monster on screen at load (fresh or resumed)
  // is already alive — the spawn pop-in is for monsters born from a kill.
  let monsterAnim = tickMonster(createMonsterAnim(), MONSTER_SPAWNING_MS);
  const floats = createFloatPool();
  const particles = createParticlePool();
  const impacts = createImpactQueue();
  const drops = createDropPool();
  const banner = createBanner();
  // ms since the last drop arrived at the counter; Infinity = never popped.
  let coinPopAgeMs = Number.POSITIVE_INFINITY;
  // The monster the current event batch is landing on — hero attacks and
  // companion volleys share it, and a kill hands it to the next monster.
  let target = engine.getState().monster;
  // Hit counter: the effect seed, so consecutive hits fan out differently.
  let hitCount = 0;
  // ms since the last fever aura sparkle burst.
  let feverSparkleAgeMs = 0;
  // ms since the last critical hit started the camera shake; Infinity = still.
  let shakeAgeMs = Number.POSITIVE_INFINITY;
  // The roster as it stood before the running apply(): a lost PvP names a
  // companion the engine has already dropped, and only this snapshot still
  // knows its species art and its column slot.
  let rosterBefore: readonly Companion[] = [];
  // The PvP battle scene, or null while the field owns the canvas (F66).
  let scene: BattleScene | null = null;
  const sceneQueue: BattleScene[] = [];
  const completedReplays = new Set<string>();

  /** Drop every in-flight presentation system (Reset Progress and rebirth). */
  const clearPresentation = (): void => {
    timeMs = 0;
    heroAnim = createHeroAnim();
    // Boot the monster straight into idle: the pop-in is for kill-born
    // spawns (T15 decision) — rebirth re-arms it right after this call.
    monsterAnim = tickMonster(createMonsterAnim(), MONSTER_SPAWNING_MS);
    for (const f of floats) {
      f.active = false;
    }
    for (const p of particles) {
      p.active = false;
    }
    for (const impact of impacts) impact.active = false;
    for (const d of drops) {
      d.active = false;
      d.arrived = false;
    }
    banner.active = false;
    coinPopAgeMs = Number.POSITIVE_INFINITY;
    target = engine.getState().monster;
    hitCount = 0;
    feverSparkleAgeMs = 0;
    shakeAgeMs = Number.POSITIVE_INFINITY;
    scene = null;
    sceneQueue.length = 0;
    options.onReplayStatus?.(null);
  };

  /**
   * The PvP verdict's presentation — banner, steal pop-in, loss scatter —
   * as a closure, so a battle scene can hold it back until it ends (F53).
   * `before` is the roster the action landed on: only it still knows the art
   * and slot of a companion the engine has already dropped.
   */
  const pvpPresentation =
    (event: Extract<GameEvent, { type: 'pvpResolved' }>, before: readonly Companion[]) =>
    (): void => {
      showBanner(banner, event.won ? VICTORY_TEXT : DEFEAT_TEXT);
      const state = engine.getState();
      if (event.stolen !== null) {
        // The prize pops in at the party slot it will fight from.
        const slot = partySlotOf(fieldParty(state), event.stolen.id);
        if (slot !== null) {
          const at = slotCentre(slot, event.stolen.speciesId);
          spawnEffect(particles, EFFECTS.captureSparkle, at.x, at.y, 1);
        }
      }
      const lostId = event.lostId;
      if (lostId !== null) {
        // It is already off the roster: scatter the art it was drawn with,
        // where it stood. A benched loss was never on screen.
        const party = partyOrder(activeCompanions(before, state.monster.type, state.hero?.equipped));
        const lost = party.find((c) => c.id === lostId);
        const slot = partySlotOf(party, lostId);
        if (lost !== undefined && slot !== null) {
          const art = speciesSpritesFor(lost.speciesId).idle;
          spawnSpriteScatter(particles, art, 0, slot.x, slot.y - art.h * slot.scale, slot.scale);
        }
      }
    };

  /**
   * One blow of the replay: a shot from the actor's slot, then the target's
   * own hit effect and a damage float coloured by the match-up; a `ko`
   * scatters the target and takes it out of its group (§6). A blow naming
   * someone who is not on the field draws nothing.
   */
  const playBlow = (s: BattleScene, blow: WireBlow): void => {
    const mineActs = blow.side === 'A';
    const actor = (mineActs ? s.mine : s.theirs).find((c) => c.id === blow.actorId);
    const targets = mineActs ? s.theirs : s.mine;
    const target = targets.find((c) => c.id === blow.targetId);
    const actorSlot = mineActs
      ? partySlotOf(s.mine, blow.actorId)
      : opponentSlotOf(s.theirs, blow.actorId);
    const targetSlot = mineActs
      ? opponentSlotOf(s.theirs, blow.targetId)
      : partySlotOf(s.mine, blow.targetId);
    if (actor === undefined || target === undefined || actorSlot === null || targetSlot === null) {
      return;
    }
    audio.attackTick();
    // The commanding hero swings with each of its side's blows (user change 2026-09-06).
    if (mineActs) s.heroAnim = heroInput();
    else s.rivalAnim = heroInput();
    const from = slotCentre(actorSlot, actor.speciesId);
    const at = slotCentre(targetSlot, target.speciesId);
    spawnCompanionAttack(s.particles, actor.speciesId, from, at, mineActs ? 1 : -1);
    spawnImpact(s.particles, s.impacts, companionImpactOf(actor.speciesId), at.x, at.y, mineActs ? 1 : -1);
    spawnImpact(s.particles, s.impacts,
      heroImpactOf((mineActs ? s.ownHero?.formId : s.opponentHero?.formId) ?? 'h00'),
      at.x, at.y - 5, mineActs ? 1 : -1);
    spawnEffect(s.particles, EFFECTS.hit[speciesKey(target.speciesId)], at.x, at.y, 1, s.hitCount++);
    spawnFloat(
      s.floats,
      at.x,
      at.y - BLOW_FLOAT_LIFT,
      format(wireDamage(blow.damage)),
      false,
      floatColor(effectiveness(typeOf(actor.speciesId), typeOf(target.speciesId))),
    );
    if (!blow.ko) {
      return;
    }
    audio.killArpeggio();
    const art = speciesSpritesFor(target.speciesId).idle;
    spawnSpriteScatter(
      s.particles,
      art,
      0,
      targetSlot.x,
      targetSlot.y - art.h * targetSlot.scale,
      targetSlot.scale,
    );
    targets.splice(targets.indexOf(target), 1);
  };

  /** New battles use actual hero turns. The old companion-only animation is
   * deliberately separate so durable pre-upgrade receipts retain their shape. */
  const playHeroicBlow = (s: BattleScene, blow: WireBlow): void => {
    const own = blow.side === 'A';
    const actors = own ? s.ownFighters : s.opponentFighters;
    const targets = own ? s.opponentFighters : s.ownFighters;
    const actor = actors.find(f => f.id === blow.actorId && f.kind === blow.actorKind);
    const target = targets.find(f => f.id === blow.targetId && f.kind === blow.targetKind);
    if (!actor || !target || actor.remaining <= 0n || target.remaining <= 0n) return;
    const centre = (fighter: WireFighter, mine: boolean): { x: number; y: number } | null => {
      if (fighter.kind === 'hero') return { x: (mine ? HERO_X : OPPONENT_HERO_X) + 14, y: GROUND_Y - 14 };
      const slot = mine ? partySlotOf(s.mine, fighter.id) : opponentSlotOf(s.theirs, fighter.id);
      return slot ? slotCentre(slot, fighter.speciesId ?? 'slime') : null;
    };
    const from = centre(actor, own), at = centre(target, !own);
    if (!from || !at) return;
    audio.attackTick();
    if (actor.kind === 'hero') spawnImpact(s.particles, s.impacts, heroImpactOf(actor.formId ?? 'h00'), at.x, at.y, own ? 1 : -1);
    else {
      spawnCompanionAttack(s.particles, actor.speciesId ?? 'slime', from, at, own ? 1 : -1);
      spawnImpact(s.particles, s.impacts, companionImpactOf(actor.speciesId ?? 'slime'), at.x, at.y, own ? 1 : -1);
    }
    const damage = wireDamage(blow.damage);
    target.remaining = blow.ko || damage >= target.remaining ? 0n : target.remaining - damage;
    spawnFloat(s.floats, at.x, at.y - BLOW_FLOAT_LIFT, format(damage), blow.crit ?? false,
      actor.type && target.type ? floatColor(effectiveness(actor.type, target.type)) : COLORS.white);
    if (target.kind === 'hero') {
      if (own) s.rivalHitUntil = s.ageMs + 120; else s.heroHitUntil = s.ageMs + 120;
    } else spawnEffect(s.particles, EFFECTS.hit[speciesKey(target.speciesId ?? 'slime')], at.x, at.y, 1, s.hitCount++);
    if (!blow.ko) return;
    audio.killArpeggio();
    if (target.kind === 'hero') {
      const mine = !own, combat = mine ? s.ownCombat : s.opponentCombat;
      const sprite = equippedHeroSprite(target.formId ?? combat?.hero.formId ?? 'h00', combat?.loadout.weapon ?? null,
        { flipX: !mine });
      spawnSpriteScatter(s.particles, sprite, 0, (mine ? HERO_X : OPPONENT_HERO_X) - EQUIPPED_HERO_PADDING.x * SPRITE_SCALE,
        HERO_Y - EQUIPPED_HERO_PADDING.y * SPRITE_SCALE, SPRITE_SCALE);
      if (mine) s.heroAnim = createHeroAnim(); else s.rivalAnim = createHeroAnim();
    } else {
      const party = own ? s.theirs : s.mine;
      const slot = own ? opponentSlotOf(party, target.id) : partySlotOf(party, target.id);
      if (slot) {
        const sprite = speciesSpritesFor(target.speciesId ?? 'slime').idle;
        spawnSpriteScatter(s.particles, sprite, 0, slot.x, GROUND_Y - sprite.h * SPRITE_SCALE, SPRITE_SCALE);
      }
      const index = party.findIndex(c => c.id === target.id); if (index >= 0) party.splice(index, 1);
    }
  };

  /** Run the scene's clock: due blows, then the verdict + the field back. */
  const advanceScene = (dt: number): void => {
    const s = scene;
    if (s === null) {
      return;
    }
    s.ageMs += dt;
    if (!s.heroic) { s.heroAnim = tickHero(s.heroAnim, dt); s.rivalAnim = tickHero(s.rivalAnim, dt); }
    tickFloats(s.floats, dt);
    tickParticles(s.particles, dt);
    tickImpacts(s.particles, s.impacts, dt);
    tickBanner(s.banner, dt);
    if (s.heroic) {
      const duration = Math.min(HERO_ATTACK_MS, 2 * s.blowMs);
      // Process due actions and their strike impacts in chronological order.
      // A delayed render frame therefore cannot put a KO after the next turn.
      for (;;) {
        const turnAt = s.next < s.blows.length ? s.next * s.blowMs : Infinity;
        const hitAt = s.pendingHits[0]?.at ?? Infinity;
        if (Math.min(turnAt, hitAt) > s.ageMs) break;
        if (hitAt <= turnAt) {
          const pending = s.pendingHits.shift()!; playHeroicBlow(s, pending.blow);
        } else {
          const blow = s.blows[s.next++]!;
          if (blow.actorKind === 'hero') {
            if (blow.side === 'A') s.heroStartedAt = turnAt; else s.rivalStartedAt = turnAt;
            s.pendingHits.push({ blow, at: turnAt + duration / 3 });
          } else playHeroicBlow(s, blow);
        }
      }
      const motion = (start: number, fighters: BattleScene['ownFighters']): HeroAnim => {
        const age = s.ageMs - start;
        return fighters.some(f => f.kind === 'hero' && f.remaining > 0n) && age >= 0 && age < duration
          ? { state: 'attack', t: age / duration * HERO_ATTACK_MS } : createHeroAnim();
      };
      s.heroAnim = motion(s.heroStartedAt, s.ownFighters); s.rivalAnim = motion(s.rivalStartedAt, s.opponentFighters);
    } else while (s.next < s.blows.length && s.ageMs >= s.next * s.blowMs) {
      const blow = s.blows[s.next++];
      if (blow !== undefined) {
        playBlow(s, blow);
      }
    }
    if (s.presentation && s.next === s.blows.length && s.pendingHits.length === 0 && !s.resultShown) {
      s.resultShown = true;
      showBanner(s.banner, s.presentation.won ? VICTORY_TEXT : DEFEAT_TEXT);
    }
    if (s.ageMs < s.endsAt) {
      return;
    }
    scene = sceneQueue.shift() ?? null;
    if (s.presentation) {
      completedReplays.add(s.presentation.battleId);
      if (completedReplays.size > REPLAY_HISTORY_SIZE) {
        const oldest = completedReplays.values().next().value;
        if (oldest !== undefined) completedReplays.delete(oldest);
      }
      options.onReplayComplete?.(s.presentation.battleId);
    } else if (s.after !== null) {
      s.after();
    } else {
      // Legacy uncommitted replay callers retain their original field banner.
      showBanner(banner, s.mine.length > 0 && s.theirs.length === 0 ? VICTORY_TEXT : DEFEAT_TEXT);
    }
    options.onReplayStatus?.(scene?.presentation ?? null);
  };

  /**
   * The ONE presentation router: `attack()` and `update()` both feed their
   * engine events through it, so a companion kill looks exactly like a hero
   * kill. An empty batch does nothing.
   */
  const handleEvents = (events: readonly GameEvent[], verdictScene?: BattleScene): void => {
    // Glyphs plus their bottom outline extend 6px below the spawn coordinate
    // at either damage scale. Leave another 2px clear above the boss HP bar.
    const floatAnchor = (): { x: number; y: number } => monsterFloatAnchor(target);
    for (const event of events) {
      if (scene !== null) {
        // Only explicit committed actions may arrive during playback; engine
        // ticking and manual attacks are suspended until the queue drains.
        if (event.type === 'monsterSpawned') {
          target = event.monster;
        }
        if (event.type !== 'pvpResolved') {
          continue;
        }
      }
      switch (event.type) {
        case 'attack':
          audio.attackTick();
          spawnImpact(particles, impacts, heroImpactOf(engine.getState().hero?.equipped.formId ?? 'h00'),
            monsterCentre(target).x, monsterCentre(target).y);
          spawnFieldFloat(
            floats,
            floatAnchor().x,
            floatAnchor().y,
            format(event.damage),
            event.crit,
          );
          if (usesEquippedSlash(engine.getState())) {
            const state = engine.getState();
            const slash = heroSlashPosition(heroFormSprite(state.hero?.equipped.formId ?? 'h00', true));
            spawnEffect(
              particles,
              state.souls > 0 ? EFFECTS.heroSlashSouls : EFFECTS.heroSlash,
              slash.x,
              slash.y + heroSlash.h * SPRITE_SCALE / 2,
              1,
            );
          }
          if (event.crit) {
            // Critical hit: the camera shakes and hot sparks ring the monster.
            shakeAgeMs = 0;
            const centre = monsterCentre(target);
            spawnEffect(particles, EFFECTS.critBurst, centre.x, centre.y, 1, hitCount);
          }
          break;
        case 'companionAttack': {
          spawnImpact(particles, impacts, companionImpactOf(event.speciesId),
            monsterCentre(target).x, monsterCentre(target).y);
          // The float carries the match-up: yellow super, steel weak (§6).
          spawnFieldFloat(
            floats,
            floatAnchor().x,
            floatAnchor().y,
            format(event.damage),
            false,
            floatColor(event.effectiveness),
          );
          const slot = partySlotOf(fieldParty(engine.getState()), event.companionId);
          if (slot !== null) {
            // Each companion attacks in its own style (§4): golems slash, slimes
            // lob, bats bolt, dragons breathe, ghosts throw spectral orbs.
            spawnCompanionAttack(
              particles,
              event.speciesId,
              slotCentre(slot, event.speciesId),
              monsterCentre(target),
              1,
            );
          }
          break;
        }
        case 'monsterHit':
          monsterAnim = monsterHit(monsterAnim);
          spawnEffect(
            particles,
            EFFECTS.hit[speciesKey(target.speciesId)],
            monsterCentre(target).x,
            monsterCentre(target).y,
            1,
            hitCount++,
          );
          break;
        case 'monsterKilled': {
          // Decompose the (tier-tinted) sprite into gravity particles; the
          // FSM rides DYING for the same 500ms the scatter lives.
          audio.killArpeggio();
          const sprite = tintedIdleSprite(event.monster);
          const scale = monsterScale();
          spawnSpriteScatter(
            particles,
            sprite,
            0,
            MONSTER_X,
            GROUND_Y - sprite.h * scale,
            scale,
          );
          monsterAnim = monsterKilled(monsterAnim);
          break;
        }
        case 'bossCaptured': {
          // Sparkle where the boss stood, then where it joins the party — a
          // capture the type match-up benches sparkles at the boss only (§6).
          const centre = monsterCentre(target);
          spawnEffect(particles, EFFECTS.captureSparkle, centre.x, centre.y, 1);
          const slot = partySlotOf(fieldParty(engine.getState()), event.companion.id);
          if (slot !== null) {
            const at = slotCentre(slot, event.companion.speciesId);
            spawnEffect(particles, EFFECTS.captureSparkle, at.x, at.y, 1);
          }
          break;
        }
        case 'companionReleased': {
          // The draw used to vanish; now it says what it paid and whether the
          // roster's weakest keeper is the one worth trading away (§6).
          const centre = monsterCentre(target);
          spawnFloat(
            floats,
            centre.x,
            centre.y,
            event.souls > 0 ? `RELEASED +${String(event.souls)}` : 'RELEASED',
            false,
            event.strongerThanWeakest ? COLORS.orange : COLORS.steel,
          );
          break;
        }
        case 'feverStart':
          audio.feverStart();
          break;
        case 'itemDropped': {
          let slot = 0;
          for (const drop of event.drops) {
            spawnDrop(drops, {
              itemId: drop.item.id,
              // Launch at the monster's left edge — the drop bursts out of
              // the dying monster toward the gap without ever overlapping
              // the scatter pixels.
              startX: MONSTER_X - 6,
              startY: GROUND_Y - 12,
              landX: DROP_LAND_X + slot * DROP_STAGGER_PX,
              landY: GROUND_Y - itemSpriteFor(drop.item.id).h,
              targetX: DROP_TARGET_X,
              targetY: DROP_TARGET_Y,
            });
            slot++;
          }
          break;
        }
        case 'levelUp':
          audio.levelUpFanfare();
          showBanner(banner);
          spawnSparkles(
            particles,
            HERO_X + Math.floor((heroIdle.w * SPRITE_SCALE) / 2),
            HERO_Y + 4 * SPRITE_SCALE,
          );
          break;
        case 'pvpResolved': {
          const show = pvpPresentation(event, rosterBefore);
          // A replay opened the scene first: the verdict waits for it (F53).
          const recipient = verdictScene ?? scene;
          if (recipient === null) {
            show();
          } else {
            recipient.after = show;
          }
          break;
        }
        case 'rebirth':
          // Everything on screen belonged to the old run; monster 0 then
          // rises out of the ground exactly like a kill-born spawn.
          clearPresentation();
          monsterAnim = createMonsterAnim();
          break;
        case 'monsterSpawned':
          // The FSM stays deferred on purpose: its DYING → SPAWNING
          // transition brings the new monster in after the scatter ends.
          target = event.monster;
          if (event.monster.boss) {
            const centre = monsterCentre(event.monster);
            spawnEffect(particles, EFFECTS.bossShockwave, centre.x, centre.y, 1);
          }
          break;
      }
    }
  };

  const makeScene = (replay: BattleReplay, ownParty: readonly Companion[], ownHero: PvpPresentation['ownHero'],
    presentation: PvpPresentation | null, after: BattleScene['after']): BattleScene => {
    const heroic = replay.ownFighters !== undefined && replay.opponentFighters !== undefined;
    const perBlow = heroic ? Math.min(blowMs(replay.blows.length),
      (REPLAY_MS - REPLAY_END_MS - ATTACK_FRAME_MS) / Math.max(1, replay.blows.length - 1)) : blowMs(replay.blows.length);
    const next: BattleScene = {
      name: replay.opponentName,
      ownHero: ownHero ? { ...ownHero } : undefined,
      opponentHero: replay.opponentHero ? { ...replay.opponentHero } : undefined,
      ownCombat: presentation?.ownCombat ? structuredClone(presentation.ownCombat) : undefined,
      opponentCombat: replay.opponentCombat ? structuredClone(replay.opponentCombat) : undefined,
      heroic, ownFighters: (replay.ownFighters ?? []).map(f => ({ ...f, remaining: wireDamage(f.hp) })),
      opponentFighters: (replay.opponentFighters ?? []).map(f => ({ ...f, remaining: wireDamage(f.hp) })),
      heroStartedAt: -Infinity, rivalStartedAt: -Infinity, heroHitUntil: 0, rivalHitUntil: 0, pendingHits: [],
      presentation,
      heroAnim: createHeroAnim(), rivalAnim: createHeroAnim(),
      floats: createFloatPool(), particles: createParticlePool(), impacts: createImpactQueue(),
      banner: createBanner(), hitCount: 0, resultShown: false,
      mine: partyOrder(ownParty.map(c => ({ ...c }))),
      theirs: partyOrder(replay.opponentParty.map(c => ({ ...c }))),
      blows: replay.blows.map(b => ({ ...b })),
      blowMs: perBlow,
      next: 0,
      ageMs: 0,
      endsAt: Math.min(REPLAY_MS, Math.max(0, replay.blows.length - 1) * perBlow + REPLAY_END_MS + (heroic ? Math.min(ATTACK_FRAME_MS, perBlow * 2 / 3) : 0)),
      after,
    };
    showBanner(next.banner, `VS ${replay.opponentName}`);
    return next;
  };
  const queueScene = (next: BattleScene): void => {
    if (scene === null) {
      scene = next;
      options.onReplayStatus?.(next.presentation);
    } else sceneQueue.push(next);
  };
  const legacyReplay = (replay: BattleReplay, won?: boolean): BattleScene => {
    // Legacy callers have no historical own-party snapshot. New presentations
    // always use the complete server snapshot, including untouched back rows.
    const fought = new Set(replay.blows.map(b => b.side === 'A' ? b.actorId : b.targetId));
    const state = engine.getState();
    const next = makeScene(replay, state.companions.filter(c => fought.has(c.id)), state.hero?.equipped, null,
      won === undefined ? null : () => showBanner(banner, won ? VICTORY_TEXT : DEFEAT_TEXT));
    queueScene(next);
    return next;
  };
  const enqueueReplay = (presentation: PvpPresentation): void => {
    const id = presentation.battleId;
    if (completedReplays.has(id)) { options.onReplayComplete?.(id); return; }
    if (scene?.presentation?.battleId === id || sceneQueue.some(s => s.presentation?.battleId === id)) return;
    // No acknowledgement on overflow: main retains the durable receipt and
    // can redeliver it. Normal delivery is bounded to five defenses + one attack.
    if (sceneQueue.length + Number(scene !== null) >= REPLAY_QUEUE_SIZE) return;
    const snapshot = structuredClone(presentation);
    queueScene(makeScene(snapshot.replay, snapshot.ownParty, snapshot.ownHero, snapshot, null));
  };

  return {
    lastActionError: (): string | null => engine.lastActionError(),
    beginEquipmentBatch: (): void => { engine.beginEquipmentBatch(); },
    endEquipmentBatch: (): GameEvent[] => { const events = engine.endEquipmentBatch(); handleEvents(events); return events; },
    refreshShop: (now): GameEvent[] => { const events = engine.refreshShop(now); handleEvents(events); return events; },
    attack(source: InputSource): GameEvent[] {
      // PvP attacks are driven exclusively by the timed battle blows.
      if (scene !== null) return [];
      // Inputs still deal damage immediately; visual swings finish with one pending.
      heroAnim = heroInput(heroAnim);
      const events = engine.attack(source);
      handleEvents(events);
      return events;
    },

    update(dtMs: number): GameEvent[] {
      const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
      if (scene !== null) {
        advanceScene(dt);
        return []; // Never catch up field time, including the scene's last frame.
      }
      timeMs += dt;
      heroAnim = tickHero(heroAnim, dt);
      monsterAnim = tickMonster(monsterAnim, dt);
      tickFloats(floats, dt);
      tickParticles(particles, dt);
      tickImpacts(particles, impacts, dt);
      tickDrops(drops, dt);
      tickBanner(banner, dt);
      coinPopAgeMs += dt;
      shakeAgeMs += dt;
      for (const drop of drops) {
        if (drop.arrived) {
          drop.arrived = false;
          coinPopAgeMs = 0;
          spawnSparkles(particles, drop.targetX, drop.targetY, COLLECT_SPARKLE_COUNT);
        }
      }
      // The engine clock moves ONLY here (Assumption 39): companion volleys
      // and fever transitions come out of the same router as attack()'s.
      const events = engine.tick(dt);
      handleEvents(events);
      feverSparkleAgeMs += dt;
      if (engine.getState().fever.active) {
        if (feverSparkleAgeMs >= FEVER_SPARKLE_MS) {
          feverSparkleAgeMs = 0;
          spawnEffect(
            particles,
            EFFECTS.feverAura,
            HERO_X + (heroIdle.w * SPRITE_SCALE) / 2,
            HERO_Y + (heroIdle.h * SPRITE_SCALE) / 2,
            1,
          );
        }
      } else {
        feverSparkleAgeMs = 0;
      }
      return events;
    },

    apply(a: CollectionAction): GameEvent[] {
      rosterBefore = engine.getState().companions;
      let verdictScene: BattleScene | undefined;
      if (a.type === 'pvpResult' && a.replay !== undefined) {
        // The scene opens BEFORE the verdict lands, so the banner and the
        // pop-in/scatter wait until it ends (F53).
        verdictScene = legacyReplay(a.replay);
      }
      const events = engine.apply(a);
      handleEvents(events, verdictScene);
      return events;
    },

    playReplay: (replay, won): void => { legacyReplay(replay, won); },
    enqueueReplay,
    isReplaying: (): boolean => scene !== null,

    draw(screen: GameCanvas): void {
      screen.clearRect(0, 0, VIEW_W, VIEW_H);
      // A critical hit shakes the world (everything but the top-left counters
      // and the banner) for SHAKE_MS; `ctx` is the shifted view of `screen`.
      const shake = scene === null && options.screenShake === true && shakeAgeMs < SHAKE_MS ? shakeOffset(shakeAgeMs) : null;
      const ctx = shake === null ? screen : shifted(screen, shake.dx, shake.dy);
      drawField(ctx);

      const state = engine.getState();
      const shownTime = scene?.ageMs ?? timeMs;
      const shownHero = scene?.heroAnim ?? heroAnim;

      // Both party groups stand BEHIND the hero (drawn first): the 2x art of
      // a 5-member group reaches the hero's box, and the protagonist wins the
      // overlap. Back to front (§6); every species shares the 2-frame bob, so
      // one frame index drives the whole group. A battle scene shows the
      // party that fought and the opponent's group mirrored on the right under
      // its name — the field monster is hidden while it plays (§6).
      const partyFrame =
        Math.floor(shownTime / IDLE_FRAME_MS) % monsterSprites.slime.idle.frames.length;
      const myParty = scene === null ? fieldParty(state) : scene.mine;
      drawParty(ctx, myParty, partyFrame, GROUND_Y);
      // Every monster wears its type under its feet (user change 2026-09-06).
      drawPartyBadges(ctx, myParty, GROUND_Y);
      if (scene !== null) {
        drawParty(ctx, scene.theirs, partyFrame, GROUND_Y, {
          flipX: false,
          originX: VIEW_W - 8,
        });
        drawPartyBadges(ctx, scene.theirs, GROUND_Y, { originX: VIEW_W - 8 });
        drawText(ctx, scene.name, OPPONENT_ORIGIN_X - textWidth(scene.name), OPPONENT_NAME_Y);
      }

      const attacking = shownHero.state === 'attack';
      const heroFormId = (scene === null ? state.hero?.equipped.formId : scene.ownCombat?.hero.formId ?? scene.ownHero?.formId) ?? 'h00';
      const heroIdleSprite = heroFormSprite(heroFormId);
      const heroSprite = attacking ? heroFormSprite(heroFormId, true) : heroIdleSprite;
      const heroX = HERO_X + (heroIdle.w - heroSprite.w) * SPRITE_SCALE / 2;
      const heroY = GROUND_Y - heroSprite.h * SPRITE_SCALE;
      // Compact forms reserve transparent space for attack poses. Anchor labels
      // to the idle silhouette so raised weapons never bounce the HUD.
      const heroTop = heroHudTop(heroFormId);
      const heroFrame = attacking
        ? Math.min(heroSprite.frames.length - 1, Math.floor(shownHero.t / ATTACK_FRAME_MS))
        : Math.floor(shownTime / IDLE_FRAME_MS) % heroSprite.frames.length;
      const equipped = scene === null ? state.equipment !== undefined : scene.heroic;
      const weapon = (scene === null ? state.equipment?.loadout.weapon : scene.ownCombat?.loadout.weapon) ?? null;
      const heroAlive = !scene?.heroic || scene.ownFighters.some(f => f.kind === 'hero' && f.remaining > 0n);
      if (scene === null && state.fever.active) {
        // Hue-cycling outline UNDER the hero — the real sprite lands on top.
        if (equipped) drawFeverAura(ctx, equippedHeroSprite(heroFormId, weapon, { attacking, frame: heroFrame }), 0,
          heroX - EQUIPPED_HERO_PADDING.x * SPRITE_SCALE, heroY - EQUIPPED_HERO_PADDING.y * SPRITE_SCALE, SPRITE_SCALE, timeMs);
        else drawFeverAura(ctx, heroSprite, heroFrame, heroX, heroY, SPRITE_SCALE, timeMs);
      }
      if (heroAlive) {
        if (equipped) drawEquippedHero(ctx, heroFormId, weapon, heroX, heroY,
          { scale: SPRITE_SCALE, attacking, frame: heroFrame, timeMs: shownTime,
            ...(scene?.heroic && scene.ageMs < scene.heroHitUntil ? { tint: COLORS.white } : {}) });
        else drawSprite(ctx, heroSprite, heroFrame, heroX, heroY, { scale: SPRITE_SCALE });
      }
      if (attacking && heroFrame === SLASH_FRAME && scene === null && usesEquippedSlash(state)) {
        // Slash arc in front of the blade, toward the monster. Not during a
        // replay: field presentation is suppressed there (§6).
        const slash = heroSlashPosition(heroSprite);
        drawSprite(
          ctx,
          heroSlash,
          0,
          slash.x,
          slash.y,
          { scale: SPRITE_SCALE },
        );
      }

      if (scene !== null && (!scene.heroic || scene.opponentFighters.some(f => f.kind === 'hero' && f.remaining > 0n))) {
        // The opponent's hero: the same art mirrored (facing left) in the
        // rival palette, in front of its own party, swinging on its blows.
        const rivalAttacking = scene.rivalAnim.state === 'attack';
        const rivalId = scene.opponentCombat?.hero.formId ?? scene.opponentHero?.formId ?? 'h00';
        const rivalSprite = heroFormSprite(rivalId, rivalAttacking);
        const rivalFrame = rivalAttacking
          ? Math.min(rivalSprite.frames.length - 1, Math.floor(scene.rivalAnim.t / ATTACK_FRAME_MS))
          : Math.floor(shownTime / IDLE_FRAME_MS) % rivalSprite.frames.length;
        if (scene.heroic) drawEquippedHero(ctx, rivalId, scene.opponentCombat?.loadout.weapon ?? null,
          OPPONENT_HERO_X, HERO_Y, { flipX: true, scale: SPRITE_SCALE, attacking: rivalAttacking, frame: rivalFrame,
            timeMs: shownTime, ...(scene.ageMs < scene.rivalHitUntil ? { tint: COLORS.white } : {}) });
        else drawSprite(
          ctx,
          heroFormSprite(scene.opponentHero?.formId ?? 'h00') !== heroIdle ? rivalSprite : { ...rivalSprite, palette: HERO_RIVAL_PALETTE },
          rivalFrame,
          OPPONENT_HERO_X + (heroIdle.w - rivalSprite.w) * SPRITE_SCALE / 2,
          GROUND_Y - rivalSprite.h * SPRITE_SCALE,
          { flipX: true, scale: SPRITE_SCALE },
        );
      }

      const species = speciesSpritesFor(state.monster.speciesId);
      const scale = monsterScale();
      if (scene !== null) {
        // The battle scene owns the field: no field monster (§6); the
        // opponent's group and hero were drawn above.
      } else if (monsterAnim.state === 'dying') {
        // The sprite is mid-scatter — its pixels live in the particle pool.
      } else if (monsterAnim.state === 'spawning') {
        // Bottom-up pop-in: the next monster grows out of the ground.
        const sprite = tintedIdleSprite(state.monster);
        const progress = easeOutQuad(monsterAnim.t / MONSTER_SPAWNING_MS);
        const visibleRows = Math.ceil(sprite.h * progress);
        drawSpriteBottomRows(
          ctx,
          sprite,
          0,
          MONSTER_X,
          GROUND_Y - sprite.h * scale,
          visibleRows,
          scale,
        );
      } else if (state.monster.boss) {
        // Bosses draw one size larger than their species and wear the crown.
        const hit = monsterAnim.state === 'hit';
        drawBoss(
          ctx,
          species,
          hit ? 'hit' : 'idle',
          hit ? 0 : Math.floor(timeMs / IDLE_FRAME_MS) % species.idle.frames.length,
          MONSTER_X,
          GROUND_Y,
          state.monster.tier,
          { tint: hit ? COLORS.white : undefined },
        );
      } else if (monsterAnim.state === 'hit') {
        // White-flash recoil pose for MONSTER_HIT_MS; the full tint makes
        // the tier tint irrelevant while it lasts.
        drawSprite(ctx, species.hit, 0, MONSTER_X, GROUND_Y - species.hit.h * scale, {
          tint: COLORS.white,
          scale,
        });
      } else {
        const sprite = tintedIdleSprite(state.monster);
        const monsterFrame = Math.floor(timeMs / IDLE_FRAME_MS) % sprite.frames.length;
        drawSprite(ctx, sprite, monsterFrame, MONSTER_X, GROUND_Y - sprite.h * scale, { scale });
      }

      for (const drop of drops) {
        if (scene !== null || !drop.active) {
          continue;
        }
        const pos = dropPosition(drop);
        drawSprite(ctx, itemSpriteFor(drop.itemId), 0, Math.round(pos.x), Math.round(pos.y));
      }
      drawParticles(ctx, scene?.particles ?? particles);

      if (scene === null && monsterAnim.state !== 'dying') {
        // No HP bar over the scatter — it pops back with the next monster,
        // and the battle scene hides it with the monster itself (§6).
        const barY = monsterHpBarY(state.monster);
        const barX = Math.round(MONSTER_X + (species.idle.w * scale) / 2 - HP_BAR.w / 2);
        drawHpBar(ctx, barX, barY, HP_BAR.w, HP_BAR.h, state.monsterHp, state.monster.maxHp);
        // The type badge sits under the monster's feet, like every party member's (§6).
        drawFootBadge(ctx, state.monster.type, MONSTER_X, species.idle.w * scale, GROUND_Y);
      }
      // LV + XP gauge floats above the hero's head (Assumption 17).
      if (scene?.heroic) {
        for (const [mine, fighters] of [[true, scene.ownFighters], [false, scene.opponentFighters]] as const) {
          const hero = fighters.find(f => f.kind === 'hero');
          const x = mine ? HERO_X : OPPONENT_HERO_X;
          if (hero && hero.remaining > 0n) drawHpBar(ctx, x, HERO_Y - 6, 28, 4, hero.remaining, wireDamage(hero.hp));
          const target = fighters.find(f => f.kind === 'companion' && f.remaining > 0n) ?? fighters.find(f => f.remaining > 0n);
          if (target) {
            const panelX = mine ? 8 : VIEW_W - 88;
            drawText(ctx, target.kind === 'hero' ? 'HERO' : (target.speciesId ?? 'ALLY').toUpperCase().slice(0, 12), panelX, 68);
            drawHpBar(ctx, panelX, 77, 80, 4, target.remaining, wireDamage(target.hp));
          }
        }
      } else drawLevelHud(
        ctx,
        state,
        HERO_X + Math.floor((heroIdle.w * SPRITE_SCALE) / 2),
        heroTop - 2,
        scene === null ? { levelUp: banner, ...(state.fever.active ? { feverAgeMs: FEVER_MS - state.fever.remainingMs } : {}) } : {},
      );
      drawFloats(ctx, scene?.floats ?? floats);
      drawCounters(screen, state, VIEW_W, scene === null && coinPopAgeMs < COUNTER_POP_MS);
      if (scene === null && state.equipment && state.equipment.bag.length >= state.equipment.capacity) {
        const pending = state.equipment.temporary.length;
        drawText(screen, pending ? `BAG FULL +${pending}` : 'BAG FULL', 8, BAG_FULL_Y, { color: COLORS.yellow });
      }
      if (scene !== null || banner.text !== LEVEL_UP_TEXT) drawBanner(screen, scene?.banner ?? banner, VIEW_W);
    },

    getState(): Readonly<GameState> {
      return engine.getState();
    },

    toSave(): SaveFile {
      return engine.toSave();
    },

    reset(rng?: Rng): void {
      engine = createEngine(null, rng);
      clearPresentation();
    },

    getHeroAnim: (): HeroAnim => scene?.heroAnim ?? heroAnim,

    getMonsterAnim: (): MonsterAnim => monsterAnim,
  };
}

// ---------------------------------------------------------------------------
// Save scheduling (SPEC F22, T16): WHEN progress persists. Kills and level-ups
// save immediately; damage-only attacks save at most once per debounce window;
// window blur / reset flush unconditionally. DOM-free with injectable timers
// so the policy is unit-testable (production uses the real setTimeout).
// ---------------------------------------------------------------------------

/** Debounce window for damage-only saves, ms (SPEC F22). */
export const SAVE_DEBOUNCE_MS = 500;

export interface SaveScheduler {
  /** Feed one attack's engine events; decides whether/when to save. */
  onEvents(events: readonly GameEvent[]): void;
  /** Save immediately, canceling any pending debounce (blur, reset). */
  flush(): void;
}

export interface SaveSchedulerOptions {
  /** Performs the actual save (renderer boot passes saveState(toSave())). */
  save(): void;
  /** Timer injection for tests; defaults to the global setTimeout. */
  setTimer?(cb: () => void, ms: number): unknown;
  clearTimer?(handle: unknown): void;
}

export function createSaveScheduler(options: SaveSchedulerOptions): SaveScheduler {
  const setTimer =
    options.setTimer ?? ((cb: () => void, ms: number): unknown => setTimeout(cb, ms));
  const clearTimer =
    options.clearTimer ??
    ((handle: unknown): void => {
      clearTimeout(handle as ReturnType<typeof setTimeout>);
    });
  let pending: unknown = undefined;

  const cancelPending = (): void => {
    if (pending !== undefined) {
      clearTimer(pending);
      pending = undefined;
    }
  };

  const saveNow = (): void => {
    cancelPending();
    options.save();
  };

  return {
    onEvents(events: readonly GameEvent[]): void {
      if (events.some((e) => e.type === 'monsterKilled' || e.type === 'levelUp' || e.type === 'heroReady')) {
        saveNow();
        return;
      }
      if (events.some((e) => e.type === 'attack')) {
        // Damage without a kill: coalesce key-mash into one trailing save.
        cancelPending();
        pending = setTimer(() => {
          pending = undefined;
          options.save();
        }, SAVE_DEBOUNCE_MS);
      }
    },

    flush: saveNow,
  };
}
