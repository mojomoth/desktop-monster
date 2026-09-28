// Development evidence, separate from V12-08 approval and release gates.
// Runs the actual Electron main/preload/renderers against the actual HTTP adapter
// and MemoryStore, with a temporary profile and an injected server clock.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '../..');
const { createApp } = require(join(root, 'dist/electron/server/app.js'));
const { MemoryStore } = require(join(root, 'dist/electron/server/store.js'));
const { createRequestListener } = require(join(root, 'dist/electron/server/http.js'));
const { RAID_EPOCH } = require(join(root, 'dist/electron/server/raid.js'));
const { RAID_PARAMETERS } = require(join(root, 'dist/electron/core/raid.js'));
const { createEngine } = require(join(root, 'dist/electron/core/engine.js'));
const { parseSave } = require(join(root, 'dist/electron/core/save.js'));
const playwrightPath = process.env.DESMON_PLAYWRIGHT ?? join(process.env.HOME, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const { _electron } = await import(playwrightPath);
const { isRaidLive } = require(join(root, 'dist/electron/main/net.js'));
const { VIEWS } = await import('./fixtures/raid.mjs');
for (const [name, view] of Object.entries(VIEWS)) assert.ok(isRaidLive(view), `outdated harness fixture: ${name}`);
const sourceHashes = {};
const hashFiles = dir => { for (const item of readdirSync(join(root, dir), { withFileTypes: true })) {
  const path = `${dir}/${item.name}`;
  if (item.isDirectory()) hashFiles(path);
  else sourceHashes[path] = createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
} };
hashFiles('src'); hashFiles('static');
const out = resolve(process.argv[2] ?? join(root, '.agentdoc/v12-connected-check'));
mkdirSync(out, { recursive: true });
const directory = mkdtempSync(join(tmpdir(), 'desmon-raid-connected-'));
let now = RAID_EPOCH + RAID_PARAMETERS.periodMs * 2 + 1000;
let offline = false;
const requests = [], errors = [];
const victory = process.argv.includes('--victory');
const until = async check => { const deadline = Date.now() + 20000; while (!await check()) { if (Date.now() > deadline) throw Error('Timed out waiting for actual IPC state'); await new Promise(r => setTimeout(r, 200)); } };
const store = new MemoryStore();
const serverApp = createApp({ store, now: () => now, randomUUID, randomBytesHex: n => randomBytes(n).toString('hex'), randomSeed: () => 42,
  raidParameters: { ...RAID_PARAMETERS, conditionNeed: 1, minConfirmed: 1, capacity: 50, countdownMs: 60000, confirmGraceMs: 90000, clearRatioBps: victory ? 100 : RAID_PARAMETERS.clearRatioBps } });
const server = createServer(createRequestListener(async req => {
  const response = offline && req.path.startsWith('/v1/raid/') ? { status: 503, body: { error: 'test_offline' } } : await serverApp.handle(req);
  requests.push({ path: req.path, method: req.method, status: response.status, body: req.path === '/v1/raid/attack' ? req.body : undefined });
  return response;
}));
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
writeFileSync(join(directory, 'save.json'), JSON.stringify(parseSave({ level: 80, bestIndex: 120, coins: '20000',
  hero: { equipped: { formId: 'h11', buffPercent: 18 }, collection: [{ formId: 'h11', buffPercent: 18 }], reincarnations: 2 } })));
writeFileSync(join(directory, 'settings.json'), JSON.stringify({ gameScale: 1, muted: true, screenShake: false, welcomeSeen: true, globalInputRequested: false }));
symlinkSync(join(root, 'static'), join(directory, 'static'));
symlinkSync(join(root, 'dist'), join(directory, 'dist'));
const entry = join(directory, 'entry.cjs');
writeFileSync(entry, `const {app}=require('electron');\napp.setPath('userData',${JSON.stringify(directory)});\nglobalThis.__raidDevMenu=()=>require(${JSON.stringify(join(root, 'dist/electron/main/menuWindow.js'))}).showMenuWindow();\nrequire(${JSON.stringify(join(root, 'dist/electron/main/index.js'))});\n`);
let electron;
const receipt = { sourceHashes, profile: directory, transport: 'actual node:http + MemoryStore', productionServer: false, scenario: victory ? 'victory' : 'timeout', checks: [] };
try {
  electron = await _electron.launch({ executablePath: join(root, 'node_modules/.bin/electron'), args: [entry], cwd: root,
    env: { ...process.env, DESMON_SERVER_URL: baseUrl, SMOKE: '' } });
  electron.process().stderr.on('data', b => { errors.push(String(b)); });
  const field = await electron.firstWindow();
  field.on('pageerror', e => errors.push(String(e)));
  await field.waitForFunction(() => !!window.desmon);
  await field.screenshot({ path: join(out, '01-hunting.png') });
  const menuReady = electron.waitForEvent('window', { predicate: page => page !== field });
  await electron.evaluate(() => { globalThis.__raidDevMenu(); });
  const menu = await menuReady;
  await menu.waitForSelector('#tab-raid'); menu.on('pageerror', e => errors.push(String(e)));
  await menu.locator('#tab-raid').click();
  const refresh = async phase => {
    await field.evaluate(() => window.desmon.getRaidState());
    await until(async () => (await field.evaluate(() => window.desmon.getRaidState()))?.raid.phase === phase);
    return field.evaluate(() => window.desmon.getRaidState());
  };
  await refresh('gathering');
  await menu.locator('.raid-current .raid-action').waitFor({ state: 'visible' });
  await menu.waitForFunction(() => !document.querySelector('.raid-current .raid-action').disabled, { timeout: 15000 });
  await menu.locator('.raid-current .raid-action').click();
  await menu.waitForFunction(() => document.querySelector('.raid-current .raid-action').textContent === '참여');
  await menu.locator('.raid-current .raid-action').click();
  await refresh('countdown');
  await menu.locator('.raid-current .raid-action').click();
  await until(async () => (await field.evaluate(() => window.desmon.getRaidState()))?.raid.me.joined);
  await field.screenshot({ path: join(out, '02-countdown.png') });
  await menu.screenshot({ path: join(out, '03-menu-countdown.png') });
  now += 60000;
  await refresh('confirming');
  assert.equal((await field.evaluate(() => window.desmon.getRaidState())).raid.me.confirmed, false);
  await menu.locator('dialog[open]').waitFor();
  await menu.screenshot({ path: join(out, '04-confirm-popup.png') });
  await menu.keyboard.press('Tab');
  assert.equal(await menu.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), true);
  await menu.keyboard.press('Escape');
  await field.locator('#raid-status').click();
  await until(async () => (await field.evaluate(() => window.desmon.getRaidState()))?.raid.me.confirmed);
  receipt.checks.push('real field click explicitly confirms; popup keyboard trap/Escape');
  now += 90000;
  await refresh('battle');
  const before = await field.evaluate(() => window.desmon.loadState());
  await field.screenshot({ path: join(out, '05-battle.png') });
  now += 5000;
  for (let i = 0; i < 8; i++) await field.mouse.click(200, 170);
  await until(async () => BigInt((await field.evaluate(() => window.desmon.getRaidState())).raid.me.damage) > 0n);
  await field.screenshot({ path: join(out, '06-battle-hit.png') });
  const after = await field.evaluate(() => window.desmon.loadState());
  assert.equal(after.killCount, before.killCount); assert.equal(after.monsterHp, before.monsterHp);
  const expected = createEngine(before);
  if (after.appliedRaidIds?.includes('r2')) {
    const result = await field.evaluate(() => window.desmon.getRaidState());
    expected.apply({ type: 'raidReward', ...result.raid.me.reward });
  }
  assert.equal(after.xp, expected.toSave().xp); assert.equal(after.level, expected.toSave().level);
  assert.ok(requests.some(r => r.path === '/v1/raid/attack' && r.status === 200));
  receipt.checks.push('actual field inputs -> IPC -> batch POST -> authoritative HP; field monster unchanged; XP changes only by authoritative reward');
  if (!victory) {
  offline = true;
  await field.evaluate(() => window.desmon.getRaidState());
  await until(async () => !(await field.evaluate(() => window.desmon.getRaidConnection())));
  await field.screenshot({ path: join(out, '07-disconnected.png') });
  offline = false;
  await refresh('battle');
  receipt.checks.push('failed HTTP request keeps raid presentation and reconnects');
  now += RAID_PARAMETERS.battleMs;
  }
  const settled = await refresh('settled');
  assert.equal(settled.raid.battle.killed, victory);
  await field.screenshot({ path: join(out, victory ? '08-victory.png' : '08-defeat.png') });
  await menu.locator('dialog[open]').waitFor({ timeout: 15000 });
  await menu.screenshot({ path: join(out, '09-result-popup.png') });
  await until(async () => (await field.evaluate(() => window.desmon.loadState())).appliedRaidIds?.includes('r2'));
  const rewarded = await field.evaluate(() => window.desmon.loadState());
  assert.ok(BigInt(rewarded.coins) > BigInt(before.coins));
  assert.deepEqual(rewarded.appliedRaidIds, ['r2']);
  await refresh('settled');
  assert.deepEqual((await field.evaluate(() => window.desmon.loadState())).appliedRaidIds, ['r2']);
  receipt.checks.push(`${victory ? 'victory' : 'timeout'} result automatically delivered once through durable save and result popup`);
  const overflow = await menu.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
    dialog: (() => { const r = document.querySelector('dialog').getBoundingClientRect(); return { x:r.x,y:r.y,right:r.right,bottom:r.bottom }; })(), height: innerHeight }));
  assert.equal(overflow.width, 560); assert.ok(overflow.scroll <= overflow.width);
  assert.ok(overflow.dialog.x >= 0 && overflow.dialog.right <= overflow.width && overflow.dialog.y >= 0 && overflow.dialog.bottom <= overflow.height);
  receipt.checks.push('560px menu and result dialog stay in viewport');
  await menu.getByRole('button', { name: '확인', exact: true }).click();
  await field.waitForFunction(() => document.querySelector('#raid-status').hidden, null, { timeout: 10000 });
  await field.screenshot({ path: join(out, '10-return-to-field.png') });
  receipt.passed = true;
} catch (error) {
  receipt.passed = false; receipt.error = String(error.stack ?? error);
  console.error(receipt.error);
} finally {
  receipt.requests = requests; receipt.errors = errors;
  writeFileSync(join(out, 'result.json'), JSON.stringify(receipt, null, 2));
  if (electron) { await electron.evaluate(({ app }) => app.exit(0)).catch(() => {}); }
  server.closeAllConnections(); await new Promise(resolveClose => server.close(resolveClose));
}
console.log(JSON.stringify({ passed: receipt.passed, checks: receipt.checks, out }));
process.exitCode = receipt.passed ? 0 : 1;
