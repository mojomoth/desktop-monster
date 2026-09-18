import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const directory = dirname(fileURLToPath(import.meta.url));
const selectionPath = resolve('.agentdoc/v11-20260918-resume/balance/r18-explore/report.json');
const selection = JSON.parse(readFileSync(selectionPath));
const selected = selection.reports.find(report => report.candidate.id === 'R18-B');
const coreDirectory = resolve(dirname(selectionPath), 'compiled-R18-B');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2);
const source = readFileSync('.harness/v11/balance.mjs', 'utf8');
assert.equal(sha(source), selection.binding.scriptHash);
for (const [file, hash] of Object.entries(selected.compiledFiles)) assert.equal(sha(readFileSync(resolve(coreDirectory, file))), hash);
let evaluator = source;
const replace = (from, to) => { assert.equal(evaluator.split(from).length, 2); evaluator = evaluator.replace(from, to); };
replace('const firstLevels = {}, checkpoints = [], growthActions = [], noResetActions = [];',
  'const firstLevels = {}, checkpoints = [], growthActions = [], noResetActions = [], finiteSoulFarmActions = [];');
replace("profile === 'soul-farming' && state.monster.index >= c.REBIRTH_MIN_INDEX",
  "(profile === 'soul-farming' || policy === 'finite-soul-farm' && soulRecoveries < 50) && state.monster.index >= c.REBIRTH_MIN_INDEX");
replace("if (apply({ type: 'rebirth', equipmentConfirmation: c.heroChangeWarning(state.equipment, state.hero?.equipped.formId ?? 'h00') })) soulRecoveries++;",
  "const before = engine.toSave(); const action = { type: 'rebirth', equipmentConfirmation: c.heroChangeWarning(state.equipment, state.hero?.equipped.formId ?? 'h00') };\n        if (apply(action)) { soulRecoveries++; finiteSoulFarmActions.push({ atMs: now, action, before, after: engine.toSave() }); }");
replace('finalHeroReincarnations: state.hero?.reincarnations ?? 0,', 'finiteSoulFarmActions, finalHeroReincarnations: state.hero?.reincarnations ?? 0,');
const evaluatorPath = resolve(directory, 'evaluator.mjs');
writeFileSync(evaluatorPath, evaluator, { flag: 'wx' });
const { simulate } = await import(pathToFileURL(evaluatorPath));
const core = createRequire(import.meta.url)(resolve(coreDirectory, 'index.js'));
const started = performance.now();
const row = simulate(core, 'high', 120001, 3, 18, 100, 'finite-soul-farm');
assert.equal(row.soulRecoveries, 50); assert.equal(row.finiteSoulFarmActions.length, 50);
let previousAt = 0;
for (const event of row.finiteSoulFarmActions) {
  assert(event.atMs > previousAt && event.atMs % 5000 === 0); previousAt = event.atMs;
  assert(event.before.monsterIndex >= core.REBIRTH_MIN_INDEX);
  assert.equal(event.after.souls, event.before.souls + Math.floor(event.before.monsterIndex / 8));
  assert.equal(event.after.rebirths, event.before.rebirths + 1);
  assert.equal(event.after.hero?.reincarnations ?? 0, event.before.hero?.reincarnations ?? 0);
  assert.equal(event.after.monsterIndex, 0); assert.equal(event.after.level, 1); assert.equal(event.after.xp, 0);
  assert.equal(event.after.coins, event.before.coins); assert.deepEqual(event.after.companions, event.before.companions);
}
for (const [file, hash] of Object.entries(selected.compiledFiles)) assert.equal(sha(readFileSync(resolve(coreDirectory, file))), hash);
const receipt = { reviewer: '/root/skills_harness', diagnosticOnly: true, originalProtocolUnchanged: true,
  policy: { input: 'high8/s', seed: 120001, legalSoulRecoveries: 50, afterward: 'normal hero-ready-first through3', maxHours: 18, totalTimeIncludesFarming: true },
  selectionPath, selectionSha256: sha(readFileSync(selectionPath)), candidate: selected.candidate,
  compiledFiles: selected.compiledFiles, originalEvaluatorSha256: sha(source), evaluatorSha256: sha(evaluator), scriptSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  actualActionReceiptsVerified: true, farmingEndedMinutes: row.finiteSoulFarmActions.at(-1).atMs / 60000,
  soulsAfterFarming: row.finiteSoulFarmActions.at(-1).after.souls,
  intervalMinutes: row.cycles.map(cycle => cycle.intervalMs / 60000), processingMs: performance.now() - started,
  quantileFailureClaim: false, row };
writeFileSync(resolve(directory, 'result.json'), json(receipt) + '\n');
console.log(json({ farmingEndedMinutes: receipt.farmingEndedMinutes, soulsAfterFarming: receipt.soulsAfterFarming,
  intervals: receipt.intervalMinutes, actualActions: row.finiteSoulFarmActions.length, arrived: row.cycles.length, processingMs: receipt.processingMs,
  quantileFailureClaim: false, result: resolve(directory, 'result.json') }));
