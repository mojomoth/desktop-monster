// Shared by the actual game and review previews. Coordinates are canvas pixels.
import { format, ratio } from '../core/index.js';
import type { MonsterType } from '../core/types-chart.js';
import type { RaidLiveResponse } from '../shared/api.js';
import { createFloatPool, drawBanner, drawFloats, drawMeter, drawOutlinedText, spawnFloat, tickFloats } from './hud.js';
import { COLORS, drawSprite, textWidth } from './sprites/index.js';
import type { SpriteCanvas } from './sprites/sprite.js';
import { heroFormSprite } from './sprites/heroForms.js';
import { drawRaidBoss } from './sprites/raidBosses.js';

export const RAID_SCALE = 1;
/** Release the field after an unconfirmed timeout; only a server reply supplies the verdict. */
export const RAID_RECONNECT_GRACE_MS = 5000;
export const RAID_HP_BAR = { x: 20, y: 14, w: 160, h: 5 } as const;
export const RAID_TIME_BAR = { x: 20, y: 21, w: 160, h: 3 } as const;
export const RAID_BOSS_MAX = { w: 128, h: 88 } as const;
const WIDTH = 200, GROUND = 120;
export interface RaidStateView {
  raidId: string;
  bossId: string;
  phase: 'battle' | 'settled';
  bossHpRatio: number;
  remainingMs: number;
  timeoutMs: number;
  participants: { playerId: string; name: string; formId: string; level: number; damageDelta: string }[];
  me: string;
  result?: { victory: boolean; rank?: number };
}
export interface RaidSlot { playerId: string; x: number; foot: number; flipX: boolean; isLocal: boolean }

/** Whole-field shallow rows: every participant is retained, including beyond preview limits. */
export function raidSlots(raidId: string, playerIds: readonly string[], me?: string): RaidSlot[] {
  const ids = [...new Set(playerIds)].sort();
  if (!ids.length) return [];
  // The cycle rotates peers across the grid; sorting makes wire ordering irrelevant.
  const hash = [...raidId].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 0);
  const peers = ids.filter(id => id !== me);
  const offset = peers.length ? hash % peers.length : 0;
  const ordered = [...peers.slice(offset), ...peers.slice(0, offset)];
  const rows = Math.min(5, Math.ceil(ids.length / 16));
  const slots: RaidSlot[] = [];
  for (let row = 0; row < rows; row++) {
    const columns = Math.floor(ids.length / rows) + (row < ids.length % rows ? 1 : 0);
    const inset = 4 + row % 2 * 4;
    for (let column = 0; column < columns; column++) {
      const x = columns === 1 ? 93 : Math.round(inset + column * (WIDTH - 14 - 2 * inset) / (columns - 1));
      slots.push({ playerId: '', x, foot: GROUND - (rows - 1 - row) * 2, flipX: x + 7 >= WIDTH / 2, isLocal: false });
    }
  }
  let local: RaidSlot | undefined;
  if (me && ids.includes(me)) {
    const front = slots.filter(slot => slot.foot === GROUND);
    local = front.reduce((nearest, slot) => Math.abs(slot.x - 93) < Math.abs(nearest.x - 93) ? slot : nearest);
    Object.assign(local, { playerId: me, x: 93, isLocal: true, flipX: false });
  }
  const others = slots.filter(slot => slot !== local);
  others.forEach((slot, i) => { slot.playerId = ordered[i]!; });
  return local ? [...others, local] : others;
}

export interface RaidScene {
  view: RaidStateView;
  slots: RaidSlot[];
  ageMs: number;
  settledMs: number;
  expiredMs: number;
  hitUntil: number;
  attacks: Map<string, number>;
  floats: ReturnType<typeof createFloatPool>;
}
export function createRaidScene(view: RaidStateView): RaidScene {
  const scene: RaidScene = { view, slots: [], ageMs: 0, settledMs: 0, expiredMs: 0, hitUntil: 0, attacks: new Map(), floats: createFloatPool() };
  applyRaidState(scene, view);
  return scene;
}
export function applyRaidState(scene: RaidScene, view: RaidStateView): void {
  if (view.phase === 'settled' && scene.view.phase !== 'settled') scene.settledMs = 0;
  if (view.remainingMs > 0) scene.expiredMs = 0;
  scene.view = { ...view, participants: view.participants.map(p => ({ ...p })) };
  scene.slots = raidSlots(view.raidId, view.participants.map(p => p.playerId), view.me);
  for (const p of view.participants) {
    if (p.playerId !== view.me && /^\d+$/.test(p.damageDelta) && BigInt(p.damageDelta) > 0n) {
      scene.attacks.set(p.playerId, scene.ageMs + 180);
      scene.hitUntil = scene.ageMs + 80;
    }
  }
}
export function tickRaid(scene: RaidScene, dtMs: number): boolean {
  const dt = Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0;
  scene.ageMs += dt;
  if (scene.view.phase === 'battle') scene.expiredMs += Math.max(0, dt - scene.view.remainingMs);
  scene.view.remainingMs = Math.max(0, scene.view.remainingMs - dt);
  tickFloats(scene.floats, dt);
  if (scene.view.phase === 'settled') scene.settledMs += dt;
  return scene.settledMs < 2000 && scene.expiredMs < RAID_RECONNECT_GRACE_MS;
}
export function raidLocalHit(scene: RaidScene, damage: bigint, crit: boolean): void {
  if (scene.view.phase !== 'battle' || scene.view.remainingMs <= 0) return;
  const slot = scene.slots.find(p => p.isLocal);
  const player = scene.view.participants.find(p => p.playerId === scene.view.me);
  if (!slot || !player) return;
  scene.attacks.set(player.playerId, scene.ageMs + 180);
  scene.hitUntil = scene.ageMs + 80;
  spawnFloat(scene.floats, slot.x + 7, slot.foot - heroFormSprite(player.formId).h - 26, format(damage), crit, undefined, 1);
}

