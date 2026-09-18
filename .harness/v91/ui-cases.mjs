// Real packaged renderer/preload/IPC. Only fixture accounts and native boundaries
// are isolated; clock, battle rules, game functions and renderer code stay intact.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const sleep = ms => new Promise(done => setTimeout(done, ms));
const same = isDeepStrictEqual;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const statusFits = ({ status }) => status.top >= status.viewportHeight * 28 / 260 &&
  status.bottom <= status.viewportHeight * 48 / 260 && status.whiteSpace === 'nowrap' && status.textOverflow === 'ellipsis';
const common = ['production-field-and-wallets', 'server-defense-and-viewer-perspective',
  'notification-independent-five-second-delivery', 'hunting-and-input-frozen',
  'single-durable-gold-settlement', 'server-event-acked-after-durable-delivery'];
export const EXPECTED_CHECKS = {
  first: [...common, 'live-hunting-resumes-at-interruption', 'native-input-resumes', 'completed-replay-removed'],
  interrupt: [...common, 'replay-persisted-before-quit'],
  restart: ['pending-replay-restored-at-startup', 'restart-gold-not-reapplied',
    'hunting-and-input-frozen', 'live-hunting-resumes-at-interruption', 'native-input-resumes', 'completed-replay-removed'],
  attack: ['native-opponent-button-starts-gold-battle', 'attack-replay-locks-menu-buttons',
    'hunting-and-input-frozen', 'attack-gold-settled-once-and-roster-preserved',
    'live-hunting-resumes-at-interruption', 'native-input-resumes', 'completed-replay-removed'],
};

// One short debugger pause obtains a read-only reference to the real lexical
// Game. A separate rAF observer records transitions without wrapping/replacing
// rAF, timers, game methods, RNG, inputs or IPC. JSON normalizes read-only BigInts.
const observerExpression = `(() => {
  const copy = value => JSON.parse(JSON.stringify(value, (_, v) => typeof v === 'bigint' ? String(v) : v));
  const transitions = [], inputEvents = { keyboard: 0, mouse: 0 };
  const snapshot = () => {
    const label=document.querySelector('#field-pvp-status'),rect=label.getBoundingClientRect(),style=getComputedStyle(label);
    return copy({save:game.toSave(), state:game.getState(), replaying:game.isReplaying(), paused, generation,
      status:{hidden:label.hidden,text:label.textContent,top:rect.top,bottom:rect.bottom,viewportHeight:innerHeight,
        whiteSpace:style.whiteSpace,textOverflow:style.textOverflow}});
  };
  window.addEventListener('keydown', () => inputEvents.keyboard++, {capture:true});
  window.addEventListener('mousedown', () => inputEvents.mouse++, {capture:true});
  let previous = null;
  const observe = () => {
    const current = game.isReplaying();
    if (current !== previous) { transitions.push({...snapshot(),at:performance.now(),wallAt:Date.now()}); previous = current; }
    requestAnimationFrame(observe);
  };
  globalThis.__v091Read = () => ({...snapshot(),transitions:copy(transitions),inputEvents:{...inputEvents}});
  observe();
  return {installed:true,replaying:game.isReplaying()};
})()`;

async function installObserver(main) {
  return main(`(async()=>{
    const d=p.field.webContents.debugger;
    const sourcePath=p.e.app.getAppPath()+'/dist/web/renderer/index.js';
    const lines=p.fs.readFileSync(sourcePath,'utf8').split(String.fromCharCode(10));
    const lineNumber=lines.findIndex(line=>line.trim()==='game.draw(ctx);');
    if(lineNumber<0)throw Error('Production frame call not found');
    d.attach('1.3'); await d.sendCommand('Debugger.enable');
    return new Promise((resolve,reject)=>{
      let breakpointId;
      const timer=setTimeout(()=>{d.removeListener('message',listener);d.detach();reject(Error('Observer breakpoint timeout'));},10000);
      const listener=async(_event,method,params)=>{
        if(method!=='Debugger.paused')return;
        try {
          const observed=await d.sendCommand('Debugger.evaluateOnCallFrame',{
            callFrameId:params.callFrames[0].callFrameId,expression:${JSON.stringify(observerExpression)},returnByValue:true});
          if(observed.exceptionDetails)throw Error(JSON.stringify(observed.exceptionDetails));
          await d.sendCommand('Debugger.removeBreakpoint',{breakpointId});
          await d.sendCommand('Debugger.resume');clearTimeout(timer);d.removeListener('message',listener);d.detach();
          resolve({sourcePath,lineNumber,...observed.result.value});
        }catch(error){clearTimeout(timer);d.removeListener('message',listener);d.detach();reject(error);}
      };
      d.on('message',listener);
      d.sendCommand('Debugger.setBreakpointByUrl',{urlRegex:'/dist/web/renderer/index[.]js$',lineNumber})
        .then(answer=>{breakpointId=answer.breakpointId;},error=>{clearTimeout(timer);d.removeListener('message',listener);d.detach();reject(error);});
    });
  })()`);
}

