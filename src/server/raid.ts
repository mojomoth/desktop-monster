import { heroicAttack } from '../core/battle.js';
import { isHeroCombatSnapshot } from '../core/equipment.js';
import { CRIT_MULT, xpToNext } from '../core/formulas.js';
import { FEVER_MULT } from '../core/fever.js';
import { RAID_BOSSES, RAID_PARAMETERS, raidLootForBoss } from '../core/raid.js';
import type { RaidParameters } from '../core/raid.js';
import { mulberry32 } from '../core/rng.js';
import type { RaidAttackRequest, RaidLiveResponse, RaidPhase, RaidReward, RaidView } from '../shared/api.js';
import type { ApiRequest, ApiResponse } from './http.js';
import type { PlayerRow, Store } from './store.js';

export const RAID_EPOCH = Date.parse('2026-09-21T00:00:00Z');
export const RAID_RATE_LIMIT = 150;
export const RAID_FLUSH_MS = 5000;
const TOP_CONTRIBUTORS = 10;
interface ConfirmedHero {
  name: string; formId: string; level: number; bestIndex: number; attack: string; at: number;
  total: string; seq: number; clicks: number; lastAt: number; reachedAt: number;
}
export interface RaidDocument {
  id: string; cycle: number; bossId: string; seed: number; params: RaidParameters; gatherDeadline: number;
  conditions: { id: 'level' | 'bestIndex'; min: number; players: string[] }[];
  joins: string[]; confirmed: Record<string, ConfirmedHero>;
  unlockedAt?: number; battleAt?: number; bossHp?: string; hpLeft?: string;
  killedAt?: number; settledAt?: number; skipped?: boolean;
  rewards: Record<string, { reward: RaidReward; claimedAt?: number }>;
}
const record = (raw: unknown): Record<string, unknown> | null => raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const error = (status: number, code: string): ApiResponse => ({ status, body: { error: code } });
export const cycleOf = (now: number, params: RaidParameters = RAID_PARAMETERS): number => Math.max(0, Math.floor((now - RAID_EPOCH) / params.periodMs));
export function newRaid(cycle: number, seed = cycle, params: RaidParameters = RAID_PARAMETERS): RaidDocument {
  const i = cycle % RAID_BOSSES.length;
  return { id: `r${cycle}`, cycle, seed, params: { ...params }, bossId: RAID_BOSSES[i]!.id,
    gatherDeadline: RAID_EPOCH + cycle * params.periodMs + params.gatherMs,
    conditions: [
      { id: 'level', min: params.conditionLevelMin + i * params.conditionLevelStep, players: [] },
      { id: 'bestIndex', min: params.conditionBestIndexMin + i * params.conditionBestIndexStep, players: [] },
    ], joins: [], confirmed: {}, rewards: {} };
}
export function phaseAt(doc: RaidDocument, now: number): RaidPhase {
  if (doc.skipped) return 'skipped';
  if (doc.settledAt !== undefined) return 'settled';
  if (doc.battleAt === undefined) return now >= doc.gatherDeadline ? 'skipped' : 'gathering';
  if (now < doc.battleAt) return 'countdown';
  if (now < doc.battleAt + doc.params.confirmGraceMs) return 'confirming';
  if (Object.keys(doc.confirmed).length < doc.params.minConfirmed) return 'skipped';
  if (doc.killedAt !== undefined || now >= doc.battleAt + doc.params.confirmGraceMs + doc.params.battleMs) return 'settled';
  return 'battle';
}
const rankHeroes = (doc: RaidDocument): [string, ConfirmedHero][] => Object.entries(doc.confirmed).sort(([aid, a], [bid, b]) =>
  BigInt(a.total) === BigInt(b.total) ? a.reachedAt - b.reachedAt || aid.localeCompare(bid) : BigInt(a.total) > BigInt(b.total) ? -1 : 1);
