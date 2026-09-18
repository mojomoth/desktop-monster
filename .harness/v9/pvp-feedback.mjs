#!/usr/bin/env node
// Real packaged menu/IPC with an owned two-player server fixture; no production PvP.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { launchRuntime } from './runtime.mjs';

const [appPath, directory] = process.argv.slice(2);
if (!appPath || !directory) throw Error('Usage: pvp-feedback.mjs APP OUTPUT');
const output = resolve(directory);
mkdirSync(output, { recursive: true });
const core = createRequire(import.meta.url)(resolve('dist/electron/core/index.js'));
const save = core.parseSave({ ...core.DEFAULT_SAVE, hero: core.newHeroProgress(),
  companions: [{ id: 'c1', speciesId: 'dragon', bossIndex: 63, level: 100, stars: 3 }], nextCompanionId: 2, pvpParty: ['c1'] });
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const sources = ['src/menu/index.ts', 'static/menu.css', 'tests/menuV9.test.ts', '.harness/v9/pvp-feedback.mjs'];
const report = { startedAt: new Date().toISOString(), sources: Object.fromEntries(sources.map(p => [p, hash(p)])), checks: [], errors: [] };
const rt = await launchRuntime({ appPath, outputDir: join(output, 'runtime'), save,
  settings: { gameScale: 1, muted: true, screenShake: true, welcomeSeen: true, globalInputRequested: false },
  identity: { name: 'FixtureMe', playerId: 'fixture-me', token: 'fixture-me-token', notifiedTheftIds: [] } });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const main = expression => rt.evaluate(`(()=>{const p=__v09Runtime;return (${expression});})()`);
