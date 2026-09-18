// Fixture diagnostics only. The caller owns the isolated, offline, no-hook launcher.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const { nativeKeyEvents } = require('../v7/loop/journey.cjs');
const sleep = ms => new Promise(done => setTimeout(done, ms));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const CHOICE_SELECTOR = '.hero-choices [data-hero-choice]';
export const UI_FIXTURES = Object.freeze({
  choices: { level: 17, coins: 1800, heroIds: ['h01', 'h02', 'h03'], offerSerial: 101 },
  longValues: { level: 23, coins: Number.MAX_SAFE_INTEGER, reincarnations: 10, stacks: 999999, offerSerial: 102 },
  rosterAndCodex: { monsterIndex: 200, rosterSize: 30, discoveredHeroes: ['h01', 'h02', 'h03', 'h04'], discoveredMonsters: ['slime', 'dragon'] },
});

/** evaluate executes awaited JavaScript in the already-started Electron main process. */
export async function runUiCases({ evaluate, outputDir, userData, context = '__v08Perf', report: runtimeReport }) {
  outputDir = resolve(outputDir); userData = resolve(userData);
  mkdirSync(outputDir, { recursive: true });
  const checks = [], screenshots = [], errors = [];
  const startedAt = new Date().toISOString();
  const main = expression => evaluate(`(() => { const p = globalThis[${JSON.stringify(context)}]; return (${expression}); })()`);
  const renderer = (fn, ...args) => main(`p.menu.webContents.executeJavaScript(${JSON.stringify(`(${fn.toString()})(...${JSON.stringify(args)})`)})`);
  const field = (fn, ...args) => main(`p.field.webContents.executeJavaScript(${JSON.stringify(`(${fn.toString()})(...${JSON.stringify(args)})`)})`);
  const check = (name, passed, details = {}) => checks.push({ name, passed: Boolean(passed), details });
  const until = async (fn, name, timeout = 15000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) { const value = await fn(); if (value) return value; await sleep(50); }
    throw Error(`Timeout: ${name}`);
  };
  const scenario = async (name, run) => {
    try { await run(); } catch (error) { errors.push({ scenario: name, message: String(error) }); check(name, false, { error: String(error) }); }
  };
  const snapshot = () => main(`JSON.parse(p.fs.readFileSync(${JSON.stringify(join(userData, 'save.json'))}, 'utf8'))`);
  const capture = async name => {
    const base64 = await main(`(async () => (await p.menu.webContents.capturePage()).toPNG().toString('base64'))()`);
    const path = join(outputDir, name + '.png'); writeFileSync(path, Buffer.from(base64, 'base64'));
    screenshots.push({ name, path, sha256: hash(readFileSync(path)) });
  };
  const openMenu = async () => {
    await main(`(() => { p.menu = p.require(p.e.app.getAppPath() + '/dist/electron/main/menuWindow.js').showMenuWindow(); return true; })()`);
    await until(() => main(`!p.menu.webContents.isLoading()`), 'menu load');
    await until(() => renderer(() => document.querySelector('#game-content')?.hidden === false &&
      document.querySelector('.hero-summary') !== null), 'menu state');
    await renderer(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
  };
  const closeMenu = async () => main(`(() => { if (p.menu && !p.menu.isDestroyed()) p.menu.close(); p.menu = null; return true; })()`);
  const click = async selector => {
    const point = await renderer(selector => {
      const button = document.querySelector(selector);
      if (!button || button.disabled) throw Error('Missing or disabled control: ' + selector);
      button.scrollIntoView({ block: 'center' });
      const rect = button.getBoundingClientRect();
      return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
    }, selector);
    await main(`(() => { p.menu.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...${JSON.stringify(point)} });
      p.menu.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...${JSON.stringify(point)} }); return true; })()`);
    await sleep(80);
  };
  const key = async (code, modifiers = []) => main(`(() => {
    for (const event of ${JSON.stringify(nativeKeyEvents(code, modifiers))}) p.menu.webContents.sendInputEvent(event); return true;
  })()`);
  const install = async name => {
    await closeMenu();
    const fixture = await main(`(() => {
      const core = p.require(p.e.app.getAppPath() + '/dist/electron/core/index.js');
      const specifications = ${JSON.stringify(UI_FIXTURES)};
      const spec = specifications[${JSON.stringify(name)}];
      let hero = { ...core.newHeroProgress() };
      let progress = core.newProgress();
      const value = { ...core.DEFAULT_SAVE, level: spec.level || 1, coins: spec.coins || 0,
        monsterIndex: spec.monsterIndex || 0, hero, progress };
      if (${JSON.stringify(name)} === 'choices') hero = { ...hero, offerSerial: spec.offerSerial,
        offerLevel: spec.level, choices: spec.heroIds.map((formId, i) => ({ formId, buffPercent: 10 + i * 5 })) };
      if (${JSON.stringify(name)} === 'longValues') {
        const types = new Set();
        const forms = [...core.HERO_FORMS].filter(form => form.rarity !== 'rare')
          .sort((a,b) => b.name.length-a.name.length || a.id.localeCompare(b.id))
          .filter(form => { if (types.has(form.type)) return false; types.add(form.type); return true; }).slice(0,3);
        const collection = forms.map(form => ({ formId: form.id, buffPercent: 25, stacks: spec.stacks }));
        hero = { ...hero, reincarnations: spec.reincarnations, equipped: collection[0], collection,
          choices: forms.map(form => ({ formId: form.id, buffPercent: 10 })), offerLevel: spec.level, offerSerial: spec.offerSerial };
        progress.heroCounts = Object.fromEntries(forms.map(form => [form.id, 1]));
      }
      if (${JSON.stringify(name)} === 'rosterAndCodex') {
        value.companions = Array.from({ length: spec.rosterSize }, (_,i) => ({ id: 'c'+(i+1), speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 }));
        value.nextCompanionId = 31; value.releasedCount = 4;
        progress.heroCounts = Object.fromEntries(spec.discoveredHeroes.map(id => [id, 1]));
        progress.speciesKills = Object.fromEntries(spec.discoveredMonsters.map(id => [id, 1]));
        value.monsterHp = '10000000000000000000000000000000000';
      }
      return core.parseSave({ ...value, hero, progress });
    })()`);
    // Write through the actual IPC so main's validated last-save cache agrees with disk.
    const saved = await field(async value => await window.desmon.saveState(value), fixture);
    if (!saved) throw Error('Fixture save failed');
    await main(`(() => { p.uiFieldReady = false; p.e.ipcMain.once('desmon:first-frame', () => { p.uiFieldReady = true; }); p.field.reload(); return true; })()`);
    await until(() => main(`p.uiFieldReady && !p.field.webContents.isLoading()`), 'fixture field first frame');
    await openMenu();
    return fixture;
  };

  await scenario('three-choice-layout-and-keyboard', async () => {
    const fixture = await install('choices');
    const layout = await renderer(selector => ({ width: innerWidth, height: innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth,
      reset: document.querySelector('.hero-reset')?.textContent,
      keeps: document.querySelector('.hero-keeps')?.textContent,
      buttons: [...document.querySelectorAll(selector)].map(button => {
        const r = button.getBoundingClientRect(); return { id: button.dataset.heroChoice, disabled: button.disabled,
          left:r.left, right:r.right, top:r.top, bottom:r.bottom,
          visible: getComputedStyle(button).visibility !== 'hidden' && r.width > 0 && r.height > 0 };
      }) }), CHOICE_SELECTOR);
    check('420x640-three-choice-viewport', layout.width === 420 && layout.height === 640 && !layout.overflow &&
      layout.buttons.length === 3 && layout.buttons.every(b => b.visible && !b.disabled && b.top >= 0 && b.left >= 0 && b.bottom <= layout.height && b.right <= layout.width), layout);
    await capture('hero-three-choices');
    await renderer(selector => { document.querySelector(selector).focus(); }, CHOICE_SELECTOR);
    await key('Tab'); await sleep(80);
    const second = await renderer(() => document.activeElement?.getAttribute('data-hero-choice'));
    await key('Tab', ['shift']); await sleep(80);
    const first = await renderer(() => document.activeElement?.getAttribute('data-hero-choice'));
    check('choice-tab-and-shift-tab', first === fixture.hero.choices[0].formId && second === fixture.hero.choices[1].formId, { first, second });
    await key('Enter');
    const chosen = await until(async () => { const save = await snapshot(); return save.hero.reincarnations === 1 ? save : null; }, 'native Enter chooses hero');
    check('native-enter-serial-bound-choice', chosen.hero.equipped.formId === first && chosen.level === 1 && chosen.coins === fixture.coins && chosen.hero.collection.some(h => h.formId === first),
      { before: fixture.hero, after: chosen.hero, level: chosen.level, coins: chosen.coins });
    await capture('hero-after-keyboard-choice');
  });

  await scenario('long-values-and-detail-retention', async () => {
    const fixture = await install('longValues');
    const layout = await renderer(() => ({ width:innerWidth, scrollWidth:document.documentElement.scrollWidth,
      cards:[...document.querySelectorAll('.hero-choice')].map(card => ({ name:card.querySelector('.name')?.textContent,
        effect:card.querySelector('.hero-buff')?.textContent, clipped:card.scrollWidth > card.clientWidth,
        overflow:getComputedStyle(card).overflow, buttonName:card.querySelector('button')?.getAttribute('aria-label') })) }));
    check('long-content-wraps-without-horizontal-clipping', layout.scrollWidth <= layout.width && layout.cards.length === 3 &&
      layout.cards.every(card => !card.clipped && card.overflow !== 'hidden' && card.effect.includes('현재') && card.effect.includes('수락 후') && card.buttonName.includes(card.name)), layout);
    await capture('hero-long-values');
    await click('.hero-rules summary');
    const before = await renderer(() => {
      globalThis.__v08RulesNode = document.querySelector('.hero-rules');
      document.querySelector('.hero-rules summary').focus();
      return globalThis.__v08RulesNode.open;
    });
    await renderer(async offerSerial => { await window.desmon.sendAction({ type:'heroReroll', offerSerial }); }, fixture.hero.offerSerial);
    const rerolled = await until(async () => { const save = await snapshot(); return save.hero.offerSerial > fixture.hero.offerSerial ? save : null; }, 'actual reroll rebuild');
    const after = await renderer(() => ({ open:document.querySelector('.hero-rules').open,
      replaced:document.querySelector('.hero-rules') !== globalThis.__v08RulesNode,
      focus:document.activeElement?.getAttribute('data-hero-action') }));
    check('hero-details-and-focus-survive-real-controls-rebuild', before && after.open && after.replaced && after.focus === 'heroRules', { before, after });
    await renderer(selector => { const buttons = [...document.querySelectorAll(selector)]; buttons.at(-1).scrollIntoView({ block:'center' }); buttons.at(-1).focus(); }, CHOICE_SELECTOR);
    await key('Space');
    const chosen = await until(async () => { const save = await snapshot(); return save.hero.reincarnations === fixture.hero.reincarnations + 1 ? save : null; }, 'native Space chooses third hero');
    check('native-space-selects-scrolled-third-choice', chosen.hero.equipped.formId === rerolled.hero.choices[2].formId, { formId:chosen.hero.equipped.formId });
  });

  await scenario('full-roster-and-sequential-discoveries', async () => {
    await install('rosterAndCodex');
    const shortcut = await renderer(() => document.querySelector('.roster-shortcut')?.textContent);
    check('full-roster-visible-from-hero', shortcut?.includes('30/30') && shortcut.includes('동료 관리'), { shortcut });
    await click('.roster-shortcut button');
    const roster = await renderer(() => ({ visible:!document.querySelector('#roster').hidden,
      count:document.querySelectorAll('#roster > .card').length, text:document.querySelector('#roster')?.textContent }));
    check('existing-full-roster-rule-is-visible', roster.visible && roster.count === 30 && roster.text.includes('2마리마다 영혼 1개'), roster);
    await capture('full-roster'); await click('#tab-codex');
    const initial = await renderer(() => ({ cards:document.querySelectorAll('.discovery-preview').length,
      count:document.querySelector('.discovery-count')?.textContent,
      gridColumns:getComputedStyle(document.querySelector('.hero-gallery')).gridTemplateColumns }));
    check('codex-two-columns-and-three-previews', initial.cards === 3 && initial.gridColumns.split(' ').length === 2, initial);
    await capture('codex-unread-first'); await click('.discovery-ack');
    const firstAck = await until(async () => { const save = await snapshot(); return save.progress.codex.acknowledgedHeroes.length === 3 ? save : null; }, 'first three acknowledgement');
    check('acknowledgement-does-not-clear-unshown-monsters', firstAck.progress.codex.acknowledgedMonsters.length === 0, firstAck.progress.codex);
    await capture('codex-unread-remaining'); await click('.discovery-ack');
    const finalAck = await until(async () => { const save = await snapshot(); return save.progress.codex.acknowledgedHeroes.length === 4 && save.progress.codex.acknowledgedMonsters.length === 2 ? save : null; }, 'remaining acknowledgement');
    const emptyHidden = await renderer(() => document.querySelector('.discovery-summary').hidden);
    check('empty-discovery-box-disappears-after-explicit-ack', emptyHidden, finalAck.progress.codex);
    await capture('codex-all-confirmed');
  });

  await scenario('live-presentation-settings', async () => {
    await install('choices'); await click('#tab-profile');
    await click('#user-settings summary');
    await field(() => { globalThis.__v08UiSettings = []; window.desmon.onSettingsChanged(next => { globalThis.__v08UiSettings.push(next); }); });
    const before = await renderer(async () => await window.desmon.getSettings());
    await click('#mute-toggle'); await click('#shake-toggle');
    const next = await renderer(async () => await window.desmon.getSettings());
    const propagation = await field(() => globalThis.__v08UiSettings);
    const muted = await main('p.field.webContents.isAudioMuted()');
    check('settings-apply-to-live-field-without-reload', next.muted !== before.muted && next.screenShake !== before.screenShake &&
      muted === next.muted && propagation.some(s => s.screenShake === next.screenShake && s.muted === next.muted),
      { before, next, actualWebContentsMuted:muted, fieldEvents:propagation });
    await capture('presentation-settings');
    await renderer(async prior => await window.desmon.updateSettings({ muted:prior.muted, screenShake:prior.screenShake }), before);
  });

  await scenario('save-error-survives-closed-menu', async () => {
    const fixture = await install('choices'); await closeMenu();
    try {
      await main(`(() => { p.uiRename = p.fs.renameSync; p.fs.renameSync = function(from,to) {
        if (String(to) === ${JSON.stringify(join(userData, 'save.json'))}) throw Object.assign(Error('v08 isolated save failure'), {code:'EACCES'});
        return p.uiRename.apply(this, arguments); }; return true; })()`);
      const saved = await field(async value => await window.desmon.saveState(value), fixture);
      const status = await field(async () => await window.desmon.getSaveStatus());
      check('real-save-failure-reaches-main-status', !saved && status.state === 'write-error', { saved, status });
      await openMenu();
      const reopened = await renderer(() => ({ hidden:document.querySelector('#save-status').hidden, text:document.querySelector('#save-status').textContent }));
      check('reopened-menu-restores-write-error', !reopened.hidden && reopened.text.includes('저장하지 못했습니다'), reopened);
      await main(`(() => { p.menu.webContents.send('desmon:state-changed', ${JSON.stringify(fixture)}); return true; })()`);
      const stillVisible = await renderer(() => !document.querySelector('#save-status').hidden);
      check('plain-state-snapshot-cannot-clear-write-error', stillVisible);
      await capture('reopened-save-error');
    } finally {
      await main('(() => { if(p.uiRename){p.fs.renameSync=p.uiRename;delete p.uiRename;} return true; })()');
    }
    const recovered = await field(async value => await window.desmon.saveState(value), fixture);
    await until(() => renderer(() => document.querySelector('#save-status').hidden), 'successful save clears error');
    check('successful-disk-save-clears-error', recovered, await renderer(async () => await window.desmon.getSaveStatus()));
    await capture('save-recovered');
  });

  const report = { version:1, startedAt, finishedAt:new Date().toISOString(), passed:errors.length === 0 && checks.every(check => check.passed),
    appHash:runtimeReport?.appHash, launcherHash:runtimeReport?.launcherHash, casesHash:hash(readFileSync(new URL(import.meta.url))),
    isolation:{ userData, naturalAcquisition:false, input:'native synthetic mouse and keyboard', globalHooks:false, network:'offline launcher required' },
    checks, screenshots, errors,
    limitations:['Fixture diagnostics do not establish human fun or natural collection.', 'Real OS permissions and audible sound remain manual checks.',
      'Screen-shake IPC reaches the live renderer; this check does not measure rendered shake amplitude.', 'Load-error startup needs a separately launched app.'] };
  writeFileSync(join(outputDir, 'ui-report.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
