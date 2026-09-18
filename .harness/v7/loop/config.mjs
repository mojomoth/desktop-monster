import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export const HARNESS = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = resolve(HARNESS, '../..');
const check = (ok, message) => { if (!ok) throw Error(message); };
export function validateConfig(config) {
  check(config.schemaVersion === 1 && config.harnessVersion === 7, 'Expected v7 configuration');
  check(config.gates === 'npm test && npm run lint && npm run typecheck', 'Canonical gates are frozen');
  check(JSON.stringify(config.roles) === JSON.stringify(['designer','critic','balance','playtester']), 'Four independent review roles required');
  const tasks = config.tasks;
  check(Array.isArray(tasks) && new Set(tasks.map(t => t.id)).size === tasks.length, 'Unique task IDs required');
  const byId = new Map(tasks.map(t => [t.id, t]));
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    check(!visiting.has(id), 'Task dependency cycle');
    if (visited.has(id)) return;
    const task = byId.get(id);
    check(task && ['setup','candidate','release'].includes(task.stage), 'Unknown task/stage');
    check(Array.isArray(task.files) && task.files.length > 0 && typeof task.owner === 'string', 'Task ownership required');
    check(Array.isArray(task.ac) && task.ac.length > 0 && new Set(task.ac.map(a => a.id)).size === task.ac.length && task.ac.every(a => a.id && typeof a.command === 'string' && a.command.trim()), 'Registered AC IDs and commands required');
    check(task.ac.every(a => Array.isArray(a.artifacts) && new Set(a.artifacts).size === a.artifacts.length && a.artifacts.every(path => typeof path === 'string' && path.trim())), 'Explicit unique AC artifact paths required');
    check(Array.isArray(task.dependencies), 'Dependencies required');
    visiting.add(id); task.dependencies.forEach(visit); visiting.delete(id); visited.add(id);
  }
  tasks.forEach(t => visit(t.id));
  const m = config.measurement;
  check(m.tickMs === 100 && m.observationMs % m.tickMs === 0, 'Canonical engine tick must be 100ms');
  check(m.checkpointsMinutes.at(-1) === 720 && m.checkpointsMinutes.every((n,i,a) => Number.isInteger(n) && n > 0 && (!i || n > a[i-1])), 'Increasing 12-hour checkpoints required');
  check(m.seeds.validation.count >= 100 && m.seeds.baseline.count >= 100, 'At least 100 validation/baseline seeds required');
  check(m.seeds.exploration.start > m.seeds.validation.start + m.seeds.validation.count - 1, 'Exploration and validation seeds must be separate');
  return config;
}
export const CONFIG = validateConfig(JSON.parse(readFileSync(resolve(HARNESS, 'config.json'), 'utf8')));
export const GATES = CONFIG.gates;
export const PROTOCOL_PATH = resolve(ROOT, 'docs/v0.7/EVALUATION_PROTOCOL.json');
const parameterKeys = ['heroMinLevel','xpBase','xpGrowth','fieldHpNumerator','fieldHpDenominator',
  'companionHpNumerator','companionHpDenominator','captureChance','firstCaptureBossIndex',
  'heroLevelStepEvery','heroLevelStepCap','heroRestMs','heroDeferMs','xpRewardBase','xpRewardPerIndex',
  'bossXpMultiplier','bossHpMultiplier'];
