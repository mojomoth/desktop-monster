#!/usr/bin/env node
// Focused production Electron acceptance. Save fixtures are synthetic; clocks/RNG/renderers are untouched.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launchRuntime } from './runtime.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = path => hash(readFileSync(path));
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]).sort();
const sleep = ms => new Promise(done => setTimeout(done, ms));
const requiredChecks = [
  'first/legacy-rest-normalized-in-main-and-menu',
  'first/native-canvas-removed-HUD-and-preserved-head-counters',
  'first/native-choice-resets-level-without-rest',
  'first/new-save-omits-rest',
  'first/raw-hash-verified-legacy-checkpoint-listed',
  'first/restored-choice-promise-normalized-and-original-checkpoint-unchanged',
  'first/restore-used-native-confirmation',
  'first/restored-menu-ready-without-rest-label',
  'restart/normalized-restoration-persists-with-choice-serial',
  'restart/native-canvas-removed-HUD-and-preserved-head-counters',
  'deferred/legacy-rest-removed-but-defer-still-blocks',
  'deferred/native-canvas-removed-HUD-and-preserved-head-counters',
  'deferred/real-time-defer-countdown-continues',
].sort();
const completeChecks = result => result.version === 9
  && JSON.stringify(result.attempts.map(attempt => attempt.phase)) === JSON.stringify(['first', 'restart', 'deferred'])
  && JSON.stringify(result.checks.map(check => check.phase + '/' + check.name).sort()) === JSON.stringify(requiredChecks)
  && result.checks.every(check => check.passed === true);
const [appPath, destination] = process.argv.slice(2);
if (appPath === 'verify') {
  const result = JSON.parse(readFileSync(resolve(destination), 'utf8'));
  if (!result.passed || !result.sourceUnchanged || result.errors.length || !completeChecks(result)
    || result.attempts.some(attempt => !attempt.runtime?.passed || attempt.runtime.exitCode !== 0 || attempt.runtime.signal !== null)
    || !Object.entries({ ...result.sources, ...result.artifacts }).every(([path, sha]) => existsSync(path) && fileHash(path) === sha)
    || result.attempts.some(attempt => fileHash(join(attempt.runtime.appPath, 'Contents/Resources/app.asar')) !== attempt.runtime.appHash)) {
    throw Error('No-rest native evidence failed, incomplete, or changed');
  }
  console.log('V09_NO_REST_UI_OK');
  process.exit(0);
}
if (!appPath || !destination) throw Error('Usage: node .harness/v9/no-rest-ui.mjs APP OUTPUT_DIR');
const outputDir = resolve(destination);
if (existsSync(outputDir)) throw Error('Use a new evidence directory');
mkdirSync(outputDir, { recursive: true });
const sourcePaths = [...files(resolve('src')), ...files(resolve('static')), ...files(resolve('dist')),
  resolve('.harness/v9/no-rest-ui.mjs'), resolve('.harness/v9/runtime.mjs'), resolve('.harness/v7/loop/package-check.mjs')];
const result = { version: 9, startedAt: new Date().toISOString(), passed: false, sourceUnchanged: false,
  sources: Object.fromEntries(sourcePaths.map(path => [path, fileHash(path)])), artifacts: {}, attempts: [], checks: [], errors: [],
  isolation: 'Synthetic level/legacy save fixtures in owned directories. Real time and production RNG, renderer, preload, IPC, coordinator and recovery. Native menu mouse input; no personal save, global hook or production network.' };
const core = createRequire(import.meta.url)(resolve('dist/electron/core/index.js'));
const settings = { gameScale: 1, muted: true, screenShake: true, welcomeSeen: true, globalInputRequested: false };
const identity = { name: 'FixtureMe', playerId: 'fixture-me', token: 'fixture-me-token', notifiedTheftIds: [] };
const choiceRolls = [{ formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 15 }, { formId: 'h03', buffPercent: 20 }];
const legacySave = (serial, defer = 0) => ({ ...core.parseSave({ ...core.DEFAULT_SAVE, version: 3,
  level: core.heroRequiredLevel(1), xp: 3, coins: 1234567, killCount: 98, bestIndex: 40 }),
  hero: { ...core.newHeroProgress(), reincarnations: 1, restRemainingMs: 120000, deferRemainingMs: defer,
    choices: defer ? [] : choiceRolls, offerSerial: serial, ...(defer ? {} : { offerLevel: core.heroRequiredLevel(1) }) } });