export function drawRaid(ctx: SpriteCanvas, scene: RaidScene, timeMs = scene.ageMs): void {
  const { view } = scene;
  if (view.phase === 'battle') {
    drawMeter(ctx, RAID_HP_BAR.x, RAID_HP_BAR.y, RAID_HP_BAR.w, RAID_HP_BAR.h, view.bossHpRatio, COLORS.red);
    drawMeter(ctx, RAID_TIME_BAR.x, RAID_TIME_BAR.y, RAID_TIME_BAR.w, RAID_TIME_BAR.h,
      view.remainingMs / Math.max(1, view.timeoutMs), COLORS.blue);
    drawOutlinedText(ctx, `${view.participants.length} HEROES`, RAID_TIME_BAR.x, 26, 1, COLORS.white);
    const remaining = `${Math.ceil(view.remainingMs / 1000)}S`;
    drawOutlinedText(ctx, remaining, 180 - textWidth(remaining), 26, 1, COLORS.white);
    const element = view.bossId.slice(5) as MonsterType;
    const bossElement = ['water', 'wind', 'dark', 'earth', 'fire'].includes(element) ? element : 'dark';
    const hit = scene.hitUntil > scene.ageMs;
    drawRaidBoss(ctx, bossElement, hit ? 0 : Math.floor(timeMs / 500) % 2,
      36 + (hit ? Math.floor(scene.ageMs / 20) % 2 : 0), GROUND, hit ? { tint: COLORS.white } : {});
  }
  const participants = new Map(view.participants.map(p => [p.playerId, p]));
  for (const slot of scene.slots) {
    const player = participants.get(slot.playerId);
    if (!player) continue;
    const attacking = view.phase === 'battle' && (scene.attacks.get(player.playerId) ?? 0) > scene.ageMs;
    const art = heroFormSprite(player.formId, attacking);
    const frame = attacking ? Math.min(1, art.frames.length - 1) : Math.floor(timeMs / 500) % art.frames.length;
    drawSprite(ctx, art, frame, slot.x, slot.foot - art.h, { scale: RAID_SCALE, flipX: slot.flipX });
  }
  const me = scene.slots.find(slot => slot.isLocal);
  const local = participants.get(view.me);
  if (me && local) {
    const markerY = me.foot - heroFormSprite(local.formId).h - 5 - Math.floor(timeMs / 500) % 2;
    ctx.fillStyle = COLORS.void;
    ctx.fillRect(me.x + 3, markerY - 1, 7, 2);
    ctx.fillRect(me.x + 4, markerY + 1, 5, 2);
    ctx.fillRect(me.x + 5, markerY + 3, 3, 1);
    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(me.x + 4, markerY, 5, 1);
    ctx.fillRect(me.x + 5, markerY + 1, 3, 1);
    ctx.fillRect(me.x + 6, markerY + 2, 1, 1);
    const label = `LV ${local.level}`;
    drawOutlinedText(ctx, label, me.x + 7 - Math.floor(textWidth(label) / 2), markerY - 8, 1, COLORS.white);
  }
  drawFloats(ctx, scene.floats);
  if (view.phase === 'settled') {
    drawBanner(ctx, { active: true, ageMs: scene.settledMs, text: view.result?.victory ? 'VICTORY!' : 'DEFEAT' }, WIDTH);
    if (view.result?.rank !== undefined) {
      const rank = `RANK ${view.result.rank}`;
      drawOutlinedText(ctx, rank, Math.floor((WIDTH - textWidth(rank)) / 2), 28, 1, COLORS.yellow);
    }
  }
}

/** Server roster and verdict are authoritative. Registration alone never enters combat. */
export function raidViewOf(live: RaidLiveResponse, previous?: RaidLiveResponse | null): RaidStateView | null {
  const { raid, now } = live;
  if (!raid.me.confirmed || !raid.battle || !['battle', 'settled'].includes(raid.phase)
    || !raid.participants.some(p => p.playerId === raid.me.playerId)) return null;
  const old = new Map((previous?.raid.raidId === raid.raidId ? previous.raid.participants : []).map(p => [p.playerId, BigInt(p.damage)]));
  const remainingMs = Math.max(0, (raid.battleEnd ?? now) - now);
  return {
    raidId: raid.raidId, bossId: raid.boss.id, phase: raid.phase as 'battle' | 'settled',
    bossHpRatio: ratio(BigInt(raid.battle.hpLeft), BigInt(raid.battle.bossHp)),
    remainingMs, timeoutMs: Math.max(1, (raid.battleEnd ?? now) - (raid.confirmUntil ?? now)), me: raid.me.playerId,
    participants: raid.participants.map(p => ({ ...p, damageDelta: (old.has(p.playerId) ? BigInt(p.damage) - old.get(p.playerId)! : 0n).toString() })),
    ...(raid.phase === 'settled' ? { result: { victory: raid.battle.killed, rank: raid.me.rank } } : {}),
  };
}
