#!/usr/bin/env node
// Isolated production Electron startup for UI/startup diagnostics; no input or game clock injection.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { inspectorConnection } from '../v7/loop/package-check.mjs';

const require = createRequire(import.meta.url);
const sleep = ms => new Promise(done => setTimeout(done, ms));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
function files(root) {
  return readdirSync(root, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(join(root,e.name)) : [join(root,e.name)]).sort();
}
function fingerprints() {
  return Object.fromEntries([...files(resolve('src')), ...files(resolve('static')),
    ...files(resolve('dist/electron')), ...files(resolve('dist/web')),
    resolve('.harness/v91/runtime.mjs'),resolve('.harness/v91/ui-cases.mjs'),resolve('.harness/v7/loop/package-check.mjs'),
    resolve('.harness/v7/loop/evidence.mjs'),resolve('.harness/v7/loop/config.mjs'),resolve('.harness/v7/config.json'),
    resolve('package.json'),resolve('package-lock.json'),resolve('tsconfig.main.json'),resolve('tsconfig.renderer.json')].map(p => [p,hash(p)]));
}

// Runs before application boot. Only native boundaries are replaced: all UI,
// preload, IPC, online coordinator, save/recovery and server rules are production.
function fixtureBootstrap(p, compiled, userData, outputDir) {
  const { createHash } = p.require('node:crypto');
  const { MemoryStore } = p.require(compiled + '/server/store.js');
  const { createApp } = p.require(compiled + '/server/app.js');
  const { parseSave, newHeroProgress } = p.require(compiled + '/core/index.js');
  p.store = new MemoryStore(); p.requests = []; p.fixtureRequests = []; p.dialogs = []; p.exports = [];
  p.dialogAnswers = []; p.saveAnswers = []; p.counter = 0;
  const read = name => JSON.parse(p.fs.readFileSync(userData + '/' + name, 'utf8'));
  p.fixtureReady = (async () => {
    if (p.fs.existsSync(userData + '/fixture-server.json')) {
      for (const [id, row] of read('fixture-server.json')) p.store.rows.set(id, row);
      if (p.store.rows.size !== 2) throw Error('Fixture must contain exactly two synthetic players');
      return;
    }
    const mine = read('save.json');
    const foe = parseSave({...mine, hero:newHeroProgress(), coins:1000});
    for (const [id,name,token,save] of [['fixture-me','FixtureMe','fixture-me-token',mine],['fixture-foe','FixtureFoe','fixture-foe-token',foe]]) {
      await p.store.createPlayer({id,name,tokenHash:createHash('sha256').update(token).digest('hex')});
      const result = await p.handle.handle({method:'PUT',path:'/v1/snapshot',query:{},auth:token,ip:'isolated-fixture',
        body:{name,level:save.level,bestIndex:save.bestIndex,rebirths:save.rebirths,
          companions:save.companions,party:save.pvpParty,hero:save.hero.equipped,gold:{revision:0,coins:save.coins}}});
      p.fixtureRequests.push({method:'PUT',path:'/v1/snapshot',playerId:id,result});
      if(result.status!==200)throw Error('Fixture wallet enrollment failed: '+JSON.stringify(result));
    }
  })();
  p.handle = createApp({store:p.store,now:Date.now,randomUUID:()=>`fixture-match-${++p.counter}`,
    randomBytesHex:bytes=>(++p.counter).toString(16).padStart(bytes*2,'0'),randomSeed:()=>7});
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.origin !== 'https://fixture.desmon.invalid') { p.errors.push({type:'unexpected-network',url:String(url)}); throw Error('Network forbidden'); }
    await p.fixtureReady;
    const headers = new Headers(init.headers), body = init.body ? JSON.parse(String(init.body)) : null;
    const request = {method:init.method || 'GET',path:url.pathname,query:Object.fromEntries(url.searchParams),
      auth:headers.get('authorization')?.replace(/^Bearer /,'' ) ?? null,body,ip:'isolated-fixture'};
    if(request.path==='/v1/players') {p.errors.push({type:'unexpected-fixture-registration'});throw Error('Only the two preseeded fixture accounts are allowed');}
    const result = await p.handle.handle(request);
    p.requests.push({method:request.method,path:request.path,query:request.query,body,status:result.status,result:result.body});
    return new Response(JSON.stringify(result.body),{status:result.status,headers:{'content-type':'application/json'}});
  };
  p.e.dialog.showMessageBox = async (...args) => {
    const options = args.at(-1), response = p.dialogAnswers.shift();
    p.dialogs.push({kind:'message',options,response});
    if (response === undefined) { p.errors.push({type:'unexpected-dialog',options}); return {response:0,checkboxChecked:false}; }
    return {response,checkboxChecked:false};
  };
  p.e.dialog.showSaveDialog = async (...args) => {
    const answer = p.saveAnswers.shift(), options = args.at(-1);
    p.dialogs.push({kind:'save',options,answer});
    if (!answer) { p.errors.push({type:'unexpected-save-dialog',options}); return {canceled:true}; }
    if (answer === 'cancel') return {canceled:true};
    const filePath = outputDir + '/' + answer + '.png'; p.exports.push({kind:'file',filePath});
    return {canceled:false,filePath};
  };
  p.e.clipboard.writeImage = image => {
    const filePath = outputDir + '/clipboard-' + p.exports.length + '.png';
    p.fs.writeFileSync(filePath,image.toPNG()); p.exports.push({kind:'clipboard',filePath});
  };
}

