#!/usr/bin/env node
// Real elapsed-time packaged-app observation. Isolation only: no engine clock injection.
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync, renameSync } from 'node:fs';
import { tmpdir, platform, arch, release, cpus } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { inspectorConnection } from '../v7/loop/package-check.mjs';

const require = createRequire(import.meta.url);
const sleep = ms => new Promise(done => setTimeout(done, ms));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const quantile = (values, q) => values.length ? [...values].sort((a,b) => a-b)[Math.floor((values.length-1)*q)] : null;
async function until(fn, label, timeout = 20000, signal) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { signal?.throwIfAborted(); const value = await fn(); if (value) return value; await sleep(100); }
  throw Error(`Timeout: ${label}`);
}

export function observationCancellation(onCancel, signals = process) {
  const controller = new AbortController();
  const handlers = ['SIGTERM', 'SIGINT'].map(signal => [signal, () => {
    if (controller.signal.aborted) return;
    controller.abort(new Error('Observation cancelled: ' + signal)); onCancel(signal);
  }]);
  for (const [signal, handler] of handlers) signals.on(signal, handler);
  return { signal: controller.signal,
    dispose() { for (const [signal, handler] of handlers) signals.removeListener(signal, handler); },
  };
}

export function processTable() {
  const result = spawnSync('/bin/ps', ['-wwaxo', 'pid=,ppid=,pgid=,lstart=,command='],
    { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' }, maxBuffer: 16 * 1024 * 1024, timeout: 5000 });
  if (result.status !== 0) throw Error('Cannot verify owned processes: ' + (result.error ?? result.stderr));
  return result.stdout.split('\n').flatMap(line => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+\s+\S+\s+\d+\s+\d\d:\d\d:\d\d\s+\d{4})\s+(.*)$/);
    return match ? [{ pid: Number(match[1]), ppid: Number(match[2]), pgid: Number(match[3]), started: match[4].replace(/\s+/g, ' '), command: match[5] }] : [];
  });
}

/** Track identities, not process groups. A unique fixture path also identifies
 * helpers reparented during startup; no other user's app matches that path.
 * Injected process tables/clocks keep cancellation tests deterministic.
 */
