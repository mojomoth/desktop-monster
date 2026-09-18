#!/usr/bin/env node
// Virtual-time paired PvE preservation plus a fixed, independently bounded raid matrix.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const encode = value => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? String(v) + 'n' : v);
const assert = (condition, message) => { if (!condition) throw Error(message); };
const policies = ['active', 'returning-idle'];
const raids = ['attacker-wins', 'defender-wins', 'repeat-pair', 'rotating-donors', 'rotating-attackers', 'offline-spend-restore'];
const binding = directory => Object.fromEntries(readdirSync(directory).filter(f => /\.(ts|js)$/.test(f)).sort()
  .map(f => [join(directory, f), sha(readFileSync(join(directory, f)))]));
const gameplay = save => {
  const result = { ...save }; delete result.pvpGoldNet; delete result.pvpGoldDebt; return result;
};
const quantiles = values => {
  const v = [...values].sort((a, b) => a - b);
  return { min: v[0], p10: v[Math.floor((v.length - 1) * .1)], p50: v[Math.floor((v.length - 1) * .5)],
    p90: v[Math.floor((v.length - 1) * .9)], max: v.at(-1) };
};

function field(core, seed, policy, duration = 1_800_000) {
  const random = core.mulberry32(seed); let draws = 0, inputs = 0;
  const rng = { next: () => { draws++; return random.next(); } };
  const initial = policy === 'active' ? null : { ...core.DEFAULT_SAVE, nextCompanionId: 6,
    companions: Array.from({ length: 5 }, (_, i) => ({ id: `c${i + 1}`, speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 })) };
  const engine = core.createEngine(initial, rng), events = createHash('sha256'), checkpoints = [];
  const collect = (at, produced) => { if (produced.length) events.update(encode([at, produced]) + '\n'); };
  for (let at = 0; at < duration; at += 100) {
    if (policy === 'active' && at % 500 === 0) { inputs++; collect(at, engine.attack('keyboard')); }
    collect(at + 100, engine.tick(100));
    if ([300_000, 900_000, 1_800_000].includes(at + 100)) checkpoints.push({ at: at + 100,
      coins: engine.getState().coins, hash: sha(encode(gameplay(engine.toSave()))), draws });
  }
  return { seed, policy, duration, inputs, draws, eventHash: events.digest('hex'), checkpoints,
    finalSave: gameplay(engine.toSave()) };
}

function raidMatrix(core, gold, seed, balance, sourcePolicy) {
  const rows = [];
  const wallet = coins => ({ ...gold.currentGold(null, 0), enrolled: true, balance: coins, peak: coins });
  for (const policy of raids) {
    // Rich synthetic counterpart makes the small player's stake and protection observable.
    const initial = Math.max(100, balance), accounts = { a: wallet(initial), d: wallet(initial) };
    const before = initial * 2; const transfers = [];
    const transfer = (a, d, won, at) => {
      const result = gold.raidGold(accounts[a], accounts[d], a, d, won, at);
      transfers.push({ attacker: a, defender: d, won, at, ...result });
    };
    if (policy === 'attacker-wins' || policy === 'defender-wins') transfer('a', 'd', policy === 'attacker-wins', 0);
    if (policy === 'repeat-pair') {
      transfer('a', 'd', true, 0);
      for (let minute = 1; minute <= 60; minute++) transfer(minute % 2 ? 'd' : 'a', minute % 2 ? 'a' : 'd', true, minute * 60_000);
    }
    if (policy === 'rotating-donors' || policy === 'rotating-attackers') {
      for (let i = 0; i < 20; i++) {
        accounts['p' + i] = wallet(initial);
        transfer(policy === 'rotating-donors' ? 'a' : 'p' + i, policy === 'rotating-donors' ? 'p' + i : 'd', true, i * 60_000);
      }
    }
    let offline;
    if (policy === 'offline-spend-restore') {
      transfer('a', 'd', true, 0);
      // Synthetic terminal spend: money already used offline remains an obligation,
      // then real engine item drops repay it. This is not a shop-buy pacing policy.
      const engine = core.createEngine({ ...core.DEFAULT_SAVE, coins: 0 }, core.mulberry32(seed));
      engine.apply({ type: 'syncPvpGold', net: accounts.d.net });
      const initialDebt = engine.toSave(); let income = 0;
      for (let hit = 0; hit < 20_000 && income < transfers[0].amount + 10; hit++) {
        for (const event of engine.attack('keyboard')) if (event.type === 'itemDropped') {
          income += event.drops.filter(d => d.item.kind === 'coin').reduce((sum, d) => sum + d.amount, 0);
        }
      }
      const paid = engine.toSave();
      const backup = { coins: initial, pvpGoldNet: '0', pvpGoldDebt: '0' };
      const restored = core.settlePvpGold(backup, accounts.d.net);
      const repeated = core.settlePvpGold(backup, accounts.d.net);
      offline = { spent: initial, initialDebt: initialDebt.pvpGoldDebt, income, coins: paid.coins, debt: paid.pvpGoldDebt,
        restored, repeated };
    }
    const final = Object.fromEntries(Object.entries(accounts).map(([id, value]) => [id, { balance: value.balance,
      net: value.net, gained: value.gained, lost: value.lost, peak: value.peak }]));
    rows.push({ kind: 'raid', seed, policy, sourcePolicy, initial, initialTotal: before + (Object.keys(accounts).length - 2) * initial,
      transfers, final, ...(offline ? { offline } : {}) });
  }
  return rows;
}

