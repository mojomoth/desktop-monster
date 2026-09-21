#!/usr/bin/env node
// Production Electron scenarios; run only after serial performance observations stop.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchRuntime } from '../v10/launcher.mjs';
import { digest, ROOT, sha } from './run.mjs';
import { validateNative } from './final-check.mjs';
import { menuLiveCases, manualEquipmentCases, equipmentRestartCase, hudCases, fieldPartyCases, latencyFamilies } from './ui-cases.mjs';

/** Serialized into the owned main process; observation never blocks a quit. */
export function instrumentLifecycle(p, outputDir) {
  if (p.v12Lifecycle) throw Error('Lifecycle diagnostics already installed');
  const path = outputDir + '/lifecycle.jsonl';
  const record = (event, details = {}) => {
    try { p.fs.appendFileSync(path, JSON.stringify({ at: new Date().toISOString(), event, ...details }) + '\n'); }
    catch (error) { console.error('V11 lifecycle logging failed', String(error)); }
  };
  p.v12Lifecycle = { path };
  for (const name of ['quit', 'exit']) {
    const original = p.e.app[name];
    p.e.app[name] = function (...args) {
      record('app.' + name, { args, stack: new Error('Observed app.' + name).stack });
      return original.apply(this, args);
    };
  }
  for (const event of ['before-quit', 'will-quit', 'window-all-closed']) p.e.app.on(event, () => record(event));
  p.e.app.on('quit', (_event, exitCode) => record('quit', { exitCode }));
  p.e.app.on('render-process-gone', (_event, contents, details) => record('render-process-gone', { id: contents.id, details }));
  p.e.app.on('child-process-gone', (_event, details) => record('child-process-gone', { details }));
  p.require('node:process').on('exit', exitCode => record('process-exit', { exitCode }));
  const watch = window => {
    const id = window.id;
    window.on('close', () => record('window-close', { id }));
    window.on('closed', () => record('window-closed', { id }));
  };
  for (const window of p.e.BrowserWindow.getAllWindows()) watch(window);
  p.e.app.on('browser-window-created', (_event, window) => watch(window));
  try {
    const tray = p.require(p.e.app.getAppPath() + '/dist/electron/main/tray.js').getActiveTray();
    tray?.setTitle?.('자동 검증'); tray?.setToolTip?.('DesMon 자동 검증 전용 · 사용자 저장 미사용');
    record('diagnostic-tray-marker', { available: Boolean(tray) });
  } catch (error) { record('diagnostic-tray-marker-unavailable', { error: String(error) }); }
  record('installed', { note: 'Pass-through observation in isolated native fixture; no quit prevention.' });
  return { path };
}

