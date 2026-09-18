#!/usr/bin/env node
// Host-owned, resumable v0.7 task journal. No git operations or external services.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, sourceDigest, evaluationDigest, sha256 } from './evidence.mjs';
const json = value => JSON.stringify(value, null, 2) + '\n';
const requireThat = (ok, why) => { if (!ok) throw Error(why); };
export { GATES } from './config.mjs';
import { CONFIG, GATES } from './config.mjs';
export const TASKS = CONFIG.tasks;
const PHASES = ['setup','candidate','release'];
const shellQuote = value => "'" + value.replaceAll("'", "'\"'\"'") + "'";
export function newLoop(digest=sourceDigest(), toolsDigest=evaluationDigest(), directory=ROOT) {
  return {version:7,kind:'desmon-v07-development',phase:'setup',runDir:resolve(directory),createdAt:new Date().toISOString(),baselineDigest:digest,baselineEvaluationDigest:toolsDigest,history:[],
    tasks:TASKS.map(task=>({...structuredClone(task),status:'pending',attempts:[],verificationHistory:[]}))};
}
export function validateLoop(loop) {
  requireThat(loop?.version===7 && loop.kind==='desmon-v07-development' && PHASES.includes(loop.phase), 'Not a supported v7 development journal');
  requireThat(typeof loop.runDir==='string' && Array.isArray(loop.tasks) && loop.tasks.length===TASKS.length, 'Invalid task journal');
  for(const definition of TASKS) {
    const task=loop.tasks.find(t=>t.id===definition.id);
    requireThat(task && Object.entries(definition).every(([key,value])=>json(task[key])===json(value)), 'Task contract changed; preserve the journal and reconcile it explicitly');
    requireThat(['pending','running','verified','blocked'].includes(task.status) && Array.isArray(task.attempts) && Array.isArray(task.verificationHistory), 'Invalid task state');
  }
  return loop;
}
export function registeredCommand(loop, task, id) {
  if(id==='gates') return GATES;
  const ac=task.ac.find(check=>check.id===id);
  requireThat(ac, 'Use a registered AC ID or gates');
  return ac.command.replaceAll('{runDir}',shellQuote(loop.runDir));
}
function artifactPaths(loop, task, id) {
  if(id==='gates') return [];
  const ac=task.ac.find(check=>check.id===id);
  requireThat(ac, 'Use a registered AC ID or gates');
  return (ac.artifacts??[]).map(path=>resolve(ROOT,path.replaceAll('{runDir}',loop.runDir)));
}
export function artifactManifest(loop, task, id, readManifest=fileManifest) {
  return Object.fromEntries(artifactPaths(loop,task,id).map(path=>{
    try {return [path,readManifest([path])];} catch {return [path,null];}
  }));
}
function verifyCheckArtifacts(loop, task, check, readManifest=fileManifest) {
  const paths=artifactPaths(loop,task,check.commandId);
  requireThat(check.artifacts && json(Object.keys(check.artifacts).sort())===json([...paths].sort()), 'Registered AC artifact paths are missing or changed');
  const current=artifactManifest(loop,task,check.commandId,readManifest);
  for(const path of paths) {
    const recorded=check.artifacts[path];
    requireThat(recorded && Object.keys(recorded).length>0 && Object.values(recorded).every(hash=>typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash)), 'Missing or incomplete AC artifact');
    requireThat(sameManifest(recorded,current[path]), 'AC artifact changed or disappeared');
  }
}
export function verifyRecordedEvidence(loop, read=readFileSync, readManifest=fileManifest) {
  validateLoop(loop);
  for(const task of loop.tasks.filter(task=>task.status==='verified')) {
    const verification=task.verificationHistory.at(-1);
    requireThat(verification?.ac?.path && verification.ac.sha256 && Array.isArray(verification.checks), 'Missing recorded verification evidence');
    requireThat(sha256(read(verification.ac.path))===verification.ac.sha256, 'Recorded AC evidence changed');
    for(const check of verification.checks) {
      requireThat(sha256(read(check.log))===check.sha256, 'Recorded check log changed');
      verifyCheckArtifacts(loop,task,check,readManifest);
    }
  }
  return loop;
}
export function advancePhase(loop, phase, digest=sourceDigest(), toolsDigest=evaluationDigest()) {
  validateLoop(loop);
  requireThat(PHASES.indexOf(phase)===PHASES.indexOf(loop.phase)+1, 'Advance exactly one development phase');
  requireThat(!loop.tasks.some(t=>t.status==='running'), 'Stop running tasks before changing phase');
  const tasks=loop.tasks.filter(t=>t.stage===loop.phase);
  requireThat(tasks.length && tasks.every(t=>t.status==='verified'), 'Finish every required task in the current phase');
  const terminal=tasks.at(-1).verificationHistory.at(-1);
  requireThat(terminal?.sourceDigest===digest && terminal.evaluationDigest===toolsDigest, 'Current phase completion is stale');
  const next=structuredClone(loop);next.phase=phase;
  next.history.push({at:new Date().toISOString(),action:'phase',phase,sourceDigest:digest,evaluationDigest:toolsDigest});return next;
}
export function ready(loop,task) {
  return task.dependencies.every(id=>loop.tasks.find(t=>t.id===id)?.status==='verified');
}
export function pathsOverlap(a,b) {
  const left=resolve(ROOT,a),right=resolve(ROOT,b);
  return left===right||left.startsWith(right+sep)||right.startsWith(left+sep);
}
const sameManifest=(a,b)=>a&&b&&json(Object.entries(a).sort())===json(Object.entries(b).sort());
export function transition(loop,id,action,payload={},digest=sourceDigest(),toolsDigest=evaluationDigest(),currentFiles,readManifest=fileManifest) {
  validateLoop(loop);
  requireThat(action==='check'||loop.phase!=='setup'||digest===loop.baselineDigest, 'Setup must preserve the baseline game source');
  const next=structuredClone(loop);const task=next.tasks.find(t=>t.id===id);
  requireThat(task,'Unknown task');
  requireThat(task.stage===loop.phase||(action==='invalidate'&&task.stage==='candidate'&&loop.phase==='release'), 'Task is locked outside its development phase');
  const now=new Date().toISOString();
  const filesHash=currentFiles??fileManifest(task.files);
  if(action==='start') {
    requireThat(['pending','blocked'].includes(task.status),'Only pending/blocked tasks can start');
    requireThat(ready(next,task),'Dependencies unfinished');
    requireThat(!next.tasks.some(t=>t.status==='running'&&t.files.some(f=>task.files.some(g=>pathsOverlap(f,g)))),'Files already owned by a running task');
    task.status='running';task.attempts.push({startedAt:now,sourceDigest:digest,evaluationDigest:toolsDigest,filesHash,checks:[]});
  } else if(action==='check') {
    requireThat(task.status==='running','Checks require a running task');
    requireThat(typeof payload.commandId==='string' && payload.command===registeredCommand(loop,task,payload.commandId) && Number.isInteger(payload.exitCode),'Check needs a registered command and exit code');
    requireThat([payload.sourceDigest,payload.endedDigest,payload.evaluationDigest,payload.endedEvaluationDigest].every(d=>typeof d==='string'&&/^[a-f0-9]{64}$/.test(d))&&payload.filesHash&&payload.endedFilesHash,'Check needs start/end source, evaluation and owned-file fingerprints');
    requireThat(payload.log&&payload.sha256,'Check needs immutable log');
    requireThat(payload.artifacts && json(Object.keys(payload.artifacts).sort())===json(artifactPaths(loop,task,payload.commandId).sort()), 'Check needs every registered artifact path');
    // Even a failed or changed-during-run check is evidence; verification rejects it below.
    task.attempts.at(-1).checks.push(payload);
  } else if(action==='verify') {
    requireThat(task.status==='running'&&ready(next,task),'Verification needs running task and completed dependencies');
    // Retrying the same command supersedes its result, while the attempt retains every log.
    const checks=[...new Map(task.attempts.at(-1).checks.map(c=>[c.commandId,c])).values()];
    requireThat(checks.length>=2&&checks.every(c=>c.exitCode===0&&c.sourceDigest===digest&&c.endedDigest===digest&&
      c.evaluationDigest===toolsDigest&&c.endedEvaluationDigest===toolsDigest&&sameManifest(c.filesHash,filesHash)&&sameManifest(c.endedFilesHash,filesHash)),
      'Failed or stale checks: rerun affected commands or start a new attempt');
    requireThat(checks.some(c=>c.commandId==='gates'&&c.command===GATES),'Canonical integration gates required');
    requireThat(task.ac.every(ac=>checks.some(c=>c.commandId===ac.id&&c.command===registeredCommand(loop,task,ac.id))), 'Every registered AC command is required');
    for(const check of checks) verifyCheckArtifacts(loop,task,check,readManifest);
    requireThat(payload.ac&&payload.review&&sameManifest(payload.filesHash,filesHash),'AC evidence, review and current files hash required');
    task.status='verified';task.verificationHistory.push({at:now,sourceDigest:digest,evaluationDigest:toolsDigest,...payload,checks:structuredClone(checks)});
  } else if(action==='exclude') {
    throw Error('All v7 tasks are mandatory; exclusion is not supported');
  } else if(action==='invalidate'||action==='retry') {
    requireThat(payload.reason,'Retry/invalidation needs a reason');
    requireThat(['running','verified','blocked'].includes(task.status),'Task has no attempt to resume');
    const invalidate=t=>{t.status='pending';t.staleReason=payload.reason;};
    invalidate(task);
    if(action==='invalidate'&&PHASES.indexOf(task.stage)<PHASES.indexOf(next.phase))next.phase=task.stage;
    // Preserve historical validations; only affected descendants become stale.
    const affected=new Set([id]);let changed=true;
    while(changed){changed=false;for(const child of next.tasks){if(!affected.has(child.id)&&child.dependencies.some(d=>affected.has(d))){affected.add(child.id);changed=true;if(['running','verified','blocked'].includes(child.status))invalidate(child);}}}
  } else if(action==='block') {
    requireThat(task.status==='running'&&payload.reason&&Array.isArray(payload.attemptEvidence)&&payload.attemptEvidence.length>=3&&
      new Set(payload.attemptEvidence.map(json)).size>=3,'Block needs three different environmental recovery attempts');
    task.status='blocked';task.blocker=payload;
  } else throw Error('Unknown transition');
  next.history.push({at:now,id,action,sourceDigest:digest,evaluationDigest:toolsDigest});return next;
}
const atomic=(file,value)=>{mkdirSync(dirname(file),{recursive:true});writeFileSync(file+'.tmp',json(value));renameSync(file+'.tmp',file);};
export function fileManifest(paths,root=ROOT) {
  // Git-free exact file hashes; directories use recursively enumerated regular files.
  const output={};
  const visit=p=>{const full=resolve(root,p);if(!existsSync(full)){output[p]=null;return;}
    const {statSync,readdirSync}=fs; if(statSync(full).isDirectory())for(const name of readdirSync(full).sort())visit(p+'/'+name);else output[p]=sha256(readFileSync(full));};
  paths.forEach(visit);return output;
}
import * as fs from 'node:fs';
function main() {
  const [command,dir,id,...args]=process.argv.slice(2);requireThat(command&&dir,'Usage: develop.mjs init|status|next|phase|start|check|verify|retry|invalidate|block <run-dir> [task] [argument]');
  const file=resolve(dir,'loop.json');
  if(command==='init'){requireThat(!existsSync(file),'Journal already exists');requireThat(!id, 'New journals always start in setup');atomic(file,newLoop(sourceDigest(),evaluationDigest(),dir));return;}
  let loop=validateLoop(JSON.parse(readFileSync(file,'utf8')));
  requireThat(resolve(dir)===loop.runDir, 'Journal directory changed; keep evidence at its original path');
  if(command==='phase'){verifyRecordedEvidence(loop);loop=advancePhase(loop,id);atomic(file,loop);console.log(loop.phase);return;}
  if(command==='status'||command==='next'){
    console.log(json(command==='status'?loop.tasks.map(t=>({id:t.id,status:t.status,owner:t.owner,stage:t.stage,locked:t.stage!==loop.phase,next:t.stage===loop.phase&&ready(loop,t)})):loop.tasks.filter(t=>t.status==='pending'&&t.stage===loop.phase&&ready(loop,t))));return;
  }
  if(command==='check') {
    const task=loop.tasks.find(t=>t.id===id);requireThat(task?.status==='running'&&task.stage===loop.phase,'Task must be running in the current phase');
    requireThat(args.length===1,'Provide one registered AC ID or gates');
    const commandId=args[0],cmd=registeredCommand(loop,task,commandId);
    requireThat(loop.phase!=='setup'||sourceDigest()===loop.baselineDigest,'Setup must preserve the baseline game source');
    const digest=sourceDigest(),toolsDigest=evaluationDigest(),filesHash=fileManifest(task.files);
    const log=resolve(dir,'evidence',`${id}-${Date.now()}.log`);mkdirSync(dirname(log),{recursive:true});
    const fd=fs.openSync(log,'wx');
    const run=spawnSync(cmd,{cwd:ROOT,shell:'/bin/zsh',stdio:['ignore',fd,fd]});fs.closeSync(fd);
    const endedDigest=sourceDigest(),endedEvaluationDigest=evaluationDigest(),endedFilesHash=fileManifest(task.files);
    const check={commandId,command:cmd,exitCode:run.status??1,sourceDigest:digest,endedDigest,evaluationDigest:toolsDigest,endedEvaluationDigest,filesHash,endedFilesHash,
      artifacts:artifactManifest(loop,task,commandId),
      log,sha256:sha256(readFileSync(log)),ac:cmd!==GATES,at:new Date().toISOString()};
    loop=transition(loop,id,'check',check,endedDigest,endedEvaluationDigest,endedFilesHash);atomic(file,loop);console.log(json(check));
    process.exitCode=check.exitCode||Number(digest!==endedDigest||toolsDigest!==endedEvaluationDigest||!sameManifest(filesHash,endedFilesHash));return;
  }
  let payload={};
  if(command==='verify') {
    const evidence=resolve(args[0]??'');requireThat(existsSync(evidence),'Provide AC/review evidence file');
    const task=loop.tasks.find(t=>t.id===id);
    for(const check of task.attempts.at(-1).checks) requireThat(sha256(readFileSync(check.log))===check.sha256,'Check log changed');
    payload={ac:{path:evidence,sha256:sha256(readFileSync(evidence))},review:evidence,filesHash:fileManifest(task.files)};
  } else if(command==='exclude'){const evidence=resolve(args[0]??'');payload={reason:args.slice(1).join(' '),evidence:{path:evidence,sha256:sha256(readFileSync(evidence))}};}
  else if(command==='retry'||command==='invalidate')payload={reason:args.join(' ')};
  else if(command==='block')payload=JSON.parse(readFileSync(args[0],'utf8'));
  loop=transition(loop,id,command,payload);atomic(file,loop);console.log(`${id}: ${loop.tasks.find(t=>t.id===id).status}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
