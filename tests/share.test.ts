import { saveProgress } from '../src/core/progress.js';
import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, displayNameOf, HERO_FORMS, mulberry32, SPECIES_IDS } from '../src/core/index.js';
import { newHeroProgress } from '../src/core/hero.js';
import { newProgress as newCoreProgress } from '../src/core/progress.js';
import { drawShareCard, SHARE_CARD_SIZE } from '../src/menu/share.js';
import type { ShareCanvas, ShareCardRequest } from '../src/menu/share.js';

function canvas() {
  const rects: number[][] = [];
  const words: string[] = [];
  const images: unknown[][] = [];
  const ctx: ShareCanvas = {
    fillStyle: '', font: '', textAlign: 'left', textBaseline: 'top', imageSmoothingEnabled: true,
    fillRect: (x, y, w, h) => { rects.push([x, y, w, h]); },
    fillText: word => { words.push(word); },
    measureText: word => ({ width: word.length * (Number(/(\d+)px/.exec(ctx.font)?.[1]) || 20) * 0.6 }) as TextMetrics,
    drawImage: (...args: unknown[]) => { images.push(args); },
  };
  return { ctx, rects, words, images };
}
const save = () => createEngine(DEFAULT_SAVE, mulberry32(1)).toSave();

describe('share card composition', () => {
  it('draws all six card types without mutating a frozen save or leaking internal IDs', () => {
    const state = save();
    state.companions = [{ id: 'private-id', speciesId: 'dragon', bossIndex: 7, level: 9, stars: 1 }];
    Object.freeze(state.companions[0]); Object.freeze(state.companions); Object.freeze(state);
    const before = JSON.stringify(state);
    for (const kind of ['hero', 'companion', 'party', 'codex', 'field', 'pvp'] as const) {
      const out = canvas();
      const request: ShareCardRequest = { kind, save: state, companionId: 'private-id' };
      expect(drawShareCard(out.ctx, request)).toMatchObject({ width: 1200, height: 1200 });
      expect(out.ctx.imageSmoothingEnabled).toBe(false);
      expect(out.words.join(' ')).not.toContain('private-id');
      expect(out.rects[0]).toEqual([0, 0, SHARE_CARD_SIZE, SHARE_CARD_SIZE]);
      for (const [x, y, w, h] of out.rects) {
        expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
        expect(x! + w!).toBeLessThanOrEqual(1200); expect(y! + h!).toBeLessThanOrEqual(1200);
        expect([x, y, w, h].every(Number.isInteger)).toBe(true);
      }
    }
    expect(JSON.stringify(state)).toBe(before);
  });

  it('paginates only acquired heroes and preserves unread discovery state', () => {
    const state = save();
    state.hero = { ...newHeroProgress(), collection: HERO_FORMS.slice(0, 13).map(form => ({ formId: form.id, buffPercent: 10 })) };
    state.progress = { ...newProgress(), seenHeroes: ['h70'] };
    const before = structuredClone(state);
    const first = canvas();
    expect(drawShareCard(first.ctx, { kind: 'codex', save: state })).toMatchObject({ page: 0, pageCount: 2 });
    expect(first.words).toContain(HERO_FORMS[0]!.name);
    expect(first.words).not.toContain(HERO_FORMS[12]!.name);
    expect(first.words).not.toContain(HERO_FORMS[69]!.name);
    const last = canvas();
    expect(drawShareCard(last.ctx, { kind: 'codex', save: state, page: 999 })).toMatchObject({ page: 1, pageCount: 2 });
    expect(last.words).toContain(HERO_FORMS[12]!.name);
    expect(last.words).not.toContain(HERO_FORMS[0]!.name);
    expect(state).toEqual(before);
  });

  it('covers every acquired monster exactly once across all codex pages', () => {
    const state = { ...save(), progress: { ...newProgress(), speciesKills: Object.fromEntries(SPECIES_IDS.map(id => [id, 1])) } };
    const pages: string[][] = [];
    for (let page = 0; page < 12; page++) {
      const out = canvas();
      const metadata = drawShareCard(out.ctx, { kind: 'codex', codexKind: 'monster', save: state, page });
      expect(metadata).toMatchObject({ page, pageCount: 12 });
      pages.push(out.words);
    }
    const names = SPECIES_IDS.map(displayNameOf);
    expect(pages.flatMap(words => words.filter(word => names.includes(word)))).toEqual(names);
  });

  it('uses a caller-supplied frozen field frame and keeps replay account names private', () => {
    const frame = {} as CanvasImageSource;
    const out = canvas();
    drawShareCard(out.ctx, { kind: 'pvp', save: save(), frameCanvas: frame,
      replay: { opponentName: 'private-opponent-name', opponentParty: [], blows: [] }, result: { won: true } });
    expect(out.images).toEqual([[frame, 100, 232, 1000, 650]]);
    expect(out.words).toContain('VICTORY · 승리');
    expect(out.words.join(' ')).not.toContain('private-opponent-name');
  });

  it('handles a removed companion, empty collections and non-finite page without an exception', () => {
    const missing = canvas();
    drawShareCard(missing.ctx, { kind: 'companion', save: save(), companionId: 'removed' });
    expect(missing.words).toContain('함께할 동료를 기다리는 중');
    const empty = canvas();
    expect(drawShareCard(empty.ctx, { kind: 'codex', save: save(), page: Number.NaN })).toMatchObject({ page: 0, pageCount: 1 });
    expect(empty.words).toContain('새로운 발견을 기다리는 중');
  });
});

function newProgress(...args: Parameters<typeof newCoreProgress>) { return saveProgress(newCoreProgress(...args)); }
