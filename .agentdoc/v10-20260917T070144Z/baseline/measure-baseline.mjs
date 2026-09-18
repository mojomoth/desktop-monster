// Independent Critic baseline. Only the preserved v0.9.1 compiled core is executed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const coreDir = resolve(here, '../preservation/compiled-core');
const core = require(join(coreDir, 'index.js'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashes = () => Object.fromEntries(readdirSync(coreDir).sort().map(name => [join(coreDir, name), hash(readFileSync(join(coreDir, name)))]));
const binding = { ...hashes(), [fileURLToPath(import.meta.url)]: hash(readFileSync(fileURLToPath(import.meta.url))) };
const output = resolve(process.argv[2] ?? join(here, 'baseline-01'));
const seeds = Number(process.argv[3] ?? 100);
assert(Number.isInteger(seeds) && seeds >= 1 && seeds <= 100);
assert(!existsSync(output), 'Never overwrite a prior baseline attempt');
mkdirSync(output, { recursive: true });
const policies = [
  { id: 'active-no-rebirth', inputEveryMs: 500, visitEveryMs: null, fixture: 'fresh' },
  { id: 'active-immediate', inputEveryMs: 500, visitEveryMs: 1000, fixture: 'fresh' },
  { id: 'active-10m-visits', inputEveryMs: 500, visitEveryMs: 600000, fixture: 'fresh' },
  { id: 'returning-idle-10m-visits', inputEveryMs: null, visitEveryMs: 600000, fixture: 'five-initial-companions' },
];
const checkpointsMs = [1800000, 7200000, 28800000];
const protocol = { version: 10, kind: 'independent-preserved-baseline', agentId: '/root/harness_critic',
  clock: 'virtual', tickMs: 100, observationMs: 1000, seeds: { first: 50001, count: seeds }, checkpointsMs, policies,
  heroChoice: 'first offered form; no rerolls', purchases: 'none', companionManagement: 'none',
  boundaries: ['Not native Electron or human play', 'No direct comparison of active and idle as equivalent starting states',
    'No-rebirth intentionally measures delayed progression; immediate is an optimistic menu bot',
    'Checkpoints from a trajectory are correlated; 3 observations do not mean 3 independent runs'] };
writeFileSync(join(output, 'protocol.json'), JSON.stringify(protocol, null, 2) + '\n', { flag: 'wx' });
const raw = join(output, 'raw.jsonl');
writeFileSync(raw, '', { flag: 'wx' });
const quantile = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { min: sorted[0], p10: sorted[Math.floor((sorted.length - 1) * .1)], p50: sorted[Math.floor((sorted.length - 1) * .5)],
    p90: sorted[Math.floor((sorted.length - 1) * .9)], max: sorted.at(-1) };
};
const all = [];
function run(seed, policy) {
  const initial = policy.fixture === 'fresh' ? undefined : { ...core.DEFAULT_SAVE, nextCompanionId: 6,
    companions: Array.from({ length: 5 }, (_, i) => ({ id: 'c' + (i + 1), speciesId: ['slime', 'bat', 'ghost', 'golem', 'dragon'][i], bossIndex: 7, level: 1, stars: 0 })) };
  const engine = core.createEngine(initial, core.mulberry32(seed));
  let inputCount = 0, bossKills = 0, firstBossMs = null, first100GoldMs = null, maxLevel = 1, level = 1;
  const levelFirstMs = { 1: 0 }, levelSeconds = {}, heroActions = [], rows = [];
  const events = batch => { for (const e of batch) if (e.type === 'monsterKilled' && e.monster.boss) bossKills++; };
  for (let at = 0; at < checkpointsMs.at(-1); at += 100) {
    if (policy.inputEveryMs && at % policy.inputEveryMs === 0) { inputCount++; events(engine.attack('keyboard')); }
    events(engine.tick(100));
    const now = at + 100;
    if (bossKills && firstBossMs === null) firstBossMs = now;
    if (now % 1000 !== 0) continue;
    let state = engine.getState();
    if (state.coins >= 100 && first100GoldMs === null) first100GoldMs = now;
    level = state.level;
    maxLevel = Math.max(maxLevel, level);
    levelFirstMs[level] ??= now;
    levelSeconds[level] = (levelSeconds[level] ?? 0) + 1;
    if (policy.visitEveryMs && now % policy.visitEveryMs === 0 && core.heroReadiness(state.level, state.hero).status === 'ready') {
      if (!state.hero?.choices.length) { events(engine.apply({ type: 'heroOffer' })); state = engine.getState(); }
      const choice = state.hero?.choices[0];
      if (choice) {
        const before = state.hero.reincarnations;
        events(engine.apply({ type: 'heroChoose', formId: choice.formId, offerSerial: state.hero.offerSerial }));
        state = engine.getState();
        assert.equal(state.hero.reincarnations, before + 1, 'Registered hero action must actually execute');
        heroActions.push({ atMs: now, formId: choice.formId, priorLevel: level, reincarnations: state.hero.reincarnations });
      }
    }
    if (checkpointsMs.includes(now)) {
      const save = engine.toSave();
      const row = { seed, policy: policy.id, atMs: now, inputCount, coins: save.coins, level: save.level, maxLevel,
        monsterIndex: save.monsterIndex, bestIndex: save.bestIndex, kills: save.killCount, bossKills,
        companions: save.companions.length, souls: save.souls, reincarnations: save.hero?.reincarnations ?? 0,
        firstBossMs, first100GoldMs, levelFirstMs: { ...levelFirstMs }, levelSeconds: { ...levelSeconds },
        heroActions: [...heroActions], finalSaveHash: hash(JSON.stringify(save)) };
      rows.push(row);
      appendFileSync(raw, JSON.stringify(row) + '\n');
    }
  }
  assert.equal(Object.values(levelSeconds).reduce((sum, n) => sum + n, 0), 28800);
  return rows;
}
const startedAt = new Date().toISOString();
for (let i = 0; i < seeds; i++) {
  for (const policy of policies) all.push(...run(50001 + i, policy));
  if (i === 0 || (i + 1) % 5 === 0) process.stdout.write(JSON.stringify({ completedSeeds: i + 1, totalSeeds: seeds,
    firstSeed30m: i === 0 ? all.filter(row => row.atMs === 1800000).map(({ policy, coins, level, maxLevel, bossKills, reincarnations }) =>
      ({ policy, coins, level, maxLevel, bossKills, reincarnations })) : undefined }) + '\n');
}
for (const [path, expected] of Object.entries(binding)) assert.equal(hash(readFileSync(path)), expected, 'Bound baseline input changed: ' + path);
assert.equal(all.length, seeds * policies.length * checkpointsMs.length);
assert.equal(new Set(all.map(row => `${row.seed}/${row.policy}/${row.atMs}`)).size, all.length);
const summary = policies.flatMap(policy => checkpointsMs.map(atMs => {
  const rows = all.filter(row => row.policy === policy.id && row.atMs === atMs);
  return { policy: policy.id, minutes: atMs / 60000, samples: rows.length,
    ...Object.fromEntries(['coins', 'level', 'maxLevel', 'bossKills', 'reincarnations', 'bestIndex'].map(key => [key, quantile(rows.map(row => row[key]))])),
    levelReach: Object.fromEntries([5, 10, 15, 20, 25, 30].map(target => [target, rows.filter(row => row.maxLevel >= target).length / rows.length])),
    firstBossUnreached: rows.filter(row => row.firstBossMs === null).length,
    first100GoldUnreached: rows.filter(row => row.first100GoldMs === null).length,
  };
}));
const report = { ...protocol, startedAt, endedAt: new Date().toISOString(), passed: true, rowCount: all.length,
  binding, raw, rawHash: hash(readFileSync(raw)), protocolHash: hash(readFileSync(join(output, 'protocol.json'))), summary };
writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ report: join(output, 'report.json'), rowCount: all.length, passed: true }) + '\n');