const original = legacySave(9), checkpointSave = { ...legacySave(29), coins: 34567 };
const userData = join(outputDir, 'user-data');
mkdirSync(join(userData, 'checkpoints'), { recursive: true });
writeFileSync(join(userData, '.v09-isolated'), 'Owned synthetic no-rest verification fixtures.\n');
const checkpointId = 'legacy-rest-point', checkpointPath = join(userData, 'checkpoints', checkpointId + '.json');
writeFileSync(checkpointPath, JSON.stringify({ version: 1, id: checkpointId, at: Date.now(), reason: 'reset',
  save: checkpointSave, hash: hash(JSON.stringify(checkpointSave)) }));
const checkpointOriginalHash = fileHash(checkpointPath);
writeFileSync(join(outputDir, 'fixtures.json'), JSON.stringify({ original, checkpointSave, checkpointId, checkpointOriginalHash,
  deferred: legacySave(39, 30000) }, null, 2) + '\n');

const check = (phase, name, passed, details = {}) => {
  result.checks.push({ phase, name, passed: Boolean(passed), details });
  if (!passed) throw Error(name + ': ' + JSON.stringify(details));
};
async function until(fn, label, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await fn(); if (value) return value; await sleep(50); }
  throw Error('Timeout: ' + label);
}
function surface(runtime, phase) {
  const main = expression => runtime.evaluate(`(()=>{const p=__v09Runtime;return (${expression});})()`);
  const inWindow = (target, fn, ...args) => main(`p.${target}.webContents.executeJavaScript(${JSON.stringify(`(${fn})(...${JSON.stringify(args)})`)})`);
  const menu = (fn, ...args) => inWindow('menu', fn, ...args);
  const field = (fn, ...args) => inWindow('field', fn, ...args);
  const snapshot = () => field(async () => await window.desmon.loadState());
  const menuState = () => menu(async () => ({ save: await window.desmon.loadState(),
    text: document.querySelector('#hero').textContent,
    choices: [...document.querySelectorAll('[data-hero-choice]')].map(button => ({ id: button.dataset.heroChoice, disabled: button.disabled })),
    offer: [...document.querySelectorAll('[data-hero-action="heroOffer"]')].map(button => ({ text: button.textContent, disabled: button.disabled })) }));
  const capture = async (name, target = 'menu') => {
    const base64 = await main(`(async()=> (await p.${target}.webContents.capturePage()).toPNG().toString('base64'))()`);
    writeFileSync(join(runtime.outputDir, name + '.png'), Buffer.from(base64, 'base64'));
  };
  const click = async selector => {
    const point = await menu(selector => {
      const element = document.querySelector(selector);
      if (!element || element.disabled) throw Error('Missing/disabled control: ' + selector);
      element.scrollIntoView({ block: 'center' });
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) throw Error('Hidden control: ' + selector);
      return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
    }, selector);
    await main(`(()=>{for(const type of ['mouseDown','mouseUp'])p.menu.webContents.sendInputEvent({type,button:'left',clickCount:1,...${JSON.stringify(point)}});return true;})()`);
    await sleep(90);
  };
  const openMenu = async () => {
    await main(`(()=>{p.menu=p.require(p.e.app.getAppPath()+'/dist/electron/main/menuWindow.js').showMenuWindow();return true;})()`);
    await until(() => main('!p.menu.webContents.isLoading()'), 'menu load');
    await until(() => menu(() => document.querySelector('#game-content')?.hidden === false && Boolean(document.querySelector('.hero-summary'))), 'production menu');
    await click('#tab-hero');
  };
  const assertHud = async ready => {
    const pixels = await field(() => {
      const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
      const alphaCount = (x, y, w, h) => {
        const pixels = ctx.getImageData(x, y, w, h).data;
        let nonzero = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 0) nonzero++;
        return nonzero;
      };
      const colorCount = (x, y, w, h, rgb) => {
        const pixels = ctx.getImageData(x, y, w, h).data;
        let count = 0; for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] !== 0 && rgb.every((value, channel) => pixels[i + channel] === value)) count++;
        }
        return count;
      };
      return { width: canvas.width, height: canvas.height,
        removed: alphaCount(2, 16, 64, 22), level: colorCount(60, 79, 40, 5, [222, 238, 214]),
        ready: colorCount(55, 72, 51, 5, [218, 212, 94]), xp: alphaCount(60, 86, 40, 4),
        kills: colorCount(170, 24, 28, 10, [222, 238, 214]), coins: colorCount(160, 38, 38, 10, [218, 212, 94]),
        xpFrame: [...ctx.getImageData(60, 86, 1, 1).data] };
    });
    check(phase, 'native-canvas-removed-HUD-and-preserved-head-counters', pixels.width === 200 && pixels.height === 130
      && pixels.removed === 0 && pixels.level > 0 && pixels.xp === 160 && pixels.xpFrame[3] === 255
      && pixels.kills > 0 && pixels.coins > 0 && (ready ? pixels.ready > 0 : pixels.ready === 0), pixels);
    await capture('field-hud', 'field');
  };
  return { main, menu, snapshot, menuState, capture, click, openMenu, assertHud };
}

