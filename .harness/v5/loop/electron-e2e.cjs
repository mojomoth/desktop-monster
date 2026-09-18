// Test-only bootstrap. All windows, preload, renderer, IPC and persistence are production modules.
// Deliberately never imports main/index (native hooks, live network, tray and smoke auto-exit).
const { app, BrowserWindow, ipcMain, session } = require('electron');
const { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve, dirname, join } = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const ROOT = resolve(__dirname, '../../..');
const [output, duration, profile] = process.argv.slice(2);
const started = performance.now();
const data = mkdtempSync(join(tmpdir(), 'desmon-e2e-'));
const shots = `${output}.screenshots`;
mkdirSync(shots, { recursive: true });
app.setName('DesMon E2E');
app.setAppPath(ROOT);
app.setPath('userData', data);
process.env.SMOKE = '1';
process.env.DESMON_SERVER_URL = '';
const report = { schemaVersion: 1, mode: 'electron-e2e', sourceDigest: process.env.DESMON_E2E_DIGEST, evaluationDigest: process.env.DESMON_E2E_TOOLS,
  command: `node .harness/v5/loop/e2e.mjs ${output} ${duration} ${profile}`,
  startedAt: new Date().toISOString(), elapsedMs: 0, status: 'failed', checks: [], sessions: [], screenshots: [], errors: [],
  bootstrap: 'Production BrowserWindows, preload, renderer, IPC and save; harness lifecycle.',
  limitations: ['No human player: enjoyment, distraction and retention remain unverified.',
    'OS global hooks, Accessibility, tray startup, packaged app and live PvP are not exercised.',
    'Live renderer uses production RNG and wall clock; distribution claims use separate seeded simulation.',
    'Scripted fixtures are diagnostic setup, not naturally earned player progress.'],
};
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const check = (id, passed, details) => { report.checks.push({ id, passed: Boolean(passed), details }); };
const until = async (predicate, label, timeout = 12_000) => {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    if (await predicate()) return;
    await pause(100);
  }
  throw new Error(`Timeout: ${label}`);
};
let field;
const evaluate = (win, code) => win.webContents.executeJavaScript(code, true);
const readState = () => evaluate(field, 'window.desmon.loadState()');
const flush = async () => {
  await evaluate(field, "window.dispatchEvent(new Event('blur'))");
  await pause(150);
  return readState();
};
const screenshot = async (win, name) => {
  const png = (await win.webContents.capturePage()).toPNG();
  const path = join(shots, `${name}.png`);
  writeFileSync(path, png);
  report.screenshots.push({ path, sha256: createHash('sha256').update(png).digest('hex') });
};
const click = async (win, selector) => {
  const point = await evaluate(win, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el || el.disabled || el.closest('[hidden]')) throw new Error('Control unavailable: ' + ${JSON.stringify(selector)});
    el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect();
    return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};
  })()`);
  win.focus();
  win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point });
  win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point });
  await pause(180);
};
let frameCount = 0;
const loadFixture = async (save) => {
  // Stop the old renderer before replacing its isolated save (no old rAF overwrite).
  await field.loadURL('about:blank');
  writeFileSync(join(data, 'save.json'), JSON.stringify(save));
  const before = frameCount;
  await field.loadFile(resolve(ROOT, 'static/index.html'));
  await until(() => frameCount > before, 'fixture first frame');
  await flush();
};
const summary = (save) => ({ level: save.level, kills: save.killCount, coins: save.coins,
  companions: save.companions.length, reincarnations: save.hero?.reincarnations ?? 0,
  playTimeMs: save.progress?.playTimeMs ?? 0, seenMonsters: save.progress?.seenMonsters.length ?? 0 });
const watchdog = setTimeout(() => {
  report.errors.push('E2E watchdog timeout'); finish(1);
}, Number(duration) * 60_000 + 100_000);
let finishing = false;
function finish(code) {
  if (finishing) return;
  finishing = true;
  clearTimeout(watchdog);
  report.elapsedMs = performance.now() - started;
  report.status = code === 0 && report.checks.every((c) => c.passed) && report.errors.length === 0 ? 'passed' : 'failed';
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  for (const win of BrowserWindow.getAllWindows()) win.destroy();
  // Only the mkdtemp directory owned by this process is removed.
  rmSync(data, { recursive: true, force: true });
  console.log(`E2E_${report.status.toUpperCase()} ${output} (${report.checks.length} checks)`);
  app.exit(report.status === 'passed' ? 0 : 1);
}
process.on('uncaughtException', (error) => { report.errors.push(error.stack); finish(1); });
process.on('unhandledRejection', (error) => { report.errors.push(String(error)); finish(1); });
process.on('SIGTERM', () => { report.errors.push('Terminated'); finish(1); });

app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', (details) => {
    if (details.level === 'error') report.errors.push(`${details.message} (${details.sourceId}:${details.lineNumber})`);
  });
  contents.on('render-process-gone', (_event, details) => report.errors.push(`Renderer gone: ${details.reason}`));
  contents.on('did-fail-load', (_event, code, text, url) => report.errors.push(`Load failed ${code}: ${text} ${url}`));
});

app.whenReady().then(async () => {
  app.dock?.hide();
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
    report.errors.push(`Unexpected network request: ${details.url}`); callback({ cancel: true });
  });
  const core = require(resolve(ROOT, 'dist/electron/core/index.js'));
  const { registerIpcHandlers } = require(resolve(ROOT, 'dist/electron/main/ipc.js'));
  const { createOverlayWindow } = require(resolve(ROOT, 'dist/electron/main/window.js'));
  const { showMenuWindow } = require(resolve(ROOT, 'dist/electron/main/menuWindow.js'));
  registerIpcHandlers({ onFirstFrame: () => { frameCount++; } });
  field = createOverlayWindow();
  await until(() => frameCount > 0, 'production first painted frame');
  await flush();
  check('native-overlay', field.isAlwaysOnTop() && field.getContentSize().join('x') === '400x260',
    { size: field.getContentSize(), alwaysOnTop: field.isAlwaysOnTop() });
  check('preload-isolation', await evaluate(field, "typeof window.desmon.loadState === 'function' && typeof require === 'undefined'"),
    'Real sandboxed preload bridge; Node unavailable in renderer.');
  const pixels = await evaluate(field, "(() => {const c=document.querySelector('#game');const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return Array.from(p).filter((v,i)=>i%4===3&&v>0).length})()");
  check('painted-canvas', pixels > 100, { opaquePixels: pixels });
  await screenshot(field, 'fresh-field');

  // Real-time observation starts on a fresh state. No clock acceleration or fixture rewards.
  if (Number(duration) > 0) {
    const start = summary(await readState());
    const sessionStart = performance.now();
    const observation = { profile, minutes: Number(duration), mode: 'real-time', elapsedMs: 0,
      inputs: 0, start, end: null, timeline: [], policy: '2 inputs/sec; no automatic menu/reincarnation choices; idle has zero onboarding inputs' };
    const driver = new core.SimulatedInputDriver();
    driver.subscribe((event) => field.webContents.send('desmon:input', event));
    driver.start();
    let nextInput = sessionStart;
    let nextSample = sessionStart;
    while (performance.now() - sessionStart < Number(duration) * 60_000) {
      const now = performance.now();
      const elapsed = now - sessionStart;
      if (now >= nextInput) {
        if (profile === 'active' || (profile === 'intermittent' && elapsed % 60_000 < 15_000)) {
          driver.emit(observation.inputs % 2 ? 'mouse' : 'keyboard'); observation.inputs++;
        }
        nextInput = now + 500;
      }
      if (now >= nextSample) {
        observation.timeline.push({ elapsedMs: elapsed, ...summary(await readState()) });
        console.log(`PLAYTEST ${profile} ${Math.floor(elapsed / 1000)}/${Number(duration) * 60}s`);
        nextSample = now + 30_000;
      }
      await pause(25);
    }
    driver.stop();
    observation.elapsedMs = performance.now() - sessionStart;
    observation.end = summary(await flush());
    report.sessions.push(observation);
    check('real-time-observation', observation.elapsedMs >= Number(duration) * 60_000 &&
      observation.end.playTimeMs > start.playTimeMs, observation);
    await screenshot(field, `${duration}m-${profile}`);
  }

  await loadFixture(core.DEFAULT_SAVE);
  const before = await readState();
  field.focus();
  field.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'A' });
  field.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'A' });
  await pause(750);
  const after = await flush();
  check('fallback-keyboard-to-save', BigInt(after.monsterHp) < BigInt(before.monsterHp),
    { beforeHp: before.monsterHp, afterHp: after.monsterHp });
  await click(field, '#game');
  const mouseAfter = await flush();
  check('fallback-mouse-to-save', BigInt(mouseAfter.monsterHp) < BigInt(after.monsterHp),
    { beforeHp: after.monsterHp, afterHp: mouseAfter.monsterHp });
  const driver = new core.SimulatedInputDriver();
  driver.subscribe((event) => field.webContents.send('desmon:input', event));
  driver.start();
  for (let i = 0; i < 24; i++) { driver.emit('keyboard'); await pause(80); }
  driver.stop();
  const killed = await flush();
  check('ipc-input-kill-reward', killed.killCount > 0 && (killed.xp > 0 || killed.level > 1), summary(killed));
  const persisted = JSON.parse(readFileSync(join(data, 'save.json'), 'utf8'));
  const beforeReload = frameCount;
  field.reload();
  await until(() => frameCount > beforeReload, 'saved field reload');
  const resumed = await readState();
  check('save-reload', resumed.killCount === persisted.killCount && resumed.level === persisted.level &&
    resumed.coins === persisted.coins, { saved: summary(persisted), resumed: summary(resumed) });

  await loadFixture({ ...core.DEFAULT_SAVE, coins: 1800 });
  let ready = false;
  ipcMain.once('desmon:menu-ready', () => { ready = true; });
  const menu = showMenuWindow();
  await until(() => ready, 'production menu ready');
  check('menu-singleton', showMenuWindow() === menu, 'Repeated opener reuses the production menu window.');
  await click(menu, '#tab-shop');
  await click(menu, '#shop .shop-card button');
  await until(async () => (await readState()).progress?.trainingLevel === 1, 'shop IPC mutation');
  const trained = await readState();
  check('shop-transaction', trained.coins === 1725 && trained.progress.trainingLevel === 1,
    { coins: trained.coins, training: trained.progress.trainingLevel });
  // A replay of the original purchase token must not debit a second time.
  await evaluate(menu, "window.desmon.sendAction({type:'shopBuy',item:'training',shopSerial:0})");
  await pause(200);
  check('stale-purchase-token', (await readState()).coins === 1725, 'Repeated token rejected by production reducer through IPC.');
  await screenshot(menu, 'shop');
  for (const tab of ['hero', 'codex', 'profile', 'roster', 'ranking', 'battle']) {
    await click(menu, `#tab-${tab}`);
    const details = await evaluate(menu, `({visible:!document.querySelector('#${tab}').hidden,
      overflow:document.documentElement.scrollWidth > window.innerWidth,
      text:document.querySelector('#${tab}').innerText.slice(0,2000)})`);
    check(`menu-${tab}`, details.visible && !details.overflow, details);
    await screenshot(menu, tab);
  }
  check('offline-pvp', await evaluate(menu, "document.querySelector('#battle-go').disabled"), 'Battle is disabled with offline identity.');
  await click(menu, '#tab-profile');
  await click(menu, '#name');
  await evaluate(menu, "document.querySelector('#name').select()");
  menu.webContents.insertText('E2E_Player');
  await click(menu, '#save-name');
  await until(async () => (await evaluate(menu, 'window.desmon.getIdentity()')).name === 'E2E_Player', 'name persistence');
  check('profile-name-ipc', true, 'Native input, click, preload, IPC and isolated identity store round-trip.');
  await loadFixture({ ...core.DEFAULT_SAVE, level: 12, coins: 1800 });
  await click(menu, '#tab-hero');
  await click(menu, '#hero .hero-opportunity button');
  await until(async () => (await readState()).hero?.choices.length === 3, 'three hero choices');
  await screenshot(menu, 'hero-choices');
  const offered = await readState();
  await click(menu, '#hero .hero-choice button');
  await until(async () => (await readState()).hero?.reincarnations === 1, 'hero choice through IPC');
  const chosen = await readState();
  check('hero-choice-reset-preserve', chosen.level === 1 && chosen.coins === 1800 &&
    chosen.hero.collection.length === 1 && chosen.hero.choices.length === 0 && chosen.hero.restRemainingMs > 0,
  { chosen: summary(chosen), restRemainingMs: chosen.hero.restRemainingMs, choices: offered.hero.choices });
  await evaluate(menu, `window.desmon.sendAction(${JSON.stringify({ type: 'heroChoose',
    formId: offered.hero.choices[0].formId, offerSerial: offered.hero.offerSerial })})`);
  await pause(200);
  check('stale-hero-choice', (await readState()).hero.reincarnations === 1,
    'Replaying an accepted offer does not grant another reincarnation.');
  // Reproduce the known level-gate presentation issue without modifying gameplay.
  const hero = core.newHeroProgress();
  hero.reincarnations = 1;
  await loadFixture({ ...core.DEFAULT_SAVE, level: 12, hero });
  const gate = await readState();
  const greenPixels = await evaluate(field, "(() => {const p=document.querySelector('#game').getContext('2d').getImageData(3,17,38,1).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i+1]>p[i]&&p[i+1]>p[i+2]&&p[i+3]>0)n++;return n})()");
  check('reincarnation-progress-honesty', greenPixels < 38 || core.heroReady(gate.level, gate.hero),
    { level: gate.level, requiredLevel: core.heroRequiredLevel(1), ready: core.heroReady(gate.level, gate.hero),
      filledPixels: greenPixels, barWidth: 38, fixture: 'Lv12 after first reincarnation, no rest' });
  await screenshot(field, 'level-gate');
  await require('./v06-journey.cjs')({core,ROOT,data,field,menu,readState,flush,loadFixture,evaluate,click,until,pause,check,screenshot});
  finish(0);
}).catch((error) => { report.errors.push(error.stack); finish(1); });
