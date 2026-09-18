#!/usr/bin/env node
// Sequential real-time observations; a failed slot stops the queue and preserves its evidence.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { digest, sha } from './run.mjs';
// The observer owns application cleanup. Signal it alone and await close, which
// follows its finally/report and inherited stdio closure, before returning.
export async function runObservedChild(args, onSpawn, onInterrupt, { spawnProcess = spawn, signals = process } = {}) {
  let child, interrupted = null, callbackError;
  const handlers = ['SIGTERM', 'SIGINT'].map(signal => [signal, () => {
    if (interrupted) return;
    interrupted = signal;
    try { onInterrupt(signal); } catch (error) { callbackError = String(error); }
    finally { child?.kill(signal); }
  }]);
  for (const [signal, handler] of handlers) signals.on(signal, handler);
  try {
    child = spawnProcess(process.execPath, args, { stdio: 'inherit', detached: true });
    const closed = new Promise(done => {
      let launchError;
      child.once('error', error => { launchError = String(error); });
      child.once('close', (code, signal) => done({ code: code ?? 1, signal, ...(launchError ? { error: launchError } : {}) }));
    });
    try { onSpawn(child); } catch (error) { callbackError = String(error); child.kill('SIGTERM'); }
    const result = await closed;
    return { ...result, ...(callbackError ? { code: 1, error: callbackError } : {}), interrupted };
  } finally {
    for (const [signal, handler] of handlers) signals.removeListener(signal, handler);
  }
}

export async function runPerformance(args) {
const [baselineActive, baselineIdle, candidate, destination]=args;
if(!destination)throw Error('Usage: run-performance.mjs BASELINE_ACTIVE_JSON BASELINE_IDLE_JSON CANDIDATE_APP OUTPUT_DIRECTORY');
for(const file of [baselineActive,baselineIdle])if(JSON.parse(readFileSync(file)).passed!==true)throw Error('Baseline did not pass: '+file);
const outputDir=resolve(destination);
if(existsSync(join(outputDir,'queue.json')))throw Error('Preserve previous queue; use a new directory');
mkdirSync(outputDir,{recursive:true});
const schedule=[['candidate-active',candidate,'active',30],['candidate-idle',candidate,'idle',30],['mixed',candidate,'mixed',180]];
const source=digest(),appHash=sha(readFileSync(join(resolve(candidate),'Contents/Resources/app.asar')));
const status={version:10,pid:process.pid,source,appHash,baselineActive:resolve(baselineActive),baselineIdle:resolve(baselineIdle),startedAt:new Date().toISOString(),state:'running',slots:[]};
const persist=()=>writeFileSync(join(outputDir,'queue.json'),JSON.stringify(status,null,2)+'\n');
persist();
const interrupt = signal => {
  status.state='interrupted';status.signal=signal;persist();process.exitCode=1;
};
for(const [slot,app,profile,minutes] of schedule){
  if(status.state!=='running')break;
  const args=['.harness/v10/performance-v4.mjs',resolve(app),join(outputDir,slot+'.json'),profile,String(minutes)];
  const entry={slot,args,startedAt:new Date().toISOString(),state:'running'};
  status.slots.push(entry);
  const result=await runObservedChild(args,child=>{entry.pid=child.pid;persist();},interrupt);
  const code=result.code;
  entry.endedAt=new Date().toISOString();entry.exitCode=code;entry.signal=result.signal;if(result.error)entry.error=result.error;
  const reportPath=join(outputDir,slot+'.json');
  const report=existsSync(reportPath)?JSON.parse(readFileSync(reportPath)):null;
  entry.cleanupComplete=report?.cleanup?.state==='complete'&&Array.isArray(report.cleanup.remaining)&&report.cleanup.remaining.length===0;
  entry.lifecyclePath=report?.lifecyclePath??reportPath+'.lifecycle.json';
  entry.sourceUnchanged=source===digest();entry.appUnchanged=appHash===sha(readFileSync(join(resolve(candidate),'Contents/Resources/app.asar')));
  entry.state=code===0&&entry.cleanupComplete&&entry.sourceUnchanged&&entry.appUnchanged?'passed':'failed';
  if(entry.state!=='passed'){if(status.state==='running')status.state='failed';process.exitCode=1;}
  persist();
}
if(status.state==='running'){
  const args=['.harness/v10/performance-report.mjs','report',join(outputDir,'comparison.json'),
    '--baseline-active',resolve(baselineActive),'--baseline-idle',resolve(baselineIdle),
    ...schedule.flatMap(([slot])=>['--'+slot,join(outputDir,slot+'.json')])];
  const {code}=await runObservedChild(args,()=>{},interrupt);
  status.comparisonExitCode=code;if(status.state==='running')status.state=code===0?'passed':'failed';if(code!==0)process.exitCode=1;
}
status.endedAt=new Date().toISOString();persist();
return status;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  runPerformance(process.argv.slice(2)).catch(error=>{console.error(error);process.exitCode=1;});