export function settle(doc: RaidDocument, at: number): void {
  if (doc.settledAt !== undefined) return;
  doc.settledAt = at;
  const ranked = rankHeroes(doc), total = ranked.reduce((sum, [, hero]) => sum + BigInt(hero.total), 0n), p = doc.params;
  ranked.forEach(([id, hero], index) => {
    const full = doc.killedAt !== undefined && total > 0n && BigInt(hero.total) * 10000n >= total * BigInt(p.contributionFloorBps);
    const rng = mulberry32(doc.seed ^ (index + 1));
    const odds = Math.max(p.itemOddsFloorBps, p.itemOddsTopBps * (p.itemOddsDecayBps / 10000) ** index);
    const item = full && rng.next() * 10000 < odds ? raidLootForBoss(doc.bossId)[Math.floor(rng.next() * 2)] : undefined;
    doc.rewards[id] = { reward: { raidId: doc.id, rank: index + 1, of: ranked.length,
      xpLevels: p.xpLevels, goldKills: p.goldKills, level: hero.level, bestIndex: hero.bestIndex,
      rewardBps: full ? 10000 : p.failRewardBps, ...(item ? { itemTemplateId: item.id } : {}) } };
  });
}
const bossHpFor = (attack: bigint, p: RaidParameters): bigint =>
  attack * BigInt(Math.round(p.cadencePerSec * 1000)) * BigInt(p.battleMs) * BigInt(p.clearRatioBps) / 10000000000n;

/** Lazy catch-up: HP and settlement are initialized once even after a restart. */
export function advance(doc: RaidDocument, now: number): void {
  const phase = phaseAt(doc, now);
  if (phase === 'skipped') { doc.skipped = true; return; }
  if (phase !== 'battle' && phase !== 'settled') return;
  if (doc.bossHp === undefined) {
    const sum = Object.values(doc.confirmed).reduce((n, hero) => n + BigInt(hero.attack), 0n), p = doc.params;
    const hp = bossHpFor(sum, p);
    doc.bossHp = String(hp > 0n ? hp : 1n); doc.hpLeft = doc.bossHp;
  }
  if (phase === 'settled') settle(doc, doc.killedAt ?? doc.battleAt! + doc.params.confirmGraceMs + doc.params.battleMs);
}
export function viewOf(doc: RaidDocument, player: PlayerRow, now: number): RaidView {
  const p = doc.params, mine = doc.confirmed[player.id], receipt = doc.rewards[player.id];
  return { raidId: doc.id, cycle: doc.cycle, boss: RAID_BOSSES.find(b => b.id === doc.bossId)!, phase: phaseAt(doc, now),
    gatherDeadline: doc.gatherDeadline, capacity: p.capacity, joined: doc.joins.length,
    confirmed: Object.keys(doc.confirmed).length, openToAll: doc.unlockedAt !== undefined && now >= doc.unlockedAt + p.priorityMs,
    conditions: doc.conditions.map(c => ({ id: c.id, kind: c.id, min: c.min, need: p.conditionNeed,
      have: c.players.length, mine: c.players.includes(player.id), qualified: (player.snapshot?.[c.id] ?? 0) >= c.min })),
    participants: Object.entries(doc.confirmed).map(([playerId, h]) => ({ playerId, name: h.name, formId: h.formId, level: h.level, damage: h.total })),
    ...(doc.unlockedAt === undefined ? {} : { unlockedAt: doc.unlockedAt, priorityUntil: doc.unlockedAt + p.priorityMs }),
    ...(doc.battleAt === undefined ? {} : { battleAt: doc.battleAt, confirmUntil: doc.battleAt + p.confirmGraceMs,
      battleEnd: doc.battleAt + p.confirmGraceMs + p.battleMs }),
    ...(doc.settledAt === undefined ? {} : { claimUntil: doc.settledAt + p.claimWindowMs }),
    ...(doc.bossHp === undefined ? {} : { battle: { bossHp: doc.bossHp, hpLeft: doc.hpLeft!, killed: doc.killedAt !== undefined,
      elapsedMs: Math.max(0, Math.min(p.battleMs, (doc.killedAt ?? now) - doc.battleAt! - p.confirmGraceMs)),
      top: rankHeroes(doc).slice(0, TOP_CONTRIBUTORS).map(([, h]) => ({ name: h.name, damage: h.total })) } }),
    me: { playerId: player.id, unlocker: doc.conditions.some(c => c.players.includes(player.id)), joined: doc.joins.includes(player.id),
      confirmed: mine !== undefined, damage: mine?.total ?? '0', seq: mine?.seq ?? 0, claimed: receipt?.claimedAt !== undefined,
      ...(receipt ? { rank: receipt.reward.rank, reward: { ...receipt.reward } } : {}) } };
}
export function parseRaidAttack(raw: unknown): RaidAttackRequest | null {
  const b = record(raw);
  if (!b || typeof b.raidId !== 'string' || !/^r\d{1,16}$/.test(b.raidId) || !integer(b.seq, 1) ||
    typeof b.damage !== 'string' || !/^(0|[1-9]\d{0,39})$/.test(b.damage) || !integer(b.clicks, 1, 10000) ||
    !integer(b.crits, 0, b.clicks) || !integer(b.feverMs, 0, 300000)) return null;
  return { raidId: b.raidId, seq: b.seq, damage: b.damage, clicks: b.clicks, crits: b.crits, feverMs: b.feverMs };
}
/** Per-batch AND lifetime click budgets prevent repeated same-tick bursts. */
export function damageCap(doc: RaidDocument, hero: ConfirmedHero, batch: RaidAttackRequest, now: number): { damage: bigint; clicks: number } {
  const p = doc.params, start = doc.battleAt! + p.confirmGraceMs;
  const lifetime = Math.floor(Math.max(0, now - start) / 1000 * p.maxClicksPerSec);
  const sinceBatch = Math.floor(Math.max(0, now - Math.max(start, hero.lastAt)) / 1000 * p.maxClicksPerSec);
  const clicks = Math.min(batch.clicks, p.maxClicksPerSec * p.batchCapSec, sinceBatch, Math.max(0, lifetime - hero.clicks));
  const crits = Math.min(clicks, batch.crits), fever = batch.feverMs > 0 ? FEVER_MULT : 1n;
  const cap = BigInt(hero.attack) * BigInt(clicks - crits + crits * CRIT_MULT) * fever * BigInt(p.damageSlackBps) / 10000n;
  return { damage: BigInt(batch.damage) > cap ? cap : BigInt(batch.damage), clicks };
}

