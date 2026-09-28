// Synthetic state drives the same createGame().draw() used by the real app.
// No IPC, persistence, server, or global input hooks are connected here.
import { createEngine, DEFAULT_SAVE, mulberry32 } from '../../../src/core/index.js';
import { newHeroProgress } from '../../../src/core/hero.js';
import { createGame, VIEW_W, VIEW_H } from '../../../src/renderer/game.js';
import { raidSlots } from '../../../src/renderer/raidScene.js';
import { HERO_FORM_IDS } from '../../../src/renderer/sprites/heroForms.js';
export { RAID_HP_BAR as RAID_HP, RAID_TIME_BAR as RAID_TIME } from '../../../src/renderer/raidScene.js';

const hero = newHeroProgress();
hero.equipped = { formId: 'h11', buffPercent: 18 };
hero.collection = [hero.equipped];
hero.reincarnations = 2;
const save = { ...DEFAULT_SAVE, level: 33, xp: 30, killCount: 1204, coins: '18450', hero,
  companions: [
    { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 3, stars: 0 },
    { id: 'c2', speciesId: 'bat', bossIndex: 15, level: 2, stars: 0 },
    { id: 'c3', speciesId: 'golem', bossIndex: 23, level: 2, stars: 0 },
  ], nextCompanionId: 4 };
export interface RaidHero {
  x: number;
  foot: number;
  form: string;
  isLocal: boolean;
  flipX: boolean;
}

/** Only this review fixture bounds its count. The live renderer keeps the full roster. */
export function raidHeroes(count: number): RaidHero[] {
  const total = Number.isFinite(count) ? Math.max(1, Math.min(100, Math.floor(count))) : 32;
  const forms = HERO_FORM_IDS.filter(id => id !== 'h11');
  const ids = Array.from({ length: total }, (_, index) => `p${String(index).padStart(3, '0')}`);
  return raidSlots('preview', ids, ids[0]).map((slot, index) => ({
    x: slot.x, foot: slot.foot, flipX: slot.flipX, isLocal: slot.isLocal,
    form: slot.isLocal ? 'h11' : forms[index % forms.length]!,
  }));
}

export function mountFieldPreview(canvas: HTMLCanvasElement, status: HTMLButtonElement, initialMode: string,
  participantCount = 32): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  ctx.imageSmoothingEnabled = false;
  const game = createGame(createEngine(save, mulberry32(7)));
  const players = raidHeroes(participantCount);
  let mode = initialMode;
  if (mode === 'battle' || mode === 'victory' || mode === 'defeat') game.raidState({
    raidId: 'preview', bossId: 'raid-dark', phase: mode === 'battle' ? 'battle' : 'settled',
    bossHpRatio: mode === 'victory' ? 0 : .62, remainingMs: 55_000, timeoutMs: 120_000, me: 'p000',
    participants: players.map((p, index) => ({ playerId: p.isLocal ? 'p000' : `p${String(index + 1).padStart(3, '0')}`,
      name: p.isLocal ? 'me' : `Hero ${index + 1}`, formId: p.form, level: p.isLocal ? 33 : 25 + index, damageDelta: '0' })),
    ...(mode !== 'battle' ? { result: { victory: mode === 'victory', rank: 2 } } : {}),
  });
  function paint(): void {
    if (!ctx) return;
    status.hidden = mode === 'battle' || mode === 'victory' || mode === 'defeat' || mode === 'baseline';
    status.className = mode === 'alert' ? 'alert' : mode === 'confirmed' ? 'done' : '';
    status.textContent = mode === 'alert' ? '경고 · 참여' : mode === 'confirmed' ? '참여 완료' : '레이드 22:34:56';
    status.disabled = mode !== 'alert';
    game.draw(ctx);
  }
  status.addEventListener('click', () => { if (mode === 'alert') { mode = 'confirmed'; paint(); } });
  canvas.addEventListener('click', () => { if (mode === 'battle') { game.attack('mouse'); paint(); } });
  // Frozen by default for review captures; motion advances only synthetic time.
  if (new URLSearchParams(location.search).get('motion') === '1') {
    let previous = 0;
    const step = (stamp: number): void => {
      game.update(previous ? Math.min(32, stamp - previous) : 0);
      previous = stamp;
      paint();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  paint();
}
