#!/usr/bin/env node
// Packaged startup/restart diagnostics. Only launcher-owned fixture directories are mutated.
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { launchRuntime } from './runtime.mjs';

const sleep = ms => new Promise(done => setTimeout(done, ms));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const [appPath, destination, v07Samples] = process.argv.slice(2);
const outputDir = resolve(destination);
if (existsSync(outputDir)) throw Error('Use a new attempt directory');
mkdirSync(outputDir, { recursive:true });
const sourceLine = readFileSync(resolve(v07Samples), 'utf8').split('\n')[0];
const legacy = JSON.parse(sourceLine).save;
const report = { version:1, startedAt:new Date().toISOString(), checks:[], runtimes:[], screenshots:[],
  legacyFixture:{ source:resolve(v07Samples), firstSampleSha256:hash(sourceLine), save:legacy },
  limits:['OS permission decision is simulated denied; real grant/hook remains a human check.',
    'Native mute state is checked; physical speakers/headphones are a human check.'] };
const check = (name, passed, detail={}) => {
  report.checks.push({ name, passed:Boolean(passed), detail });
  if (!passed) throw Error(name);
};
async function until(fn, label, timeout=15000) {
  const end=Date.now()+timeout;
  while(Date.now()<end) { const value=await fn(); if(value)return value; await sleep(50); }
  throw Error('Timeout: '+label);
}
const js=(r, expression, window='field') => r.evaluate(`__v08Perf.${window}.webContents.executeJavaScript(${JSON.stringify(expression)})`);
async function menu(r) {
  await r.evaluate(`(() => {const p=__v08Perf;p.menu=p.e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/static/menu.html'))||p.require(p.e.app.getAppPath()+'/dist/electron/main/menuWindow.js').showMenuWindow();})()`);
  await until(()=>r.evaluate('!__v08Perf.menu.webContents.isLoading()'),'menu');
  await sleep(100);
}
async function click(r, selector) {
  const point=await js(r,`(() => {const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.disabled)throw Error('Control unavailable');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()`,'menu');
  await r.evaluate(`(() => {for(const type of ['mouseDown','mouseUp'])__v08Perf.menu.webContents.sendInputEvent({type,button:'left',clickCount:1,...${JSON.stringify(point)}});})()`);
  await sleep(100);
}
async function capture(r,name) {
  const bytes=Buffer.from(await r.evaluate("(async()=> (await __v08Perf.menu.webContents.capturePage()).toPNG().toString('base64'))()"),'base64');
  const path=join(outputDir,name+'.png');writeFileSync(path,bytes);report.screenshots.push({name,path,sha256:hash(bytes)});
}
async function run(name, options, action) {
  let r;
  try { r=await launchRuntime({appPath,outputDir:join(outputDir,name),...options}); await action(r); return r.userData; }
  finally { if(r) { const result=await r.close();report.runtimes.push({name,...result});check(name+'-runtime-isolated',result.passed); } }
}
try {
  const skipped=await run('fresh-skip',{},async r=>{
    await menu(r);
    const initial=await js(r,'window.desmon.getSettings()');
    check('fresh-defaults',JSON.stringify(initial)===JSON.stringify({gameScale:1,muted:false,screenShake:true,welcomeSeen:false,globalInputRequested:false}),initial);
    check('fresh-guide-without-permission-request',await js(r,"!document.querySelector('#welcome').hidden",'menu') &&
      await r.evaluate('__v08Perf.permissionCalls.length===0&&__v08Perf.hookLoads===0'));
    await capture(r,'fresh-guide');await click(r,'#skip-welcome');
    await until(async()=> (await js(r,'window.desmon.getSettings()')).welcomeSeen,'skip persisted');
    check('skip-persists-window-input',(await js(r,'window.desmon.getSettings()')).globalInputRequested===false);
    // Exercise the real field input/blur save before restarting with a valid new-format save.
    const before=await js(r,'window.desmon.loadState()');
    await r.evaluate("__v08Perf.field.webContents.sendInputEvent({type:'keyDown',keyCode:'A'})");
    await sleep(100);
    await js(r,"window.dispatchEvent(new Event('blur'))");
    await until(()=>existsSync(join(r.userData,'save.json')),'fresh progress saved');
    const after=JSON.parse(readFileSync(join(r.userData,'save.json'),'utf8'));
    check('native-window-input-damages-monster',after.killCount>(before?.killCount??0)||BigInt(after.monsterHp)<BigInt(before?.monsterHp??'10'),{before,after});
  });
  await run('skip-restart',{userData:skipped},async r=>{
    const s=await js(r,'window.desmon.getSettings()');
    check('skip-survives-restart-with-save',s.welcomeSeen&&!s.globalInputRequested,s);
    check('restart-does-not-reopen-guide-or-request-permission',await r.evaluate("__v08Perf.permissionCalls.length===0&&__v08Perf.e.BrowserWindow.getAllWindows().length===1"));
  });
  const closed=await run('fresh-close',{},async r=>{
    await menu(r);await r.evaluate('__v08Perf.menu.close()');
    await until(async()=> (await js(r,'window.desmon.getSettings()')).welcomeSeen,'close persisted');
    check('closing-guide-persists-fallback',!(await js(r,'window.desmon.getSettings()')).globalInputRequested);
  });
  await run('close-restart',{userData:closed},async r=>{
    check('closed-guide-stays-closed',await r.evaluate('__v08Perf.e.BrowserWindow.getAllWindows().length===1&&__v08Perf.permissionCalls.length===0'));
    await r.evaluate("__v08Perf.trayTemplate.find(i=>i.label==='설정').submenu.find(i=>i.label==='시작 안내 다시 보기…').click()");
    await menu(r);await until(()=>js(r,"!document.querySelector('#welcome').hidden",'menu'),'tray guide');
    await click(r,'#connect-input');
    const replies=await js(r,'Promise.all(Array.from({length:5},()=>window.desmon.connectGlobalInput()))','menu');
    const calls=await r.evaluate('__v08Perf.permissionCalls');
    check('explicit-repeated-connection-starts-once',calls.filter(c=>c.prompt).length===1&&replies.every(v=>v.ok&&v.mode.mode==='fallback'),{calls,replies});
    const text=await js(r,"document.querySelector('#welcome-status').textContent",'menu');
    check('denied-permission-never-displays-success',text.includes('아직 전체 입력이 연결되지 않았습니다'),{text});
    check('global-request-survives-settings-save',(await js(r,'window.desmon.getSettings()')).globalInputRequested);
    await capture(r,'connection-pending');
  });
  const migrated=await run('v07-upgrade',{save:legacy,settings:{gameScale:1.5}},async r=>{
    const s=await js(r,'window.desmon.getSettings()');
    check('legacy-retains-automatic-connection-and-scale',s.gameScale===1.5&&s.welcomeSeen&&s.globalInputRequested&&
      await r.evaluate('__v08Perf.permissionCalls.filter(c=>c.prompt).length===1'),s);
    const loaded=await js(r,'window.desmon.loadState()');
    check('v07-progress-migrates',loaded.killCount>=legacy.killCount&&loaded.coins===legacy.coins&&
      JSON.stringify(loaded.hero)===JSON.stringify(legacy.hero)&&JSON.stringify(loaded.companions)===JSON.stringify(legacy.companions));
    await r.evaluate("(() => {const settings=__v08Perf.trayTemplate.find(i=>i.label==='설정').submenu;settings.find(i=>i.label==='음소거').click();settings.find(i=>i.label==='화면 흔들림').click();__v08Perf.trayTemplate.find(i=>i.label==='설정').submenu.find(i=>i.label==='1/2×').click();})()");
    const actual=await r.evaluate("({muted:__v08Perf.field.webContents.isAudioMuted(),size:__v08Perf.field.getContentSize()})");
    const persisted=await js(r,'window.desmon.getSettings()');
    check('tray-applies-and-preserves-every-setting',actual.muted&&actual.size[0]===200&&actual.size[1]===130&&persisted.muted&&
      !persisted.screenShake&&persisted.gameScale===.5&&persisted.welcomeSeen&&persisted.globalInputRequested,{actual,persisted});
  });
  await run('settings-restart',{userData:migrated},async r=>{
    const s=await js(r,'window.desmon.getSettings()');
    check('mute-shake-scale-survive-app-restart',s.muted&&!s.screenShake&&s.gameScale===.5&&
      await r.evaluate('__v08Perf.field.webContents.isAudioMuted()'),s);
  });
  let brokenData;
  for(const [name,save] of [['broken-json','{broken'],['unsupported-format','{"version":99}']]) {
    brokenData=await run(name,{save},async r=>{
      await menu(r);const status=await js(r,'window.desmon.getSaveStatus()');
      check(name+'-blocks-game',status.state==='load-error'&&await r.evaluate('!__v08Perf.ready&&__v08Perf.permissionCalls.length===0'));
      check(name+'-recovery-controls',await js(r,"!document.querySelector('#save-recovery').hidden&&document.querySelector('#game-content').hidden&&Boolean(document.querySelector('#open-save-folder')&&document.querySelector('#recovery-quit'))",'menu'));
      await sleep(5500);
      check(name+'-preserves-original',readFileSync(join(r.userData,'save.json'),'utf8')===save);
      check(name+'-refuses-save',!(await js(r,`window.desmon.saveState(${JSON.stringify(legacy)})`))&&readFileSync(join(r.userData,'save.json'),'utf8')===save);
      check(name+'-blocks-online',await js(r,"Promise.all([window.desmon.getLeaderboard(),window.desmon.pvpMatch('synthetic'),window.desmon.thefts()]).then(results=>results.every(r=>!r.ok&&r.error==='offline'))"));
      await capture(r,name);
    });
  }
  await run('restore-restart',{userData:brokenData,save:legacy,settings:{welcomeSeen:true,globalInputRequested:false}},async r=>{
    check('restored-file-runs-after-restart',(await js(r,'window.desmon.getSaveStatus()')).state==='ready'&&await r.evaluate('__v08Perf.ready'));
  });
  // Reuse only our fresh fixture directory to force a settings-write error before progress exists.
  rmSync(join(closed,'save.json'),{force:true});mkdirSync(join(closed,'settings.json.tmp'));
  await run('fresh-settings-write-failure',{userData:closed},async r=>{
    await menu(r);const status=await js(r,'window.desmon.getSaveStatus()');
    check('failed-first-preferences-stop-progress',status.state==='load-error'&&status.reason==='settings-write'&&
      !existsSync(join(r.userData,'save.json'))&&await r.evaluate('!__v08Perf.ready&&__v08Perf.permissionCalls.length===0'),status);
    await capture(r,'settings-recovery');
  });
  rmSync(join(closed,'settings.json.tmp'),{recursive:true});
} catch(error) { report.error=String(error); }
report.finishedAt=new Date().toISOString();
report.passed=!report.error&&report.checks.length>25&&report.checks.every(c=>c.passed);
writeFileSync(join(outputDir,'startup-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({outputDir,passed:report.passed,checks:report.checks.length,error:report.error}));
if(!report.passed)process.exitCode=1;