export async function cleanupOwnedApp({ childPid, userData, appPath, hasExited }, {
  table = processTable, send = (pid, signal) => process.kill(pid, signal), wait = sleep, now = Date.now,
  graceMs = 10000, killMs = 5000,
} = {}) {
  const owned = new Map(), signals = [], sent = new Set();
  const identity = row => `${row.pid}/${row.started}/${row.command}`;
  const markers = ['--user-data-dir=' + userData, '--database=' + userData + '/Crashpad'];
  const scan = () => {
    const rows = table(), live = new Map();
    for (const row of rows) if (owned.has(identity(row)) || row.command.startsWith(appPath + '/Contents/') &&
      markers.some(marker => row.command.endsWith(marker) || row.command.includes(marker + ' '))) live.set(row.pid, row);
    let added;
    do { added = false; for (const row of rows) if (!live.has(row.pid) && live.has(row.ppid)) { live.set(row.pid, row); added = true; } } while (added);
    for (const row of live.values()) owned.set(identity(row), row);
    return [...live.values()];
  };
  const signal = (row, name) => {
    const key = identity(row) + '/' + name; if (sent.has(key)) return;
    // A preceding signal may have exited/replaced another row in this scan.
    // Revalidate before every kill; macOS has no portable atomic PID handle.
    if (!table().some(current => identity(current) === identity(row))) return;
    try { send(row.pid, name); signals.push({ pid: row.pid, signal: name, at: new Date(now()).toISOString() }); sent.add(key); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  let remaining = scan();
  for (const [name, duration] of [['SIGTERM', graceMs], ['SIGKILL', killMs]]) {
    const deadline = now() + duration;
    while (remaining.length || !hasExited()) {
      for (const row of remaining) if (name === 'SIGKILL' || row.pid === childPid || hasExited()) signal(row, name);
      if (now() >= deadline) break;
      await wait(Math.min(100, deadline - now())); remaining = scan();
    }
  }
  return { state: remaining.length === 0 && hasExited() ? 'complete' : 'failed', owned: [...owned.values()], remaining, signals,
    finishedAt: new Date(now()).toISOString() };
}

export async function observe(appPath, output, profile, minutes) {
  if (!['active','idle','mixed'].includes(profile) || !(minutes > 0)) throw Error('Invalid observation');
  appPath = resolve(appPath); output = resolve(output);
  if ([output, output+'.log', output+'.samples.jsonl', output+'.lifecycle.json'].some(existsSync)) throw Error('Output already exists; use a new attempt path');
  mkdirSync(dirname(output), {recursive:true});
  const userData = mkdtempSync(join(tmpdir(), 'desmon-v10-perf-'));
  const executable = join(appPath, 'Contents/MacOS/DesMon');
  const appHash = hash(readFileSync(join(appPath,'Contents/Resources/app.asar')));
  const observerPath = new URL(import.meta.url);
  const observerHash = hash(readFileSync(observerPath));
  const log = output + '.log', rawPath = output + '.samples.jsonl';
  writeFileSync(log,''); writeFileSync(rawPath,'');
  let inspector, socket;
  const samples = [], screenshots = [], errors = [];
  let logFailed = false;
  const appendLog = value => {
    try { appendFileSync(log, value); }
    catch (error) { if (!logFailed) errors.push({ type: 'log-write', message: String(error) }); logFailed = true; }
  };
  const lifecyclePath = output + '.lifecycle.json';
  const lifecycle = { version: 1, observerPid: process.pid, childPid: null, userData, appPath, appHash,
    startedAt: new Date().toISOString(), state: 'starting', cancelSignal: null, cleanup: { state: 'pending', owned: [], remaining: [], signals: [] } };
  const persistLifecycle = () => { writeFileSync(lifecyclePath + '.tmp', JSON.stringify(lifecycle, null, 2) + '\n'); renameSync(lifecyclePath + '.tmp', lifecyclePath); };
  // Install before spawn: a signal during inspector/bootstrap must still enter
  // our finally block, rather than leave the paused Electron child behind.
  const cancellation = observationCancellation(signal => {
    lifecycle.cancelSignal = signal; errors.push({ type: 'cancelled', signal });
    inspector?.close();
    if (!inspector && socket && socket.readyState < 2) socket.close();
  });
  const child = spawn(executable, ['--inspect-brk=127.0.0.1:0', '--user-data-dir='+userData], {
    env:{...process.env, DESMON_SERVER_URL:''}, stdio:['ignore','pipe','pipe'],
  });
  let text = '', ended = false, exitCode = null, exitSignal = null, observerStart;
  child.stdout.on('data', b => {text += b; appendLog(b);});
  child.stderr.on('data', b => {text += b; appendLog(b);});
  child.on('exit', (code, signal) => {ended = true; exitCode = code; exitSignal = signal;appendLog(JSON.stringify({event:'child-exit',code,signal,at:new Date().toISOString()})+'\n');});
  child.on('error', err => {text += String(err); ended = true;});
  let startedAt, finishedAt, metadata, finalSave, inputCount = 0, observationMs = 0;
  try {
    lifecycle.childPid = child.pid ?? null; persistLifecycle();
    const url = await until(() => {
      if (ended) throw Error(`App exited before inspector: ${text}`);
      return text.match(/ws:\/\/127\.0\.0\.1:\d+\/[a-z0-9-]+/)?.[0];
    }, 'inspector', 20000, cancellation.signal);
    const Socket = globalThis.WebSocket ?? require('undici').WebSocket;
    socket = new Socket(url);
    await new Promise((ok,fail) => {
      const abort = () => fail(cancellation.signal.reason);
      const finish = fn => value => { cancellation.signal.removeEventListener('abort', abort); fn(value); };
      socket.addEventListener('open',finish(ok),{once:true}); socket.addEventListener('error',finish(fail),{once:true});
      cancellation.signal.addEventListener('abort', abort, {once:true}); if (cancellation.signal.aborted) abort();
    });
    cancellation.signal.throwIfAborted();
    inspector = inspectorConnection(socket);
    socket.addEventListener('message', event => {
      const message=JSON.parse(String(event.data));
      if(['Runtime.executionContextDestroyed','Runtime.executionContextsCleared'].includes(message.method))
        appendLog(JSON.stringify({event:message.method,params:message.params,at:new Date().toISOString()})+'\n');
    });
    await inspector.call('Runtime.enable'); await inspector.call('Debugger.enable');
    await inspector.call('Runtime.runIfWaitingForDebugger');
    const paused = await until(() => inspector.event('Debugger.paused'),'main paused',20000,cancellation.signal);
    const injected = await inspector.call('Debugger.evaluateOnCallFrame', {
      callFrameId:paused.callFrames[0].callFrameId,
      expression:`(() => {
        const e=require('electron'), fs=require('node:fs');
        const originalSetPath=e.app.setPath.bind(e.app);
        const originalSetName=e.app.setName.bind(e.app);
        e.app.setName=name=>{originalSetName(name);originalSetPath('userData',${JSON.stringify(userData)});};
        const lock=e.app.requestSingleInstanceLock.bind(e.app);
        e.app.requestSingleInstanceLock=(...args)=>{const result=lock(...args);console.log('V09_LOCK',result,e.app.getPath('userData'));return result;};
        e.app.setPath=(key,value)=>originalSetPath(key,key==='userData'?${JSON.stringify(userData)}:value);
        originalSetPath('userData',${JSON.stringify(userData)});
        e.systemPreferences.isTrustedAccessibilityClient=()=>false;
        e.Notification.isSupported=()=>false;
        const buildMenu=e.Menu.buildFromTemplate.bind(e.Menu);
        e.Menu.buildFromTemplate=template=>{if(template[0]?.label?.startsWith('DesMon'))template[0].label='DesMon 성능검증 · 자동 종료';return buildMenu(template);};
        const core=require(e.app.getAppPath()+'/dist/electron/core/index.js');
        const save=JSON.parse(JSON.stringify(core.parseSave({version:3,level:1,xp:0,killCount:0,coins:0,items:{},monsterIndex:0,monsterHp:'10',companions:Array.from({length:5},(_,i)=>({id:'c'+(i+1),speciesId:'slime',bossIndex:7,level:1,stars:0})),nextCompanionId:6,souls:0,rebirths:0,bestIndex:0,pvpParty:[]}),(_key,value)=>typeof value==='bigint'?String(value):value));
        fs.writeFileSync(${JSON.stringify(join(userData,'save.json'))},JSON.stringify(save));
        fs.writeFileSync(${JSON.stringify(join(userData,'settings.json'))},JSON.stringify({gameScale:1,muted:false,screenShake:true,welcomeSeen:true,globalInputRequested:false}));
        globalThis.__v09Perf={e,fs,require,inputs:0,errors:[],save,menus:[]};
        for(const name of ['quit','exit']){const original=e.app[name].bind(e.app);e.app[name]=(...args)=>{console.log('V09_APP_CALL',name,JSON.stringify(args),new Error().stack);return original(...args);};}
        for(const name of ['before-quit','will-quit','quit','window-all-closed'])e.app.on(name,()=>console.log('V09_LIFECYCLE',name,Date.now()));
        process.on('exit',code=>console.log('V09_PROCESS_EXIT',code,Date.now()));
        e.ipcMain.on('desmon:first-frame',()=>{__v09Perf.ready=true;console.log('V09_FRAME_READY');});
        const handle=e.ipcMain.handle.bind(e.ipcMain);
        e.ipcMain.handle=(channel,fn)=>handle(channel,async(...args)=>{
          const result=await fn(...args);
          if(channel==='desmon:save-state'&&result===false)__v09Perf.errors.push({type:'save-failed'});
          return result;
        });
        globalThis.fetch=async()=>{__v09Perf.errors.push({type:'unexpected-network'});throw Error('Network disabled in isolated performance observation');};
        e.app.on('render-process-gone',(_ev,_wc,details)=>__v09Perf.errors.push({type:'renderer-gone',details}));
        e.app.on('child-process-gone',(_ev,details)=>__v09Perf.errors.push({type:'child-gone',details}));
        e.app.on('browser-window-created',(_ev,w)=>{const id=w.id;w.on('unresponsive',()=>__v09Perf.errors.push({type:'unresponsive'}));for(const name of ['close','closed'])w.on(name,()=>console.log('V09_WINDOW',id,name,Date.now()));});
        return {version:e.app.getVersion(),appPath:e.app.getAppPath(),runtime:process.versions,fixture:save};
      })()`,returnByValue:true,
    });
    if (injected.exceptionDetails) throw Error(JSON.stringify(injected.exceptionDetails));
    metadata = injected.result.value;
    await inspector.call('Debugger.resume');
    appendLog('V09_INSPECTOR_RESUMED\n');
    // Electron replaces its bootstrap context during startup. Wait outside CDP before evaluating.
    await until(()=>text.includes('V09_FRAME_READY')||(ended&&Promise.reject(Error('App exited before first frame'))),'first frame stdout',20000,cancellation.signal);
    const evaluate = async expression => {
      cancellation.signal.throwIfAborted();
      if (ended) throw Error(`Packaged app exited unexpectedly: ${exitCode}`);
      const r=await inspector.call('Runtime.evaluate',{expression:'globalThis.__v09Perf.pending=('+expression+')',returnByValue:true,awaitPromise:true});
      if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    await until(()=>evaluate(`(() => {const p=__v09Perf; p.field=p.e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/static/index.html'));return Boolean(p.ready&&p.field&&!p.field.webContents.isLoading());})()`),'field first frame');
    await evaluate(`(() => {const p=__v09Perf;p.started=performance.now();p.e.app.getAppMetrics();p.timer=setInterval(()=>{const elapsed=performance.now()-p.started; const active=${JSON.stringify(profile)}==='active'||(${JSON.stringify(profile)}==='mixed'&&Math.floor(elapsed/300000)%2===0);if(active){p.field.webContents.send('desmon:input',{source:p.inputs%2?'mouse':'keyboard'});p.inputs++;}},500);})()`);
    startedAt = new Date().toISOString();
    lifecycle.state = 'observing'; persistLifecycle();
    const start=performance.now(), duration=minutes*60000;observerStart=start;
    let nextMenu=600000, nextPrint=60000;
    const capture=async(name,menu=false)=>{
      const file=output+'.'+name+'.png';
      await evaluate(`(async()=>{const p=__v09Perf,w=${menu?'p.menu':'p.field'};p.fs.writeFileSync(${JSON.stringify(file)},(await w.webContents.capturePage()).toPNG());})()`);
      screenshots.push({name,path:file,sha256:hash(readFileSync(file))});
    };
    await capture('start');
    while(performance.now()-start<duration){
      await sleep(Math.min(5000, Math.max(1,duration-(performance.now()-start))));
      const sample=await evaluate(`(() => {const p=__v09Perf;return{elapsedMs:performance.now()-p.started,inputs:p.inputs,processes:p.e.app.getAppMetrics().map(m=>({pid:m.pid,creationTime:m.creationTime,type:m.type,cpu:m.cpu.percentCPUUsage,workingSetKiB:m.memory.workingSetSize})),errors:p.errors,save:JSON.parse(p.fs.readFileSync(${JSON.stringify(join(userData,'save.json'))},'utf8'))};})()`);
      sample.cpu=sample.processes.reduce((n,p)=>n+p.cpu,0);
      sample.workingSetMiB=sample.processes.reduce((n,p)=>n+p.workingSetKiB/1024,0);
      samples.push(sample);appendFileSync(rawPath,JSON.stringify(sample)+'\n');
      if(profile==='mixed' && sample.elapsedMs>=nextMenu){
        await evaluate(`(() => {__v09Perf.menu=__v09Perf.require(__v09Perf.e.app.getAppPath()+'/dist/electron/main/menuWindow.js').showMenuWindow();})()`);
        await until(()=>evaluate(`!__v09Perf.menu.webContents.isLoading()`),'menu');await sleep(300);
        await evaluate(`__v09Perf.menu.webContents.executeJavaScript("(()=>{const button=document.querySelector('.hero-choice button:not(:disabled), .hero-choice-row button:not(:disabled), [data-hero-choice]:not(:disabled)');if(button){button.click();return true;}return false;})()")`);
        await sleep(300);
        await evaluate(`__v09Perf.menu.webContents.executeJavaScript("document.getElementById('share-open').click()")`);
        await sleep(300);
        await evaluate(`__v09Perf.menu.webContents.executeJavaScript("(()=>{const s=document.getElementById('share-kind');for(const kind of ['hero','companion','party','codex','field','pvp']){s.value=kind;s.dispatchEvent(new Event('change'));}document.getElementById('share-close').click();})()")`);
        await capture('menu-'+Math.round(nextMenu/60000)+'m',true);
        await evaluate('__v09Perf.menu.close()'); nextMenu+=600000;
      }
      if(sample.elapsedMs>=nextPrint){process.stdout.write(JSON.stringify({profile,minutes,elapsedMinutes:+(sample.elapsedMs/60000).toFixed(2),samples:samples.length,inputs:sample.inputs,cpu:sample.cpu,memoryMiB:sample.workingSetMiB})+'\n');nextPrint+=60000;}
    }
    observationMs=performance.now()-start;
    await evaluate('clearInterval(__v09Perf.timer)'); await capture('end');
    const last=await evaluate(`({inputs:__v09Perf.inputs,errors:__v09Perf.errors,save:JSON.parse(__v09Perf.fs.readFileSync(${JSON.stringify(join(userData,'save.json'))},'utf8'))})`);
    finalSave=last.save;inputCount=last.inputs;errors.push(...last.errors);
  } catch(error) {errors.push({type:'observer',message:String(error)});}
  finally {
    finishedAt=new Date().toISOString();
    if(observerStart!==undefined)observationMs=performance.now()-observerStart;
    inspector?.close(); if (!inspector && socket && socket.readyState < 2) socket.close();
    lifecycle.state = 'cleaning'; lifecycle.cleanup.state = 'running';
    try { persistLifecycle(); } catch (error) { errors.push({ type: 'cleanup-report', message: String(error) }); }
    try {
      await sleep(250);
      lifecycle.cleanup = await cleanupOwnedApp({ childPid: child.pid, userData, appPath, hasExited: () => ended });
      if (lifecycle.cleanup.state !== 'complete') errors.push({ type: 'cleanup', message: 'Owned application processes survived cleanup' });
    } catch (error) {
      lifecycle.cleanup.state = 'failed'; errors.push({ type: 'cleanup', message: String(error) });
      if (!ended) child.kill('SIGKILL');
    }
    lifecycle.state = 'complete';
    try { persistLifecycle(); } catch (error) { errors.push({ type: 'cleanup-report', message: String(error) }); }
  }
  const stable=samples.filter(s=>s.elapsedMs>=300000);
  const startWindow=samples.filter(s=>s.elapsedMs>=300000&&s.elapsedMs<=2100000);
  const endWindow=samples.filter(s=>s.elapsedMs>=9000000);
  const checks={duration:observationMs>=minutes*60000,metrics:samples.length>0&&samples.every(s=>s.processes.length>0&&Number.isFinite(s.cpu)&&Number.isFinite(s.workingSetMiB)),
    samples:samples.length>=Math.floor(minutes*12)*.95,progress:(finalSave?.killCount??0)>(metadata?.fixture?.killCount??0),
    inputs:profile==='idle'?inputCount===0:inputCount>0,errors:errors.length===0,
    appUnchanged:appHash===hash(readFileSync(join(appPath,'Contents/Resources/app.asar'))),
    observerUnchanged:observerHash===hash(readFileSync(observerPath))};
  const report={version:1,profile,requestedMinutes:minutes,startedAt,finishedAt,observationMs,inputCount,appPath,appHash,observerHash,checks,exitCode,exitSignal,
    lifecyclePath,cleanup:lifecycle.cleanup,cancelSignal:lifecycle.cancelSignal,
    lastObserved: samples.length ? {source:'last-sample',elapsedMs:samples.at(-1).elapsedMs,inputs:samples.at(-1).inputs,save:samples.at(-1).save} : null,
    machine:{platform:platform(),arch:arch(),os:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length},metadata,
    isolation:{userData,globalHooks:false,osPermissionPrompts:false,network:'offline',input:'synthetic production IPC',time:'real wall time; no engine ticks injected'},
    raw:{path:rawPath,sha256:hash(readFileSync(rawPath)),samples:samples.length},screenshots,errors,finalSave,
    summary:{cpuP95:quantile(stable.map(s=>s.cpu),.95),workingSetMiBP95:quantile(stable.map(s=>s.workingSetMiB),.95),initialMemoryMedian:quantile(startWindow.map(s=>s.workingSetMiB),.5),finalMemoryMedian:quantile(endWindow.map(s=>s.workingSetMiB),.5)},
    passed:Object.values(checks).every(Boolean)};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  cancellation.dispose();
  if(!report.passed)throw Error(`Observation failed; see ${output}`);
  return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [app,output,profile,minutes]=process.argv.slice(2);
  observe(app,output,profile,Number(minutes)).then(r=>process.stdout.write(JSON.stringify({output,passed:r.passed,summary:r.summary})+'\n')).catch(e=>{console.error(e);process.exitCode=1;});
}