/** One service instance owns raids; its queue never locks the players table.
 * ponytail: accepted attack durability has a <=5s flush window; multi-instance
 * deployments require raid row locks before sharing this service. */
export function createRaidService(store: Store, now: () => number, randomSeed: () => number, params: RaidParameters = RAID_PARAMETERS): {
  handle(req: ApiRequest, player: PlayerRow): Promise<ApiResponse>;
} {
  const cache = new Map<string, RaidDocument>(), flushed = new Map<string, number>();
  const absent = new Set<string>();
  let tail = Promise.resolve();
  const load = async (cycle: number): Promise<RaidDocument> => {
    const id = `r${cycle}`;
    let doc = cache.get(id);
    if (!doc) { doc = await store.getRaid(id) ?? newRaid(cycle, randomSeed(), params); cache.set(id, doc); }
    return doc;
  };
  const persist = async (doc: RaidDocument, at: number): Promise<void> => {
    await store.putRaid(doc.id, doc); flushed.set(doc.id, at);
  };
  const route = async (req: ApiRequest, player: PlayerRow): Promise<ApiResponse> => {
    const at = now(), cycle = cycleOf(at, params), current = await load(cycle);
    const body = record(req.body), operation = req.path.slice('/v1/raid/'.length);
    if (!(req.method === 'GET' && operation === 'live') && !(req.method === 'POST' && ['participate', 'join', 'confirm', 'attack', 'claim'].includes(operation))) return error(404, 'not_found');
    const before = structuredClone(current), phaseBefore = phaseAt(current, at - 1);
    advance(current, at);
    const phase = phaseAt(current, at);
    let durable = JSON.stringify(before) !== JSON.stringify(current) || !flushed.has(current.id);
    let attackResult: { accepted: boolean; expectedSeq: number } | undefined;
    try {
      if (operation === 'claim') {
        if (!body || typeof body.raidId !== 'string' || !/^r\d{1,16}$/.test(body.raidId)) return error(400, 'bad_request');
        const claimCycle = Number(body.raidId.slice(1));
        if (!integer(claimCycle) || claimCycle > cycle || cycle - claimCycle > Math.ceil(params.claimWindowMs / params.periodMs) + 1) return error(410, 'expired');
        const claimId = `r${claimCycle}`;
        const doc = cache.get(claimId) ?? await store.getRaid(claimId);
        if (!doc) return error(410, 'expired');
        cache.set(claimId, doc);
        const prior = structuredClone(doc);
        advance(doc, at);
        const receipt = doc.rewards[player.id];
        if (!receipt) return error(409, 'raid_phase');
        if (at > doc.settledAt! + doc.params.claimWindowMs) return error(410, 'expired');
        receipt.claimedAt ??= at;
        try { await persist(doc, at); } catch (failure) { cache.set(doc.id, prior); throw failure; }
        return { status: 200, body: { reward: { ...receipt.reward } } };
      }
      if (req.method === 'POST' && !body) return error(400, 'bad_request');
      if (operation === 'participate') {
        if (phase !== 'gathering') return error(409, 'raid_phase');
        const condition = current.conditions.find(c => c.id === body?.conditionId);
        if (!condition) return error(400, 'bad_request');
        if ((player.snapshot?.[condition.id] ?? 0) < condition.min) return error(403, 'raid_ineligible');
        if (!condition.players.includes(player.id) && condition.players.length < current.params.conditionNeed) condition.players.push(player.id);
        if (current.conditions.every(c => c.players.length >= current.params.conditionNeed)) {
          current.unlockedAt = at; current.battleAt = at + current.params.countdownMs;
        }
        durable = true;
      } else if (operation === 'join') {
        if (phase !== 'countdown' && phase !== 'confirming') return error(409, 'raid_phase');
        if (!current.joins.includes(player.id)) {
          if (at < current.unlockedAt! + current.params.priorityMs && !current.conditions.some(c => c.players.includes(player.id))) return error(409, 'raid_phase');
          if (current.joins.length >= current.params.capacity) return error(409, 'raid_full');
          current.joins.push(player.id); durable = true;
        }
      } else if (operation === 'confirm') {
        if (phase !== 'confirming' || !current.joins.includes(player.id)) return error(409, 'raid_phase');
        if (!current.confirmed[player.id]) {
          const combat = player.snapshot?.combat;
          if (!isHeroCombatSnapshot(combat)) return error(426, 'upgrade_required');
          const attack = heroicAttack(combat), maxWire = 10n ** 40n - 1n;
          const total = Object.values(current.confirmed).reduce((sum, hero) => sum + BigInt(hero.attack), attack);
          // A single extreme snapshot must not poison the shared raid wire or
          // mint XP the local safe-integer save can never apply.
          if (attack * BigInt(CRIT_MULT) * FEVER_MULT > maxWire || bossHpFor(total, current.params) > maxWire ||
            !Number.isSafeInteger(xpToNext(combat.level) * current.params.xpLevels)) return error(400, 'raid_power_limit');
          current.confirmed[player.id] = { name: player.name, formId: combat.hero.formId, level: combat.level,
            bestIndex: player.snapshot!.bestIndex, attack: String(attack), at,
            total: '0', seq: 0, clicks: 0, lastAt: at, reachedAt: at }; durable = true;
        }
      } else if (operation === 'attack') {
        const batch = parseRaidAttack(body);
        if (!batch) return error(400, 'bad_request');
        if (batch.raidId !== current.id || phase !== 'battle') return error(410, 'raid_over');
        const hero = current.confirmed[player.id];
        if (!hero) return error(403, 'raid_unconfirmed');
        attackResult = { accepted: false, expectedSeq: hero.seq + 1 };
        if (batch.seq === hero.seq + 1) {
          const capped = damageCap(current, hero, batch, at), left = BigInt(current.hpLeft!);
          const damage = capped.damage > left ? left : capped.damage;
          hero.total = String(BigInt(hero.total) + damage); hero.seq = batch.seq;
          hero.clicks += capped.clicks; hero.lastAt = at; if (damage > 0n) hero.reachedAt = at;
          current.hpLeft = String(left - damage);
          if (current.hpLeft === '0') { current.killedAt = at; advance(current, at); durable = true; }
          attackResult = { accepted: true, expectedSeq: hero.seq + 1 };
        }
      }
      if (durable || phaseBefore !== phaseAt(current, at) || at - (flushed.get(current.id) ?? 0) >= RAID_FLUSH_MS) await persist(current, at);
      const result: RaidLiveResponse = { now: at, raid: viewOf(current, player, at) };
      for (let prior = cycle - 1; prior >= Math.max(0, cycle - Math.ceil(params.claimWindowMs / params.periodMs) - 1); prior--) {
        const id = `r${prior}`;
        if (absent.has(id)) continue;
        const doc = cache.get(id) ?? await store.getRaid(id);
        if (!doc) { absent.add(id); continue; }
        cache.set(id, doc);
        advance(doc, at);
        if (doc.rewards[player.id]?.claimedAt === undefined && doc.rewards[player.id] && at <= doc.settledAt! + doc.params.claimWindowMs) {
          cache.set(id, doc); await persist(doc, at); result.previous = viewOf(doc, player, at); break;
        }
      }
      for (const [id, doc] of cache) if (cycle - doc.cycle > Math.ceil(params.claimWindowMs / params.periodMs) + 1) { cache.delete(id); flushed.delete(id); }
      return { status: 200, body: { ...result, ...attackResult } };
    } catch (failure) { cache.set(current.id, before); throw failure; }
  };
  return { handle(req, player) {
    const task = tail.then(() => route(req, player));
    tail = task.then(() => undefined, () => undefined);
    return task;
  } };
}
