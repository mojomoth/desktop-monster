#!/usr/bin/env node
import process from 'node:process';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { setTimeout, clearTimeout } from 'node:timers';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { ROOT, evaluationDigest, sha256, sourceDigest } from "file:///Users/jeongyounglee/work/repo/desktop-monster/.harness/v5/loop/evidence.mjs";

const require = createRequire(import.meta.url);
const pause = ms => new Promise(done => setTimeout(done, ms));
async function until(predicate, label, timeout = 12_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await predicate(); if (value) return value; await pause(50); }
  throw new Error(`Timeout: ${label}`);
}

/** Small CDP transport; injection keeps protocol tests independent of a browser and network. */
export function inspectorConnection(socket) {
  let serial = 0;
  const pending = new Map();
  const events = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    } else if (message.method) events.set(message.method, message.params);
  });
  socket.addEventListener('close', () => {
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Inspector disconnected')); }
    pending.clear();
  });
  return {
    call(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++serial;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Inspector timeout: ${method}`)); }, 12_000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    event: method => events.get(method),
    close: () => socket.close(),
  };
}

function launch(executable, args, env, log) {
  const child = spawn(executable, args, { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; let ended = false; let exitCode; let signal; let launchError;
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  child.on('error', error => { launchError = error; ended = true; });
  child.on('exit', (code, value) => { exitCode = code; signal = value; ended = true; });
  const watchdog = setTimeout(() => child.kill('SIGKILL'), 30_000);
  return {
    child, get output() { return output; }, get ended() { return ended; },
    async finish() {
      if (!ended) child.kill('SIGTERM');
      await until(() => ended, 'packaged process shutdown', 5000);
      clearTimeout(watchdog); writeFileSync(log, output);
      if (launchError) throw launchError;
      return { command: [executable, ...args], exitCode, signal, log, sha256: sha256(output) };
    },
  };
}

async function inspectBoot(executable, env, userData, log) {
  const process = launch(executable, ['--inspect-brk=127.0.0.1:0'], env, log);
  let inspector;
  try {
    const url = await until(() => {
      if (process.ended) throw new Error(`Packaged app exited before inspector: ${process.output}`);
      return process.output.match(/ws:\/\/127\.0\.0\.1:\d+\/[a-z0-9-]+/)?.[0];
    }, 'packaged main inspector');
    // undici is already installed; no dependency is added to the app or lockfile.
    const Socket = globalThis.WebSocket ?? require('undici').WebSocket;
    const socket = new Socket(url);
    await new Promise((accept, reject) => { socket.addEventListener('open', accept, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    inspector = inspectorConnection(socket);
    await inspector.call('Runtime.enable');
    await inspector.call('Debugger.enable');
    await inspector.call('Runtime.runIfWaitingForDebugger');
    const paused = await until(() => inspector.event('Debugger.paused'), 'main break before execution');
    const injected = await inspector.call('Debugger.evaluateOnCallFrame', { callFrameId: paused.callFrames[0].callFrameId,
      expression: `(() => { const e = require('electron'); const fs = require('node:fs');
        const app = e.app; const setPath = app.setPath.bind(app); const exit = app.exit.bind(app);
        globalThis.__packageCheck = { e, fs, require, app, exit };
        app.setPath = (key, value) => setPath(key, key === 'userData' ? ${JSON.stringify(userData)} : value);
        setPath('userData', ${JSON.stringify(userData)});
        app.exit = code => { if (code !== 0) exit(code); };
        return {version: app.getVersion(), appPath: app.getAppPath(), userData: app.getPath('userData'), runtime: process.versions}; })()`,
      returnByValue: true });
    if (injected.exceptionDetails) throw new Error(`Isolation injection failed: ${JSON.stringify(injected.exceptionDetails)}`);
    await inspector.call('Debugger.resume');
    const evaluate = async expression => {
      const response = await inspector.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (response.exceptionDetails) throw new Error(`Packaged runtime evaluation: ${JSON.stringify(response.exceptionDetails)}`);
      return response.result.value;
    };
    await until(() => process.output.includes('SMOKE_OK') || (process.ended && Promise.reject(new Error(process.output))), 'production SMOKE_OK');
    await evaluate(`globalThis.__packageCheck.field = __packageCheck.e.BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/static/index.html')); Boolean(__packageCheck.field)`);
    return { process, inspector, evaluate, runtime: injected.result.value,
      async close() { try { await evaluate('__packageCheck.exit(0)'); } catch { /* process exit closes its inspector */ }
        inspector.close(); await until(() => process.ended, 'clean packaged exit', 5000); return process.finish(); } };
  } catch (error) { inspector?.close(); await process.finish(); throw error; }
}

