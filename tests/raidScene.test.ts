import { describe, expect, it } from 'vitest';
import type { RaidLiveResponse } from '../src/shared/api.js';
import { applyRaidState, createRaidScene, drawRaid, RAID_HP_BAR, RAID_TIME_BAR, raidLocalHit, raidSlots, raidViewOf, tickRaid } from '../src/renderer/raidScene.js';
import type { RaidStateView } from '../src/renderer/raidScene.js';
import { raidStatus } from '../src/renderer/raidStatus.js';
import { COLORS, drawSprite } from '../src/renderer/sprites/index.js';
import { heroFormSprite } from '../src/renderer/sprites/heroForms.js';

function canvas() {
  const rects: { x: number; y: number; w: number; h: number; color: string }[] = [];
  const ctx = { fillStyle: '', fillRect(x: number, y: number, w: number, h: number) { rects.push({ x, y, w, h, color: ctx.fillStyle }); } };
  return { ctx, rects };
}
function view(count = 32): RaidStateView {
  return { raidId: 'r7', bossId: 'raid-dark', phase: 'battle', bossHpRatio: .62, remainingMs: 55_000,
    timeoutMs: 120_000, me: 'me', participants: Array.from({ length: count }, (_, i) => ({
      playerId: i === 0 ? 'me' : `p${i}`, name: `Hero ${i}`, formId: i === 0 ? 'h11' : 'h00', level: 33, damageDelta: '0',
    })) };
}
function live(): RaidLiveResponse {
  return { now: 100_000, raid: { raidId: 'r7', cycle: 7, boss: { id: 'raid-dark', name: '노크튀르', element: 'dark' },
    phase: 'battle', gatherDeadline: 10_000, capacity: 50, joined: 2, confirmed: 2, openToAll: true, conditions: [],
    confirmUntil: 90_000, battleEnd: 210_000, participants: view(2).participants.map(p => ({ ...p, damage: '100' })),
    battle: { bossHp: '1000', hpLeft: '620', elapsedMs: 10_000, killed: false, top: [] },
    me: { playerId: 'me', unlocker: false, joined: true, confirmed: true, damage: '100', seq: 1, claimed: false },
  } };
}