function checkRows(rows, count = 100) {
  assert(rows.length === count * 14, 'Complete two-field/twelve-raid matrix required');
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.kind}/${row.seed}/${row.sourcePolicy ?? ""}/${row.policy}`;
    assert(!seen.has(key) && row.seed >= 40001 && row.seed < 40001 + count, 'Seed coverage'); seen.add(key);
    if (row.kind === 'field') {
      assert(policies.includes(row.policy) && isDeepStrictEqual(row.baseline, row.candidate), 'PvE gameplay changed');
    } else {
      assert(raids.includes(row.policy) && policies.includes(row.sourcePolicy), 'Unexpected raid policy');
      const accounts = Object.values(row.final);
      assert(accounts.reduce((n, a) => n + a.balance, 0) === row.initialTotal, 'Server balance conservation');
      assert(accounts.reduce((n, a) => n + BigInt(a.net), 0n) === 0n, 'Signed ledger conservation');
      for (const account of accounts) {
        assert(account.balance >= 75 && account.gained <= 250 && account.lost <= Math.min(250, Math.floor(account.peak / 10)), 'Budget/keep invariant');
      }
      const lastPaid = new Map();
      for (const transfer of row.transfers) {
        assert(Number.isSafeInteger(transfer.amount) && transfer.amount >= 0 && transfer.amount <= 75, 'Per-battle bound');
        assert(transfer.delta === (transfer.won ? transfer.amount : -transfer.amount), 'Viewer sign');
        if (transfer.amount) {
          const pair = [transfer.attacker, transfer.defender].sort().join('/');
          assert(lastPaid.get(pair) === undefined || transfer.at - lastPaid.get(pair) >= 3_600_000, 'Unordered pair protection');
          lastPaid.set(pair, transfer.at);
        }
      }
      if (row.offline) {
        const o = row.offline, debit = row.transfers[0].amount;
        assert(BigInt(o.initialDebt) === BigInt(debit), 'Offline spend must preserve full debt');
        assert(BigInt(o.coins) - BigInt(o.debt) === BigInt(o.income - debit), 'Real drop/debt conservation');
        assert(o.income >= debit + 10 && o.debt === '0', 'Debt repayment actually exercised');
        assert(isDeepStrictEqual(o.restored, o.repeated) && o.restored.coins === row.initial - debit, 'Checkpoint cursor reconciliation');
      }
    }
  }
}
const summarize = rows => policies.map(policy => ({ policy, samples: rows.filter(r => r.kind === 'field' && r.policy === policy).length,
  coins30m: quantiles(rows.filter(r => r.kind === 'field' && r.policy === policy).map(r => r.candidate.finalSave.coins)),
  firstRaid: quantiles(rows.filter(r => r.kind === 'raid' && r.policy === 'attacker-wins' && r.sourcePolicy === policy).map(r => r.transfers[0].amount)) }));

async function main(args) {
  if (args[0] === 'verify') {
    const report = JSON.parse(readFileSync(args[1], 'utf8')), bytes = readFileSync(report.rawPath, 'utf8');
    assert(report.version === 91 && report.seeds === 100 && report.passed && sha(bytes) === report.rawHash, 'Report/raw binding');
    for (const [file, hash] of Object.entries(report.binding)) assert(sha(readFileSync(file)) === hash, `Changed bound file: ${file}`);
    const rows = bytes.trim().split('\n').map(JSON.parse); checkRows(rows);
    assert(isDeepStrictEqual(report.summary, summarize(rows)), 'Summary mismatch');
    process.stdout.write('V091_BALANCE_VERIFIED\n'); return;
  }
  assert(args.length === 3, 'Usage: balance.mjs BASELINE_CORE CANDIDATE_ELECTRON OUTPUT_JSON | verify OUTPUT_JSON');
  const baselineDir = resolve(args[0]), candidateDir = resolve(args[1]), output = resolve(args[2]);
  const baseline = require(join(baselineDir, 'index.js')), core = require(join(candidateDir, 'core/index.js'));
  const gold = require(join(candidateDir, 'server/gold.js'));
  const hashes = { ...binding(baselineDir), ...binding(join(candidateDir, 'core')), ...binding(join(candidateDir, 'server')),
    ...binding(join(root, 'src/core')), ...binding(join(root, 'src/server')), [fileURLToPath(import.meta.url)]: sha(readFileSync(fileURLToPath(import.meta.url))) };
  mkdirSync(dirname(output), { recursive: true });
  const rows = []; let error = null;
  try {
    for (let seed = 40001; seed <= 40100; seed++) {
      for (const policy of policies) {
        const candidate = field(core, seed, policy);
        rows.push({ kind: 'field', seed, policy, baseline: field(baseline, seed, policy), candidate });
        rows.push(...raidMatrix(core, gold, seed, candidate.finalSave.coins, policy));
      }
      if (seed % 10 === 0) process.stdout.write(`balance seeds ${seed - 40000}/100\n`);
    }
    checkRows(rows);
    for (const [file, hash] of Object.entries(hashes)) assert(sha(readFileSync(file)) === hash, `Source changed during run: ${file}`);
  } catch (e) { error = String(e); }
  const bytes = rows.map(encode).join('\n') + '\n', rawPath = output.replace(/\.json$/, '') + '.jsonl';
  writeFileSync(rawPath, bytes, { flag: 'wx' });
  writeFileSync(output, JSON.stringify({ version: 91, seeds: 100, rows: rows.length, policies, raids,
    kind: 'virtual-paired-PvE-and-raid-accounting', interpretation: '100 seeded paired 30-minute trajectories per policy; raids are synthetic financial policies, not human or native play.',
    rawPath, rawHash: sha(bytes), binding: hashes, summary: summarize(rows), passed: error === null, error }, null, 2) + '\n', { flag: 'wx' });
  if (error) throw Error(error); process.stdout.write('V091_BALANCE_OK\n');
}
main(process.argv.slice(2)).catch(error => { process.stderr.write(String(error) + '\n'); process.exitCode = 1; });