export function fixture(core, gear, kind, now = Date.now()) {
  const equipment = gear.newEquipment(now, 71111);
  if (kind === 'field') {
    assert([1, 2].includes(core.PROGRESSION_PARAMETERS.fieldCompanionTailPolynomial), 'Native field scenario requires an adopted field curve');
    const hero = core.newHeroProgress(); hero.reincarnations = 1;
    const companions = [
      ...Array.from({ length: 4 }, (_, i) => ({ id: 'c' + (i + 1), speciesId: 'slime', bossIndex: 151, level: 10, stars: 0 })),
      { id: 'c5', speciesId: 'slime', bossIndex: 31, level: 10, stars: 1 },
      { id: 'c6', speciesId: 'slime', bossIndex: 95, level: 1, stars: 0 },
      { id: 'c7', speciesId: 'slime', bossIndex: 7, level: 1, stars: 1 },
    ];
    const trained = companions[4], target = companions[5];
    const curve = core.PROGRESSION_PARAMETERS;
    if (curve.fieldCompanionGrowthBonus !== null && curve.fieldCompanionIndexCap === 79) {
      // Equal capped capture bases distinguish Q2 from Q1, then consumed Q3.
      // Raw/PvP still ranks the index95 capture above index79/star1.
      trained.bossIndex = 79;
      trained.level = 1;
    } else {
      const trainedUnit = core.fieldCompanionPower({ ...trained, level: 1 }, 0, 11);
      const targetPower = core.fieldCompanionPower(target, 0, 11);
      trained.level = Number((2n * targetPower + trainedUnit - 1n) / trainedUnit);
    }
    const targetPower = core.fieldCompanionPower(target, 0, 11);
    assert(Number.isSafeInteger(trained.level) && trained.level > 0, 'Invalid discriminating fixture level');
    assert(core.fieldCompanionPower(trained, 0, 11) > targetPower &&
      core.fieldCompanionPower(trained, 0, 11) < core.fieldCompanionPower({ ...target, level: 3 }, 0, 11) &&
      core.companionPower(trained) < core.companionPower(target), 'Fixture must reverse field/PvP membership and reverse it again after growth');
    // A rich synthetic hero gives one intentional native input control of the
    // legacy→new spawn. Ordinary companion volleys cannot kill this old target.
    const save = core.createEngine(core.parseSave({ ...core.DEFAULT_SAVE, hero, equipment, companions, rebirths: 1,
      souls: 1_000_000_000_000_000, monsterIndex: 1000, monsterSpeciesId: 'slime',
      monsterCurveVersion: 10, monsterCurveRebirths: 1, monsterHp: '500000000000000', bestIndex: 1000, nextCompanionId: 8 })).toSave();
    return { save, ids: { trained: 'c5', target: 'c6', food: 'c7' } };
  }
  const item = (template, roll = 100) => { const value = gear.createEquipmentItem(equipment, template); value.roll = roll; return value; };
  const previous = item(kind === 'menu' ? 'w-sword-epic-4' : 'w-sword-rare-4', kind === 'menu' ? 110 : 100);
  const manual = item('w-sword-common-1'), alternate = item('w-sword-common-2');
  const weakPurchase = item('w-sword-common-1', 90), strongPurchase = item('w-sword-uncommon-2');
  const accessory = item('a-ring-critical-common-1', 90), disposable = item('w-sword-common-3');
  equipment.loadout.weapon = previous;
  // Keep the live-save menu fixture's equipped rows stable while gold changes.
  equipment.loadout.accessories = Array.from({ length: 4 }, () =>
    item(kind === 'menu' ? 'a-ring-critical-epic-4' : 'a-ring-critical-common-1', kind === 'menu' ? 110 : 100));
  equipment.bag = [manual, alternate]; equipment.capacity = 64;
  if (kind === 'menu') equipment.bag.push(...Array.from({ length: 32 }, () => item('w-staff-common-4')));
  if (kind === 'manual') {
    equipment.bag.push(accessory, disposable, ...Array.from({ length: 4 }, () => item('w-staff-common-4')));
    equipment.capacity = equipment.bag.length;
  }
  equipment.shop = { serial: 7, nextRefreshAt: now + 3_600_000, lastObservedAt: now,
    stock: [weakPurchase, strongPurchase], boughtIds: [] };
  const hero = core.newHeroProgress();
  if (kind === 'manual') {
    hero.collection = [{ formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 10 }];
    hero.equipped = { ...hero.collection[0] };
  }
  const companions = kind === 'menu' ? [
    { id: 'c1', speciesId: 'dragon', bossIndex: 79, level: 1_000_000_000_000, stars: 1 },
    { id: 'c2', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 },
  ] : [];
  const level = kind === 'hud' ? core.heroRequiredLevel(0) : 30;
  const engine = core.createEngine(core.parseSave({ ...core.DEFAULT_SAVE, level, hero, equipment, companions,
    // Exhaust allocation only in the HUD fixture: a captured index-999 companion
    // would otherwise add unrelated automatic floats to the timed screenshots.
    nextCompanionId: kind === 'hud' ? Number.MAX_SAFE_INTEGER : 3, coins: '1000000000000000000000000000000000',
    xp: kind === 'hud' ? core.xpToNext(level) - 1 : 0,
    monsterIndex: kind === 'hud' ? 999 : kind === 'menu' ? 0 : 1000,
    monsterSpeciesId: 'slime', monsterHp: kind === 'manual' ? '9'.repeat(80) : '1', bestIndex: 1000 }));
  const save = engine.toSave();
  // One boss hit survives even a critical; the remaining native burst kills it.
  if (kind === 'hud') save.monsterHp = String(gear.displayedHeroAttack(engine.getState()) * 10n);
  return { save, ids: Object.fromEntries(Object.entries({ previous, manual, alternate, weakPurchase, strongPurchase, accessory, disposable }).map(([key, value]) => [key, value.id])) };
}

