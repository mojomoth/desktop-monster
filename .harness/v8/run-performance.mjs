#!/usr/bin/env node
// Sequential real-time observations; a failed slot stops the queue and preserves its evidence.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const [baseline, candidate, destination]=process.argv.slice(2);
const outputDir=resolve(destination);
if(existsSync(outputDir))throw Error('Use a new performance queue directory');
mkdirSync(outputDir,{recursive:true});
const schedule=[['baseline-active',baseline,'active',30],['baseline-idle',baseline,'idle',30],
  ['candidate-active',candidate,'active',30],['candidate-idle',candidate,'idle',30],['mixed',candidate,'mixed',180]];
const status={version:1,pid:process.pid,startedAt:new Date().toISOString(),state:'running',slots:[]};
const persist=()=>writeFileSync(join(outputDir,'queue.json'),JSON.stringify(status,null,2)+'\n');
persist();
let active;
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{
  // Each child owns a new group; include its Electron descendants, never unrelated app PIDs.
  if(active?.pid){try{process.kill(-active.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}}
  status.state='interrupted';status.signal=signal;persist();process.exitCode=1;
});
for(const [slot,app,profile,minutes] of schedule){
  if(status.state!=='running')break;
  const args=['.harness/v8/performance.mjs',resolve(app),join(outputDir,slot+'.json'),profile,String(minutes)];
  const entry={slot,args,startedAt:new Date().toISOString(),state:'running'};
  status.slots.push(entry);active=spawn(process.execPath,args,{stdio:'inherit',detached:true});entry.pid=active.pid;persist();
  const code=await new Promise(done=>{active.once('exit',(code,signal)=>{entry.signal=signal;done(code??1);});active.once('error',error=>{entry.error=String(error);done(1);});});
  entry.endedAt=new Date().toISOString();entry.exitCode=code;entry.state=code===0?'passed':'failed';active=null;
  if(code!==0){if(status.state==='running')status.state='failed';process.exitCode=1;}
  persist();
}
if(status.state==='running'){
  const args=['.harness/v8/performance-report.mjs','report',join(outputDir,'comparison.json'),
    ...schedule.flatMap(([slot])=>['--'+slot,join(outputDir,slot+'.json')])];
  active=spawn(process.execPath,args,{stdio:'inherit',detached:true});
  const code=await new Promise(done=>{active.once('exit',code=>done(code??1));active.once('error',()=>done(1));});
  status.comparisonExitCode=code;if(status.state==='running')status.state=code===0?'passed':'failed';if(code!==0)process.exitCode=1;
}
status.endedAt=new Date().toISOString();persist();
