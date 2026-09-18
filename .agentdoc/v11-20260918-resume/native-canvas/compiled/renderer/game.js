"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAVE_DEBOUNCE_MS = exports.BLOW_FLOAT_LIFT = exports.OPPONENT_HERO_X = exports.OPPONENT_NAME_Y = exports.OPPONENT_ORIGIN_X = exports.REPLAY_QUEUE_SIZE = exports.REPLAY_END_MS = exports.BLOW_MS_MAX = exports.BLOW_MS_MIN = exports.REPLAY_MS = exports.SHAKE_PX = exports.SHAKE_MS = exports.FEVER_SPARKLE_MS = exports.SWORD_TIP_Y = exports.SWORD_TIP_X = exports.SLASH_OVERLAY_DY = exports.DROP_TARGET_Y = exports.DROP_TARGET_X = exports.DROP_STAGGER_PX = exports.DROP_LAND_X = exports.SLASH_FRAME = exports.ATTACK_FRAME_MS = exports.IDLE_FRAME_MS = exports.HP_BAR = exports.MONSTER_X = exports.HERO_Y = exports.HERO_X = exports.SPRITE_SCALE = exports.GROUND_Y = exports.VIEW_H = exports.VIEW_W = void 0;
exports.monsterHpBarY = monsterHpBarY;
exports.shakeOffset = shakeOffset;
exports.blowMs = blowMs;
exports.monsterFloatAnchor = monsterFloatAnchor;
exports.heroHudTop = heroHudTop;
exports.createGame = createGame;
exports.createSaveScheduler = createSaveScheduler;
const index_js_1 = require("../core/index.js");
const equipment_js_1 = require("../core/equipment.js");
const fsm_js_1 = require("../core/fsm.js");
const index_js_2 = require("./sprites/index.js");
const heroForms_js_1 = require("./sprites/heroForms.js");
const audio_js_1 = require("./audio.js");
const effects_js_1 = require("./effects.js");
const anim_js_1 = require("./anim.js");
const hud_js_1 = require("./hud.js");
/** Internal canvas size in game pixels (CSS-scaled 2x, see static/). */
exports.VIEW_W = 200;
exports.VIEW_H = 130;
/** Top of the ground strip; entities stand on it (120 since 2026-09-06: a thin 10-px strip — 2 grass + 8 earth rows — under the feet). */
exports.GROUND_Y = 120;
/**
 * Uniform pixel scale (Assumption 17; user changes 2026-09-04). EVERY world
 * sprite — hero, party, monster, boss — draws at this one integer scale, so a
 * pixel is the same size across the whole scene. 2× = chunky retro pixels
 * (one art pixel = 2 canvas px = 4 screen px). Size differences come from
 * each sprite's NATIVE art dimensions (hero 14×14; monsters 13×10 → 20×17 by
 * species; 2026-09-04..06 redesigns), not from a per-entity scale multiplier. Mirrors sprite.ts
 * UNIT_SCALE (kept literal here for the F64 AC grep).
 */
exports.SPRITE_SCALE = 2;
/**
 * Hero sprite position (left side, feet on the ground). 66 since 2026-09-06
 * (user change): the hero stands in front of its party on the left third, and
 * the PvP scene mirrors it exactly across the field centre (OPPONENT_HERO_X).
 */
exports.HERO_X = 66;
exports.HERO_Y = exports.GROUND_Y - index_js_2.heroIdle.h * exports.SPRITE_SCALE;
/** Monster sprite left edge (right side; species art faces left already). */
exports.MONSTER_X = 150;
/** Health bar follows the species' head, with room for a boss crown. */
exports.HP_BAR = { w: 40, h: 5, gap: 3 };
function monsterHpBarY(monster) {
    const art = speciesSpritesFor(monster.speciesId).idle;
    const crown = monster.boss ? index_js_2.itemSprites.crown.h * exports.SPRITE_SCALE : 0;
    return exports.GROUND_Y - art.h * exports.SPRITE_SCALE - crown - exports.HP_BAR.gap - exports.HP_BAR.h;
}
/** ms per idle bob frame (GAME_ARCHITECTURE §4: 2-frame bob, 500 ms/frame). */
exports.IDLE_FRAME_MS = 500;
/** ms per hero attack frame: 3 frames (wind-up/slash/recover) over 180 ms. */
exports.ATTACK_FRAME_MS = fsm_js_1.HERO_ATTACK_MS / 3;
/** The attack frame during which the slash-arc overlay shows. */
exports.SLASH_FRAME = 1;
/** Where item drops land after their arc + bounce (the gap between the hero's box and the monster; later drops stagger to the right). */
exports.DROP_LAND_X = 125;
/** Horizontal stagger between simultaneous drops so they never stack. */
exports.DROP_STAGGER_PX = 8;
/** Drop flight destination: the fixed top-left coin icon. */
exports.DROP_TARGET_X = hud_js_1.COIN_COUNTER_X;
exports.DROP_TARGET_Y = hud_js_1.COIN_COUNTER_Y;
/** Sparkle burst size when a collected drop pops the counter. */
const COLLECT_SPARKLE_COUNT = 6;
/**
 * Top of the slash-arc overlay relative to the hero's top: the arc is centred
 * on the blade of the slash frame (2026-09-06 hero: blade at art rows
 * 6-6, centre 6; the arc is 7 rows tall → its top sits 3 rows
 * down), at the uniform scale.
 */
exports.SLASH_OVERLAY_DY = 3 * exports.SPRITE_SCALE;
/** Where the slash arc lands — the origin of the hero slash effect (F36). */
exports.SWORD_TIP_X = exports.HERO_X + index_js_2.heroAttack.w * exports.SPRITE_SCALE;
exports.SWORD_TIP_Y = exports.HERO_Y + exports.SLASH_OVERLAY_DY + (index_js_2.heroSlash.h * exports.SPRITE_SCALE) / 2;
/** Spears, guns, spells and fists have their own strike poses. */
const usesHeroSlash = (formId) => (0, heroForms_js_1.heroFormSprite)(formId) === index_js_2.heroIdle || [0, 4, 5, 8].includes((Number(formId.slice(1)) - 1) % 10);
const usesEquippedSlash = (state) => {
    if (!state.equipment)
        return usesHeroSlash(state.hero?.equipped.formId ?? 'h00');
    const id = state.equipment.loadout.weapon?.templateId;
    const type = id ? (0, equipment_js_1.equipmentTemplate)(id)?.weaponType : undefined;
    return type === 'sword' || type === 'greatsword' || type === 'dagger' || type === 'hammer';
};
/** All hero forms share the starter's 14px skeleton and forward strike anchor. */
const heroSlashPosition = (sprite) => ({
    x: exports.HERO_X + (index_js_2.heroIdle.w + sprite.w) * exports.SPRITE_SCALE / 2,
    y: exports.GROUND_Y - sprite.h * exports.SPRITE_SCALE + exports.SLASH_OVERLAY_DY,
});
/** One fever aura sparkle burst per this many ms while fever burns (F36). */
exports.FEVER_SPARKLE_MS = 100;
/** Camera shake after a critical hit (user change 2026-09-06, toned down the same day): a very light 1-px, 120 ms tremor. */
exports.SHAKE_MS = 120;
exports.SHAKE_PX = 1;
/**
 * Deterministic camera offset `ageMs` into a shake: the amplitude decays
 * linearly to 0 over SHAKE_MS while the sign flips every 30 ms (x) / 60 ms (y).
 */