async function attempt(phase, options, work) {
  let runtime;
  const entry = { phase, startedAt: new Date().toISOString(), runtime: null, errors: [] }; result.attempts.push(entry);
  try {
    runtime = await launchRuntime({ appPath, outputDir: join(outputDir, phase), ...options });
    const ui = surface(runtime, phase); await ui.openMenu(); await work(ui, runtime);
  } catch (error) { entry.errors.push(String(error)); result.errors.push({ phase, error: String(error) }); }
  finally { if (runtime) entry.runtime = await runtime.close(); }
  entry.finishedAt = new Date().toISOString();
  if (entry.errors.length || !entry.runtime?.passed) throw Error('Failed phase: ' + phase);
}
const normalizedOffer = (save, expected) => save.level === expected.level && save.hero
  && !Object.hasOwn(save.hero, 'restRemainingMs') && save.hero.offerSerial === expected.hero.offerSerial
  && save.hero.offerLevel === expected.hero.offerLevel && JSON.stringify(save.hero.choices) === JSON.stringify(expected.hero.choices);

try {
  await attempt('first', { userData, save: original, settings, identity }, async ui => {
    const loaded = await ui.snapshot(), menu = await ui.menuState();
    check('first', 'legacy-rest-normalized-in-main-and-menu', normalizedOffer(loaded, original) && normalizedOffer(menu.save, original)
      && menu.choices.length === 3 && menu.choices.every(button => !button.disabled) && !/휴식|REST/.test(menu.text), { loaded, menu });
    await ui.assertHud(true); await ui.capture('hero-legacy-ready');
    await ui.click('[data-hero-choice="h02"]');
    const chosen = await until(async () => { const save = await ui.snapshot(); return save.level === 1 ? save : null; }, 'native hero choice');
    const chosenUi = await until(async () => { const menu = await ui.menuState(); return menu.choices.length === 0 && menu.text.includes('Lv.1') ? menu : null; }, 'chosen menu updated');
    check('first', 'native-choice-resets-level-without-rest', chosen.hero.equipped.formId === 'h02' && chosen.hero.reincarnations === 2
      && chosen.hero.choices.length === 0 && !Object.hasOwn(chosen.hero, 'restRemainingMs') && !/휴식|REST/.test(chosenUi.text), { chosen, chosenUi });
    const saved = await until(() => { const save = JSON.parse(readFileSync(join(userData, 'save.json'), 'utf8')); return save.level === 1 ? save : null; }, 'choice persisted');
    check('first', 'new-save-omits-rest', !Object.hasOwn(saved.hero, 'restRemainingMs'), { saved });
    await ui.capture('hero-after-choice');
    await ui.click('#tab-profile'); await ui.click('#progress-recovery summary');
    await until(() => ui.menu(() => document.querySelectorAll('.checkpoint-row').length === 1), 'legacy checkpoint row');
    const list = await ui.menu(async () => await window.desmon.listCheckpoints());
    check('first', 'raw-hash-verified-legacy-checkpoint-listed', list.length === 1 && list[0].id === checkpointId
      && fileHash(checkpointPath) === checkpointOriginalHash, { list, checkpointOriginalHash });
    await ui.main('p.dialogAnswers.push(1)'); await ui.click('.checkpoint-row button');
    const restored = await until(async () => { const save = await ui.snapshot(); return save.hero?.offerSerial === 29 ? save : null; }, 'native checkpoint restore');
    check('first', 'restored-choice-promise-normalized-and-original-checkpoint-unchanged', normalizedOffer(restored, checkpointSave)
      && restored.coins === checkpointSave.coins && fileHash(checkpointPath) === checkpointOriginalHash, { restored });
    const dialog = await ui.main("p.dialogs.filter(item=>item.kind==='message').at(-1)");
    check('first', 'restore-used-native-confirmation', dialog?.response === 1 && dialog.options.defaultId === 0 && dialog.options.cancelId === 0, { dialog });
    await ui.capture('restored-checkpoint'); await ui.click('#tab-hero');
    const restoredUi = await until(async () => { const menu = await ui.menuState(); return menu.choices.length === 3 ? menu : null; }, 'restored menu');
    check('first', 'restored-menu-ready-without-rest-label', restoredUi.choices.every(button => !button.disabled) && !/휴식|REST/.test(restoredUi.text), { restoredUi });
    await ui.capture('hero-restored');
  });
  await attempt('restart', { userData }, async ui => {
    const loaded = await ui.snapshot(), menu = await ui.menuState(), disk = JSON.parse(readFileSync(join(userData, 'save.json'), 'utf8'));
    check('restart', 'normalized-restoration-persists-with-choice-serial', normalizedOffer(loaded, checkpointSave)
      && normalizedOffer(menu.save, checkpointSave) && normalizedOffer(disk, checkpointSave)
      && menu.choices.length === 3 && menu.choices.every(button => !button.disabled) && !/휴식|REST/.test(menu.text)
      && fileHash(checkpointPath) === checkpointOriginalHash, { loaded, menu, disk, checkpointOriginalHash });
    await ui.assertHud(true); await ui.capture('hero-restarted');
  });
  await attempt('deferred', { save: legacySave(39, 30000), settings, identity }, async ui => {
    const before = await ui.menuState();
    check('deferred', 'legacy-rest-removed-but-defer-still-blocks', !Object.hasOwn(before.save.hero, 'restRemainingMs')
      && before.save.hero.deferRemainingMs > 0 && before.save.hero.deferRemainingMs <= 30000
      && before.offer.length === 1 && before.offer[0].disabled && /무료 재도전까지 플레이 \d+초/.test(before.offer[0].text)
      && !/휴식|REST/.test(before.text), { before });
    await ui.assertHud(false); await ui.capture('hero-deferred-start');
    const began = Date.now();
    const after = await until(async () => {
      const menu = await ui.menuState(); return menu.save.hero.deferRemainingMs < before.save.hero.deferRemainingMs
        && menu.offer[0]?.text !== before.offer[0].text ? menu : null;
    }, 'real-time defer countdown save and menu refresh', 12000);
    check('deferred', 'real-time-defer-countdown-continues', after.save.hero.deferRemainingMs > 0 && after.offer[0].disabled
      && !Object.hasOwn(after.save.hero, 'restRemainingMs'), { elapsedWallMs: Date.now() - began, before: before.save.hero.deferRemainingMs, after });
    await ui.capture('hero-deferred-later');
  });
} catch (error) { result.errors.push({ phase: 'runner', error: String(error) }); }
result.sourceUnchanged = Object.entries(result.sources).every(([path, sha]) => existsSync(path) && fileHash(path) === sha);
result.artifacts = Object.fromEntries(files(outputDir).map(path => [path, fileHash(path)]));
result.finishedAt = new Date().toISOString();
result.passed = result.sourceUnchanged && result.errors.length === 0 && completeChecks(result)
  && result.attempts.every(attempt => attempt.runtime?.passed && attempt.runtime.exitCode === 0 && attempt.runtime.signal === null);
writeFileSync(join(outputDir, 'no-rest-ui.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: result.passed, checks: result.checks.length, attempts: result.attempts.length, errors: result.errors }));
if (!result.passed) process.exitCode = 1;