describe('actual raid composition', () => {
  it.each([8, 20, 32, 50, 100, 250])('retains all %i participants across the full field, local hero in front', count => {
    const ids = view(count).participants.map(p => p.playerId);
    const slots = raidSlots('raid', ids, 'me');
    expect(slots).toHaveLength(count);
    expect(new Set(slots.map(p => p.playerId)).size).toBe(count);
    expect(slots).toEqual(raidSlots('raid', [...ids].reverse(), 'me'));
    expect(slots.at(-1)).toMatchObject({ playerId: 'me', x: 93, foot: 120, isLocal: true });
    expect(slots.some(s => s.x < 40)).toBe(true);
    expect(slots.some(s => s.x >= 80 && s.x <= 110)).toBe(true);
    expect(slots.some(s => s.x > 160)).toBe(true);
    expect(slots.every(s => s.x >= 0 && s.x + 14 <= 200 && s.foot >= 112 && s.foot <= 120)).toBe(true);
    expect(slots.map(s => s.foot)).toEqual(slots.map(s => s.foot).sort((a, b) => a - b));
    if (count >= 20) expect(slots.some((a, i) => slots.slice(i + 1).some(b => Math.abs(a.x - b.x) < 14 && Math.abs(a.foot - b.foot) < 14))).toBe(true);
  });

  it('draws red HP, blue time, doubled boss pixels above the ground and native heroes in front', () => {
    const { ctx, rects } = canvas();
    const scene = createRaidScene(view());
    drawRaid(ctx, scene);
    expect(rects).toContainEqual({ x: RAID_HP_BAR.x + 1, y: RAID_HP_BAR.y + 1, w: 98, h: 3, color: COLORS.red });
    expect(rects).toContainEqual({ x: RAID_TIME_BAR.x + 1, y: RAID_TIME_BAR.y + 1, w: 72, h: 1, color: COLORS.blue });
    const boss = rects.filter(r => r.color === '#574467');
    expect(boss.length).toBeGreaterThan(20);
    expect(boss.every(r => r.h === 2 && r.w % 2 === 0 && r.x >= 36 && r.x + r.w <= 164 && r.y >= 32 && r.y + r.h <= 120)).toBe(true);
    const markerIndex = rects.map(r => r.x === 96 && r.y === 100 && r.w === 7 && r.h === 2).lastIndexOf(true);
    expect(markerIndex).toBeGreaterThan(0);
    const local = canvas();
    drawSprite(local.ctx, heroFormSprite('h11'), 0, 93, 106, { scale: 1 });
    expect(rects.slice(markerIndex - local.rects.length, markerIndex)).toEqual(local.rects);
    expect(rects.indexOf(boss.at(-1)!)).toBeLessThan(markerIndex - local.rects.length);
    expect(rects).toContainEqual({ x: 97, y: 101, w: 5, h: 1, color: COLORS.yellow });
    expect(rects.filter(r => r.y >= 90 && r.y < 100 && r.color === COLORS.white).length).toBeGreaterThan(0);
    expect(rects.every(r => r.y + r.h <= 120 && r.x >= 0 && r.x + r.w <= 200)).toBe(true);
  });

  it('anchors local damage above its own marker and animates pushed peer damage without field effects', () => {
    const scene = createRaidScene(view());
    raidLocalHit(scene, 4200n, true);
    expect(scene.floats.find(f => f.active)).toMatchObject({ x: 100, y: 80, text: '4.20A', crit: true, scale: 1 });
    const pushed = view(); pushed.participants[1]!.damageDelta = '300';
    applyRaidState(scene, pushed);
    expect(scene.attacks.has('p1')).toBe(true);
    expect(scene.hitUntil).toBe(80);
    tickRaid(scene, 181);
    expect(scene.view.remainingMs).toBe(55_000 - 181);
    expect(scene.attacks.get('p1')!).toBeLessThan(scene.ageMs);
  });

  it.each([true, false])('shows server result (victory=%s) for two seconds without polls resetting it', victory => {
    const scene = createRaidScene({ ...view(), phase: 'settled', result: { victory, rank: 2 } });
    const result = canvas(); drawRaid(result.ctx, scene);
    expect(result.rects.length).toBeGreaterThan(0);
    expect(result.rects.some(r => r.color === '#574467')).toBe(false);
    expect(tickRaid(scene, 1000)).toBe(true);
    applyRaidState(scene, { ...view(), phase: 'settled', result: { victory, rank: 2 } });
    expect(tickRaid(scene, 999)).toBe(true);
    expect(tickRaid(scene, 1)).toBe(false);
  });
});

describe('server raid presentation boundary', () => {
  it('requires explicit confirmation and an actual roster member, rather than a count or registration', () => {
    const reply = live();
    expect(raidViewOf(reply)).toMatchObject({ me: 'me', bossHpRatio: .62, timeoutMs: 120_000, remainingMs: 110_000 });
    expect(raidViewOf(reply)?.participants).toHaveLength(2);
    reply.raid.me.confirmed = false;
    expect(raidViewOf(reply)).toBeNull();
    reply.raid.me.confirmed = true;
    reply.raid.participants = [];
    expect(raidViewOf(reply)).toBeNull();
  });
  it('derives peer hits from new cumulative damage, without replaying old hits on duplicate polls', () => {
    const before = live(), after = live();
    after.raid.participants[1]!.damage = '4200';
    expect(raidViewOf(after, before)?.participants[1]?.damageDelta).toBe('4100');
    expect(raidViewOf(after, after)?.participants[1]?.damageDelta).toBe('0');
  });
  it('shows server-aligned countdown, confirmation and reconnect state', () => {
    const reply = live(); reply.raid.phase = 'countdown'; reply.raid.battleAt = reply.now + 3_661_000;
    expect(raidStatus(reply, reply.now, true)).toMatchObject({ text: '레이드 01:01:01', actionable: false });
    reply.raid.phase = 'confirming'; reply.raid.confirmUntil = reply.now + 10_000; reply.raid.me.confirmed = false;
    expect(raidStatus(reply, reply.now, true)).toMatchObject({ text: '경고 · 참여', actionable: true });
    reply.raid.me.confirmed = true;
    expect(raidStatus(reply, reply.now, true)).toMatchObject({ text: '참여 완료', actionable: false });
    expect(raidStatus(reply, reply.now, false)).toMatchObject({ text: '레이드 연결 끊김 · 재연결 중', className: 'offline', actionable: false });
    reply.raid.me.confirmed = false;
    expect(raidStatus(reply, reply.now + 11_000, true).actionable).toBe(false);
  });
});