function shakeOffset(ageMs) {
    const amp = Math.ceil(exports.SHAKE_PX * Math.max(0, 1 - ageMs / exports.SHAKE_MS));
    const phase = Math.floor(ageMs / 30);
    return { dx: (phase % 2 === 0 ? 1 : -1) * amp, dy: (phase % 4 < 2 ? 1 : -1) * Math.ceil(amp / 2) };
}
/** Every draw call shifted by (dx, dy): the whole world moves as one during a shake. */
function shifted(ctx, dx, dy) {
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
exports.REPLAY_MS = 12_000;
/** Preferred beat range; long battles accelerate to honor REPLAY_MS. */
exports.BLOW_MS_MIN = 250;
exports.BLOW_MS_MAX = 600;
/** Beat between the last blow and the VICTORY!/DEFEAT banner. */
exports.REPLAY_END_MS = 600;
/** Main delivers at most five pending defenses and one attack. */
exports.REPLAY_QUEUE_SIZE = 6;
/** Covers retained server receipts and delayed completion acknowledgements. */
const REPLAY_HISTORY_SIZE = 128;
/** Right edge the mirrored opponent group and its name hang from. */
exports.OPPONENT_ORIGIN_X = exports.VIEW_W - 8;
/** Baseline of the opponent's name, clear of its tallest member. */
exports.OPPONENT_NAME_Y = 58;
/**
 * Left edge of the opponent's hero in the battle scene (user change
 * 2026-09-06): the exact mirror of my hero across the field centre, so the two
 * heroes square off symmetrically with their parties behind them.
 */
exports.OPPONENT_HERO_X = exports.VIEW_W - exports.HERO_X - index_js_2.heroIdle.w * exports.SPRITE_SCALE;
/** How far a blow's damage float sits above the target's centre. */
exports.BLOW_FLOAT_LIFT = 6;
/** Per-blow pacing of a replay of `blows` blows, ms (§6). */
function blowMs(blows) {
    const count = Number.isFinite(blows) ? Math.max(0, Math.floor(blows)) : 0;
    return Math.min(exports.BLOW_MS_MAX, Math.max(exports.BLOW_MS_MIN, exports.REPLAY_MS / Math.max(1, count)), (exports.REPLAY_MS - exports.REPLAY_END_MS) / Math.max(1, count - 1));
}
/** Wire damage is a decimal string — a corrupt one must never throw mid-frame. */
function wireDamage(damage) {
    return /^\d+$/.test(damage) ? BigInt(damage) : 0n;
}
/** A single shot in the actor species' hit colour (no new preset, §6). */
/**
 * A companion's attack, styled per species (F35/F63). Melee 'slash' bursts ON
 * the target; the ranged styles fire FROM the actor toward `dirX`. Shared by
 * the field volley and the PvP replay so both read the same way (§4/§6).
 */
function spawnCompanionAttack(pool, speciesId, from, to, dirX) {
    const { style, preset } = effects_js_1.COMPANION_ATTACK[speciesKey(speciesId)];
    const origin = style === 'slash' ? to : from;
    (0, effects_js_1.spawnEffect)(pool, preset, origin.x, origin.y, dirX);
}
// Species idle art tinted per tier (60° hue per tier), cached per pair so
// the render loop never re-tints palettes frame after frame.
const tintedIdleCache = new Map();
/**
 * Art/effect key for a runtime species id (MonsterDef.speciesId and
 * Companion.speciesId are plain strings); unknown ids fall back to slime.
 */
function speciesKey(speciesId) {
    return (0, index_js_1.isSpeciesId)(speciesId) ? speciesId : index_js_1.SPECIES_IDS[0];
}
/** Species art for a runtime species id (unknown ids fall back to slime). */
function speciesSpritesFor(speciesId) {
    return index_js_2.monsterSprites[speciesKey(speciesId)];
}
/**
 * The party on the field, back → front: the five companions with the best
 * type-adjusted power against THIS monster. Never cached — the auto-change
 * has to be visible the frame after a new monster spawns (§6).
 */
function fieldParty(state, companions = state.companions) {
    return (0, index_js_1.partyOrder)((0, index_js_1.activeFieldCompanions)(companions, state.monster.type, state.hero?.equipped, state.hero?.reincarnations ?? 0, state.monster.curveVersion));
}
/** Where a member of `party` stands, or null when it is not on the field. */
function partySlotOf(party, id) {
    return (0, index_js_2.partySlots)(party, exports.GROUND_Y)[party.findIndex((c) => c.id === id)] ?? null;
}
/**
 * Where a member of the mirrored opponent group stands: drawParty's own
 * originX rule (x measured leftwards from the origin), so the slots the blows
 * shoot at stay glued to the art.
 */
function opponentSlotOf(party, id) {
    const index = party.findIndex((c) => c.id === id);
    const slot = (0, index_js_2.partySlots)(party, exports.GROUND_Y)[index];
    const member = party[index];
    if (slot === undefined || member === undefined) {
        return null;
    }
    const art = speciesSpritesFor(member.speciesId).idle;
    return { ...slot, x: exports.OPPONENT_ORIGIN_X - (slot.x - index_js_2.PARTY_X) - art.w * slot.scale };
}
/** Centre of a drawn party member — where its shots and sparkles start. */
function slotCentre(slot, speciesId) {
    const art = speciesSpritesFor(speciesId).idle;
    return { x: slot.x + (art.w * slot.scale) / 2, y: slot.y - (art.h * slot.scale) / 2 };
}
/** Uniform draw scale (SPRITE_SCALE): size variety is in the native art now,
 * so a boss reads as a boss from its crown + aura, not a bigger pixel grid. */
function monsterScale() {
    return exports.SPRITE_SCALE;
}
/** Centre of the monster's drawn art — where its hit effects burst. */
function monsterCentre(monster) {
    const scale = monsterScale();
    const art = speciesSpritesFor(monster.speciesId).idle;
    return { x: exports.MONSTER_X + (art.w * scale) / 2, y: exports.GROUND_Y - (art.h * scale) / 2 };
}
/** Damage clears the head, boss crown and HP bar without drifting off target. */
function monsterFloatAnchor(monster) {
    return { x: monsterCentre(monster).x, y: monsterHpBarY(monster) - 8 };
}
/** Idle silhouette keeps the label stack stable during all attack poses. */
function heroHudTop(formId) {
    const idle = (0, heroForms_js_1.heroFormSprite)(formId);
    return exports.GROUND_Y - idle.h * exports.SPRITE_SCALE + Math.max(0, idle.frames[0]?.findIndex(row => /[^.]/.test(row)) ?? 0) * exports.SPRITE_SCALE;
}
function tintedIdleSprite(monster) {
    const key = `${monster.speciesId}:${String(monster.tier)}`;
    const cached = tintedIdleCache.get(key);
    if (cached !== undefined) {
        return cached;
    }
    const base = speciesSpritesFor(monster.speciesId);
    const tinted = {
        ...base.idle,
        palette: (0, index_js_2.paletteForTier)(base.idle.palette, monster.tier),
    };
    tintedIdleCache.set(key, tinted);
    return tinted;
}
/** The field strip: grass line over packed earth, full width. */
function drawField(ctx) {
    ctx.fillStyle = index_js_2.COLORS.forest;
    ctx.fillRect(0, exports.GROUND_Y, exports.VIEW_W, 2);
    ctx.fillStyle = index_js_2.COLORS.maroon;
    ctx.fillRect(0, exports.GROUND_Y + 2, exports.VIEW_W, exports.VIEW_H - exports.GROUND_Y - 2);
}
/** Item art for a runtime item id (unknown ids fall back to the coin). */
function itemSpriteFor(itemId) {
    // ItemDef.id is a plain string — widen the record to index it.
    const byId = index_js_2.itemSprites;
    return byId[itemId] ?? index_js_2.itemSprites.coin;
}
/**
 * Draw only the bottom `visibleRows` rows of a sprite frame — the spawn
 * pop-in reveals the new monster bottom-up out of the ground (Manual M3).
 * Same skip rules as drawSprite: unknown chars/rows never throw.
 */
function drawSpriteBottomRows(ctx, sprite, frame, x, y, visibleRows, scale = 1) {
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
            if (ch === index_js_2.TRANSPARENT || ch === '') {
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
/**
 * Wrap an engine with the scene/HUD presentation state.
 * `audio` defaults to the real WebAudio blips (SPEC F24) — lazy and fully
 * guarded, so the default is a silent no-op under node/tests and can never
 * break the loop; tests inject a recording fake to pin the triggers.
 */
function createGame(initialEngine, audio = (0, audio_js_1.createGameAudio)(), options = {}) {
    let engine = initialEngine;
    let timeMs = 0;
    let heroAnim = (0, fsm_js_1.createHeroAnim)();
    // Boot straight into idle: the monster on screen at load (fresh or resumed)
    // is already alive — the spawn pop-in is for monsters born from a kill.
    let monsterAnim = (0, fsm_js_1.tickMonster)((0, fsm_js_1.createMonsterAnim)(), fsm_js_1.MONSTER_SPAWNING_MS);
    const floats = (0, hud_js_1.createFloatPool)();
    const particles = (0, anim_js_1.createParticlePool)();
    const impacts = (0, effects_js_1.createImpactQueue)();
    const drops = (0, anim_js_1.createDropPool)();
    const banner = (0, hud_js_1.createBanner)();
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
    let rosterBefore = [];
    // The PvP battle scene, or null while the field owns the canvas (F66).
    let scene = null;
    const sceneQueue = [];
    const completedReplays = new Set();
    /** Drop every in-flight presentation system (Reset Progress and rebirth). */
    const clearPresentation = () => {
        timeMs = 0;
        heroAnim = (0, fsm_js_1.createHeroAnim)();
        // Boot the monster straight into idle: the pop-in is for kill-born
        // spawns (T15 decision) — rebirth re-arms it right after this call.
        monsterAnim = (0, fsm_js_1.tickMonster)((0, fsm_js_1.createMonsterAnim)(), fsm_js_1.MONSTER_SPAWNING_MS);
        for (const f of floats) {
            f.active = false;
        }
        for (const p of particles) {
            p.active = false;
        }
        for (const impact of impacts)
            impact.active = false;
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
    const pvpPresentation = (event, before) => () => {
        (0, hud_js_1.showBanner)(banner, event.won ? hud_js_1.VICTORY_TEXT : hud_js_1.DEFEAT_TEXT);
        const state = engine.getState();
        if (event.stolen !== null) {
            // The prize pops in at the party slot it will fight from.
            const slot = partySlotOf(fieldParty(state), event.stolen.id);
            if (slot !== null) {
                const at = slotCentre(slot, event.stolen.speciesId);
                (0, effects_js_1.spawnEffect)(particles, effects_js_1.EFFECTS.captureSparkle, at.x, at.y, 1);
            }
        }
        const lostId = event.lostId;
        if (lostId !== null) {
            // It is already off the roster: scatter the art it was drawn with,
            // where it stood. A benched loss was never on screen.
            const party = fieldParty(state, before);
            const lost = party.find((c) => c.id === lostId);
            const slot = partySlotOf(party, lostId);
            if (lost !== undefined && slot !== null) {
                const art = speciesSpritesFor(lost.speciesId).idle;
                (0, anim_js_1.spawnSpriteScatter)(particles, art, 0, slot.x, slot.y - art.h * slot.scale, slot.scale);
            }
        }
    };
    /**
     * One blow of the replay: a shot from the actor's slot, then the target's
     * own hit effect and a damage float coloured by the match-up; a `ko`
     * scatters the target and takes it out of its group (§6). A blow naming
     * someone who is not on the field draws nothing.
     */
    const playBlow = (s, blow) => {
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
        if (mineActs)
            s.heroAnim = (0, fsm_js_1.heroInput)();
        else
            s.rivalAnim = (0, fsm_js_1.heroInput)();
        const from = slotCentre(actorSlot, actor.speciesId);
        const at = slotCentre(targetSlot, target.speciesId);
        spawnCompanionAttack(s.particles, actor.speciesId, from, at, mineActs ? 1 : -1);
        (0, effects_js_1.spawnImpact)(s.particles, s.impacts, (0, effects_js_1.companionImpactOf)(actor.speciesId), at.x, at.y, mineActs ? 1 : -1);
        (0, effects_js_1.spawnImpact)(s.particles, s.impacts, (0, effects_js_1.heroImpactOf)((mineActs ? s.ownHero?.formId : s.opponentHero?.formId) ?? 'h00'), at.x, at.y - 5, mineActs ? 1 : -1);
        (0, effects_js_1.spawnEffect)(s.particles, effects_js_1.EFFECTS.hit[speciesKey(target.speciesId)], at.x, at.y, 1, s.hitCount++);
        (0, hud_js_1.spawnFloat)(s.floats, at.x, at.y - exports.BLOW_FLOAT_LIFT, (0, index_js_1.format)(wireDamage(blow.damage)), false, (0, hud_js_1.floatColor)((0, index_js_1.effectiveness)((0, index_js_1.typeOf)(actor.speciesId), (0, index_js_1.typeOf)(target.speciesId))));
        if (!blow.ko) {
            return;
        }
        audio.killArpeggio();
        const art = speciesSpritesFor(target.speciesId).idle;
        (0, anim_js_1.spawnSpriteScatter)(s.particles, art, 0, targetSlot.x, targetSlot.y - art.h * targetSlot.scale, targetSlot.scale);
        targets.splice(targets.indexOf(target), 1);
    };
    /** New battles use actual hero turns. The old companion-only animation is
     * deliberately separate so durable pre-upgrade receipts retain their shape. */
    const playHeroicBlow = (s, blow) => {
        const own = blow.side === 'A';
        const actors = own ? s.ownFighters : s.opponentFighters;
        const targets = own ? s.opponentFighters : s.ownFighters;
        const actor = actors.find(f => f.id === blow.actorId && f.kind === blow.actorKind);
        const target = targets.find(f => f.id === blow.targetId && f.kind === blow.targetKind);
        if (!actor || !target || actor.remaining <= 0n || target.remaining <= 0n)
            return;
        const centre = (fighter, mine) => {
            if (fighter.kind === 'hero')
                return { x: (mine ? exports.HERO_X : exports.OPPONENT_HERO_X) + 14, y: exports.GROUND_Y - 14 };
            const slot = mine ? partySlotOf(s.mine, fighter.id) : opponentSlotOf(s.theirs, fighter.id);
            return slot ? slotCentre(slot, fighter.speciesId ?? 'slime') : null;
        };
        const from = centre(actor, own), at = centre(target, !own);
        if (!from || !at)
            return;
        audio.attackTick();
        if (actor.kind === 'hero')
            (0, effects_js_1.spawnImpact)(s.particles, s.impacts, (0, effects_js_1.heroImpactOf)(actor.formId ?? 'h00'), at.x, at.y, own ? 1 : -1);
        else {
            spawnCompanionAttack(s.particles, actor.speciesId ?? 'slime', from, at, own ? 1 : -1);
            (0, effects_js_1.spawnImpact)(s.particles, s.impacts, (0, effects_js_1.companionImpactOf)(actor.speciesId ?? 'slime'), at.x, at.y, own ? 1 : -1);
        }
        const damage = wireDamage(blow.damage);
        target.remaining = blow.ko || damage >= target.remaining ? 0n : target.remaining - damage;
        (0, hud_js_1.spawnFloat)(s.floats, at.x, at.y - exports.BLOW_FLOAT_LIFT, (0, index_js_1.format)(damage), blow.crit ?? false, actor.type && target.type ? (0, hud_js_1.floatColor)((0, index_js_1.effectiveness)(actor.type, target.type)) : index_js_2.COLORS.white);
        if (target.kind === 'hero') {
            if (own)
                s.rivalHitUntil = s.ageMs + 120;
            else
                s.heroHitUntil = s.ageMs + 120;
        }
        else
            (0, effects_js_1.spawnEffect)(s.particles, effects_js_1.EFFECTS.hit[speciesKey(target.speciesId ?? 'slime')], at.x, at.y, 1, s.hitCount++);
        if (!blow.ko)
            return;
        audio.killArpeggio();
        if (target.kind === 'hero') {
            const mine = !own, combat = mine ? s.ownCombat : s.opponentCombat;
            const sprite = (0, index_js_2.equippedHeroSprite)(target.formId ?? combat?.hero.formId ?? 'h00', combat?.loadout.weapon ?? null, { flipX: !mine });
            (0, anim_js_1.spawnSpriteScatter)(s.particles, sprite, 0, (mine ? exports.HERO_X : exports.OPPONENT_HERO_X) - index_js_2.EQUIPPED_HERO_PADDING.x * exports.SPRITE_SCALE, exports.HERO_Y - index_js_2.EQUIPPED_HERO_PADDING.y * exports.SPRITE_SCALE, exports.SPRITE_SCALE);
            if (mine)
                s.heroAnim = (0, fsm_js_1.createHeroAnim)();
            else
                s.rivalAnim = (0, fsm_js_1.createHeroAnim)();
        }
        else {
            const party = own ? s.theirs : s.mine;
            const slot = own ? opponentSlotOf(party, target.id) : partySlotOf(party, target.id);
            if (slot) {
                const sprite = speciesSpritesFor(target.speciesId ?? 'slime').idle;
                (0, anim_js_1.spawnSpriteScatter)(s.particles, sprite, 0, slot.x, exports.GROUND_Y - sprite.h * exports.SPRITE_SCALE, exports.SPRITE_SCALE);
            }
            const index = party.findIndex(c => c.id === target.id);
            if (index >= 0)
                party.splice(index, 1);
        }
    };
    /** Run the scene's clock: due blows, then the verdict + the field back. */
    const advanceScene = (dt) => {
        const s = scene;
        if (s === null) {
            return;
        }
        s.ageMs += dt;
        if (!s.heroic) {
            s.heroAnim = (0, fsm_js_1.tickHero)(s.heroAnim, dt);
            s.rivalAnim = (0, fsm_js_1.tickHero)(s.rivalAnim, dt);
        }
        (0, hud_js_1.tickFloats)(s.floats, dt);
        (0, anim_js_1.tickParticles)(s.particles, dt);
        (0, effects_js_1.tickImpacts)(s.particles, s.impacts, dt);
        (0, hud_js_1.tickBanner)(s.banner, dt);
        if (s.heroic) {
            const duration = Math.min(fsm_js_1.HERO_ATTACK_MS, 2 * s.blowMs);
            // Process due actions and their strike impacts in chronological order.
            // A delayed render frame therefore cannot put a KO after the next turn.
            for (;;) {
                const turnAt = s.next < s.blows.length ? s.next * s.blowMs : Infinity;
                const hitAt = s.pendingHits[0]?.at ?? Infinity;
                if (Math.min(turnAt, hitAt) > s.ageMs)
                    break;
                if (hitAt <= turnAt) {
                    const pending = s.pendingHits.shift();
                    playHeroicBlow(s, pending.blow);
                }
                else {
                    const blow = s.blows[s.next++];
                    if (blow.actorKind === 'hero') {
                        if (blow.side === 'A')
                            s.heroStartedAt = turnAt;
                        else
                            s.rivalStartedAt = turnAt;
                        s.pendingHits.push({ blow, at: turnAt + duration / 3 });
                    }
                    else
                        playHeroicBlow(s, blow);
                }
            }
            const motion = (start, fighters) => {
                const age = s.ageMs - start;
                return fighters.some(f => f.kind === 'hero' && f.remaining > 0n) && age >= 0 && age < duration
                    ? { state: 'attack', t: age / duration * fsm_js_1.HERO_ATTACK_MS } : (0, fsm_js_1.createHeroAnim)();
            };
            s.heroAnim = motion(s.heroStartedAt, s.ownFighters);
            s.rivalAnim = motion(s.rivalStartedAt, s.opponentFighters);
        }
        else
            while (s.next < s.blows.length && s.ageMs >= s.next * s.blowMs) {
                const blow = s.blows[s.next++];
                if (blow !== undefined) {
                    playBlow(s, blow);
                }
            }
        if (s.presentation && s.next === s.blows.length && s.pendingHits.length === 0 && !s.resultShown) {
            s.resultShown = true;
            (0, hud_js_1.showBanner)(s.banner, s.presentation.won ? hud_js_1.VICTORY_TEXT : hud_js_1.DEFEAT_TEXT);
        }
        if (s.ageMs < s.endsAt) {
            return;
        }
        scene = sceneQueue.shift() ?? null;
        if (s.presentation) {
            completedReplays.add(s.presentation.battleId);
            if (completedReplays.size > REPLAY_HISTORY_SIZE) {
                const oldest = completedReplays.values().next().value;
                if (oldest !== undefined)
                    completedReplays.delete(oldest);
            }
            options.onReplayComplete?.(s.presentation.battleId);
        }
        else if (s.after !== null) {
            s.after();
        }
        else {
            // Legacy uncommitted replay callers retain their original field banner.
            (0, hud_js_1.showBanner)(banner, s.mine.length > 0 && s.theirs.length === 0 ? hud_js_1.VICTORY_TEXT : hud_js_1.DEFEAT_TEXT);
        }
        options.onReplayStatus?.(scene?.presentation ?? null);
    };
    /**
     * The ONE presentation router: `attack()` and `update()` both feed their
     * engine events through it, so a companion kill looks exactly like a hero
     * kill. An empty batch does nothing.
     */
    const handleEvents = (events, verdictScene) => {
        // Glyphs plus their bottom outline extend 6px below the spawn coordinate
        // at either damage scale. Leave another 2px clear above the boss HP bar.
        const floatAnchor = () => monsterFloatAnchor(target);
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
                    (0, effects_js_1.spawnImpact)(particles, impacts, (0, effects_js_1.heroImpactOf)(engine.getState().hero?.equipped.formId ?? 'h00'), monsterCentre(target).x, monsterCentre(target).y);
                    (0, hud_js_1.spawnFieldFloat)(floats, floatAnchor().x, floatAnchor().y, (0, index_js_1.format)(event.damage), event.crit);
                    if (usesEquippedSlash(engine.getState())) {
                        const state = engine.getState();
                        const slash = heroSlashPosition((0, heroForms_js_1.heroFormSprite)(state.hero?.equipped.formId ?? 'h00', true));
                        (0, effects_js_1.spawnEffect)(particles, state.souls > 0 ? effects_js_1.EFFECTS.heroSlashSouls : effects_js_1.EFFECTS.heroSlash, slash.x, slash.y + index_js_2.heroSlash.h * exports.SPRITE_SCALE / 2, 1);
                    }
                    if (event.crit) {
                        // Critical hit: the camera shakes and hot sparks ring the monster.
                        shakeAgeMs = 0;
                        const centre = monsterCentre(target);
                        (0, effects_js_1.spawnEffect)(particles, effects_js_1.EFFECTS.critBurst, centre.x, centre.y, 1, hitCount);
                    }
                    break;
                case 'companionAttack': {
                    (0, effects_js_1.spawnImpact)(particles, impacts, (0, effects_js_1.companionImpactOf)(event.speciesId), monsterCentre(target).x, monsterCentre(target).y);
                    // The float carries the match-up: yellow super, steel weak (§6).
                    (0, hud_js_1.spawnFieldFloat)(floats, floatAnchor().x, floatAnchor().y, (0, index_js_1.format)(event.damage), false, (0, hud_js_1.floatColor)(event.effectiveness));
                    const slot = partySlotOf(fieldParty(engine.getState()), event.companionId);
                    if (slot !== null) {
                        // Each companion attacks in its own style (§4): golems slash, slimes
                        // lob, bats bolt, dragons breathe, ghosts throw spectral orbs.
                        spawnCompanionAttack(particles, event.speciesId, slotCentre(slot, event.speciesId), monsterCentre(target), 1);
                    }
                    break;
                }
                case 'monsterHit':
                    monsterAnim = (0, fsm_js_1.monsterHit)(monsterAnim);
                    (0, effects_js_1.spawnEffect)(particles, effects_js_1.EFFECTS.hit[speciesKey(target.speciesId)], monsterCentre(target).x, monsterCentre(target).y, 1, hitCount++);
                    break;
                case 'monsterKilled': {
                    // Decompose the (tier-tinted) sprite into gravity particles; the
                    // FSM rides DYING for the same 500ms the scatter lives.
                    audio.killArpeggio();
                    const sprite = tintedIdleSprite(event.monster);
                    const scale = monsterScale();
                    (0, anim_js_1.spawnSpriteScatter)(particles, sprite, 0, exports.MONSTER_X, exports.GROUND_Y - sprite.h * scale, scale);
                    monsterAnim = (0, fsm_js_1.monsterKilled)(monsterAnim);
                    break;
                }
                case 'bossCaptured': {
                    // Sparkle where the boss stood, then where it joins the party — a
                    // capture the type match-up benches sparkles at the boss only (§6).
                    const centre = monsterCentre(target);
                    (0, effects_js_1.spawnEffect)(particles, effects_js_1.EFFECTS.captureSparkle, centre.x, centre.y, 1);
                    const slot = partySlotOf(fieldParty(engine.getState()), event.companion.id);
                    if (slot !== null) {
                        const at = slotCentre(slot, event.companion.speciesId);
                        (0, effects_js_1.spawnEffect)(particles, effects_js_1.EFFECTS.captureSparkle, at.x, at.y, 1);
                    }
                    break;
                }
                case 'companionReleased': {
                    // The draw used to vanish; now it says what it paid and whether the
                    // roster's weakest keeper is the one worth trading away (§6).
                    const centre = monsterCentre(target);
                    (0, hud_js_1.spawnFloat)(floats, centre.x, centre.y, event.souls > 0 ? `RELEASED +${String(event.souls)}` : 'RELEASED', false, event.strongerThanWeakest ? index_js_2.COLORS.orange : index_js_2.COLORS.steel);
                    break;
                }
                case 'feverStart':
                    audio.feverStart();
                    break;
                case 'itemDropped': {
                    let slot = 0;
                    for (const drop of event.drops) {
                        (0, anim_js_1.spawnDrop)(drops, {
                            itemId: drop.item.id,
                            // Launch at the monster's left edge — the drop bursts out of
                            // the dying monster toward the gap without ever overlapping
                            // the scatter pixels.
                            startX: exports.MONSTER_X - 6,
                            startY: exports.GROUND_Y - 12,
                            landX: exports.DROP_LAND_X + slot * exports.DROP_STAGGER_PX,
                            landY: exports.GROUND_Y - itemSpriteFor(drop.item.id).h,
                            targetX: exports.DROP_TARGET_X,
                            targetY: exports.DROP_TARGET_Y,
                        });
                        slot++;
                    }
                    break;
                }
                case 'levelUp':
                    audio.levelUpFanfare();
                    (0, hud_js_1.showBanner)(banner);
                    (0, anim_js_1.spawnSparkles)(particles, exports.HERO_X + Math.floor((index_js_2.heroIdle.w * exports.SPRITE_SCALE) / 2), exports.HERO_Y + 4 * exports.SPRITE_SCALE);
                    break;
                case 'pvpResolved': {
                    const show = pvpPresentation(event, rosterBefore);
                    // A replay opened the scene first: the verdict waits for it (F53).
                    const recipient = verdictScene ?? scene;
                    if (recipient === null) {
                        show();
                    }
                    else {
                        recipient.after = show;
                    }
                    break;
                }
                case 'rebirth':
                    // Everything on screen belonged to the old run; monster 0 then
                    // rises out of the ground exactly like a kill-born spawn.
                    clearPresentation();
                    monsterAnim = (0, fsm_js_1.createMonsterAnim)();
                    break;
                case 'monsterSpawned':
                    // The FSM stays deferred on purpose: its DYING → SPAWNING
                    // transition brings the new monster in after the scatter ends.
                    target = event.monster;
                    if (event.monster.boss) {
                        const centre = monsterCentre(event.monster);
                        (0, effects_js_1.spawnEffect)(particles, effects_js_1.EFFECTS.bossShockwave, centre.x, centre.y, 1);
                    }
                    break;
            }
        }
    };
    const makeScene = (replay, ownParty, ownHero, presentation, after) => {
        const heroic = replay.ownFighters !== undefined && replay.opponentFighters !== undefined;
        const perBlow = heroic ? Math.min(blowMs(replay.blows.length), (exports.REPLAY_MS - exports.REPLAY_END_MS - exports.ATTACK_FRAME_MS) / Math.max(1, replay.blows.length - 1)) : blowMs(replay.blows.length);
        const next = {
            name: replay.opponentName,
            ownHero: ownHero ? { ...ownHero } : undefined,
            opponentHero: replay.opponentHero ? { ...replay.opponentHero } : undefined,
            ownCombat: presentation?.ownCombat ? structuredClone(presentation.ownCombat) : undefined,
            opponentCombat: replay.opponentCombat ? structuredClone(replay.opponentCombat) : undefined,
            heroic, ownFighters: (replay.ownFighters ?? []).map(f => ({ ...f, remaining: wireDamage(f.hp) })),
            opponentFighters: (replay.opponentFighters ?? []).map(f => ({ ...f, remaining: wireDamage(f.hp) })),
            heroStartedAt: -Infinity, rivalStartedAt: -Infinity, heroHitUntil: 0, rivalHitUntil: 0, pendingHits: [],
            presentation,
            heroAnim: (0, fsm_js_1.createHeroAnim)(), rivalAnim: (0, fsm_js_1.createHeroAnim)(),
            floats: (0, hud_js_1.createFloatPool)(), particles: (0, anim_js_1.createParticlePool)(), impacts: (0, effects_js_1.createImpactQueue)(),
            banner: (0, hud_js_1.createBanner)(), hitCount: 0, resultShown: false,
            mine: (0, index_js_1.partyOrder)(ownParty.map(c => ({ ...c }))),
            theirs: (0, index_js_1.partyOrder)(replay.opponentParty.map(c => ({ ...c }))),
            blows: replay.blows.map(b => ({ ...b })),
            blowMs: perBlow,
            next: 0,
            ageMs: 0,
            endsAt: Math.min(exports.REPLAY_MS, Math.max(0, replay.blows.length - 1) * perBlow + exports.REPLAY_END_MS + (heroic ? Math.min(exports.ATTACK_FRAME_MS, perBlow * 2 / 3) : 0)),
            after,
        };
        (0, hud_js_1.showBanner)(next.banner, `VS ${replay.opponentName}`);
        return next;
    };
    const queueScene = (next) => {
        if (scene === null) {
            scene = next;
            options.onReplayStatus?.(next.presentation);
        }
        else
            sceneQueue.push(next);
    };
    const legacyReplay = (replay, won) => {
        // Legacy callers have no historical own-party snapshot. New presentations
        // always use the complete server snapshot, including untouched back rows.
        const fought = new Set(replay.blows.map(b => b.side === 'A' ? b.actorId : b.targetId));
        const state = engine.getState();
        const next = makeScene(replay, state.companions.filter(c => fought.has(c.id)), state.hero?.equipped, null, won === undefined ? null : () => (0, hud_js_1.showBanner)(banner, won ? hud_js_1.VICTORY_TEXT : hud_js_1.DEFEAT_TEXT));
        queueScene(next);
        return next;
    };
    const enqueueReplay = (presentation) => {
        const id = presentation.battleId;
        if (completedReplays.has(id)) {
            options.onReplayComplete?.(id);
            return;
        }
        if (scene?.presentation?.battleId === id || sceneQueue.some(s => s.presentation?.battleId === id))
            return;
        // No acknowledgement on overflow: main retains the durable receipt and
        // can redeliver it. Normal delivery is bounded to five defenses + one attack.
        if (sceneQueue.length + Number(scene !== null) >= exports.REPLAY_QUEUE_SIZE)
            return;
        const snapshot = structuredClone(presentation);
        queueScene(makeScene(snapshot.replay, snapshot.ownParty, snapshot.ownHero, snapshot, null));
    };
    return {
        lastActionError: () => engine.lastActionError(),
        beginEquipmentBatch: () => { engine.beginEquipmentBatch(); },
        endEquipmentBatch: () => { const events = engine.endEquipmentBatch(); handleEvents(events); return events; },
        refreshShop: (now) => { const events = engine.refreshShop(now); handleEvents(events); return events; },
        attack(source) {
            // PvP attacks are driven exclusively by the timed battle blows.
            if (scene !== null)
                return [];
            // Inputs still deal damage immediately; visual swings finish with one pending.
            heroAnim = (0, fsm_js_1.heroInput)(heroAnim);
            const events = engine.attack(source);
            handleEvents(events);
            return events;
        },
        update(dtMs) {
            const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
            if (scene !== null) {
                advanceScene(dt);
                return []; // Never catch up field time, including the scene's last frame.
            }
            timeMs += dt;
            heroAnim = (0, fsm_js_1.tickHero)(heroAnim, dt);
            monsterAnim = (0, fsm_js_1.tickMonster)(monsterAnim, dt);
            (0, hud_js_1.tickFloats)(floats, dt);
            (0, anim_js_1.tickParticles)(particles, dt);
            (0, effects_js_1.tickImpacts)(particles, impacts, dt);
            (0, anim_js_1.tickDrops)(drops, dt);
            (0, hud_js_1.tickBanner)(banner, dt);
            coinPopAgeMs += dt;
            shakeAgeMs += dt;
            for (const drop of drops) {
                if (drop.arrived) {
                    drop.arrived = false;
                    coinPopAgeMs = 0;
                    (0, anim_js_1.spawnSparkles)(particles, drop.targetX, drop.targetY, COLLECT_SPARKLE_COUNT);
                }
            }
            // The engine clock moves ONLY here (Assumption 39): companion volleys
            // and fever transitions come out of the same router as attack()'s.
            const events = engine.tick(dt);
            handleEvents(events);
            feverSparkleAgeMs += dt;
            if (engine.getState().fever.active) {
                if (feverSparkleAgeMs >= exports.FEVER_SPARKLE_MS) {
                    feverSparkleAgeMs = 0;
                    (0, effects_js_1.spawnEffect)(particles, effects_js_1.EFFECTS.feverAura, exports.HERO_X + (index_js_2.heroIdle.w * exports.SPRITE_SCALE) / 2, exports.HERO_Y + (index_js_2.heroIdle.h * exports.SPRITE_SCALE) / 2, 1);
                }
            }
            else {
                feverSparkleAgeMs = 0;
            }
            return events;
        },
        apply(a) {
            rosterBefore = engine.getState().companions;
            let verdictScene;
            if (a.type === 'pvpResult' && a.replay !== undefined) {
                // The scene opens BEFORE the verdict lands, so the banner and the
                // pop-in/scatter wait until it ends (F53).
                verdictScene = legacyReplay(a.replay);
            }
            const events = engine.apply(a);
            handleEvents(events, verdictScene);
            return events;
        },
        playReplay: (replay, won) => { legacyReplay(replay, won); },
        enqueueReplay,
        isReplaying: () => scene !== null,
        draw(screen) {
            screen.clearRect(0, 0, exports.VIEW_W, exports.VIEW_H);
            // A critical hit shakes the world (everything but the top-left counters
            // and the banner) for SHAKE_MS; `ctx` is the shifted view of `screen`.
            const shake = scene === null && options.screenShake === true && shakeAgeMs < exports.SHAKE_MS ? shakeOffset(shakeAgeMs) : null;
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
            const partyFrame = Math.floor(shownTime / exports.IDLE_FRAME_MS) % index_js_2.monsterSprites.slime.idle.frames.length;
            const myParty = scene === null ? fieldParty(state) : scene.mine;
            (0, index_js_2.drawParty)(ctx, myParty, partyFrame, exports.GROUND_Y);
            // Every monster wears its type under its feet (user change 2026-09-06).
            (0, index_js_2.drawPartyBadges)(ctx, myParty, exports.GROUND_Y);
            if (scene !== null) {
                (0, index_js_2.drawParty)(ctx, scene.theirs, partyFrame, exports.GROUND_Y, {
                    flipX: false,
                    originX: exports.VIEW_W - 8,
                });
                (0, index_js_2.drawPartyBadges)(ctx, scene.theirs, exports.GROUND_Y, { originX: exports.VIEW_W - 8 });
                (0, index_js_2.drawText)(ctx, scene.name, exports.OPPONENT_ORIGIN_X - (0, index_js_2.textWidth)(scene.name), exports.OPPONENT_NAME_Y);
            }
            const attacking = shownHero.state === 'attack';
            const heroFormId = (scene === null ? state.hero?.equipped.formId : scene.ownCombat?.hero.formId ?? scene.ownHero?.formId) ?? 'h00';
            const heroIdleSprite = (0, heroForms_js_1.heroFormSprite)(heroFormId);
            const heroSprite = attacking ? (0, heroForms_js_1.heroFormSprite)(heroFormId, true) : heroIdleSprite;
            const heroX = exports.HERO_X + (index_js_2.heroIdle.w - heroSprite.w) * exports.SPRITE_SCALE / 2;
            const heroY = exports.GROUND_Y - heroSprite.h * exports.SPRITE_SCALE;
            // Compact forms reserve transparent space for attack poses. Anchor labels
            // to the idle silhouette so raised weapons never bounce the HUD.
            const heroTop = heroHudTop(heroFormId);
            const heroFrame = attacking
                ? Math.min(heroSprite.frames.length - 1, Math.floor(shownHero.t / exports.ATTACK_FRAME_MS))
                : Math.floor(shownTime / exports.IDLE_FRAME_MS) % heroSprite.frames.length;
            const equipped = scene === null ? state.equipment !== undefined : scene.heroic;
            const weapon = (scene === null ? state.equipment?.loadout.weapon : scene.ownCombat?.loadout.weapon) ?? null;
            const heroAlive = !scene?.heroic || scene.ownFighters.some(f => f.kind === 'hero' && f.remaining > 0n);
            if (scene === null && state.fever.active) {
                // Hue-cycling outline UNDER the hero — the real sprite lands on top.
                if (equipped)
                    (0, index_js_2.drawFeverAura)(ctx, (0, index_js_2.equippedHeroSprite)(heroFormId, weapon, { attacking, frame: heroFrame }), 0, heroX - index_js_2.EQUIPPED_HERO_PADDING.x * exports.SPRITE_SCALE, heroY - index_js_2.EQUIPPED_HERO_PADDING.y * exports.SPRITE_SCALE, exports.SPRITE_SCALE, timeMs);
                else
                    (0, index_js_2.drawFeverAura)(ctx, heroSprite, heroFrame, heroX, heroY, exports.SPRITE_SCALE, timeMs);
            }
            if (heroAlive) {
                if (equipped)
                    (0, index_js_2.drawEquippedHero)(ctx, heroFormId, weapon, heroX, heroY, { scale: exports.SPRITE_SCALE, attacking, frame: heroFrame, timeMs: shownTime,
                        ...(scene?.heroic && scene.ageMs < scene.heroHitUntil ? { tint: index_js_2.COLORS.white } : {}) });
                else
                    (0, index_js_2.drawSprite)(ctx, heroSprite, heroFrame, heroX, heroY, { scale: exports.SPRITE_SCALE });
            }
            if (attacking && heroFrame === exports.SLASH_FRAME && scene === null && usesEquippedSlash(state)) {
                // Slash arc in front of the blade, toward the monster. Not during a
                // replay: field presentation is suppressed there (§6).
                const slash = heroSlashPosition(heroSprite);
                (0, index_js_2.drawSprite)(ctx, index_js_2.heroSlash, 0, slash.x, slash.y, { scale: exports.SPRITE_SCALE });
            }
            if (scene !== null && (!scene.heroic || scene.opponentFighters.some(f => f.kind === 'hero' && f.remaining > 0n))) {
                // The opponent's hero: the same art mirrored (facing left) in the
                // rival palette, in front of its own party, swinging on its blows.
                const rivalAttacking = scene.rivalAnim.state === 'attack';
                const rivalId = scene.opponentCombat?.hero.formId ?? scene.opponentHero?.formId ?? 'h00';
                const rivalSprite = (0, heroForms_js_1.heroFormSprite)(rivalId, rivalAttacking);
                const rivalFrame = rivalAttacking
                    ? Math.min(rivalSprite.frames.length - 1, Math.floor(scene.rivalAnim.t / exports.ATTACK_FRAME_MS))
                    : Math.floor(shownTime / exports.IDLE_FRAME_MS) % rivalSprite.frames.length;
                if (scene.heroic)
                    (0, index_js_2.drawEquippedHero)(ctx, rivalId, scene.opponentCombat?.loadout.weapon ?? null, exports.OPPONENT_HERO_X, exports.HERO_Y, { flipX: true, scale: exports.SPRITE_SCALE, attacking: rivalAttacking, frame: rivalFrame,
                        timeMs: shownTime, ...(scene.ageMs < scene.rivalHitUntil ? { tint: index_js_2.COLORS.white } : {}) });
                else
                    (0, index_js_2.drawSprite)(ctx, (0, heroForms_js_1.heroFormSprite)(scene.opponentHero?.formId ?? 'h00') !== index_js_2.heroIdle ? rivalSprite : { ...rivalSprite, palette: index_js_2.HERO_RIVAL_PALETTE }, rivalFrame, exports.OPPONENT_HERO_X + (index_js_2.heroIdle.w - rivalSprite.w) * exports.SPRITE_SCALE / 2, exports.GROUND_Y - rivalSprite.h * exports.SPRITE_SCALE, { flipX: true, scale: exports.SPRITE_SCALE });
            }
            const species = speciesSpritesFor(state.monster.speciesId);
            const scale = monsterScale();
            if (scene !== null) {
                // The battle scene owns the field: no field monster (§6); the
                // opponent's group and hero were drawn above.
            }
            else if (monsterAnim.state === 'dying') {
                // The sprite is mid-scatter — its pixels live in the particle pool.
            }
            else if (monsterAnim.state === 'spawning') {
                // Bottom-up pop-in: the next monster grows out of the ground.
                const sprite = tintedIdleSprite(state.monster);
                const progress = (0, anim_js_1.easeOutQuad)(monsterAnim.t / fsm_js_1.MONSTER_SPAWNING_MS);
                const visibleRows = Math.ceil(sprite.h * progress);
                drawSpriteBottomRows(ctx, sprite, 0, exports.MONSTER_X, exports.GROUND_Y - sprite.h * scale, visibleRows, scale);
            }
            else if (state.monster.boss) {
                // Bosses draw one size larger than their species and wear the crown.
                const hit = monsterAnim.state === 'hit';
                (0, index_js_2.drawBoss)(ctx, species, hit ? 'hit' : 'idle', hit ? 0 : Math.floor(timeMs / exports.IDLE_FRAME_MS) % species.idle.frames.length, exports.MONSTER_X, exports.GROUND_Y, state.monster.tier, { tint: hit ? index_js_2.COLORS.white : undefined });
            }
            else if (monsterAnim.state === 'hit') {
                // White-flash recoil pose for MONSTER_HIT_MS; the full tint makes
                // the tier tint irrelevant while it lasts.
                (0, index_js_2.drawSprite)(ctx, species.hit, 0, exports.MONSTER_X, exports.GROUND_Y - species.hit.h * scale, {
                    tint: index_js_2.COLORS.white,
                    scale,
                });
            }
            else {
                const sprite = tintedIdleSprite(state.monster);
                const monsterFrame = Math.floor(timeMs / exports.IDLE_FRAME_MS) % sprite.frames.length;
                (0, index_js_2.drawSprite)(ctx, sprite, monsterFrame, exports.MONSTER_X, exports.GROUND_Y - sprite.h * scale, { scale });
            }
            for (const drop of drops) {
                if (scene !== null || !drop.active) {
                    continue;
                }
                const pos = (0, anim_js_1.dropPosition)(drop);
                (0, index_js_2.drawSprite)(ctx, itemSpriteFor(drop.itemId), 0, Math.round(pos.x), Math.round(pos.y));
            }
            (0, anim_js_1.drawParticles)(ctx, scene?.particles ?? particles);
            if (scene === null && monsterAnim.state !== 'dying') {
                // No HP bar over the scatter — it pops back with the next monster,
                // and the battle scene hides it with the monster itself (§6).
                const barY = monsterHpBarY(state.monster);
                const barX = Math.round(exports.MONSTER_X + (species.idle.w * scale) / 2 - exports.HP_BAR.w / 2);
                (0, hud_js_1.drawHpBar)(ctx, barX, barY, exports.HP_BAR.w, exports.HP_BAR.h, state.monsterHp, state.monster.maxHp);
                // The type badge sits under the monster's feet, like every party member's (§6).
                (0, index_js_2.drawFootBadge)(ctx, state.monster.type, exports.MONSTER_X, species.idle.w * scale, exports.GROUND_Y);
            }
            // LV + XP gauge floats above the hero's head (Assumption 17).
            if (scene?.heroic) {
                for (const [mine, fighters] of [[true, scene.ownFighters], [false, scene.opponentFighters]]) {
                    const hero = fighters.find(f => f.kind === 'hero');
                    const x = mine ? exports.HERO_X : exports.OPPONENT_HERO_X;
                    if (hero && hero.remaining > 0n)
                        (0, hud_js_1.drawHpBar)(ctx, x, exports.HERO_Y - 6, 28, 4, hero.remaining, wireDamage(hero.hp));
                    const target = fighters.find(f => f.kind === 'companion' && f.remaining > 0n) ?? fighters.find(f => f.remaining > 0n);
                    if (target) {
                        const panelX = mine ? 8 : exports.VIEW_W - 88;
                        (0, index_js_2.drawText)(ctx, target.kind === 'hero' ? 'HERO' : (target.speciesId ?? 'ALLY').toUpperCase().slice(0, 12), panelX, 68);
                        (0, hud_js_1.drawHpBar)(ctx, panelX, 77, 80, 4, target.remaining, wireDamage(target.hp));
                    }
                }
            }
            else
                (0, hud_js_1.drawLevelHud)(ctx, state, exports.HERO_X + Math.floor((index_js_2.heroIdle.w * exports.SPRITE_SCALE) / 2), heroTop - 2, scene === null ? { levelUp: banner, ...(state.fever.active ? { feverAgeMs: index_js_1.FEVER_MS - state.fever.remainingMs } : {}) } : {});
            (0, hud_js_1.drawFloats)(ctx, scene?.floats ?? floats);
            (0, hud_js_1.drawCounters)(screen, state, exports.VIEW_W, scene === null && coinPopAgeMs < hud_js_1.COUNTER_POP_MS);
            if (scene === null && state.equipment && state.equipment.bag.length >= state.equipment.capacity) {
                const pending = state.equipment.temporary.length;
                (0, index_js_2.drawText)(screen, pending ? `BAG FULL +${pending}` : 'BAG FULL', 8, hud_js_1.BAG_FULL_Y, { color: index_js_2.COLORS.yellow });
            }
            if (scene !== null || banner.text !== hud_js_1.LEVEL_UP_TEXT)
                (0, hud_js_1.drawBanner)(screen, scene?.banner ?? banner, exports.VIEW_W);
        },
        getState() {
            return engine.getState();
        },
        toSave() {
            return engine.toSave();
        },
        reset(rng) {
            engine = (0, index_js_1.createEngine)(null, rng);
            clearPresentation();
        },
        getHeroAnim: () => scene?.heroAnim ?? heroAnim,
        getMonsterAnim: () => monsterAnim,
    };
}
// ---------------------------------------------------------------------------
// Save scheduling (SPEC F22, T16): WHEN progress persists. Kills and level-ups
// save immediately; damage-only attacks save at most once per debounce window;
// window blur / reset flush unconditionally. DOM-free with injectable timers
// so the policy is unit-testable (production uses the real setTimeout).
// ---------------------------------------------------------------------------
/** Debounce window for damage-only saves, ms (SPEC F22). */
exports.SAVE_DEBOUNCE_MS = 500;
function createSaveScheduler(options) {
    const setTimer = options.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
    const clearTimer = options.clearTimer ??
        ((handle) => {
            clearTimeout(handle);
        });
    let pending = undefined;
    const cancelPending = () => {
        if (pending !== undefined) {
            clearTimer(pending);
            pending = undefined;
        }
    };
    const saveNow = () => {
        cancelPending();
        options.save();
    };
    return {
        onEvents(events) {
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
                }, exports.SAVE_DEBOUNCE_MS);
            }
        },
        flush: saveNow,
    };
}
