// Independent alternate-policy diagnostic; original qualification protocol is unchanged.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulate, sha } from './evaluator.mjs';

const folder = dirname(fileURLToPath(import.meta.url)), output = resolve(folder, 'result.json');
if (existsSync(output)) throw Error('Preserve prior diagnostic');
const archive = resolve('.agentdoc/v11-20260918-resume/balance/r14-growth-screen');
const require = createRequire(import.meta.url), c = require(archive + '/compiled-R14-A/index.js');
const measured = JSON.parse(readFileSync(archive + '/R14-A-report.json'));
const binding = JSON.parse(readFileSync(archive + '/binding.json'));
const evaluatorHash = sha(readFileSync(resolve(folder, 'evaluator.mjs')));
if (evaluatorHash !== binding.scriptHash) throw Error('Evaluator snapshot differs from measured candidate');
for (const [file, hash] of Object.entries(measured.compiledFiles)) {
  if (sha(readFileSync(archive + '/compiled-R14-A/' + file)) !== hash) throw Error('Archived compiled code changed');
}
const actions = [], configured = { ...c, createEngine(...args) {
  const engine = c.createEngine(...args); let elapsed = 0;
  return { ...engine, tick(ms) {
    const events = engine.tick(ms); elapsed += ms;
    const s = engine.getState();
    if (elapsed % 5000 !== 0 || c.heroReady(s.level, s.hero) || s.companions.length !== 30) return events;
    const context = { companions: structuredClone(s.companions), heroEquipped: s.hero?.equipped ?? null,
      acceptedHeroCount: s.hero?.reincarnations ?? 0, enemyType: s.monster.type, curveVersion: s.monster.curveVersion,
      partyBonusBps: String(c.equipmentBonus(s.equipment?.loadout, 'party')), feverMultiplier: s.fever.active ? 3 : 1 };
    const active = c.activeFieldCompanions(s.companions, s.monster.type, s.hero?.equipped, context.acceptedHeroCount, context.curveVersion);
    const activeIds = new Set(active.map(item => item.id)), food = s.companions.filter(item => !activeIds.has(item.id));
    const id = item => Number(item.id.slice(1));
    const volley = roster => c.activeFieldCompanions(roster, context.enemyType, context.heroEquipped, context.acceptedHeroCount, context.curveVersion)
      .reduce((sum, item) => sum + c.effectivePower(c.heroBuffedPower(c.fieldCompanionPower(item, context.acceptedHeroCount, context.curveVersion),
        c.typeOf(item.speciesId), context.heroEquipped) * (10000n + BigInt(context.partyBonusBps)) / 10000n,
      c.typeOf(item.speciesId), context.enemyType) * BigInt(context.feverMultiplier), 0n);
    const before = volley(s.companions); let best;
    for (const target of active) for (const material of food) {
      const targetAfter = { ...target, level: target.level + 1 + material.stars };
      const roster = s.companions.filter(item => item.id !== material.id).map(item => item.id === target.id ? targetAfter : item);
      const after = volley(roster), gain = after - before;
      if (!best || gain > best.gain || gain === best.gain && (id(target) < id(best.target) || id(target) === id(best.target) && id(material) < id(best.material)))
        best = { target, material, targetAfter, after, gain };
    }
    if (!best || best.gain < 0n) throw Error('Missing nonnegative legal consume');
    const action = { type: 'consume', targetId: best.target.id, foodId: best.material.id }, more = engine.apply(action);
    if (engine.lastActionError()) throw Error(engine.lastActionError());
    const after = engine.getState(), grown = after.companions.find(item => item.id === best.target.id);
    if (after.companions.length !== 29 || JSON.stringify(grown) !== JSON.stringify(best.targetAfter) || after.companions.some(item => item.id === best.material.id))
      throw Error('Invalid legal growth result');
    actions.push({ atMs: elapsed, cycle: context.acceptedHeroCount + 1, targetId: best.target.id, foodId: best.material.id,
      targetBefore: { ...best.target }, foodBefore: { ...best.material }, targetAfter: { ...grown }, volleyBefore: String(before), volleyAfter: String(best.after), context });
    return [...events, ...more];
  } };
} };
const row = simulate(configured, 'high', 120001, 10, 60);
row.growthActions = actions; row.growthConsumes = actions.length; row.growthActionsSha256 = sha(JSON.stringify(actions, null, 2));
const result = { diagnosticOnly: true, adopted: false, candidate: measured.candidate, compiledFiles: measured.compiledFiles, binding,
  sourceArchive: archive, scriptHash: sha(readFileSync(fileURLToPath(import.meta.url))), evaluatorHash,
  protocol: { initial: 'fresh high-input DEFAULT_SAVE, original gear/shop/reset policy', seed: 120001, cycles: 10, maxHours: 60,
    decisionMs: 5000, trigger: 'only full roster of30', action: 'consume one inactive food into active target maximizing the actual next typed/hero/party/fever volley; numeric target then food ties; preserve29 reserves; hero-ready priority; no future information' }, row };
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ cycles: row.cycles.map(item => ({ number: item.number, minutes: item.intervalMs / 60000, roster: item.companions })),
  actions: actions.length, nonarrival: row.nonarrival, processingMs: row.processingMs }));