export function verify(output) {
  const report = JSON.parse(readFileSync(resolve(output), 'utf8'));
  const app = report.attempts?.[0]?.runtime?.appPath;
  assert(typeof app === 'string', 'Missing native package path');
  const protocol = JSON.parse(readFileSync(join(ROOT, 'docs/v0.12/PERFORMANCE_PROTOCOL.json'), 'utf8'));
  return { passed: true, source: digest(), latency: validateNative(report, digest(), join(app, 'Contents/Resources/app.asar'), protocol) };
}

export async function run(outputArg, appArg) {
  const output = resolve(outputArg), appPath = resolve(appArg);
  assert(!existsSync(output), 'Preserve previous native attempts: choose a new output path');
  const directory = join(dirname(output), 'attempt-' + basename(output, '.json') + '-' + Date.now());
  mkdirSync(directory, { recursive: true });
  const require = createRequire(import.meta.url);
  const core = require(join(ROOT, 'dist/electron/core/index.js')), gear = require(join(ROOT, 'dist/electron/core/equipment.js'));
  const result = { version: 12, source: digest(), sourceUnchanged: false, passed: false, startedAt: new Date().toISOString(),
    attempts: [], artifacts: {}, errors: [], latency: { families: [], method: 'Trusted renderer click capture → double-rAF paint; equipment completion follows production onActionResult plus painted success feedback. Public non-pausing conditional tracepoints independently record main IPC entry and engine.apply start/end. Chromium 142 clamps each current timestamp to an adjacent 100us boundary; two batches of 64 distinct clock readings verify that lattice. Calibration and event intervals independently include ±100us and computed IEEE754 epoch rounding bounds; raw deltas, probes and unresolved intervals remain visible. Initial paint may be pending feedback; applied feedback uses resultAt. Double-rAF is a paint proxy, not exact monitor presentation. Conditional probes may affect JIT; no guessed overhead is subtracted. Local UI result equals paint completion. Inspector transport is excluded.' } };
  const settings = { gameScale: 1, muted: true, screenShake: false, welcomeSeen: true, globalInputRequested: false };
  const identity = { name: 'FixtureMe', playerId: 'fixture-me', token: 'fixture-me-token', notifiedTheftIds: [] };
  let active, name;
  const launch = async (scenario, save, userData) => {
    name = scenario; active = await launchRuntime({ appPath, outputDir: join(directory, scenario),
      ...(userData ? { userData } : { save, settings, identity }) });
    await active.evaluate(`(${instrumentLifecycle.toString()})(__v010Runtime,${JSON.stringify(active.outputDir)})`);
    return active;
  };
  const finish = async ui => {
    const path = join(active.outputDir, 'lifecycle.jsonl'), runtime = await active.close(); active = null;
    result.attempts.push({ name, ui, runtime, lifecycle: { path, sha256: sha(readFileSync(path)) } });
    assert(runtime.passed && ui.passed, 'Native scenario failed: ' + name);
  };
  try {
    const menu = fixture(core, gear, 'menu');
    await finish(await menuLiveCases(await launch('menu-live-updates', menu.save), menu.save));
    const equipment = fixture(core, gear, 'manual');
    const runtime = await launch('manual-equipment', equipment.save);
    const ui = await manualEquipmentCases(runtime, equipment.ids), userData = runtime.userData;
    await finish(ui);
    await finish(await equipmentRestartCase(await launch('equipment-restart', undefined, userData), ui.expectedOnRestart));
    await finish(await hudCases(await launch('hud-states', fixture(core, gear, 'hud').save), core.FEVER_INPUTS));
    const field = fixture(core, gear, 'field');
    await finish(await fieldPartyCases(await launch('field-party', field.save), field.ids));
  } catch (error) {
    result.errors.push(String(error));
    if (active) {
      const ui = { checks: [], screenshots: [], samples: [], ...error.ui, passed: false, error: String(error) };
      // Failed assertions retain the pictures and timing observations already made.
      ui.screenshots = readdirSync(active.outputDir).filter(file => file.endsWith('.png')).map(file => {
        const path = join(active.outputDir, file); return { path, sha256: sha(readFileSync(path)) };
      });
      try { ui.samples = await active.evaluate("__v010Runtime.menu?.webContents.executeJavaScript('globalThis.__v12Latency?.snapshot().samples ?? []')") ?? []; }
      catch (observationError) { ui.observationError = String(observationError); }
      try { ui.observedFrames = await active.evaluate("__v010Runtime.field.webContents.executeJavaScript('globalThis.__v12Hud?.frames ?? []')"); }
      catch (frameError) { ui.frameObservationError = String(frameError); }
      try { ui.inputTrace = await active.evaluate("__v010Runtime.field.webContents.executeJavaScript('globalThis.__v12HudInputs ?? null')"); }
      catch (inputError) { ui.inputObservationError = String(inputError); }
      try { ui.partialPipelineTrace = await active.evaluate(`(async()=>{const p=__v010Runtime,state=p.v12Pipeline;if(!state)return null;
        try{return{basis:'cdp-conditional-false',main:globalThis.__v12MainTiming&&{rows:__v12MainTiming.rows,overflow:__v12MainTiming.overflow},
          field:await p.field.webContents.executeJavaScript('globalThis.__v12FieldTiming&&({rows:__v12FieldTiming.rows,overflow:__v12FieldTiming.overflow})'),
          pauseCount:state.pauseCount,locations:state.locations,probes:state.probes,resolutionObservations:state.resolutionObservations};}finally{await state.cleanup();}})()`); }
      catch (pipelineError) { ui.pipelineObservationError = String(pipelineError); }
      const path = join(active.outputDir, 'lifecycle.jsonl'), runtime = await active.close();
      result.attempts.push({ name, ui, runtime, ...(existsSync(path) ? { lifecycle: { path, sha256: sha(readFileSync(path)) } } : {}) }); active = null;
    }
  }
  for (const attempt of result.attempts) for (const shot of attempt.ui?.screenshots ?? []) result.artifacts[shot.path] = sha(readFileSync(shot.path));
  result.latency.families = latencyFamilies(result.attempts.flatMap(attempt => attempt.ui?.samples ?? []));
  result.sourceUnchanged = result.source === digest();
  result.passed = result.sourceUnchanged && result.errors.length === 0 && result.attempts.length === 5;
  result.finishedAt = new Date().toISOString();
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  if (result.passed) {
    try { verify(output); } catch (error) { result.passed = false; result.errors.push(String(error)); writeFileSync(output, JSON.stringify(result, null, 2) + '\n'); }
  }
  return { output, passed: result.passed, errors: result.errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [action, output, app] = process.argv.slice(2);
    assert(output && (action === 'verify' || action === 'run' && app), 'Usage: runtime.mjs run OUTPUT APP | verify OUTPUT');
    const result = action === 'verify' ? verify(output) : await run(output, app);
    console.log(JSON.stringify(result, null, 2)); if (!result.passed) process.exitCode = 1;
  } catch (error) { console.error(error); process.exitCode = 1; }
}