const tailParameterKeys = ['fieldHpTailStartIndex','fieldHpTailNumerator','fieldHpTailDenominator'];
const keysForParameterVersion = (version) => {
  check([1,2,3].includes(version), 'Unknown progression parameter version');
  return [...parameterKeys, ...(version >= 2 ? tailParameterKeys : []), ...(version === 3 ? ['earlyCaptureCount'] : [])];
};
export function validateParameters(parameters, version = 1) {
  const keys = keysForParameterVersion(version);
  check(parameters && typeof parameters === 'object' && !Array.isArray(parameters) &&
    Object.keys(parameters).length === keys.length && keys.every(key => Object.hasOwn(parameters,key)),
  'Register every exact progression parameter, without unknown keys');
  for (const key of keys.filter(key => !['xpGrowth','captureChance','firstCaptureBossIndex','fieldHpTailStartIndex'].includes(key))) {
    check(Number.isSafeInteger(parameters[key]) && parameters[key] >= (['heroLevelStepCap','heroRestMs','heroDeferMs'].includes(key) ? 0 : 1), `Invalid parameter ${key}`);
  }
  check(CONFIG.measurement.levelControls.includes(parameters.heroMinLevel), 'Minimum level must be one of the registered level controls');
  check(typeof parameters.xpGrowth === 'number' && Number.isFinite(parameters.xpGrowth) && parameters.xpGrowth > 1, 'Invalid XP growth');
  check(typeof parameters.captureChance === 'number' && parameters.captureChance >= 0 && parameters.captureChance <= 1, 'Invalid capture chance');
  check(parameters.firstCaptureBossIndex === null || Number.isSafeInteger(parameters.firstCaptureBossIndex) && parameters.firstCaptureBossIndex >= 7 && parameters.firstCaptureBossIndex % 8 === 7, 'Initial capture guarantee must name a boss index');
  check(parameters.heroRestMs === 120000 && parameters.heroDeferMs === 30000, 'No new forced waiting timers');
  check(parameters.companionHpNumerator === 115 && parameters.companionHpDenominator === 100, 'Preserve legacy companion power');
  if (version === 3) check(parameters.earlyCaptureCount <= 30, 'Invalid parameter earlyCaptureCount');
  if (version >= 2) {
    check(parameters.fieldHpTailStartIndex === null || Number.isSafeInteger(parameters.fieldHpTailStartIndex) && parameters.fieldHpTailStartIndex >= 0, 'Invalid field HP tail start index');
    if (parameters.fieldHpTailStartIndex !== null) {
      const numerator = BigInt(parameters.fieldHpTailNumerator), denominator = BigInt(parameters.fieldHpTailDenominator);
      check(numerator > denominator && numerator * BigInt(parameters.fieldHpDenominator) <= BigInt(parameters.fieldHpNumerator) * denominator,
        'Enabled field HP tail growth must exceed one and not exceed prefix growth');
    }
  }
  return parameters;
}
export function validateProtocol(protocol, candidate = false) {
  check([1,2].includes(protocol.schemaVersion) && protocol.harnessVersion === CONFIG.harnessVersion, 'Expected v7 protocol');
  const parameterVersion = protocol.progressionParameterVersion === undefined ? 1 : protocol.progressionParameterVersion;
  const keys = keysForParameterVersion(parameterVersion);
  check(protocol.kind === 'desmon-v07-evaluation' && ['baseline','candidate','release'].includes(protocol.phase), 'Unknown evaluation protocol kind/phase');
  check(protocol.fixture === 'fresh', 'Canonical evaluation starts from a fresh save');
  check(Array.isArray(protocol.milestones) && Array.isArray(protocol.candidates), 'Milestone and candidate registration required');
  const ids = new Set();
  for (const m of protocol.milestones) {
    check(m.id && !ids.has(m.id) && m.label && ['hero','monster'].includes(m.kind) && Array.isArray(m.ids) && m.ids.length > 0 && new Set(m.ids).size === m.ids.length && m.ids.every(id => typeof id === 'string' && id.length > 0) && typeof m.final === 'boolean', 'Register named, unique content milestones');
    ids.add(m.id);
  }
  check(protocol.candidates.length <= CONFIG.measurement.maximumCandidates, 'Too many candidate designs');
  check(new Set(protocol.candidates.map(c => c.id)).size === protocol.candidates.length && protocol.candidates.every(c => c.id && c.hypothesis && c.parameters && typeof c.parameters === 'object' && !Array.isArray(c.parameters)), 'Exact candidate parameters and hypotheses required');
  if (candidate || protocol.phase !== 'baseline') {
    check(protocol.phase !== 'baseline' && protocol.milestones.filter(m => m.final).length === 1, 'Candidate needs exactly one named final unlock milestone');
    if (protocol.schemaVersion === 1) check(protocol.candidates.length > 0 && protocol.candidates.some(c => c.id === protocol.selectedCandidate), 'Select a preregistered candidate');
    check(protocol.frozenAt && Number.isFinite(Date.parse(protocol.frozenAt)), 'Freeze protocol before candidate measurements');
  }
  if (protocol.schemaVersion === 2) {
    check(protocol.phase !== 'baseline' && ['exploration','validation'].includes(protocol.experimentStage), 'Explicit exploration or validation stage required');
    check(Number.isSafeInteger(protocol.round) && protocol.round > 0, 'Positive registration round required');
    check(Array.isArray(protocol.controls) && protocol.controls.length === CONFIG.measurement.levelControls.length, 'Register all five level controls separately');
    check(protocol.candidates.length > 0, 'Register at least one candidate');
    const experiments = [...protocol.controls, ...protocol.candidates];
    check(experiments.every(e => e && typeof e.id === 'string' && /^[a-z0-9-]+$/.test(e.id) && typeof e.hypothesis === 'string' && e.hypothesis.trim()) && new Set(experiments.map(e=>e.id)).size === experiments.length, 'Unique experiment IDs and hypotheses required');
    experiments.forEach(e => validateParameters(e.parameters, parameterVersion));
    check(CONFIG.measurement.levelControls.every(level => protocol.controls.filter(e => e.parameters.heroMinLevel === level).length === 1), 'Register Lv16–20 controls exactly once');
    const control = protocol.controls[0].parameters;
    check(protocol.controls.every(e => keys.filter(k=>k!=='heroMinLevel').every(k=>e.parameters[k]===control[k])) &&
      Object.entries({xpBase:20,xpGrowth:1.4,fieldHpNumerator:115,fieldHpDenominator:100,companionHpNumerator:115,companionHpDenominator:100,captureChance:.35,firstCaptureBossIndex:null,heroLevelStepEvery:2,heroLevelStepCap:6,heroRestMs:120000,heroDeferMs:30000,xpRewardBase:5,xpRewardPerIndex:3,bossXpMultiplier:5,bossHpMultiplier:5,
        ...(parameterVersion >= 2 ? {fieldHpTailStartIndex:null,fieldHpTailNumerator:115,fieldHpTailDenominator:100} : {}),
        ...(parameterVersion === 3 ? {earlyCaptureCount:1} : {})}).every(([k,v])=>control[k]===v),
    'Level-only controls must preserve baseline growth');
    const selection = protocol.selectedExperiment;
    check(selection === null && protocol.experimentStage === 'exploration' ||
      selection && ['candidate','control'].includes(selection.kind) && protocol[selection.kind === 'candidate' ? 'candidates' : 'controls'].some(e=>e.id===selection.id), 'Select a registered experiment before validation');
    check(protocol.phase !== 'release' || protocol.experimentStage === 'validation', 'Release requires an adopted experiment');
    check(new Set(protocol.milestones.flatMap(m=>m.ids)).size === protocol.milestones.length, 'Register each milestone content ID only once');
    for (const milestone of protocol.milestones) {
      check(milestone.ids.length === 1 && Array.isArray(milestone.requirements) && milestone.requirements.length > 0, 'Bind each named milestone to exact performance requirements');
      for (const requirement of milestone.requirements) {
        check(['speciesKills','elementKills','heroHistory','heroFamilyHistory','totalKills','reincarnations','uniqueHeroes','seenMonsters','goldSpent'].includes(requirement.kind) && Number.isSafeInteger(requirement.count) && requirement.count > 0, 'Milestones require performance counts, not new timers');
        if (['speciesKills','heroHistory'].includes(requirement.kind)) check(typeof requirement.id === 'string' && requirement.id.length > 0, 'Requirement needs a content ID');
        if (requirement.kind === 'elementKills') check(['fire','water','wind','earth','dark'].includes(requirement.element), 'Requirement needs an element');
        if (requirement.kind === 'heroFamilyHistory') check(Number.isInteger(requirement.family) && requirement.family >= 0 && requirement.family < 10, 'Invalid hero family');
      }
    }
  }
  return protocol;
}
export function validateProtocolContent(protocol, core) {
  const heroes = core.HERO_FORMS.map(h=>h.id);
  const monsters = [...core.SPECIES_IDS];
  for (const milestone of protocol.milestones) {
    check(milestone.ids.every(id=>(milestone.kind==='hero'?heroes:monsters).includes(id)), 'Unknown milestone content ID');
    for (const requirement of milestone.requirements??[]) {
      if (requirement.kind==='speciesKills') check(monsters.includes(requirement.id), 'Unknown species requirement ID');
      if (requirement.kind==='heroHistory') check(heroes.includes(requirement.id), 'Unknown hero requirement ID');
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const command = process.argv[2];
    check(['validate','validate-candidate'].includes(command), 'Usage: config.mjs validate|validate-candidate [protocol.json]');
    const protocol = JSON.parse(readFileSync(resolve(process.argv[3] ?? PROTOCOL_PATH), 'utf8'));
    validateProtocol(protocol, command === 'validate-candidate');
    if (command === 'validate-candidate') {
      const build = spawnSync('npm',['run','build'],{cwd:ROOT,encoding:'utf8'});
      check(build.status===0, `Cannot validate content catalog: ${build.stderr||build.stdout}`);
      validateProtocolContent(protocol,await import(pathToFileURL(resolve(ROOT,'dist/electron/core/index.js')).href));
    }
    console.log('V7_CONFIG_OK');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