export function retainedProgress(save) {
  return { level: save.level, xp: save.xp, coins: save.coins, souls: save.souls, killCount: save.killCount,
    rebirths: save.rebirths, companions: save.companions, pvpParty: save.pvpParty,
    hero: save.hero, history: save.progress?.reincarnationHistory, heroCounts: save.progress?.heroCounts,
    pvpWins: save.progress?.pvpWins, pvpLosses: save.progress?.pvpLosses, goldSpent: save.progress?.goldSpent,
    trainingLevel: save.progress?.trainingLevel, codex: save.progress?.codex };
}
function buildFiles() {
  const files = [];
  const walk = dir => {
    for (const entry of readdirSync(resolve(ROOT, dir), { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (path === 'dist/electron/server') continue;
      if (entry.isDirectory()) walk(path); else if (entry.isFile()) files.push(path);
    }
  };
  walk('dist'); walk('static');
  return files.sort().map(path => ({ path, sha256: sha256(readFileSync(resolve(ROOT, path))) }));
}

export async function packageCheck(output, appPath = resolve(ROOT, 'release/mac-arm64/DesMon.app'), probe = false) {
  const executable = resolve(appPath, 'Contents/MacOS/DesMon');
  const asar = resolve(appPath, 'Contents/Resources/app.asar');
  const file = resolve(output); mkdirSync(dirname(file), { recursive: true });
  const ownedTmp = mkdtempSync(join(tmpdir(), 'desmon-package-check-'));
  const userData = join(ownedTmp, 'user-data'); mkdirSync(userData);
  const env = { ...process.env, SMOKE: '1', DESMON_SERVER_URL: '', TMPDIR: ownedTmp };
  delete env.ELECTRON_RUN_AS_NODE;
  const report = { schemaVersion: 1, mode: probe ? 'package-probe' : 'package-verification', status: 'failed',
    startedAt: new Date().toISOString(), sourceDigest: sourceDigest(), evaluationDigest: evaluationDigest(),
    command: ['node', '.harness/v5/loop/package-check.mjs', file, appPath, ...(probe ? ['--probe'] : [])],
    executable, asar, userData, temporaryDataRemoved: false, processes: [], checks: [], errors: [], screenshots: [],
    limitations: ['Synthetic isolated fixture; no personal save or authentication copied.', 'SMOKE mode disables real OS hooks, Accessibility and network.',
      'Production main stays running only by suppressing its success exit; the 20-second failure watchdog remains active.', 'No human fun or live PvP validation.'] };
  const check = (id, passed, details) => report.checks.push({ id, passed: Boolean(passed), details });
  let boot; let pendingSmoke;
  try {
    report.packageHashes = { executable: sha256(readFileSync(executable)), asar: sha256(readFileSync(asar)) };
    const smoke = pendingSmoke = launch(executable, [], env, `${file}.smoke.log`);
    await until(() => smoke.ended, 'packaged production smoke', 25_000);
    const smokeResult = await smoke.finish(); pendingSmoke = null; report.processes.push(smokeResult);
    check('packaged-production-smoke', smokeResult.exitCode === 0 && smoke.output.includes('SMOKE_OK'), smokeResult);
    boot = await inspectBoot(executable, env, userData, `${file}.first.log`);
    report.runtime = boot.runtime;
    check('isolated-packaged-main', realpathSync(boot.runtime.userData) === realpathSync(userData) && realpathSync(boot.runtime.appPath) === realpathSync(asar), boot.runtime);
    if (!probe) {
      check('release-version', boot.runtime.version === '0.6.0', { expected: '0.6.0', actual: boot.runtime.version });
      const files = buildFiles();
      const packed = await boot.evaluate(`(() => { const {fs,app,require}=__packageCheck; const hash=require('node:crypto').createHash;
        return ${JSON.stringify(files.map(entry => entry.path))}.map(path => ({path,sha256:hash('sha256').update(fs.readFileSync(app.getAppPath()+'/'+path)).digest('hex')})); })()`);
      check('packaged-files-match-verified-build', isDeepStrictEqual(files, packed), { files, packagedFiles: packed });
      // Stop the renderer before replacing only this process-owned fixture, then exercise its real load path.
      const fixture = await boot.evaluate(`(async () => { const {field,fs,app,require}=__packageCheck; await field.loadURL('about:blank');
        const core=require(app.getAppPath()+'/dist/electron/core/index.js'); const progress=core.newProgress(true); delete progress.codex;
        Object.assign(progress,{playTimeMs:1000,seenHeroes:['h01'],seenMonsters:['slime','bat'],heroCounts:{h01:1},pvpWins:7,pvpLosses:3,goldSpent:75,trainingLevel:1,
          reincarnationHistory:[{number:1,formId:'h01',level:12,playTimeMs:1000,buffPercent:15,stacks:0}]});
        const roll={formId:'h01',buffPercent:15}; const hero={...core.newHeroProgress(),equipped:roll,collection:[roll],reincarnations:1};
        const fixture={...core.DEFAULT_SAVE,level:12,xp:3,coins:4321,souls:9,killCount:78,rebirths:1,monsterIndex:999,monsterSpeciesId:'bat',monsterHp:core.monsterForIndex(999,'bat').maxHp.toString(),
          companions:[{id:'c1',speciesId:'slime',bossIndex:0,level:1,stars:0}],pvpParty:['c1'],nextCompanionId:2,hero,progress};
        fs.writeFileSync(app.getPath('userData')+'/save.json',JSON.stringify(fixture)); return fixture; })()`);
      writeFileSync(`${file}.legacy-fixture.json`, `${JSON.stringify(fixture, null, 2)}\n`);
      report.fixtureHash = sha256(readFileSync(`${file}.legacy-fixture.json`));
      report.processes.push(await boot.close()); boot = null;
      // The authoritative local PvP record is synthetic too; the production main owns these counters.
      writeFileSync(join(userData, 'identity.json'), JSON.stringify({ name: 'Package_Check', playerId: null, token: null,
        notifiedTheftIds: [], pvpHistory: { wins: 7, losses: 3, matchIds: ['synthetic-package-match'] } }));
      boot = await inspectBoot(executable, env, userData, `${file}.legacy.log`);
      const flush = async () => {
        await boot.evaluate(`__packageCheck.field.webContents.executeJavaScript("window.dispatchEvent(new Event('blur'))")`);
        await pause(150);
        return boot.evaluate(`__packageCheck.field.webContents.executeJavaScript('window.desmon.loadState()')`);
      };
      const migrated = await flush();
      const legacyExpected = retainedProgress(fixture); delete legacyExpected.codex;
      const { codex: migratedCodex, ...legacyActual } = retainedProgress(migrated);
      check('legacy-value-and-history-preservation', isDeepStrictEqual(legacyExpected, legacyActual), { expected: legacyExpected, actual: legacyActual });
      check('legacy-discoveries-baselined', isDeepStrictEqual(migratedCodex, { acknowledgedHeroes: ['h01'], acknowledgedMonsters: ['slime', 'bat'], goal: null }), migratedCodex);
      await boot.evaluate(`__packageCheck.menu=__packageCheck.require(__packageCheck.app.getAppPath()+'/dist/electron/main/menuWindow.js').showMenuWindow(); true`);
      await until(() => boot.evaluate(`__packageCheck.menu.webContents.executeJavaScript("Boolean(window.desmon && document.querySelector('#tab-codex'))")`), 'packaged menu preload');
      await boot.evaluate(`__packageCheck.menu.webContents.executeJavaScript("document.querySelector('#tab-codex').click()")`);
      await until(() => boot.evaluate(`__packageCheck.menu.webContents.executeJavaScript("Boolean(document.querySelector('[data-discovery-id=\\"h03\\"] .codex-goal'))")`), 'packaged goal control');
      await boot.evaluate(`__packageCheck.menu.webContents.executeJavaScript("document.querySelector('[data-discovery-id=\\"h03\\"] .codex-goal').click()")`);
      await until(async () => (await flush())?.progress?.codex?.goal?.id === 'h03', 'goal through packaged renderer/preload/IPC/save');
      const saved = await flush();
      check('new-ui-state-saved', saved.progress.codex.goal.kind === 'hero' && saved.progress.codex.goal.id === 'h03', saved.progress.codex);
      const png = Buffer.from(await boot.evaluate(`__packageCheck.menu.webContents.capturePage().then(image => image.toPNG().toString('base64'))`), 'base64');
      writeFileSync(`${file}.menu.png`, png); report.screenshots.push({ path: `${file}.menu.png`, sha256: sha256(png) });
      writeFileSync(`${file}.before-restart.json`, `${JSON.stringify(saved, null, 2)}\n`);
      report.processes.push(await boot.close()); boot = null;
      boot = await inspectBoot(executable, env, userData, `${file}.restart.log`);
      const resumed = await flush();
      check('packaged-save-restart-preservation', isDeepStrictEqual(retainedProgress(saved), retainedProgress(resumed)),
        { saved: retainedProgress(saved), resumed: retainedProgress(resumed) });
      writeFileSync(`${file}.after-restart.json`, `${JSON.stringify(resumed, null, 2)}\n`);
    }
    report.processes.push(await boot.close()); boot = null;
    check('packaged-process-exits', report.processes.every(process => process.exitCode === 0 && process.signal === null), report.processes);
    check('unchanged-verification-inputs', report.sourceDigest === sourceDigest() && report.evaluationDigest === evaluationDigest() &&
      report.packageHashes.asar === sha256(readFileSync(asar)) && report.packageHashes.executable === sha256(readFileSync(executable)), 'Source, tools and packaged bytes checked again after runtime validation.');
  } catch (error) { report.errors.push(error.stack ?? String(error)); }
  finally {
    if (pendingSmoke) { try { report.processes.push(await pendingSmoke.finish()); } catch (error) { report.errors.push(String(error)); } }
    if (boot) { try { report.processes.push(await boot.process.finish()); } catch (error) { report.errors.push(String(error)); } boot.inspector.close(); }
    rmSync(ownedTmp, { recursive: true, force: true }); report.temporaryDataRemoved = !existsSync(ownedTmp);
    report.finishedAt = new Date().toISOString();
    report.status = report.errors.length === 0 && report.checks.every(entry => entry.passed) ? 'passed' : 'failed';
    writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [output, appPath, flag] = process.argv.slice(2);
  if (!output || (flag && flag !== '--probe')) {
    console.error('Usage: node .harness/v5/loop/package-check.mjs <output.json> [release/mac-arm64/DesMon.app] [--probe]\n--probe checks isolated packaged main/smoke only; it is not release verification.');
    process.exitCode = 1;
  } else {
    const report = await packageCheck(output, appPath, flag === '--probe');
    console.log(`PACKAGE_${report.status.toUpperCase()} ${relative(ROOT, resolve(output))}`);
    process.exitCode = report.status === 'passed' ? 0 : 1;
  }
}

export { inspectBoot };
