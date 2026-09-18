#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, createWriteStream } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, sourceDigest, sha256, evaluationDigest } from './evidence.mjs';
export const COMBINATIONS = [5,15,30].flatMap(minutes=>['active','idle','intermittent'].map(profile=>({minutes,profile})));
const check=(ok,message)=>{if(!ok)throw Error(message);};
const json=value=>JSON.stringify(value,null,2)+'\n';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const atomic=(path,value)=>{writeFileSync(path+'.tmp',json(value));renameSync(path+'.tmp',path);};
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
/** Detached wrapper and its Electron descendants share this group, even if the wrapper exits. */
export function processGroupAlive(running,kill=process.kill) {
  check(Number.isSafeInteger(running.pid)&&running.pid>1&&running.processGroupId===running.pid,
    'Missing process group identity; inspect the legacy native run before resuming');
  try { kill(-running.processGroupId,0);return true; }
  catch(error){if(error.code==='ESRCH')return false;if(error.code==='EPERM')return true;throw error;}
}
export function aggregateRuns(records,digest,toolDigest,readFile=readFileSync) {
  check(records.length===9,'Matrix requires nine independent originals');
  const seen=new Set();const originals=[];const shots=[];const sessions=[];const checks=[];const errors=[];
  for(const record of records){
    const bytes=readFile(record.path);check(sha256(bytes)===record.sha256,'Original hash mismatch');
    const run=JSON.parse(bytes.toString());
    check(run.mode==='electron-e2e'&&run.sourceDigest===digest&&run.evaluationDigest===toolDigest,'Stale source or runner/protocol fingerprint');
    check(run.sessions?.length===1,'Each original must contain one independent real-time session');
    const session=run.sessions[0];const key=`${session.minutes}-${session.profile}`;
    check(COMBINATIONS.some(c=>c.minutes===session.minutes&&c.profile===session.profile)&&!seen.has(key),'Duplicate/unknown combination');seen.add(key);
    check(session.mode==='real-time'&&finite(session.elapsedMs)&&session.elapsedMs>=session.minutes*60_000,'Real elapsed observation is too short or invalid');
    check(typeof run.startedAt==='string'&&Number.isFinite(Date.parse(run.startedAt))&&finite(run.elapsedMs)&&run.elapsedMs>=session.elapsedMs,'Invalid run timestamps');
    check(Number.isSafeInteger(session.inputs)&&session.inputs>=0&&(session.profile!=='idle'||session.inputs===0),'Invalid input count; fresh idle must have zero inputs');
    check(Array.isArray(session.timeline)&&session.timeline.length>0&&object(session.start)&&object(session.end)&&
      session.timeline.every((sample,i)=>finite(sample.elapsedMs)&&sample.elapsedMs>=0&&sample.elapsedMs<=session.elapsedMs&&
        (i===0||sample.elapsedMs>=session.timeline[i-1].elapsedMs)),'Missing or invalid observation timeline');
    check(Array.isArray(run.checks)&&run.checks.length>0&&run.checks.every(c=>object(c)&&typeof c.id==='string'&&c.id.trim()&&c.details!==undefined)&&
      new Set(run.checks.map(c=>c.id)).size===run.checks.length,'Missing or duplicate checks');
    check(run.checks.every(c=>typeof c.passed==='boolean')&&Array.isArray(run.errors),'Invalid check/error status');
    check(['passed','failed'].includes(run.status),'Unknown run status');
    check(run.status!=='passed'||(record.exitCode===0&&run.checks.every(c=>c.passed)&&!run.errors.length),'Failure hidden by passed status');
    check(run.screenshots?.length>0,'Missing screenshots');
    for(const shot of run.screenshots){const path=resolve(dirname(record.path),shot.path);check(sha256(readFile(path))===shot.sha256,'Screenshot hash mismatch');shots.push({path,sha256:shot.sha256});}
    originals.push({...record,key,startedAt:run.startedAt,elapsedMs:run.elapsedMs,status:run.status});
    sessions.push({...session,original:record.path});checks.push(...run.checks.map(c=>({...c,id:`${key}/${c.id}`})));
    if(record.exitCode!==0||run.status!=='passed')errors.push(`${key}: failed (exit ${record.exitCode})`);
    errors.push(...run.errors.map(e=>`${key}: ${e}`));
  }
  const ordered=[...originals].sort((a,b)=>Date.parse(a.startedAt)-Date.parse(b.startedAt));
  for(let i=1;i<ordered.length;i++)check(Date.parse(ordered[i].startedAt)>=Date.parse(ordered[i-1].startedAt)+ordered[i-1].elapsedMs,'Native runs overlap; sequential desktop execution required');
  const observationMs=sessions.reduce((sum,s)=>sum+s.elapsedMs,0);check(observationMs>=150*60_000,'Matrix observation under 150 minutes');
  return {schemaVersion:2,mode:'electron-e2e',sourceDigest:digest,evaluationDigest:toolDigest,command:'node .harness/v5/loop/e2e-matrix.mjs run <directory>',
    startedAt:ordered[0].startedAt,elapsedMs:originals.reduce((sum,r)=>sum+r.elapsedMs,0),observationMs,
    status:!errors.length&&checks.every(c=>c.passed)?'passed':'failed',checks,sessions,screenshots:shots,errors,
    matrix:{version:1,originals},limitations:['Nine independent real-time native runs; no automatic menu choices. idle is fresh with zero inputs.',
      'Fixtures and v0.6 UI journey follow natural observation and are not natural acquisitions.',
      'Human fun and interruption remain PENDING; OS hooks, Accessibility and live PvP are separate.']};
}
export function verifyMatrix(artifact,digest=sourceDigest(),toolDigest=evaluationDigest()) {
  check(artifact.sourceDigest===digest&&artifact.evaluationDigest===toolDigest,'Matrix source/tools stale');
  const rebuilt=aggregateRuns(artifact.matrix.originals,digest,toolDigest);
  check(json(rebuilt)===json(artifact),'Matrix aggregation differs from originals');return artifact;
}
async function main(){
  const [command,directory]=process.argv.slice(2);check(['run','verify','status'].includes(command)&&directory,'Usage: e2e-matrix.mjs run|verify|status <directory>');
  const dir=resolve(directory);mkdirSync(dir,{recursive:true});const statePath=resolve(dir,'matrix-state.json');const resultPath=resolve(dir,'matrix.json');
  if(command==='verify'){const artifact=verifyMatrix(read(resultPath));console.log(json({status:artifact.status,runs:9,observationMs:artifact.observationMs}));process.exitCode=artifact.status==='passed'?0:1;return;}
  if(command==='status'){console.log(json(read(statePath)));return;}
  let state=existsSync(statePath)?read(statePath):{version:1,sourceDigest:sourceDigest(),evaluationDigest:evaluationDigest(),runs:[],attempts:[]};
  check(state.sourceDigest===sourceDigest()&&state.evaluationDigest===evaluationDigest(),'Changed source/tools: use a new matrix directory');
  if(state.running){check(!processGroupAlive(state.running),'Matrix native process group is still running; inspect its log, do not launch twice');state.attempts.push({...state.running,recovery:'ended orphan group preserved; rerun combination'});delete state.running;}
  atomic(statePath,state);
  for(const combination of COMBINATIONS){
    const key=`${combination.minutes}-${combination.profile}`;
    const existing=state.runs.find(r=>r.key===key);
    if(existing){check(sha256(readFileSync(existing.path))===existing.sha256,'Existing result changed');const run=read(existing.path);check(existing.exitCode===0&&run.status==='passed'&&run.sourceDigest===state.sourceDigest&&run.evaluationDigest===state.evaluationDigest,'Existing result failed/stale');continue;}
    const path=resolve(dir,`${key}-${Date.now()}.json`);const log=path+'.log';const stream=createWriteStream(log,{flags:'wx'});
    const child=spawn(process.execPath,[resolve(ROOT,'.harness/v5/loop/e2e.mjs'),path,String(combination.minutes),combination.profile],{cwd:ROOT,env:process.env,detached:true,stdio:['ignore','pipe','pipe']});
    state.running={key,path,log,pid:child.pid,processGroupId:child.pid,startedAt:new Date().toISOString()};atomic(statePath,state);
    for(const io of [child.stdout,child.stderr])io.on('data',chunk=>{stream.write(chunk);process.stdout.write(chunk);});
    const code=await new Promise((done,reject)=>{child.once('error',reject);child.once('close',c=>done(c??1));});stream.end();
    const attempt={...state.running,exitCode:code,endedAt:new Date().toISOString(),...(existsSync(path)?{sha256:sha256(readFileSync(path))}:{})};state.attempts.push(attempt);delete state.running;
    if(code===0&&existsSync(path)&&read(path).status==='passed')state.runs.push(attempt);atomic(statePath,state);
    check(code===0,`${key} failed; original preserved. Fix and use fresh directory if source changes.`);
    check(state.sourceDigest===sourceDigest()&&state.evaluationDigest===evaluationDigest(),'Source/tools changed while observing');
  }
  const result=aggregateRuns(state.runs,state.sourceDigest,state.evaluationDigest);atomic(resultPath,result);console.log(`MATRIX_${result.status.toUpperCase()} ${resultPath}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{await main();}catch(error){console.error(error.stack);process.exitCode=1;}}
