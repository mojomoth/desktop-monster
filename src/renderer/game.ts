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
// v3 (SPEC F64): the field is 240x150 at SPRITE_SCALE 1, monsters draw at
// their hidden species size, the field monster carries a type badge, and the
// party is re-read from state every frame so the type match-up re-picks it.
// v3 (SPEC F66): playReplay() takes over the field for the PvP battle scene —
// the opponent's party mirrored on the right, one blow per BLOW_MS off the
// same update(dt) clock, the field monster hidden and its events' presentation
// suppressed until the scene hands the field back.
// DOM-free on purpose — draws through GameCanvas (SpriteCanvas + clearRect)
// so tests run under vitest's node environment.

import {
  activeCompanions,
  createEngine,
  effectiveness,
  format,
  partyOrder,
  sizeOf,
  SPECIES_IDS,
  typeOf,
} from '../core/index.js';
import type {
  BattleReplay,
  CollectionAction,
  Companion,
  Engine,
  GameEvent,
  GameState,
  InputSource,
  MonsterDef,
  SaveFile,
  SpeciesId,
  WireBlow,
} from '../core/index.js';
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
  BOSS_HP_BAR_Y,
  COLORS,
  drawBoss,
  drawFeverAura,
  drawParty,
  drawSprite,
  drawText,
  drawTypeBadge,
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
import { createGameAudio } from './audio.js';
import type { GameAudio } from './audio.js';
import { EFFECTS, hitColorOf, spawnEffect } from './effects.js';
import type { EffectPreset } from './effects.js';
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
  createBanner,
  createFloatPool,
  DEFEAT_TEXT,
  drawBanner,
  drawCounters,
  drawFloats,
  drawHpBar,
  drawLevelHud,
  FEVER_TEXT,
  floatColor,
  showBanner,
  spawnFloat,
  tickBanner,
  tickFloats,
  VICTORY_TEXT,
} from './hud.js';

/** Internal canvas size in game pixels (CSS-scaled 2x, see static/). */
export const VIEW_W = 240;
export const VIEW_H = 150;
/** Top of the ground strip; entities stand on it. */
export const GROUND_Y = 132;
/** Hero art pixel scale (Assumption 17, v3): one art pixel is one game pixel. */
export const SPRITE_SCALE = 1;
/** Hero sprite position (left side, feet on the ground). */
export const HERO_X = 96;
export const HERO_Y = GROUND_Y - heroIdle.h * SPRITE_SCALE;
/** Monster sprite left edge (right side; species art faces left already). */
export const MONSTER_X = 176;
/** Boxed HP bar above the monster (centered over it at draw time). */
export const HP_BAR = { w: 40, h: 5, y: 96 } as const;
/** Gap between the type badge and the left end of the monster's HP bar. */
export const TYPE_BADGE_GAP = 7;
/** ms per idle bob frame (GAME_ARCHITECTURE §4: 2-frame bob, 500 ms/frame). */
export const IDLE_FRAME_MS = 500;
/** ms per hero attack frame: 3 frames (wind-up/slash/recover) over 180 ms. */
export const ATTACK_FRAME_MS = HERO_ATTACK_MS / 3;
/** The attack frame during which the slash-arc overlay shows. */
export const SLASH_FRAME = 1;
/** Where item drops land after their arc + bounce (gap left of the monster). */
export const DROP_LAND_X = 150;
/** Horizontal stagger between simultaneous drops so they never stack. */
export const DROP_STAGGER_PX = 8;
/** Drop flight destination: the top-right coin counter (icon position). */
export const DROP_TARGET_X = VIEW_W - 12;
export const DROP_TARGET_Y = 8;
/** Sparkle burst size when a collected drop pops the counter. */
const COLLECT_SPARKLE_COUNT = 6;
/** Where the slash arc lands — the origin of the hero slash effect (F36). */
export const SWORD_TIP_X = HERO_X + heroAttack.w * SPRITE_SCALE;
export const SWORD_TIP_Y = HERO_Y + 2 + (heroSlash.h * SPRITE_SCALE) / 2;
/** One fever aura sparkle burst per this many ms while fever burns (F36). */
export const FEVER_SPARKLE_MS = 100;

// --- PvP battle scene (SPEC F66, GAME_DESIGN_V3 §6) ---------------------
/** A whole replay aims to fit in this much presentation time. */
export const REPLAY_MS = 12_000;
/** BLOW_MS = clamp(REPLAY_MS / blows, BLOW_MS_MIN, BLOW_MS_MAX). */
export const BLOW_MS_MIN = 250;
export const BLOW_MS_MAX = 600;
/** Beat between the last blow and the VICTORY!/DEFEAT banner. */
export const REPLAY_END_MS = 600;
/** Right edge the mirrored opponent group and its name hang from. */
export const OPPONENT_ORIGIN_X = VIEW_W - 8;
/** Baseline of the opponent's name, clear of its tallest member. */
export const OPPONENT_NAME_Y = 84;
/** How far a blow's damage float sits above the target's centre. */
export const BLOW_FLOAT_LIFT = 6;

