import { describe, expect, it, vi } from 'vitest';
import { activeCompanions, activeFieldCompanions, attackDelayOf, createEngine, DEFAULT_SAVE, fieldCompanionPower, mulberry32, newHeroProgress, partyOrder } from '../src/core/index.js';
import type { Companion, GameState, SpeciesId } from '../src/core/index.js';
import { COMPANION_ATTACK_MS, PARTY_STAGGER_MS } from '../src/core/engine.js';
import { createGame, GROUND_Y } from '../src/renderer/game.js';
import type { GameCanvas } from '../src/renderer/game.js';
import { createParticlePool, drawParticles, spawnSpriteScatter } from '../src/renderer/anim.js';
import { COMPANION_ATTACK } from '../src/renderer/effects.js';
import { drawParty, monsterSprites, partySlots } from '../src/renderer/sprites/index.js';

// Exercise the approved field family before numerical candidate adoption.
// This isolated test module leaves all production/default renderer tests intact.
const curve = vi.hoisted(() => ({ indexCap: null as number | null, growthBonus: null as number | null }));
vi.mock('../src/core/progression.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/core/progression.js')>();
  return { ...actual, PROGRESSION_PARAMETERS: { ...actual.PROGRESSION_PARAMETERS,
    fieldCompanionTailPolynomial: 2, fieldCompanionTailScale: 1, fieldHeroCycleBonus: 28,
    fieldHpIndexCap: null, fieldHpResumeIndex: null, fieldRebirthCountCap: null,
    fieldCompanionBaseFloor: 0, fieldCompanionFeverMultiplier: 3,
    get fieldCompanionIndexCap() { return curve.indexCap; },
    get fieldCompanionGrowthBonus() { return curve.growthBonus; } } };
});

interface RectCall {
  x: number;
  y: number;
  w: number;
  h: number;
  fillStyle: string;
}

interface ClearCall {
  x: number;
  y: number;
  w: number;
  h: number;
}

function makeCtx(): { ctx: GameCanvas; calls: RectCall[]; clears: ClearCall[] } {
  const calls: RectCall[] = [];
  const clears: ClearCall[] = [];
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      calls.push({ x, y, w, h, fillStyle: String(ctx.fillStyle) });
    },
    clearRect(x: number, y: number, w: number, h: number): void {
      clears.push({ x, y, w, h });
    },
  };
  return { ctx, calls, clears };
}

const rectKey = (c: RectCall): string =>
  `${String(c.x)},${String(c.y)},${String(c.w)},${String(c.h)},${c.fillStyle}`;
const companion = (id: string, speciesId: SpeciesId, stars = 0): Companion => ({ id, speciesId, bossIndex: 7, level: 1, stars });
const artOf = (speciesId: string): { w: number; h: number } => monsterSprites[speciesId as SpeciesId].idle;

