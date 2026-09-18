import process from 'node:process';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { setTimeout } from 'node:timers/promises';
import { ROOT, sourceDigest, evaluationDigest, sha256 } from '../../.harness/v5/loop/evidence.mjs';

// Host-only demo adapter: expose the existing packaged-app boot without changing frozen tools.
const folder = resolve('.agentdoc/v06-live-demo-20260910T151800Z');
const original = readFileSync(join(ROOT, '.harness/v5/loop/package-check.mjs'), 'utf8');
const adapter = original
  .replace('#!/usr/bin/env node\n', "#!/usr/bin/env node\nimport process from 'node:process';\nimport { Buffer } from 'node:buffer';\nimport console from 'node:console';\nimport { setTimeout, clearTimeout } from 'node:timers';\n")
  .replace('message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);',
    'if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);')
  .replace('const { codex: _legacyCodex, ...legacyExpected } = retainedProgress(fixture);',
    'const legacyExpected = retainedProgress(fixture); delete legacyExpected.codex;')
  .replaceAll(String.raw`\\\"`, String.raw`\\"`)
  .replace("from './evidence.mjs'", `from ${JSON.stringify(pathToFileURL(join(ROOT, '.harness/v5/loop/evidence.mjs')).href)}`) + '\nexport { inspectBoot };\n';
writeFileSync(join(folder, 'package-demo-adapter.mjs'), adapter);
const { inspectBoot } = await import(pathToFileURL(join(folder, 'package-demo-adapter.mjs')));
const owned = mkdtempSync(join(tmpdir(), 'desmon-live-demo-'));
const data = join(owned, 'user-data'); mkdirSync(data);
const frames = join(folder, 'frames'); mkdirSync(frames, { recursive: true });
const executable = join(ROOT, 'release/mac-arm64/DesMon.app/Contents/MacOS/DesMon');
const asar = join(ROOT, 'release/mac-arm64/DesMon.app/Contents/Resources/app.asar');
const env = { ...process.env, SMOKE: '1', DESMON_SERVER_URL: '', TMPDIR: owned };
delete env.ELECTRON_RUN_AS_NODE;
const report = { startedAt: new Date().toISOString(), status: 'running', source: sourceDigest(), evaluation: evaluationDigest(),
  asar: sha256(readFileSync(asar)), adapterBaseSha256: sha256(original), checks: [], screenshots: [], processes: [], errors: [],
  limitations: ['Fresh isolated demo save, no personal data or global hooks/network.',
    'Actual packaged main with existing diagnostic success-exit suppression; original failure watchdog retained.',
    'Each startup emits the production smoke sequence of 3 synthetic attacks in addition to the counted demo inputs.',
    'Short demonstration with synthetic input, not a replacement for the completed 150-minute verification or human fun testing.'] };
