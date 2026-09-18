import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, mulberry32 } from '../src/core/index.js';
import { newEquipment } from '../src/core/equipment.js';
import type { EquipmentItem } from '../src/core/equipment.js';
import { createGame, HERO_X, HERO_Y, OPPONENT_HERO_X, REPLAY_MS } from '../src/renderer/game.js';
import { drawEquippedHero } from '../src/renderer/sprites/equippedHero.js';
import { COLORS } from '../src/renderer/sprites/palette.js';
import type { PvpPresentation } from '../src/shared/api.js';

const weapon = (templateId = 'w-sword-rare-1'): EquipmentItem => ({ id: 'e1', templateId, enhancement: '2', roll: 100, seed: 1, attempts: '2' });
function game() { return createGame(createEngine({ ...DEFAULT_SAVE, equipment: newEquipment() }, mulberry32(7))); }
type Rect = { x: number; y: number; w: number; h: number; color: string };
function draw(g: ReturnType<typeof game>): Rect[] {
  const rectangles: Rect[] = [];
  const ctx = { fillStyle: '', fillRect(x: number, y: number, w: number, h: number) {
    rectangles.push({ x, y, w, h, color: String(ctx.fillStyle) });
  }, clearRect() { rectangles.length = 0; } };
  g.draw(ctx); return rectangles;
}
function presentation(): PvpPresentation {
  const hero = { formId: 'h00', buffPercent: 0 };
  const combat = { hero, level: 20, souls: 0, reincarnations: 0, trainingLevel: 0, loadout: { weapon: weapon(), accessories: [] } };
  const fighter = { id: '@hero', kind: 'hero' as const, formId: 'h00', hp: '100', attack: '20' };
  return { battleId: 'equipment-replay-A', role: 'attack', ownParty: [], ownHero: hero, ownCombat: combat,
    won: true, goldDelta: '0', replay: { opponentName: 'RIVAL', opponentParty: [], opponentHero: hero,
      opponentCombat: { ...combat, loadout: { weapon: weapon('w-hammer-epic-1'), accessories: [] } },
      ownFighters: [{ ...fighter }], opponentFighters: [{ ...fighter }],
      blows: [{ side: 'A', actorId: '@hero', actorKind: 'hero', targetId: '@hero', targetKind: 'hero', damage: '20', ko: false }] } };
}

describe('equipped field and authoritative six-member replay', () => {
  it('draws a complete bare novice in the field through the shared renderer', () => {
    const g = game(), actual = new Set(draw(g).map(r => JSON.stringify(r))), expected: Rect[] = [];
    const ctx = { fillStyle: '', fillRect(x: number, y: number, w: number, h: number) {
      expected.push({ x, y, w, h, color: String(ctx.fillStyle) });
    } };
    drawEquippedHero(ctx, 'h00', null, HERO_X, HERO_Y, { scale: 2 });
    expect(expected.length).toBeGreaterThan(60);
    expect(expected.every(rect => actual.has(JSON.stringify(rect)))).toBe(true);
  });

  it('lands hero damage on the strike frame and reads server HP rather than current formulas', () => {
    const g = game(); g.enqueueReplay(presentation()); g.update(0);
    expect(g.getHeroAnim()).toEqual({ state: 'attack', t: 0 });
    const full = { x: 113, y: 78, w: 78, h: 2, color: COLORS.red };
    expect(draw(g)).toContainEqual(full);
    g.update(59); expect(draw(g)).toContainEqual(full);
    g.update(1); expect(draw(g)).not.toContainEqual(full);
    expect(draw(g)).toContainEqual({ ...full, w: 62 });
  });

  it('does not animate a phantom hero hit for a companion turn', () => {
    const p = presentation();
    p.ownParty = [{ id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 }];
    p.replay.ownFighters!.push({ id: 'c1', kind: 'companion', speciesId: 'slime', hp: '40', attack: '3', type: 'water' });
    p.replay.blows[0] = { ...p.replay.blows[0]!, actorId: 'c1', actorKind: 'companion', damage: '3' };
    const g = game(); g.enqueueReplay(p); g.update(0);
    expect(g.getHeroAnim().state).toBe('idle');
    expect(draw(g).filter(r => r.x === 113 && r.y === 78)).toContainEqual({ x: 113, y: 78, w: 76, h: 2, color: COLORS.red });
  });

  it('hides a KO hero and its HP, while retaining the surviving hero and restoring the live field', () => {
    const p = presentation(); p.replay.blows[0] = { ...p.replay.blows[0]!, damage: '100', ko: true };
    const g = game(); g.enqueueReplay(p); g.update(60);
    const bar = { x: OPPONENT_HERO_X, y: HERO_Y - 6, w: 28, h: 4, color: COLORS.steel };
    expect(draw(g)).not.toContainEqual(bar);
    expect(draw(g)).toContainEqual({ ...bar, x: HERO_X });
    g.update(REPLAY_MS); expect(g.isReplaying()).toBe(false);
    expect(g.getState().equipment?.loadout.weapon).toBeNull();
  });

  it('freezes both weapons and every equipment copy before a delayed replay', () => {
    const p = presentation(), g = game(); g.enqueueReplay(p);
    const before = draw(g);
    p.ownCombat!.loadout.weapon!.templateId = 'w-gauntlet-common-1';
    p.replay.opponentCombat!.loadout.weapon = null;
    p.replay.opponentFighters![0]!.hp = '1';
    expect(draw(g)).toEqual(before);
  });

  it('shows all three hero poses in a 200-turn replay and finishes within twelve seconds', () => {
    const p = presentation();
    p.replay.ownFighters![0]!.hp = '1000'; p.replay.opponentFighters![0]!.hp = '1000';
    p.replay.blows = Array.from({ length: 200 }, (_, index) => ({ side: index % 2 ? 'D' : 'A',
      actorId: '@hero', actorKind: 'hero', targetId: '@hero', targetKind: 'hero', damage: '1', ko: false }));
    const g = game(); g.enqueueReplay(p); g.update(0);
    const frames = new Set<number>();
    for (let elapsed = 0; elapsed < REPLAY_MS; elapsed += 20) {
      const anim = g.getHeroAnim(); if (anim.state === 'attack') frames.add(Math.floor(anim.t / 60)); g.update(20);
    }
    expect(frames).toEqual(new Set([0, 1, 2])); expect(g.isReplaying()).toBe(false);
  });
});