function fixtureSave() {
  const core = require(resolve('dist/electron/core/index.js'));
  const companions = ['slime','bat','ghost','golem','dragon'].map((speciesId,i)=>({
    id:'c'+(i+1),speciesId,bossIndex:7+i*8,level:10,stars:0}));
  return core.createEngine(core.parseSave({...core.DEFAULT_SAVE,version:3,level:27,coins:1000,
    bestIndex:1000,monsterIndex:1000,monsterSpeciesId:'slime',monsterHp:'9'.repeat(100),
    hero:core.newHeroProgress(),companions,nextCompanionId:6,pvpParty:companions.map(c=>c.id)})).toSave();
}
async function until(predicate, label, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await predicate(); if (value) return value; await sleep(50); }
  throw Error('Timeout: ' + label);
}

/** Raw strings create malformed fixtures; objects are serialized. Undefined preserves an existing file. */
export async function launchRuntime({ appPath, outputDir, userData, save, settings, identity }) {
  appPath = resolve(appPath); outputDir = resolve(outputDir);
  if (existsSync(outputDir)) throw Error('Attempt output already exists: ' + outputDir);
  mkdirSync(outputDir, { recursive:true });
  userData = userData ? resolve(userData) : mkdtempSync(join(tmpdir(), 'desmon-v091-ui-'));
  mkdirSync(userData, { recursive:true });
  const marker = join(userData, '.v091-isolated');
  if (!existsSync(marker) && readdirSync(userData).length) throw Error('Refusing unowned userData: ' + userData);
  writeFileSync(marker, 'DesMon v0.9.1 isolated fixture data; no personal data copied.\n');
  for (const [name, value] of [['save', save], ['settings', settings], ['identity', identity]]) {
    if (value !== undefined) writeFileSync(join(userData, name + '.json'), typeof value === 'string' ? value : JSON.stringify(value));
  }
  const log = join(outputDir, 'runtime.log');
  const asar = join(appPath, 'Contents/Resources/app.asar');
  const report = { version:1, appPath, appHash:hash(asar), launcherHash:hash(new URL(import.meta.url)),
    startedAt:new Date().toISOString(), userData, metadata:null, diagnostics:null, errors:[],
    isolation:{ globalHooks:false, permissionPrompts:false, network:'in-process production createApp/MemoryStore; two synthetic accounts only', notifications:false,
      input:'none from launcher; UI cases use native sendInputEvent', clock:'real time; one debugger pause to install read-only closure observer', data:'owned fixture directory only' } };
  const env = { ...process.env, DESMON_SERVER_URL:'https://fixture.desmon.invalid' };
  delete env.ELECTRON_RUN_AS_NODE; delete env.SMOKE; delete env.DESMON_STEAM_APP_ID;
  writeFileSync(log, '');
  const child = spawn(join(appPath, 'Contents/MacOS/DesMon'), ['--inspect-brk=127.0.0.1:0', '--user-data-dir=' + userData],
    { env, stdio:['ignore', 'pipe', 'pipe'] });
  let output = '', ended = false, exitCode = null, signal = null, inspector, evaluate, closed;
  const append = bytes => { output += bytes; appendFileSync(log, bytes); };
  child.stdout.on('data', append); child.stderr.on('data', append);
  child.on('error', error => { append(String(error)); ended = true; report.errors.push(String(error)); });
  child.on('exit', (code, value) => { ended = true; exitCode = code; signal = value; });
  const close = () => closed ??= (async () => {
    if (evaluate && !ended) {
      try { report.diagnostics = await evaluate(`(() => {const p=__v091Runtime;return {permissionCalls:p.permissionCalls,hookLoads:p.hookLoads,
        requests:p.requests,fixtureRequests:p.fixtureRequests,notificationSupported:p.e.Notification.isSupported(),dialogs:p.dialogs,exports:p.exports,fixtureAccounts:[...p.store.rows.keys()],errors:p.errors,firstFrame:p.ready,userData:p.e.app.getPath('userData'),windows:p.e.BrowserWindow.getAllWindows().map(w=>w.webContents.getURL())};})()`); }
      catch (error) { report.errors.push(String(error)); }
    }
    if (evaluate && !ended) { try { await evaluate(`(async()=>{const p=__v091Runtime;await p.fixtureReady;p.fs.writeFileSync(${JSON.stringify(join(userData, 'fixture-server.json'))},JSON.stringify([...p.store.rows]));setImmediate(()=>p.e.app.quit());return true;})()`); } catch(error) { report.errors.push(String(error)); } }
    inspector?.close();
    try { await until(() => ended, 'owned process exit', 10000); }
    catch (error) { report.errors.push(String(error)); child.kill('SIGKILL'); await until(() => ended, 'owned process kill', 5000).catch(e => report.errors.push(String(e))); }
    report.finishedAt = new Date().toISOString(); report.exitCode = exitCode; report.signal = signal;
    report.appUnchanged = report.appHash === hash(asar);
    report.passed = exitCode === 0 && signal === null && report.errors.length === 0 && report.appUnchanged && (report.diagnostics?.errors.length ?? 1) === 0 && report.diagnostics?.hookLoads === 0 &&
      report.diagnostics.permissionCalls.every(call=>!call.prompt)&&report.diagnostics.fixtureAccounts.length===2&&report.packageBinding?.passed===true;
    writeFileSync(join(outputDir, 'runtime.json'), JSON.stringify(report, null, 2) + '\n');
    return report;
  })();
  try {
    const url = await until(() => {
      if (ended) throw Error('App exited before inspector: ' + output);
      return output.match(/ws:\/\/127\.0\.0\.1:\d+\/[a-z0-9-]+/)?.[0];
    }, 'inspector URL');
    const Socket = globalThis.WebSocket ?? require('undici').WebSocket;
    const socket = new Socket(url);
    await new Promise((ok, fail) => { socket.addEventListener('open', ok, {once:true}); socket.addEventListener('error', fail, {once:true}); });
    inspector = inspectorConnection(socket);
    await inspector.call('Runtime.enable'); await inspector.call('Debugger.enable');
    await inspector.call('Runtime.runIfWaitingForDebugger');
    const paused = await until(() => inspector.event('Debugger.paused'), 'bootstrap paused');
    const injected = await inspector.call('Debugger.evaluateOnCallFrame', {
      callFrameId:paused.callFrames[0].callFrameId, returnByValue:true,
      expression:`(() => {
        const e=require('electron'),fs=require('node:fs'),Module=require('node:module');
        const p=globalThis.__v091Runtime={e,fs,require,field:null,ready:false,errors:[],permissionCalls:[],hookLoads:0};
        const setPath=e.app.setPath.bind(e.app),setName=e.app.setName.bind(e.app);
        e.app.setName=name=>{setName(name);setPath('userData',${JSON.stringify(userData)});};
        e.app.setPath=(key,value)=>setPath(key,key==='userData'?${JSON.stringify(userData)}:value);
        setPath('userData',${JSON.stringify(userData)});
        e.systemPreferences.isTrustedAccessibilityClient=prompt=>{p.permissionCalls.push({prompt,at:Date.now()});return false;};
        e.Notification.isSupported=()=>false;
        const buildMenu=e.Menu.buildFromTemplate.bind(e.Menu);
        e.Menu.buildFromTemplate=template=>{if(template.some(item=>item.label==='설정'))p.trayTemplate=template;return buildMenu(template);};
        const load=Module._load;
        Module._load=function(request,...args){if(request==='uiohook-napi'){p.hookLoads++;throw Error('Native input forbidden in isolated diagnostics');}return load.call(this,request,...args);};
        (${fixtureBootstrap.toString()})(p, ${JSON.stringify(resolve('dist/electron'))}, ${JSON.stringify(userData)}, ${JSON.stringify(outputDir)});
        e.app.whenReady().then(()=>e.session.defaultSession.webRequest.onBeforeRequest(
          {urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(details,done)=>{p.errors.push({type:'unexpected-renderer-network',url:details.url});done({cancel:true});}));
        e.ipcMain.on('desmon:first-frame',()=>{p.ready=true;console.log('V091_FRAME_READY');});
        e.app.on('browser-window-created',(_ev,w)=>{
          w.on('unresponsive',()=>p.errors.push({type:'unresponsive'}));
          w.webContents.on('did-finish-load',()=>{
            if(w.webContents.getURL().endsWith('/static/index.html')){
              p.field=w; console.log('V091_FIELD_LOADED');
              setImmediate(()=>setImmediate(()=>console.log('V091_CONTEXT_READY')));
            }
          });
        });
        e.app.on('render-process-gone',(_ev,_wc,details)=>p.errors.push({type:'renderer-gone',details}));
        e.app.on('child-process-gone',(_ev,details)=>p.errors.push({type:'child-gone',details}));
        return {version:e.app.getVersion(),appPath:e.app.getAppPath(),userData:e.app.getPath('userData'),runtime:process.versions};
      })()`,
    });
    if (injected.exceptionDetails) throw Error(JSON.stringify(injected.exceptionDetails));
    report.metadata = injected.result.value;
    await inspector.call('Debugger.resume'); append('V091_INSPECTOR_RESUMED\n');
    // Electron replaces its bootstrap context: wait on stdout, never evaluate immediately after resume.
    // A blocked load does not send FIRST_FRAME; the field load plus two main-loop turns covers that path.
    await until(() => {
      if (ended) throw Error('App exited before stable field context: ' + output);
      return output.includes('V091_CONTEXT_READY');
    }, 'stable field context stdout');
    evaluate = async expression => {
      if (ended) throw Error('Owned app has exited: ' + exitCode);
      const result = await inspector.call('Runtime.evaluate', { expression:'globalThis.__v091Runtime.pending=(' + expression + ')', awaitPromise:true, returnByValue:true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await until(() => evaluate('Boolean(__v091Runtime.field&&!__v091Runtime.field.webContents.isLoading())'), 'field loaded');
    await until(() => evaluate(`(async()=>{const p=__v091Runtime;return p.ready||(await p.field.webContents.executeJavaScript('window.desmon.getSaveStatus()')).state==='load-error';})()`), 'first frame or blocked load');
    const packaged = [...files(resolve('dist')), ...files(resolve('static'))]
      .filter(path=>!path.startsWith(resolve('dist/electron/server')+'/'))
      .map(path=>({path:relative(process.cwd(),path),sha256:hash(path)}));
    report.packageBinding = await evaluate(`(()=>{const p=__v091Runtime,hash=p.require('node:crypto').createHash;
      const expected=${JSON.stringify(packaged)},mismatches=[];
      for(const item of expected){try{if(hash('sha256').update(p.fs.readFileSync(p.e.app.getAppPath()+'/'+item.path)).digest('hex')!==item.sha256)mismatches.push(item.path);}
        catch{mismatches.push(item.path);}}
      return {checked:expected.length,mismatches,passed:mismatches.length===0};})()`);
    if(!report.packageBinding.passed)throw Error('Packaged build differs from workspace: '+report.packageBinding.mismatches.join(', '));
    writeFileSync(join(outputDir, 'runtime-start.json'), JSON.stringify(report, null, 2) + '\n');
    return { evaluate, userData, outputDir, metadata:report.metadata, report, close };
  } catch (error) { report.errors.push(String(error)); await close(); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [appPath, directory] = process.argv.slice(2);
  const { runUiCases, EXPECTED_CHECKS } = await import('./ui-cases.mjs');
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const validAttempts = attempts => same(attempts.map(a=>a.phase), ['first','interrupt','restart','attack']) && attempts.every(a=>
    a.ui.version === 91 && a.ui.phase === a.phase && a.ui.passed && a.ui.errors.length === 0 &&
    same(a.ui.checks.map(c=>c.name),EXPECTED_CHECKS[a.phase]) && a.ui.checks.every(c=>c.passed) &&
    a.runtime.passed && a.runtime.exitCode === 0 && a.runtime.signal === null && a.runtime.diagnostics.notificationSupported === false &&
    a.runtime.packageBinding?.passed && a.runtime.packageBinding.checked > 0 && a.runtime.packageBinding.mismatches.length === 0);
  if (appPath === 'verify') {
    const result = JSON.parse(readFileSync(resolve(directory),'utf8'));
    if (result.version !== 91 || !result.passed || !result.sourceUnchanged || result.errors.length || !validAttempts(result.attempts) ||
      !Object.keys(result.sources).length || !Object.keys(result.artifacts).length ||
      !Object.entries({...result.sources,...result.artifacts}).every(([p,sha])=>existsSync(p)&&hash(p)===sha)) throw Error('Incomplete or changed native evidence');
    const screenshots = {first:['hunting-before','defense-replay','hunting-resumed'],interrupt:['hunting-before','defense-replay','quit-during-replay'],restart:['defense-replay','hunting-resumed'],attack:['attack-menu','defense-replay','hunting-resumed']};
    for (const attempt of result.attempts) {
      if (hash(join(attempt.runtime.appPath,'Contents/Resources/app.asar')) !== attempt.runtime.appHash ||
        !same(attempt.ui.screenshots.map(s=>s.name), screenshots[attempt.phase])) throw Error('App or screenshot evidence changed');
      for (const shot of attempt.ui.screenshots) {
        const bytes=readFileSync(shot.path);
        if(hash(shot.path)!==shot.sha256 || result.artifacts[shot.path]!==shot.sha256 ||
          bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a' || bytes.readUInt32BE(16)<400 || bytes.readUInt32BE(20)<260)throw Error('Invalid native PNG');
      }
    }
    console.log('V091_NATIVE_UI_OK');
    process.exit(0);
  }
  if (!appPath || !directory) throw Error('Usage: node .harness/v91/runtime.mjs APP OUTPUT_DIR | verify REPORT');
  const outputDir = resolve(directory);
  if (existsSync(outputDir)) throw Error('Attempt output already exists: '+outputDir);
  mkdirSync(outputDir,{recursive:true});
  const result = {version:91,startedAt:new Date().toISOString(),sources:fingerprints(),attempts:[],errors:[],passed:false,
    scope:'Four owned Electron launches: live defense/resume; independent interrupted fixture; restart of that fixture; native attack menu. Two synthetic players per fixture. Real 5-second poll and game clock; no personal saves or external network.'};
  let runtime;
  const start = (phase,userData) => launchRuntime({appPath,outputDir:join(outputDir,phase),userData,
    ...(userData?{}:{save:fixtureSave(),settings:{gameScale:1,muted:true,screenShake:true,welcomeSeen:true,globalInputRequested:false},
      identity:{name:'FixtureMe',playerId:'fixture-me',token:'fixture-me-token',notifiedTheftIds:[]}})});
  try {
    runtime=await start('first');
    const first=await runUiCases({...runtime,phase:'first'});
    result.attempts.push({phase:'first',ui:first,runtime:await runtime.close()});runtime=null;
    if(!first.passed)throw Error('First defense/resume scenario failed');
    runtime=await start('interrupt');
    const interrupted=await runUiCases({...runtime,phase:'interrupt'});
    const userData=runtime.userData;
    result.attempts.push({phase:'interrupt',ui:interrupted,runtime:await runtime.close()});runtime=null;
    if(!interrupted.passed||!interrupted.interrupted)throw Error('Interrupted replay scenario failed');
    runtime=await start('restart',userData);
    const restarted=await runUiCases({...runtime,phase:'restart',interrupted:interrupted.interrupted});
    result.attempts.push({phase:'restart',ui:restarted,runtime:await runtime.close()});runtime=null;
    if(!restarted.passed)throw Error('Restart replay scenario failed');
    runtime=await start('attack');
    const attack=await runUiCases({...runtime,phase:'attack'});
    result.attempts.push({phase:'attack',ui:attack,runtime:await runtime.close()});runtime=null;
  } catch(error) {result.errors.push(String(error));if(runtime)await runtime.close();}
  result.sourceUnchanged=Object.entries(result.sources).every(([p,sha])=>existsSync(p)&&hash(p)===sha);
  result.passed=result.sourceUnchanged&&result.errors.length===0&&validAttempts(result.attempts);
  result.finishedAt=new Date().toISOString();
  result.artifacts=Object.fromEntries(files(outputDir).map(p=>[p,hash(p)]));
  writeFileSync(join(outputDir,'native.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({outputDir,passed:result.passed,errors:result.errors}));
  if(!result.passed)process.exitCode=1;
}