const menu = (fn, ...args) => main(`p.menu.webContents.executeJavaScript(${JSON.stringify(`(${fn})(...${JSON.stringify(args)})`)})`);
const check = (name, passed, details) => report.checks.push({ name, passed: Boolean(passed), details });
const until = async (fn, label) => {
  for (let i = 0; i < 200; i++) { const value = await fn(); if (value) return value; await pause(50); }
  throw Error('Timeout: ' + label);
};
const click = async (selector, block = 'center') => {
  const point = await menu((selector, block) => {
    const el = document.querySelector(selector);
    if (!el || el.disabled) throw Error('Missing or disabled: ' + selector);
    el.scrollIntoView({ block });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, selector, block);
  await main(`(()=>{for(const type of ['mouseDown','mouseUp'])p.menu.webContents.sendInputEvent({type,button:'left',clickCount:1,...${JSON.stringify(point)}});return true;})()`);
  await pause(50);
};
const status = () => menu(() => {
  const row = document.querySelector('[data-player-id="fixture-foe"]');
  const inline = row?.querySelector('.battle-status'), result = document.querySelector('#result');
  const buttonRect = row?.querySelector('button')?.getBoundingClientRect();
  const inlineRect = inline?.getBoundingClientRect();
  const visible = el => { if (!el || !el.textContent || el.hidden) return false; const r = el.getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= innerHeight; };
  return { inline: inline?.textContent, visible: visible(inline), role: inline?.getAttribute('role'),
    footer: result.textContent, footerVisible: visible(result), button: row?.querySelector('button')?.textContent,
    buttonFocused: document.activeElement === row?.querySelector('button'),
    inlineBounds: inlineRect ? { top: inlineRect.top, bottom: inlineRect.bottom } : null,
    buttonBounds: buttonRect ? { top: buttonRect.top, bottom: buttonRect.bottom } : null };
});
const capture = async name => {
  const data = await main(`(async()=> (await p.menu.webContents.capturePage()).toPNG().toString('base64'))()`);
  writeFileSync(join(output, name + '.png'), Buffer.from(data, 'base64'));
};
try {
  await main(`(()=>{p.menu=p.require(p.e.app.getAppPath()+'/dist/electron/main/menuWindow.js').showMenuWindow();return true;})()`);
  await until(() => main('!p.menu.webContents.isLoading()'), 'menu load');
  await until(() => menu(() => document.querySelector('#game-content')?.hidden === false), 'ready');
  // Five display-only directory fixtures surround the real opponent;
  // only fixture-me and fixture-foe have accounts and can participate in combat.
  await main(`(()=>{const handle=p.handle.handle.bind(p.handle);p.handle.handle=async request=>{
    const response=await handle(request);
    if(request.path==='/v1/pvp/opponents'&&response.status===200){const foe=response.body.opponents[0];
      const rows=Array.from({length:5},(_,i)=>({...foe,playerId:'fixture-list-'+i,name:'List'+i,rank:i<2?i+1:i+2}));
      response.body.opponents=[...rows.slice(0,2),{...foe,rank:3},...rows.slice(2)];}
    return response;};return true;})()`);
  await click('#tab-battle');
  await until(() => menu(() => document.querySelector('[data-player-id="fixture-foe"] button')?.getAttribute('aria-disabled') === 'false'), 'directory');
  // Delay then fail the selected match at the isolated HTTP boundary.
  await main(`(()=>{p.originalHandle=p.handle.handle.bind(p.handle);p.handle.handle=async request=>{
    if(request.path==='/v1/pvp/match'){await new Promise(resolve=>{p.finishFailedMatch=resolve;});return {status:503,body:{error:'unavailable'}};}
    return p.originalHandle(request);};return true;})()`);
  await click('[data-player-id="fixture-foe"] button', 'end');
  await until(() => main('Boolean(p.finishFailedMatch)'), 'pending match');
  let state = await status(); check('visible-pending', state.visible && state.role === 'status' && state.inline.includes('준비'), state);
  await capture('pending');
  await main('p.finishFailedMatch()');
  await until(() => menu(() => document.querySelector('[data-player-id="fixture-foe"] button')?.getAttribute('aria-disabled') === 'false'), 'failed match');
  state = await status(); check('visible-failure-at-clicked-card', state.visible && state.inline.includes('연결'), state);
  check('feedback-retains-button-focus', state.buttonFocused);
  check('failed-match-never-fights', await main(`p.requests.filter(r=>r.path==='/v1/pvp').length`) === 0);
  await capture('failure');
  // A normal retry must execute and persist exactly one battle through main.
  await main('p.handle.handle=p.originalHandle');
  await click('[data-player-id="fixture-foe"] button');
  const last = await until(() => menu(async () => await window.desmon.getLastBattle()), 'durable result');
  await until(() => menu(() => document.querySelector('[data-player-id="fixture-foe"] button')?.textContent.includes('초')), 'cooldown');
  state = await status(); check('visible-verdict', state.visible && /승리|패배/.test(state.inline), state);
  check('exactly-one-committed-battle', last.result.opponent.playerId === 'fixture-foe' && await main(`p.requests.filter(r=>r.path==='/v1/pvp'&&r.status===200).length`) === 1, { opponent: last.result.opponent.playerId });
  await capture('success');
  await click('[data-player-id="fixture-foe"] button');
  check('repeat-click-keeps-one-battle', await main(`p.requests.filter(r=>r.path==='/v1/pvp').length`) === 1);
  // Refreshing an existing directory must explain why its buttons are blocked.
  await main(`(()=>{p.handle.handle=async request=>{if(request.path==='/v1/pvp/opponents')await new Promise(resolve=>{p.finishDirectory=resolve;});return p.originalHandle(request);};return true;})()`);
  await click('#find'); await until(() => main('Boolean(p.finishDirectory)'), 'pending directory');
  state = await status(); check('refresh-explains-blocked-button', state.button.includes('목록'), state);
  await capture('refresh'); await main('p.finishDirectory()');
} catch (error) { report.errors.push(String(error)); }
finally {
  report.runtime = await rt.close(); report.finishedAt = new Date().toISOString();
  report.sourceUnchanged = sources.every(p => report.sources[p] === hash(p));
  report.passed = report.errors.length === 0 && report.runtime.passed && report.sourceUnchanged && report.checks.every(c => c.passed);
  writeFileSync(join(output, 'pvp-feedback.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, passed: report.passed, checks: report.checks, errors: report.errors }, null, 2));
  if (!report.passed) process.exitCode = 1;
}
