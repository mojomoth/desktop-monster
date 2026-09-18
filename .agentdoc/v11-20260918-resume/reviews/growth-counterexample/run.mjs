// Independent diagnostic: legal fresh play, never a replacement selection/heldout run.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulate, sha } from './evaluator.mjs';

const folder = dirname(fileURLToPath(import.meta.url)), output = resolve(folder, 'result.json');
if (existsSync(output)) throw Error('Preserve prior diagnostic');
const archive = resolve('.agentdoc/v11-20260918-resume/balance/r10-screen');
const require = createRequire(import.meta.url), c = require(archive + '/compiled-R10-A/index.js');
const measured = JSON.parse(readFileSync(archive + '/R10-A-report.json'));
for (const [file, hash] of Object.entries(measured.compiledFiles)) {
  if (sha(readFileSync(archive + '/compiled-R10-A/' + file)) !== hash) throw Error('Archived compiled code changed');
}
const actions = [];
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const configured = { ...c, createEngine(...args) {
  const engine = c.createEngine(...args); let elapsed = 0;
  return { ...engine, tick(ms) {
    const events = engine.tick(ms); elapsed += ms;
    const s = engine.getState();
    if (elapsed % 5000 !== 0 || c.heroReady(s.level, s.hero) || s.companions.length <= 5) return events;
    const count = s.hero?.reincarnations ?? 0, version = s.monster.curveVersion;
    const power = item => c.fieldCompanionPower(item, count, version);
    const active = c.activeFieldCompanions(s.companions, s.monster.type, s.hero?.equipped, count, version);
    const activeIds = new Set(active.map(item => item.id));
    const numericId = (a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1));
    const target = [...active].sort((a, b) => compare(power(b), power(a)) || numericId(a, b))[0];
    const food = s.companions.filter(item => !activeIds.has(item.id)).sort((a, b) => compare(power(a), power(b)) || numericId(a, b))[0];
    if (!target || !food) return events;
    const action = { type: 'consume', targetId: target.id, foodId: food.id };
    const before = { target: { ...target }, food: { ...food }, targetPower: String(power(target)), roster: s.companions.length };
    const more = engine.apply(action);
    if (engine.lastActionError()) throw Error(engine.lastActionError());
    const after = engine.getState(), grown = after.companions.find(item => item.id === target.id);
    if (grown.level !== target.level + 1 + food.stars || after.companions.some(item => item.id === food.id)) throw Error('Invalid legal growth result');
    actions.push({ atMs: elapsed, cycle: count + 1, monsterIndex: s.monster.index, action, before,
      after: { target: { ...grown }, targetPower: String(power(grown)), roster: after.companions.length } });
    return [...events, ...more];
  } };
} };
const row = simulate(configured, 'ordinary', 120001, 10, 60);
const result = { diagnosticOnly: true, adopted: false, candidate: measured.candidate, compiledFiles: measured.compiledFiles,
  sourceArchive: archive, scriptHash: sha(readFileSync(fileURLToPath(import.meta.url))), evaluatorHash: sha(readFileSync(resolve(folder, 'evaluator.mjs'))),
  protocol: { initial: 'ordinary DEFAULT_SAVE, same original gear/shop/input policy', seed: 120001, cycles: 10, maxHours: 60,
    decisionMs: 5000, action: 'consume one weakest unselected companion into the strongest displayed field-power active companion; numeric ID ties; preserve five members; hero ready has priority' },
  row, actions };
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ cycles: row.cycles.map(item => ({ number: item.number, minutes: item.intervalMs / 60000, stage: item.stage, roster: item.companions })),
  actions: actions.length, nonarrival: row.nonarrival, processingMs: row.processingMs }));