/** Per-blow pacing of a replay of `blows` blows, ms (§6). */
export function blowMs(blows: number): number {
  return Math.min(BLOW_MS_MAX, Math.max(BLOW_MS_MIN, REPLAY_MS / blows));
}

/** Wire damage is a decimal string — a corrupt one must never throw mid-frame. */
function wireDamage(damage: string): bigint {
  return /^\d+$/.test(damage) ? BigInt(damage) : 0n;
}

/** A single shot in the actor species' hit colour (no new preset, §6). */
function projectileOf(speciesId: string): EffectPreset {
  return { ...EFFECTS.companionProjectile, colors: [hitColorOf(speciesId)] };
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
  const ids: readonly string[] = SPECIES_IDS;
  return ids.includes(speciesId) ? (speciesId as SpeciesId) : SPECIES_IDS[0];
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
  return partyOrder(activeCompanions(state.companions, state.monster.type));
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

/** Art scale of the monster on screen: its hidden size, +1 for a boss (§6). */
function monsterScale(monster: MonsterDef): number {
  return sizeOf(monster.speciesId) + (monster.boss ? 1 : 0);
}

/** Centre of the monster's drawn art — where its hit effects burst. */
function monsterCentre(monster: MonsterDef): { x: number; y: number } {
  const scale = monsterScale(monster);
  const art = speciesSpritesFor(monster.speciesId).idle;
  return { x: MONSTER_X + (art.w * scale) / 2, y: GROUND_Y - (art.h * scale) / 2 };
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
  ctx.fillRect(0, GROUND_Y, VIEW_W, 3);
  ctx.fillStyle = COLORS.maroon;
  ctx.fillRect(0, GROUND_Y + 3, VIEW_W, VIEW_H - GROUND_Y - 3);
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
   * Advance presentation time AND the engine clock by dtMs (non-finite/
   * negative counts as 0). Returns the events the tick produced — companion
   * volleys and fever transitions — so the save scheduler sees them too.
   */
  update(dtMs: number): GameEvent[];
  /**
   * Apply one Collection & Battle action from the menu window (SPEC F53).
   * Its engine events run through the SAME presentation router as attack()'s
   * — VICTORY/DEFEAT banner, steal pop-in, loss scatter, rebirth — and come
   * back so the caller can persist them; a rejected action returns [].
   */
  apply(a: CollectionAction): GameEvent[];
  /**
   * Take the field for a PvP battle scene (SPEC F66): the opponent's party
   * stands mirrored on the right under its name, one blow per BLOW_MS off
   * `update(dt)`, the field monster hidden and every field event's
   * presentation suppressed until the scene hands the field back.
   */
  playReplay(replay: BattleReplay): void;
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
  reset(): void;
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
export function createGame(initialEngine: Engine, audio: GameAudio = createGameAudio()): Game {
  let engine = initialEngine;
  let timeMs = 0;
  let heroAnim = createHeroAnim();
  // Boot straight into idle: the monster on screen at load (fresh or resumed)
  // is already alive — the spawn pop-in is for monsters born from a kill.
  let monsterAnim = tickMonster(createMonsterAnim(), MONSTER_SPAWNING_MS);
  const floats = createFloatPool();
  const particles = createParticlePool();
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
  // The roster as it stood before the running apply(): a lost PvP names a
  // companion the engine has already dropped, and only this snapshot still
  // knows its species art and its column slot.
  let rosterBefore: readonly Companion[] = [];
  // The PvP battle scene, or null while the field owns the canvas (F66).
  let scene: BattleScene | null = null;

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
    for (const d of drops) {
      d.active = false;
      d.arrived = false;
    }
    banner.active = false;
    coinPopAgeMs = Number.POSITIVE_INFINITY;
    target = engine.getState().monster;
    hitCount = 0;
    feverSparkleAgeMs = 0;
    scene = null;
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
        const party = partyOrder(activeCompanions(before, state.monster.type));
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
    const from = slotCentre(actorSlot, actor.speciesId);
    const at = slotCentre(targetSlot, target.speciesId);
    spawnEffect(particles, projectileOf(actor.speciesId), from.x, from.y, mineActs ? 1 : -1);
    spawnEffect(particles, EFFECTS.hit[speciesKey(target.speciesId)], at.x, at.y, 1, hitCount++);
    spawnFloat(
      floats,
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
      particles,
      art,
      0,
      targetSlot.x,
      targetSlot.y - art.h * targetSlot.scale,
      targetSlot.scale,
    );
    targets.splice(targets.indexOf(target), 1);
  };

  /** Run the scene's clock: due blows, then the verdict + the field back. */
  const advanceScene = (dt: number): void => {
    const s = scene;
    if (s === null) {
      return;
    }
    s.ageMs += dt;
    while (s.next < s.blows.length && s.ageMs >= s.next * s.blowMs) {
      const blow = s.blows[s.next++];
      if (blow !== undefined) {
        playBlow(s, blow);
      }
    }
    if (s.ageMs < s.endsAt) {
      return;
    }
    // The field comes back FIRST, so the verdict's own presentation lands on
    // it instead of being suppressed as a scene event.
    scene = null;
    if (s.after !== null) {
      s.after();
      return;
    }
    // Played on its own: the side still standing won, exactly as the server
    // decided it (core simulateBattle).
    showBanner(banner, s.mine.length > 0 && s.theirs.length === 0 ? VICTORY_TEXT : DEFEAT_TEXT);
  };

  /**
   * The ONE presentation router: `attack()` and `update()` both feed their
   * engine events through it, so a companion kill looks exactly like a hero
   * kill. An empty batch does nothing.
   */
  const handleEvents = (events: readonly GameEvent[]): void => {
    // Floats sit 6px above the ACTIVE hp bar — the boss bar is raised (§3).
    const floatY = (): number => (target.boss ? BOSS_HP_BAR_Y : HP_BAR.y) - 6;
    for (const event of events) {
      if (scene !== null) {
        // The engine keeps running under the battle scene: field events land
        // on the state, only their presentation is suppressed (§6). Which
        // monster is the target is bookkeeping, not presentation.
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
          spawnFloat(
            floats,
            monsterCentre(target).x,
            floatY(),
            format(event.damage),
            event.crit,
          );
          spawnEffect(
            particles,
            engine.getState().souls > 0 ? EFFECTS.heroSlashSouls : EFFECTS.heroSlash,
            SWORD_TIP_X,
            SWORD_TIP_Y,
            1,
          );
          break;
        case 'companionAttack': {
          // The float carries the match-up: yellow super, steel weak (§6).
          spawnFloat(
            floats,
            monsterCentre(target).x,
            floatY(),
            format(event.damage),
            false,
            floatColor(event.effectiveness),
          );
          const slot = partySlotOf(fieldParty(engine.getState()), event.companionId);
          if (slot !== null) {
            const from = slotCentre(slot, event.speciesId);
            spawnEffect(
              particles,
              {
                ...EFFECTS.companionProjectile,
                // The volley reads as "that companion's magic" (§4).
                colors: EFFECTS.hit[speciesKey(event.speciesId)].colors,
              },
              from.x,
              from.y,
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
          const scale = monsterScale(event.monster);
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
        case 'feverStart':
          audio.feverStart();
          showBanner(banner, FEVER_TEXT);
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
              landX: DROP_LAND_X - slot * DROP_STAGGER_PX,
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
          if (scene === null) {
            show();
          } else {
            scene.after = show;
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

  /** SPEC F66 — see the Game interface. */
  const playReplay = (replay: BattleReplay): void => {
    // ponytail: my group is exactly the roster members the replay names —
    // the party that was sent need not be the saved pvpParty.
    const fought = new Set(replay.blows.map((b) => (b.side === 'A' ? b.actorId : b.targetId)));
    const perBlow = blowMs(replay.blows.length);
    scene = {
      name: replay.opponentName,
      mine: partyOrder(engine.getState().companions.filter((c) => fought.has(c.id))),
      theirs: partyOrder(replay.opponentParty),
      blows: replay.blows,
      blowMs: perBlow,
      next: 0,
      ageMs: 0,
      endsAt: Math.max(0, replay.blows.length - 1) * perBlow + REPLAY_END_MS,
      after: null,
    };
    showBanner(banner, `VS ${replay.opponentName}`);
  };

  return {
    attack(source: InputSource): GameEvent[] {
      // Any input (re)starts the 180ms attack — BongoCat spam feel (F20).
      heroAnim = heroInput();
      const events = engine.attack(source);
      handleEvents(events);
      return events;
    },

    update(dtMs: number): GameEvent[] {
      const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
      timeMs += dt;
      heroAnim = tickHero(heroAnim, dt);
      monsterAnim = tickMonster(monsterAnim, dt);
      tickFloats(floats, dt);
      tickParticles(particles, dt);
      tickDrops(drops, dt);
      tickBanner(banner, dt);
      coinPopAgeMs += dt;
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
      advanceScene(dt);
      return events;
    },

    apply(a: CollectionAction): GameEvent[] {
      rosterBefore = engine.getState().companions;
      if (a.type === 'pvpResult' && a.replay !== undefined) {
        // The scene opens BEFORE the verdict lands, so the banner and the
        // pop-in/scatter wait until it ends (F53).
        playReplay(a.replay);
      }
      const events = engine.apply(a);
      handleEvents(events);
      return events;
    },

    playReplay,

    draw(ctx: GameCanvas): void {
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      drawField(ctx);

      const state = engine.getState();
      const attacking = heroAnim.state === 'attack';
      const heroSprite = attacking ? heroAttack : heroIdle;
      const heroFrame = attacking
        ? Math.min(heroAttack.frames.length - 1, Math.floor(heroAnim.t / ATTACK_FRAME_MS))
        : Math.floor(timeMs / IDLE_FRAME_MS) % heroIdle.frames.length;
      if (state.fever.active) {
        // Hue-cycling outline UNDER the hero — the real sprite lands on top.
        drawFeverAura(ctx, heroSprite, heroFrame, HERO_X, HERO_Y, SPRITE_SCALE, timeMs);
      }
      drawSprite(ctx, heroSprite, heroFrame, HERO_X, HERO_Y, { scale: SPRITE_SCALE });
      if (attacking && heroFrame === SLASH_FRAME) {
        // Slash arc in front of the blade, toward the monster.
        drawSprite(ctx, heroSlash, 0, HERO_X + heroAttack.w * SPRITE_SCALE, HERO_Y + 2, {
          scale: SPRITE_SCALE,
        });
      }

      // The party stands as one overlapping group left of the hero, back to
      // front (§6). Every species shares the 2-frame bob, so one frame index
      // drives the whole group. A battle scene shows the party that fought.
      const partyFrame =
        Math.floor(timeMs / IDLE_FRAME_MS) % monsterSprites.slime.idle.frames.length;
      drawParty(ctx, scene === null ? fieldParty(state) : scene.mine, partyFrame, GROUND_Y);

      const species = speciesSpritesFor(state.monster.speciesId);
      const scale = monsterScale(state.monster);
      if (scene !== null) {
        // The battle scene owns the field: the opponent's party stands
        // mirrored on the right under its name, no field monster (§6).
        drawParty(ctx, scene.theirs, partyFrame, GROUND_Y, {
          flipX: false,
          originX: VIEW_W - 8,
        });
        drawText(ctx, scene.name, OPPONENT_ORIGIN_X - textWidth(scene.name), OPPONENT_NAME_Y);
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
        if (!drop.active) {
          continue;
        }
        const pos = dropPosition(drop);
        drawSprite(ctx, itemSpriteFor(drop.itemId), 0, Math.round(pos.x), Math.round(pos.y));
      }
      drawParticles(ctx, particles);

      if (scene === null && monsterAnim.state !== 'dying') {
        // No HP bar over the scatter — it pops back with the next monster,
        // and the battle scene hides it with the monster itself (§6).
        const barY = state.monster.boss ? BOSS_HP_BAR_Y : HP_BAR.y;
        const barX = Math.round(MONSTER_X + (species.idle.w * scale) / 2 - HP_BAR.w / 2);
        drawHpBar(ctx, barX, barY, HP_BAR.w, HP_BAR.h, state.monsterHp, state.monster.maxHp);
        // The badge at the bar's left end is the ONLY visible type marker (§6).
        drawTypeBadge(ctx, state.monster.type, barX - TYPE_BADGE_GAP, barY);
      }
      // LV + XP gauge floats above the hero's head (Assumption 17).
      drawLevelHud(
        ctx,
        state,
        HERO_X + Math.floor((heroIdle.w * SPRITE_SCALE) / 2),
        HERO_Y - 2,
      );
      drawCounters(ctx, state, VIEW_W, coinPopAgeMs < COUNTER_POP_MS);
      drawFloats(ctx, floats);
      drawBanner(ctx, banner, VIEW_W);
    },

    getState(): Readonly<GameState> {
      return engine.getState();
    },

    toSave(): SaveFile {
      return engine.toSave();
    },

    reset(): void {
      engine = createEngine();
      clearPresentation();
    },

    getHeroAnim: (): HeroAnim => heroAnim,

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
      if (events.some((e) => e.type === 'monsterKilled' || e.type === 'levelUp')) {
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
