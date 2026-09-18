#!/usr/bin/env node
// Host-owned, resumable v0.6 task journal. No git operations or external services.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, sourceDigest, evaluationDigest, sha256 } from './evidence.mjs';
const json = value => JSON.stringify(value, null, 2) + '\n';
const requireThat = (ok, why) => { if (!ok) throw Error(why); };
export const GATES = 'npm test && npm run lint && npm run typecheck';
export const TASKS = [
  ['V06-01', [], 'host/balance', ['.harness/v5/loop', 'docs/v0.6/EVALUATION_PROTOCOL.json']],
  ['V06-02', [], 'designer', ['src/core/hero.ts','src/renderer/hud.ts','src/menu/hero.ts','tests/hero.test.ts','tests/expedition.test.ts','tests/heroMenuReadiness.test.ts']],
  ['V06-03', [], 'critic', ['src/core/progress.ts','src/core/save.ts','src/core/collection.ts','src/core/engine.ts','src/core/index.ts','src/core/types.ts','src/main/ipc.ts','src/shared/ipc.ts','src/preload/index.ts','src/renderer/global.d.ts','tests/progressV6.test.ts','tests/ipcV5.test.ts','tests/ipc.test.ts']],
  ['V06-04', ['V06-03'], 'host', ['src/menu/codex.ts','src/menu/index.ts','static/menu.css','tests/menu.test.ts']],
  ['V06-05', [], 'designer', ['src/menu/economy.ts','tests/trainingPreview.test.ts']],
  ['V06-06', ['V06-01'], 'balance/host', ['docs/v0.6/EXPERIMENT_RESULTS.md']],
  ['V06-07', ['V06-03','V06-06'], 'host', []],
  ['V06-08', ['V06-04','V06-07'], 'host', []],
  ['V06-09', ['V06-02','V06-04','V06-05','V06-06','V06-07','V06-08'], 'host', ['package.json','package-lock.json']],
  ['V06-10', ['V06-09'], 'host', ['README.md','docs/v0.6/HANDOFF.md']],
];
export function newLoop(digest=sourceDigest(),toolsDigest=evaluationDigest()) {
  return {version:1,kind:'desmon-v06-development',createdAt:new Date().toISOString(),baselineDigest:digest,baselineEvaluationDigest:toolsDigest,history:[],
    tasks:TASKS.map(([id,dependencies,owner,files])=>({id,dependencies,owner,files,status:'pending',attempts:[],verificationHistory:[]}))};
}
export function ready(loop,task) {
  return task.dependencies.every(id=>['verified','excluded'].includes(loop.tasks.find(t=>t.id===id)?.status));
}
export function pathsOverlap(a,b) {
  const left=resolve(ROOT,a),right=resolve(ROOT,b);
  return left===right||left.startsWith(right+sep)||right.startsWith(left+sep);
}
const sameManifest=(a,b)=>a&&b&&json(Object.entries(a).sort())===json(Object.entries(b).sort());
export function transition(loop,id,action,payload={},digest=sourceDigest(),toolsDigest=evaluationDigest(),currentFiles) {
  const next=structuredClone(loop);const task=next.tasks.find(t=>t.id===id);
  requireThat(task,'Unknown task');const now=new Date().toISOString();
  const filesHash=currentFiles??fileManifest(task.files);
  if(action==='start') {
    requireThat(['pending','blocked'].includes(task.status),'Only pending/blocked tasks can start');
    requireThat(ready(next,task),'Dependencies unfinished');
    requireThat(!next.tasks.some(t=>t.status==='running'&&t.files.some(f=>task.files.some(g=>pathsOverlap(f,g)))),'Files already owned by a running task');
    task.status='running';task.attempts.push({startedAt:now,sourceDigest:digest,evaluationDigest:toolsDigest,filesHash,checks:[]});
  } else if(action==='check') {
    requireThat(task.status==='running','Checks require a running task');
    requireThat(typeof payload.command==='string'&&payload.command.trim()&&Number.isInteger(payload.exitCode),'Check needs command and exit code');
    requireThat([payload.sourceDigest,payload.endedDigest,payload.evaluationDigest,payload.endedEvaluationDigest].every(d=>typeof d==='string'&&/^[a-f0-9]{64}$/.test(d))&&payload.filesHash&&payload.endedFilesHash,'Check needs start/end source, evaluation and owned-file fingerprints');
    requireThat(payload.log&&payload.sha256,'Check needs immutable log');
    // Even a failed or changed-during-run check is evidence; verification rejects it below.
    task.attempts.at(-1).checks.push(payload);
  } else if(action==='verify') {
    requireThat(task.status==='running'&&ready(next,task),'Verification needs running task and completed dependencies');
    // Retrying the same command supersedes its result, while the attempt retains every log.
    const checks=[...new Map(task.attempts.at(-1).checks.map(c=>[c.command,c])).values()];
    requireThat(checks.length>=2&&checks.every(c=>c.exitCode===0&&c.sourceDigest===digest&&c.endedDigest===digest&&
      c.evaluationDigest===toolsDigest&&c.endedEvaluationDigest===toolsDigest&&sameManifest(c.filesHash,filesHash)&&sameManifest(c.endedFilesHash,filesHash)),
      'Failed or stale checks: rerun affected commands or start a new attempt');
    requireThat(checks.some(c=>c.command===GATES),'Canonical integration gates required');
    requireThat(checks.some(c=>c.command!==GATES&&c.ac),'Successful AC command required');
    requireThat(payload.ac&&payload.review&&sameManifest(payload.filesHash,filesHash),'AC evidence, review and current files hash required');
    task.status='verified';task.verificationHistory.push({at:now,sourceDigest:digest,evaluationDigest:toolsDigest,...payload,checks:structuredClone(checks)});
  } else if(action==='exclude') {
    requireThat(['V06-07','V06-08'].includes(id)&&task.status==='pending','Only pending conditional tasks may be excluded');
    requireThat(next.tasks.find(t=>t.id==='V06-06').status==='verified','Actual experiment must be verified first');
    requireThat(payload.reason&&payload.evidence,'Conditional exclusion needs decision evidence');
    task.status='excluded';task.exclusion={at:now,sourceDigest:digest,evaluationDigest:toolsDigest,...payload};
    (task.exclusionHistory??=[]).push(structuredClone(task.exclusion));
  } else if(action==='invalidate'||action==='retry') {
    requireThat(payload.reason,'Retry/invalidation needs a reason');
    requireThat(['running','verified','blocked','excluded'].includes(task.status),'Task has no attempt to resume');
    const invalidate=t=>{if(t.exclusion){if(!(t.exclusionHistory?.length))t.exclusionHistory=[structuredClone(t.exclusion)];delete t.exclusion;}t.status='pending';t.staleReason=payload.reason;};
    invalidate(task);
    // Preserve historical validations; only affected descendants become stale.
    const affected=new Set([id]);let changed=true;
    while(changed){changed=false;for(const child of next.tasks){if(!affected.has(child.id)&&child.dependencies.some(d=>affected.has(d))){affected.add(child.id);changed=true;if(['verified','excluded'].includes(child.status))invalidate(child);}}}
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
  const [command,dir,id,...args]=process.argv.slice(2);requireThat(command&&dir,'Usage: develop.mjs init|status|next|start|check|verify|exclude|retry|invalidate|block <run-dir> [task] [argument]');
  const file=resolve(dir,'loop.json');
  if(command==='init'){requireThat(!existsSync(file),'Journal already exists');atomic(file,newLoop());return;}
  let loop=JSON.parse(readFileSync(file,'utf8'));
  if(command==='status'||command==='next'){
    console.log(json(command==='status'?loop.tasks.map(t=>({id:t.id,status:t.status,owner:t.owner,next:ready(loop,t)})):loop.tasks.filter(t=>t.status==='pending'&&ready(loop,t))));return;
  }
  if(command==='check') {
    const cmd=args.join(' ');requireThat(cmd,'Check command required');
    const task=loop.tasks.find(t=>t.id===id);requireThat(task?.status==='running','Task must be running');
    const digest=sourceDigest(),toolsDigest=evaluationDigest(),filesHash=fileManifest(task.files);
    const log=resolve(dir,'evidence',`${id}-${Date.now()}.log`);mkdirSync(dirname(log),{recursive:true});
    const fd=fs.openSync(log,'wx');
    const run=spawnSync(cmd,{cwd:ROOT,shell:'/bin/zsh',stdio:['ignore',fd,fd]});fs.closeSync(fd);
    const endedDigest=sourceDigest(),endedEvaluationDigest=evaluationDigest(),endedFilesHash=fileManifest(task.files);
    const check={command:cmd,exitCode:run.status??1,sourceDigest:digest,endedDigest,evaluationDigest:toolsDigest,endedEvaluationDigest,filesHash,endedFilesHash,
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
