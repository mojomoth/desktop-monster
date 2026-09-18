#!/usr/bin/env node
// Isolated production Electron startup for UI/startup diagnostics; no input or game clock injection.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { inspectorConnection } from '../v7/loop/package-check.mjs';

const require = createRequire(import.meta.url);
const sleep = ms => new Promise(done => setTimeout(done, ms));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
async function until(predicate, label, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await predicate(); if (value) return value; await sleep(50); }
  throw Error('Timeout: ' + label);
}

/** Raw strings create malformed fixtures; objects are serialized. Undefined preserves an existing file. */
export async function launchRuntime({ appPath, outputDir, userData, save, settings }) {
  appPath = resolve(appPath); outputDir = resolve(outputDir);
  if (existsSync(outputDir)) throw Error('Attempt output already exists: ' + outputDir);
  mkdirSync(outputDir, { recursive:true });
  userData = userData ? resolve(userData) : mkdtempSync(join(tmpdir(), 'desmon-v08-ui-'));
  mkdirSync(userData, { recursive:true });
  const marker = join(userData, '.v08-isolated');
  if (!existsSync(marker) && readdirSync(userData).length) throw Error('Refusing unowned userData: ' + userData);
  writeFileSync(marker, 'DesMon v0.8 isolated fixture data; no personal data copied.\n');
  for (const [name, value] of [['save', save], ['settings', settings]]) {
    if (value !== undefined) writeFileSync(join(userData, name + '.json'), typeof value === 'string' ? value : JSON.stringify(value));
  }
  const log = join(outputDir, 'runtime.log');
  const asar = join(appPath, 'Contents/Resources/app.asar');
  const report = { version:1, appPath, appHash:hash(asar), launcherHash:hash(new URL(import.meta.url)),
    startedAt:new Date().toISOString(), userData, metadata:null, diagnostics:null, errors:[],
    isolation:{ globalHooks:false, permissionPrompts:false, network:'blocked; production offline client', notifications:false,
      input:'none from launcher', clock:'real time', data:'owned fixture directory only' } };
  const env = { ...process.env, DESMON_SERVER_URL:'' };
  delete env.ELECTRON_RUN_AS_NODE; delete env.SMOKE;
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
      try { report.diagnostics = await evaluate(`(() => {const p=__v08Perf;return {permissionCalls:p.permissionCalls,hookLoads:p.hookLoads,
        errors:p.errors,firstFrame:p.ready,userData:p.e.app.getPath('userData'),windows:p.e.BrowserWindow.getAllWindows().map(w=>w.webContents.getURL())};})()`); }
      catch (error) { report.errors.push(String(error)); }
    }
    inspector?.close(); if (!ended) child.kill('SIGTERM');
    try { await until(() => ended, 'owned process exit', 10000); }
    catch (error) { report.errors.push(String(error)); child.kill('SIGKILL'); await until(() => ended, 'owned process kill', 5000).catch(e => report.errors.push(String(e))); }
    report.finishedAt = new Date().toISOString(); report.exitCode = exitCode; report.signal = signal;
    report.appUnchanged = report.appHash === hash(asar);
    report.passed = report.errors.length === 0 && report.appUnchanged && (report.diagnostics?.errors.length ?? 1) === 0 && report.diagnostics?.hookLoads === 0;
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
        const p=globalThis.__v08Perf={e,fs,require,field:null,ready:false,errors:[],permissionCalls:[],hookLoads:0};
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
        globalThis.fetch=async()=>{p.errors.push({type:'unexpected-network'});throw Error('Network blocked in isolated diagnostics');};
        e.app.whenReady().then(()=>e.session.defaultSession.webRequest.onBeforeRequest(
          {urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(details,done)=>{p.errors.push({type:'unexpected-renderer-network',url:details.url});done({cancel:true});}));
        e.ipcMain.on('desmon:first-frame',()=>{p.ready=true;console.log('V08_FRAME_READY');});
        e.app.on('browser-window-created',(_ev,w)=>{
          w.on('unresponsive',()=>p.errors.push({type:'unresponsive'}));
          w.webContents.on('did-finish-load',()=>{
            if(w.webContents.getURL().endsWith('/static/index.html')){
              p.field=w; console.log('V08_FIELD_LOADED');
              setImmediate(()=>setImmediate(()=>console.log('V08_CONTEXT_READY')));
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
    await inspector.call('Debugger.resume'); append('V08_INSPECTOR_RESUMED\n');
    // Electron replaces its bootstrap context: wait on stdout, never evaluate immediately after resume.
    // A blocked load does not send FIRST_FRAME; the field load plus two main-loop turns covers that path.
    await until(() => {
      if (ended) throw Error('App exited before stable field context: ' + output);
      return output.includes('V08_CONTEXT_READY');
    }, 'stable field context stdout');
    evaluate = async expression => {
      if (ended) throw Error('Owned app has exited: ' + exitCode);
      const result = await inspector.call('Runtime.evaluate', { expression:'globalThis.__v08Perf.pending=(' + expression + ')', awaitPromise:true, returnByValue:true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await until(() => evaluate('Boolean(__v08Perf.field&&!__v08Perf.field.webContents.isLoading())'), 'field loaded');
    await until(() => evaluate(`(async()=>{const p=__v08Perf;return p.ready||(await p.field.webContents.executeJavaScript('window.desmon.getSaveStatus()')).state==='load-error';})()`), 'first frame or blocked load');
    writeFileSync(join(outputDir, 'runtime-start.json'), JSON.stringify(report, null, 2) + '\n');
    return { evaluate, userData, outputDir, metadata:report.metadata, report, close };
  } catch (error) { report.errors.push(String(error)); await close(); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [appPath, outputDir] = process.argv.slice(2);
  let runtime;
  try {
    runtime = await launchRuntime({ appPath, outputDir,
      settings:{gameScale:1,muted:false,screenShake:true,welcomeSeen:true,globalInputRequested:false} });
    const { runUiCases } = await import('./ui-cases.mjs');
    const ui = await runUiCases(runtime);
    const result = await runtime.close();
    console.log(JSON.stringify({ outputDir, uiPassed:ui.passed, runtimePassed:result.passed }));
    if (!ui.passed || !result.passed) process.exitCode = 1;
  } catch (error) { console.error(error); await runtime?.close(); process.exitCode = 1; }
}