export async function runUiCases({ evaluate, outputDir, userData, phase, interrupted }) {
  const result = { version: 91, phase, startedAt: new Date().toISOString(), checks: [], screenshots: [], errors: [], interrupted: null,
    scope: 'Synthetic level/party fixture; actual packaged UI and production in-process server. Native events, real clock. Read-only Game observer; no game/clock/RNG override. Restart restores only persisted field state, not transient pools.' };
  const main = expression => evaluate(`(()=>{const p=__v091Runtime;return (${expression});})()`);
  const field = expression => main(`p.field.webContents.executeJavaScript(${JSON.stringify(expression)})`);
  const read = () => field('globalThis.__v091Read()');
  const check = (name, passed, details = {}) => {
    result.checks.push({ name, passed: Boolean(passed), details });
    if (!passed) throw Error('Check failed: ' + name);
  };
  const until = async (fn, label, timeout = 20000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) { const value = await fn(); if (value) return value; await sleep(40); }
    throw Error('Timeout: ' + label);
  };
  const disk = name => JSON.parse(readFileSync(join(userData, name + '.json'), 'utf8'));
  const capture = async (name, target = 'field') => {
    const bytes = Buffer.from(await main(`(async()=>(await p.${target}.webContents.capturePage()).toPNG().toString('base64'))()`), 'base64');
    const path = join(outputDir, name + '.png'); writeFileSync(path, bytes);
    result.screenshots.push({ name, path, sha256: hash(bytes) });
  };
  const input = async () => main(`(()=>{
    p.field.focus();
    p.field.webContents.sendInputEvent({type:'keyDown',keyCode:'A'});
    p.field.webContents.sendInputEvent({type:'keyUp',keyCode:'A'});
    p.field.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x:170,y:190});
    p.field.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:170,y:190});return true;
  })()`);
  const frozen = async start => {
    const beforeInputs = start.inputEvents;
    await input(); await sleep(900);
    const after = await read();
    check('hunting-and-input-frozen', start.replaying && after.replaying && !start.paused && !after.paused &&
      same(start.save, after.save) && same(start.state, after.state) &&
      after.inputEvents.keyboard > beforeInputs.keyboard && after.inputEvents.mouse > beforeInputs.mouse,
    { start, after, observedNativeInput: true, compared: 'entire SaveFile and GameState, including HP, index, playTime and fever' });
    await capture('defense-replay');
    return after;
  };
  const finish = async start => {
    await until(async () => {
      const value = await read(); return !value.replaying && value.transitions.some(t => t.replaying) ? value : null;
    }, 'real replay completion', 16000);
    const resumed = await until(async () => {
      const value = await read(); return value.save.progress.playTimeMs >= start.save.progress.playTimeMs + 150 ? value : null;
    }, 'hunting clock resumes');
    const transition = resumed.transitions.find((t, i) => !t.replaying && i > 0 && resumed.transitions[i - 1].replaying);
    check('live-hunting-resumes-at-interruption', Boolean(transition) && same(transition.save, start.save) && same(transition.state, start.state) &&
      transition.status.hidden && transition.status.text === '' && !resumed.paused && !resumed.replaying &&
      resumed.save.monsterIndex === start.save.monsterIndex && resumed.save.coins === start.save.coins,
    { start, transition, resumed });
    const before = await read(); await input(); await sleep(100);
    const after = await read();
    check('native-input-resumes', !after.replaying && BigInt(after.save.monsterHp) < BigInt(before.save.monsterHp) &&
      after.inputEvents.keyboard > before.inputEvents.keyboard && after.inputEvents.mouse > before.inputEvents.mouse &&
      after.save.monsterIndex === before.save.monsterIndex && after.save.coins === before.save.coins, { before, after });
    await until(async () => (await field('window.desmon.getPendingReplays()')).length === 0, 'real completion ACK');
    const recovery = disk('recovery');
    check('completed-replay-removed', recovery.replays.length === 0 && (phase === 'attack' || recovery.defenseCursor === 1) &&
      (await read()).save.coins === start.save.coins, { recovery });
    await capture('hunting-resumed');
  };
  try {
    result.observer = await installObserver(main);
    if (phase === 'attack') {
      const menu = expression => main(`p.menu.webContents.executeJavaScript(${JSON.stringify(expression)})`);
      const click = async selector => {
        const point = await menu(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});
          if(!el||el.disabled)throw Error('Missing/disabled control');el.scrollIntoView({block:'center'});
          const r=el.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`);
        await main(`(()=>{for(const type of ['mouseDown','mouseUp'])p.menu.webContents.sendInputEvent({type,button:'left',clickCount:1,...${JSON.stringify(point)}});return true;})()`);
      };
      await main(`(()=>{p.menu=p.require(p.e.app.getAppPath()+'/dist/electron/main/menuWindow.js').showMenuWindow();return true;})()`);
      await until(() => main('!p.menu.webContents.isLoading()'), 'production menu load');
      await until(() => menu(`document.querySelector('#game-content')?.hidden===false`), 'menu ready');
      await click('#tab-battle');
      await until(() => menu(`Boolean(document.querySelector('[data-player-id="fixture-foe"] button'))`), 'opponent directory');
      const before = await read();
      const requestCount = await main('p.requests.length');
      await click('[data-player-id="fixture-foe"] button');
      const start = await until(async () => { const value = await read(); return value.replaying && value.transitions.some(t => t.replaying) ? value : null; }, 'attack replay starts');
      const requests = await main(`p.requests.slice(${requestCount})`);
      const matches = requests.filter(r => r.path === '/v1/pvp/match'), battles = requests.filter(r => r.path === '/v1/pvp');
      const presentation = (await field('window.desmon.getPendingReplays()'))[0];
      check('native-opponent-button-starts-gold-battle', matches.length === 1 && battles.length === 1 && battles[0].status === 200 &&
        matches[0].body.opponentId === 'fixture-foe' && matches[0].body.mode === 'gold-v1' && battles[0].body.mode === 'gold-v1' &&
        battles[0].body.matchId === matches[0].result.matchId && presentation.role === 'attack' &&
        presentation.goldDelta === battles[0].result.gold.delta && battles[0].result.gold.amount === 50 &&
        start.status.text === 'PvP · 상대 FixtureFoe와 전투 중' && !start.status.hidden && statusFits(start), { requests, presentation, start });
      const controls = await until(() => menu(`(()=>{const b=document.querySelector('[data-player-id="fixture-foe"] button');
        return b?.textContent==='전투 재생 중…'?{text:b.textContent,disabled:b.disabled,aria:b.getAttribute('aria-disabled'),
          feedback:document.querySelector('[data-player-id="fixture-foe"] .battle-status')?.textContent}:null;})()`), 'playback button feedback');
      check('attack-replay-locks-menu-buttons', controls.disabled || controls.aria === 'true', controls);
      await capture('attack-menu', 'menu');
      await frozen(start);
      const row = await main(`p.store.getById('fixture-me')`), saved = disk('save');
      check('attack-gold-settled-once-and-roster-preserved', saved.coins === 1000 + presentation.goldDelta &&
        saved.coins === row.goldAccount.balance && saved.pvpGoldNet === String(presentation.goldDelta) &&
        same(saved.companions, before.save.companions) && same(row.snapshot.companions, before.save.companions) &&
        same(disk('recovery').replays, [presentation]), { saved, row });
      await finish(start);
    } else if (phase === 'restart') {
      const start = await until(async () => { const value = await read(); return value.replaying && value.transitions.some(t => t.replaying) ? value : null; }, 'pending replay starts');
      const pending = await field('window.desmon.getPendingReplays()');
      check('pending-replay-restored-at-startup', pending.length === 1 && same(pending[0], interrupted.presentation) &&
        start.status.text === 'PvP 발생 · 상대 FixtureFoe와 전투 중' && !start.status.hidden && statusFits(start),
      { pending, start });
      const saved = disk('save'), row = await main(`p.store.getById('fixture-me')`);
      check('restart-gold-not-reapplied', same(saved, interrupted.save) && same(start.save, interrupted.save) &&
        row.goldAccount.balance === interrupted.save.coins && row.goldAccount.net === interrupted.save.pvpGoldNet &&
        same(start.save.companions, interrupted.save.companions), { saved, row, start });
      await frozen(start); await finish(start);
    } else {
      await until(() => main(`p.requests.some(r=>r.path==='/v1/snapshot'&&r.status===200)`), 'startup wallet sync');
      const before = await until(async () => { const value = await read(); return !value.paused && !value.replaying ? value : null; }, 'hunting ready');
      const initial = await main(`(async()=>({rows:await Promise.all(['fixture-me','fixture-foe'].map(id=>p.store.getById(id))),
        notificationSupported:p.e.Notification.isSupported(),url:p.field.webContents.getURL()}))()`);
      check('production-field-and-wallets', initial.url.endsWith('/static/index.html') && initial.notificationSupported === false &&
        initial.rows.every(row => row.goldAccount.enrolled && row.goldAccount.balance === 1000) && before.save.coins === 1000,
      { initial, before });
      await capture('hunting-before');
      const battle = await main(`(async()=>{
        const send=async(path,body)=>{const r=await p.handle.handle({method:'POST',path,query:{},auth:'fixture-foe-token',body,ip:'isolated-fixture'});
          p.fixtureRequests.push({method:'POST',path,body,result:r});return r;};
        const match=await send('/v1/pvp/match',{opponentId:'fixture-me',mode:'gold-v1'});
        if(match.status!==200)throw Error('Foe match failed: '+JSON.stringify(match));
        const startedAt=Date.now();
        const battle=await send('/v1/pvp',{matchId:match.body.matchId,party:['c1','c2','c3','c4','c5'],mode:'gold-v1'});
        const row=await p.store.getById('fixture-me');
        return {match,battle,startedAt,event:row.goldAccount.events[0]};
      })()`);
      const response = battle.battle.body, presentation = battle.event?.presentation;
      check('server-defense-and-viewer-perspective', battle.battle.status === 200 && response.gold.amount === 50 &&
        response.stolen === null && response.lost === null && presentation.role === 'defense' &&
        presentation.goldDelta === -response.gold.delta && presentation.won === !response.win &&
        same(presentation.ownParty, battle.match.body.opponent.party) &&
        same(presentation.replay.blows, response.blows.map(b => ({ ...b, side: b.side === 'A' ? 'D' : 'A' }))) &&
        presentation.replay.blows.length >= 10, battle);
      const start = await until(async () => { const value = await read(); return value.replaying && value.transitions.some(t => t.replaying) ? value : null; }, 'five-second defense poll', 6500);
      const deliveryMs = start.transitions.find(t => t.replaying).wallAt - battle.startedAt;
      check('notification-independent-five-second-delivery', deliveryMs <= 6000 && !start.status.hidden && statusFits(start) &&
        start.status.text === 'PvP 발생 · 상대 FixtureFoe와 전투 중' && !start.paused &&
        await main(`p.e.Notification.isSupported()===false&&p.requests.some(r=>r.path==='/v1/pvp/events'&&r.status===200&&r.result.events.length===1)`),
      { deliveryMs, nominalPollMs: 5000, schedulingAllowanceMs: 1000, start });
      const after = await frozen(start);
      const saved = disk('save'), recovery = disk('recovery');
      const server = await main(`p.store.getById('fixture-me')`);
      check('single-durable-gold-settlement', start.save.coins === 1000 + presentation.goldDelta &&
        start.save.pvpGoldNet === String(presentation.goldDelta) && start.save.pvpGoldDebt === '0' &&
        same(saved, start.save) && same(saved.companions, before.save.companions) &&
        same(recovery.replays, [presentation]) && server.goldAccount.balance === saved.coins &&
        same(server.snapshot.companions, before.save.companions), { saved, recovery, server });
      const ack = await until(() => main(`p.requests.find(r=>r.path==='/v1/pvp/events/ack'&&r.status===200)`), 'durable event ACK');
      const acknowledged = await main(`p.store.getById('fixture-me')`);
      check('server-event-acked-after-durable-delivery', ack.body.through === 1 && acknowledged.goldAccount.events.length === 0 &&
        recovery.defenseCursor === 1 && recovery.replays.length === 1, { ack, recovery });
      if (phase === 'first') await finish(start);
      else {
        const pending = await field('window.desmon.getPendingReplays()');
        check('replay-persisted-before-quit', after.replaying && pending.length === 1 && same(pending[0], presentation) &&
          same(disk('save'), start.save) && same(disk('recovery').replays, pending), { pending, after });
        result.interrupted = { presentation, save: saved };
        await capture('quit-during-replay');
      }
    }
  } catch (error) { result.errors.push(String(error)); }
  result.finishedAt = new Date().toISOString();
  result.passed = result.errors.length === 0 && same(result.checks.map(c => c.name), EXPECTED_CHECKS[phase]) && result.checks.every(c => c.passed);
  writeFileSync(join(outputDir, 'ui.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}