describe('field-only companion party presentation', () => {
  const roster = (): Companion[] => [
    ...Array.from({ length: 4 }, (_, i) => ({ ...companion(`c${i + 1}`, 'slime'), bossIndex: 151, level: 10 })),
    { ...companion('c5', 'slime', 1), bossIndex: 31, level: 10 },
    { ...companion('c6', 'slime'), bossIndex: 95 },
  ];
  const gameFor = (curveVersion: 10 | 11, companions = roster()) => createGame(createEngine({
    ...DEFAULT_SAVE, monsterIndex: 1000, monsterHp: '9'.repeat(80), monsterSpeciesId: 'slime',
    monsterCurveVersion: curveVersion, companions, nextCompanionId: 8,
  }, mulberry32(5)));
  const partyFor = (state: GameState) => partyOrder(activeFieldCompanions(state.companions,
    state.monster.type, state.hero?.equipped, state.monster.curveRebirths ?? 0, state.monster.curveVersion ?? 10));
  const paintParty = (party: Companion[], frame = 0): string => {
    const ref = makeCtx();
    drawParty(ref.ctx, party, frame, GROUND_Y);
    expect(ref.calls.length).toBeGreaterThan(0);
    return ref.calls.map(rectKey).join('|');
  };

  it.each([10, 11] as const)('paints the actual hunting party for encounter version %i', (version) => {
    const game = gameFor(version), state = game.getState();
    const party = partyFor(state);
    expect(party.map(c => c.id)).toEqual(['c1', 'c2', 'c3', 'c4', version === 10 ? 'c6' : 'c5']);
    // Raw/PvP still prefers the later capture; the earlier trained, starred
    // member is visibly different and must appear only in the v11 field party.
    expect(activeCompanions(state.companions, state.monster.type).map(c => c.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c6']);
    const painted = makeCtx(); game.draw(painted.ctx);
    const signature = painted.calls.map(rectKey).join('|');
    expect(signature).toContain(paintParty(party));
    const other = partyFor(gameFor(version === 10 ? 11 : 10).getState());
    expect(signature).not.toContain(paintParty(other));
  });

  it.each([0, 2])('uses saved encounter reset count %i instead of live resets or accepted heroes', (snapshot) => {
    const companions = [...roster().slice(0, 4), companion('c5', 'ghost'), companion('c6', 'slime')];
    const game = createGame(createEngine({ ...DEFAULT_SAVE, hero: { ...newHeroProgress(), reincarnations: 1 }, rebirths: 2,
      monsterIndex: 1000, monsterSpeciesId: 'slime', monsterHp: '9'.repeat(80), monsterCurveVersion: 11,
      monsterCurveRebirths: snapshot, companions, nextCompanionId: 7 }, mulberry32(5)));
    const state = game.getState(), party = partyFor(state);
    expect(state.rebirths).toBe(2);
    expect(state.hero?.reincarnations).toBe(1);
    expect(state.monster.curveRebirths).toBe(snapshot);
    // At snapshot0 both tiny hits floor to1, so c5 wins the ID tie. At
    // snapshot2 M=85 distinguishes weak ghost42 from normal slime85.
    const fifth = snapshot === 0 ? 'c5' : 'c6';
    expect(party.map(c => c.id).sort()).toEqual(['c1', 'c2', 'c3', 'c4', fifth]);
    const painted = makeCtx(); game.draw(painted.ctx);
    expect(painted.calls.map(rectKey).join('|')).toContain(paintParty(party));
    const wrong = partyOrder(activeFieldCompanions(state.companions, state.monster.type, state.hero?.equipped,
      snapshot === 0 ? 2 : 0, 11));
    expect(painted.calls.map(rectKey).join('|')).not.toContain(paintParty(wrong));
    const saved = game.toSave();
    expect(saved.monsterCurveRebirths).toBe(snapshot);
    const restored = createGame(createEngine(saved, mulberry32(5))), again = makeCtx(); restored.draw(again.ctx);
    expect(again.calls.map(rectKey).join('|')).toContain(paintParty(party));
  });

  it('switches legacy party membership with the next new encounter, preserving saved companions', () => {
    const companions = roster();
    const game = createGame(createEngine({ ...DEFAULT_SAVE, monsterIndex: 0, monsterHp: '1',
      monsterSpeciesId: 'slime', monsterCurveVersion: 10, companions, nextCompanionId: 8 }, mulberry32(5)));
    expect(game.getState().monsterHp).toBe(1n);
    expect(partyFor(game.getState()).map(c => c.id)).toContain('c6');
    expect(game.attack('keyboard').some(e => e.type === 'monsterSpawned')).toBe(true);
    expect(game.getState().monster.curveVersion).toBe(11);
    const party = partyFor(game.getState());
    expect(party.map(c => c.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    expect(game.toSave().companions).toEqual(companions);
    const painted = makeCtx(); game.draw(painted.ctx);
    expect(painted.calls.map(rectKey).join('|')).toContain(paintParty(party));
    const restored = createGame(createEngine(game.toSave(), mulberry32(5)));
    expect(partyFor(restored.getState()).map(c => c.id)).toEqual(party.map(c => c.id));
  });

  it('field volley actors and their visible attack origins use the same field-selected five', () => {
    const game = gameFor(11), state = game.getState();
    const ranked = activeFieldCompanions(state.companions, state.monster.type, state.hero?.equipped,
      state.monster.curveRebirths ?? 0, state.monster.curveVersion ?? 10);
    const party = partyFor(state), slots = partySlots(party, GROUND_Y);
    const last = ranked[4];
    if (!last) throw Error('missing fifth field member');
    expect(last.id).toBe('c5');
    const landedAt = COMPANION_ATTACK_MS + attackDelayOf(last.speciesId) + 4 * PARTY_STAGGER_MS;
    const events = game.update(landedAt);
    expect(events.filter(e => e.type === 'companionAttack').map(e => e.companionId)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    expect(events.some(e => e.type === 'monsterKilled')).toBe(false);
    const slot = slots[party.findIndex(c => c.id === last.id)];
    if (!slot) throw Error('missing selected field slot');
    const art = artOf(last.speciesId), centre = { x: slot.x + art.w * slot.scale / 2, y: slot.y - art.h * slot.scale / 2 };
    const preset = COMPANION_ATTACK.slime.preset, painted = makeCtx(); game.draw(painted.ctx);
    expect(painted.calls.filter(c => c.w === preset.size && c.x === centre.x && c.y === centre.y &&
      (preset.colors as readonly string[]).includes(c.fillStyle))).toHaveLength(preset.count);
  });

  it('a growth action refreshes hunting membership in the very next draw', () => {
    const companions = roster(); companions[4] = { ...companion('c5', 'slime', 1), bossIndex: 31, level: 4 };
    companions.push(companion('c7', 'slime', 1));
    const game = gameFor(11, companions), before = partyFor(game.getState());
    expect(before.map(c => c.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c6']);
    game.apply({ type: 'consume', targetId: 'c5', foodId: 'c7' });
    expect(game.lastActionError()).toBeNull();
    expect(game.getState().companions.find(c => c.id === 'c5')?.level).toBe(6);
    const after = partyFor(game.getState());
    expect(after.map(c => c.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    const painted = makeCtx(); game.draw(painted.ctx);
    expect(painted.calls.map(rectKey).join('|')).toContain(paintParty(after));
    expect(painted.calls.map(rectKey).join('|')).not.toContain(paintParty(before));
  });

  it('renders capped hunting growth and its consume-driven party change while preserving raw PvP selection', () => {
    curve.indexCap = 79; curve.growthBonus = 25;
    try {
      const companions = roster();
      companions[4] = { ...companion('c5', 'slime', 1), bossIndex: 79 };
      companions.push(companion('c7', 'slime', 1));
      const game = gameFor(11, companions), before = partyFor(game.getState());
      // Independent F(79)=floor(38*80²/32²)=237, G(Q2)=9/8.
      expect(fieldCompanionPower(companions[4]!)).toBe(266n);
      expect(fieldCompanionPower(companions[5]!)).toBe(237n);
      expect(before.map(c => c.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
      const rawIds = ['c1', 'c2', 'c3', 'c4', 'c6'];
      expect(activeCompanions(game.getState().companions, 'water').map(c => c.id)).toEqual(rawIds);
      const first = makeCtx(); game.draw(first.ctx);
      expect(first.calls.map(rectKey).join('|')).toContain(paintParty(before));
      game.apply({ type: 'consume', targetId: 'c6', foodId: 'c7' });
      expect(game.lastActionError()).toBeNull();
      const grown = game.getState().companions.find(c => c.id === 'c6')!;
      expect(grown.level).toBe(3);
      expect(fieldCompanionPower(grown)).toBe(276n); // floor(237*7/6)
      expect(game.getState().companions.some(c => c.id === 'c7')).toBe(false);
      const after = partyFor(game.getState());
      expect(after.map(c => c.id)).toEqual(rawIds);
      expect(activeCompanions(game.getState().companions, 'water').map(c => c.id)).toEqual(rawIds);
      const second = makeCtx(); game.draw(second.ctx);
      expect(second.calls.map(rectKey).join('|')).toContain(paintParty(after));
      expect(second.calls.map(rectKey).join('|')).not.toContain(paintParty(before));
    } finally {
      curve.indexCap = null; curve.growthBonus = null;
    }
  });

  it('scatters a lost hunting member at its field slot even when raw PvP power benches it', () => {
    const game = gameFor(11), before = game.getState(), party = partyFor(before);
    expect(activeCompanions(before.companions, before.monster.type).map(c => c.id)).not.toContain('c5');
    const slot = partySlots(party, GROUND_Y)[party.findIndex(c => c.id === 'c5')];
    if (!slot) throw Error('missing lost field member');
    game.apply({ type: 'pvpResult', won: false, stolen: null, lostId: 'c5' });
    const particles = createParticlePool();
    spawnSpriteScatter(particles, monsterSprites.slime.idle, 0, slot.x,
      slot.y - artOf('slime').h * slot.scale, slot.scale);
    const expected = makeCtx(); drawParticles(expected.ctx, particles);
    expect(expected.calls.length).toBeGreaterThan(0);
    const painted = makeCtx(); game.draw(painted.ctx);
    const keys = new Set(painted.calls.map(rectKey));
    expect(expected.calls.every(c => keys.has(rectKey(c)))).toBe(true);
  });
});
