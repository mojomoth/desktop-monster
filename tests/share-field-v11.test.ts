import { describe, expect, it, vi } from 'vitest';
import { activeCompanions, activeFieldCompanions, companionPower, createEngine, DEFAULT_SAVE, format,
  mulberry32, newHeroProgress } from '../src/core/index.js';
import { drawShareCard } from '../src/menu/share.js';
import type { ShareCanvas } from '../src/menu/share.js';

vi.mock('../src/core/progression.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/core/progression.js')>();
  return { ...actual, PROGRESSION_PARAMETERS: { ...actual.PROGRESSION_PARAMETERS,
    fieldCompanionTailPolynomial: 2, fieldCompanionTailScale: 64, fieldHeroCycleBonus: 28,
    fieldHpIndexCap: null, fieldHpResumeIndex: null, fieldRebirthCountCap: null, fieldCompanionFeverMultiplier: 3,
    fieldCompanionIndexCap: null, fieldCompanionGrowthBonus: null, fieldCompanionBaseFloor: 0 } };
});

function canvas() {
  const words: string[] = [];
  const rects: number[][] = [];
  const images: unknown[][] = [];
  const ctx: ShareCanvas = {
    fillStyle: '', font: '', textAlign: 'left', textBaseline: 'top', imageSmoothingEnabled: true,
    fillRect: (x, y, w, h) => { rects.push([x, y, w, h]); },
    fillText: word => { words.push(word); },
    measureText: word => ({ width: word.length * 12 }) as TextMetrics,
    drawImage: (...args: unknown[]) => { images.push(args); },
  };
  return { ctx, words };
}

describe('share cards distinguish hunting membership from raw PvP membership', () => {
  const save = (version: 10 | 11) => {
    const state = createEngine(DEFAULT_SAVE, mulberry32(1)).toSave();
    state.monsterSpeciesId = 'slime'; state.monsterCurveVersion = version;
    state.hero = { ...newHeroProgress(), reincarnations: 1 };
    state.rebirths = 5; state.monsterCurveRebirths = 3;
    state.companions = [
      { id: 'c1', speciesId: 'slime', bossIndex: 31, level: 2000, stars: 0 },
      ...[95, 103, 111, 119, 127].map((bossIndex, i) => ({ id: `c${i + 2}`, speciesId: 'slime', bossIndex, level: 1, stars: 0 })),
    ];
    return state;
  };

  it('shares the trained early capture and exact hunting/raw values instead of the five raw winners', () => {
    const state = save(11), r = state.monsterCurveRebirths!;
    expect(activeCompanions(state.companions, 'water', state.hero?.equipped).map(c => c.id)).toEqual(['c6', 'c5', 'c4', 'c3', 'c2']);
    expect(activeFieldCompanions(state.companions, 'water', state.hero?.equipped, r, 11).map(c => c.id)).toEqual(['c1', 'c6', 'c5', 'c4', 'c3']);
    const before = JSON.stringify(state);
    state.companions.forEach(Object.freeze); Object.freeze(state.companions); Object.freeze(state);
    const out = canvas(); drawShareCard(out.ctx, { kind: 'party', save: state });
    const ids = ['c1', 'c6', 'c5', 'c4', 'c3'];
    expect(out.words.filter(word => word.startsWith('PvP '))).toEqual(ids.map(id =>
      `PvP ${format(companionPower(state.companions.find(c => c.id === id)!))} · ★0`));
    // Independent F31 / polynomial2 / scale64 values, multiplied by
    // M(encounter resets=3)=(4+28*3*7)/4=148, independent of
    // accepted hero count1 and live total5. No field helper supplies expected labels.
    expect(out.words.filter(word => word.startsWith('사냥 공격력 '))).toEqual(
      [76000n, 36518n, 31782n, 27366n, 23270n].map(power => `사냥 공격력 ${format(power * 148n)}`));
    expect(out.words.filter(word => word.startsWith('Lv.'))[0]).toBe('Lv.2.00A · 물');
    expect(out.words).toContain('현재 필드 파티 · 5마리');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('keeps the saved v10 party and raw hunting labels until the encounter version changes', () => {
    const state = save(10), out = canvas();
    drawShareCard(out.ctx, { kind: 'party', save: state });
    const party = ['c6', 'c5', 'c4', 'c3', 'c2'].map(id => state.companions.find(c => c.id === id)!);
    expect(out.words.filter(word => word.startsWith('사냥 공격력 '))).toEqual(party.map(c => `사냥 공격력 ${format(companionPower(c))}`));
    expect(out.words.filter(word => word.startsWith('PvP '))).toEqual(party.map(c => `PvP ${format(companionPower(c))} · ★0`));
    expect(out.words.filter(word => word.startsWith('Lv.'))).toEqual(Array.from({ length: 5 }, () => 'Lv.1 · 물'));
    for (const version of [10, 11] as const) {
      state.monsterCurveVersion = version;
      const member = canvas(); drawShareCard(member.ctx, { kind: 'companion', save: state, companionId: 'c1' });
      expect(member.words).toContain(`PvP ${format(76000n)} · ★0`);
      expect(member.words).toContain(`사냥 공격력 ${format(version === 10 ? 76000n : 76000n * 148n)}`);
    }
  });
});