let boot;
const saveReport = () => writeFileSync(join(folder, 'report.json'), JSON.stringify(report, null, 2) + '\n');
const check = (id, passed, details) => { report.checks.push({ id, passed: Boolean(passed), details }); if (!passed) throw new Error(id); };
const evaluate = (win, code) => boot.evaluate(`__packageCheck.${win}.webContents.executeJavaScript(${JSON.stringify(code)},true)`);
const flush = async () => { await evaluate('field', "window.dispatchEvent(new Event('blur'))"); await setTimeout(100); return evaluate('field', 'window.desmon.loadState()'); };
const summary = s => ({ level: s.level, xp: s.xp, kills: s.killCount, gold: s.coins, monsterHp: s.monsterHp, companions: s.companions.length, seenMonsters: s.progress?.seenMonsters, codex: s.progress?.codex });
const shot = async (win, name) => {
  const png = Buffer.from(await boot.evaluate(`__packageCheck.${win}.webContents.capturePage().then(i=>i.toPNG().toString('base64'))`), 'base64');
  const path = join(folder, name + '.png'); writeFileSync(path, png);
  report.screenshots.push({ path, sha256: sha256(png), capturedAt: new Date().toISOString() });
  return png;
};
const until = async (fn, label) => { for (let i=0;i<80;i++) { if (await fn()) return; await setTimeout(50); } throw new Error(label); };
const openMenu = async () => {
  await boot.evaluate(`__packageCheck.menu=__packageCheck.require(__packageCheck.app.getAppPath()+'/dist/electron/main/menuWindow.js').showMenuWindow(); true`);
  await until(()=>evaluate('menu', "Boolean(window.desmon && document.querySelector('#tab-codex'))"), 'Menu load');
};
const click = async selector => {
  const point = await evaluate('menu', `(() => {const el=document.querySelector(${JSON.stringify(selector)}); if(!el || el.disabled || el.closest('[hidden]')) throw new Error('Unavailable control'); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()`);
  await boot.evaluate(`__packageCheck.menu.focus(); __packageCheck.menu.webContents.sendInputEvent(${JSON.stringify({type:'mouseDown',button:'left',clickCount:1,...point})}); __packageCheck.menu.webContents.sendInputEvent(${JSON.stringify({type:'mouseUp',button:'left',clickCount:1,...point})}); true`);
  await setTimeout(180);
};
try {
  check('same-verified-package', report.asar==='1659e05ad019048c3d1b003ea1d3d60ce2cd1732ab7c04a35d003c0471c85185', report.asar);
  boot = await inspectBoot(executable, env, data, join(folder, 'play.log'));
  report.runtime = boot.runtime;
  check('runtime-version', boot.runtime.version==='0.6.0', boot.runtime.version);
  const before = await flush(); report.before = summary(before);
  await shot('field','01-start'); console.log('SCREENSHOT 01-start.png'); saveReport();
  await boot.evaluate(`__packageCheck.driver = new (__packageCheck.require(__packageCheck.app.getAppPath()+'/dist/electron/core/index.js').SimulatedInputDriver)(); __packageCheck.driver.subscribe(e=>__packageCheck.field.webContents.send('desmon:input',e)); __packageCheck.driver.start(); true`);
  const start = performance.now(); report.inputs = 0; report.frames = [];
  for (let i=0;i<60;i++) {
    await boot.evaluate("__packageCheck.driver.emit('keyboard'); __packageCheck.driver.emit('mouse'); true"); report.inputs+=2;
    const png = await shot('field', `frames/${String(i).padStart(3,'0')}`);
    report.frames.push({ index:i, elapsedMs:performance.now()-start });
    if(i===25) {writeFileSync(join(folder,'02-playing.png'),png); console.log('SCREENSHOT 02-playing.png');}
    await setTimeout(Math.max(0,(i+1)*200-(performance.now()-start)));
  }
  await boot.evaluate('__packageCheck.driver.stop(); true');
  report.playElapsedMs = performance.now()-start;
  const after = await flush(); report.after = summary(after);
  check('attack-kill-xp-gold', after.killCount>before.killCount && after.coins>before.coins && (after.level>before.level || after.xp>before.xp), { before:report.before, after:report.after, inputs:report.inputs, elapsedMs:report.playElapsedMs });
  await shot('field','03-after-play'); console.log('SCREENSHOT 03-after-play.png');
  writeFileSync(join(folder,'play-save.json'), readFileSync(join(data,'save.json')));
  report.processes.push(await boot.close()); boot=null; saveReport();

  boot = await inspectBoot(executable, env, data, join(folder,'menu.log'));
  await openMenu(); await click('#tab-codex');
  await shot('menu','04-discoveries'); console.log('SCREENSHOT 04-discoveries.png');
  if(await evaluate('menu', "Boolean(document.querySelector('.discovery-ack'))")) {
    await click('.discovery-ack');
    const state=await flush(); check('displayed-discoveries-acknowledged', state.progress.codex.acknowledgedMonsters.length>0, state.progress.codex);
  }
  await click('[data-discovery-id="h03"] .codex-goal');
  await until(async()=>(await flush()).progress.codex.goal?.id==='h03','Goal save');
  await evaluate('menu','window.scrollTo(0,0)'); await setTimeout(150);
  report.goalText = await evaluate('menu', "document.querySelector('.goal-status').textContent");
  await shot('menu','05-goal'); console.log('SCREENSHOT 05-goal.png');
  check('goal-saved-via-native-click', (await flush()).progress.codex.goal?.id==='h03', report.goalText);
  await click('#tab-shop'); await shot('menu','06-training-preview'); console.log('SCREENSHOT 06-training-preview.png');
  report.shopText = await evaluate('menu', "document.querySelector('#shop').innerText");
  const saved = await flush(); report.saved = summary(saved);
  report.processes.push(await boot.close()); boot=null; saveReport();

  boot = await inspectBoot(executable, env, data, join(folder,'restart.log'));
  const restored = await flush(); report.restored = summary(restored);
  check('restart-preserves-progress-and-goal', restored.killCount>=saved.killCount && restored.coins>=saved.coins && restored.level>=saved.level && restored.progress.codex.goal?.id==='h03' && JSON.stringify(restored.progress.codex.acknowledgedMonsters)===JSON.stringify(saved.progress.codex.acknowledgedMonsters), { saved:report.saved, restored:report.restored });
  await openMenu(); await click('#tab-codex'); await shot('menu','07-after-restart'); console.log('SCREENSHOT 07-after-restart.png');
  report.processes.push(await boot.close()); boot=null;
  check('clean-exits', report.processes.every(p=>p.exitCode===0 && p.signal===null), report.processes);
  check('source-evaluator-package-unchanged', report.source===sourceDigest() && report.evaluation===evaluationDigest() && report.asar===sha256(readFileSync(asar)), 'No app, evaluator, or package edits.');
} catch(error) { report.errors.push(error.stack ?? String(error)); }
finally {
  if(boot) { try { report.processes.push(await boot.process.finish()); } catch(error) { report.errors.push(String(error)); } boot.inspector.close(); }
  rmSync(owned,{recursive:true,force:true}); report.temporaryDataRemoved=true;
  report.finishedAt=new Date().toISOString(); report.status=report.errors.length===0 && report.checks.every(c=>c.passed)?'passed':'failed'; saveReport();
  console.log(JSON.stringify({ status:report.status, before:report.before, after:report.after, checks:report.checks.length, errors:report.errors }));
  process.exitCode=report.status==='passed'?0:1;
}
