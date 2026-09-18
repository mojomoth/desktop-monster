import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { newLoop, transition, advancePhase, registeredCommand, verifyRecordedEvidence, artifactManifest, fileManifest, pathsOverlap, GATES } from './develop.mjs';
import { sha256 } from './evidence.mjs';
const source = 'a'.repeat(64), evaluation = 'b'.repeat(64);
const files = {'synthetic-owned.ts':'c'.repeat(64)};
const syntheticArtifacts=(paths:string[])=>Object.fromEntries(paths.map(path=>[path,sha256('fixture')]));
const proof = {ac:'fixture.md',review:'fixture.md',filesHash:files};
const apply = (loop: ReturnType<typeof newLoop>, id:string, action:string, payload = {}, digest=source, tools=evaluation) =>
  transition(loop,id,action,payload,digest,tools,files,syntheticArtifacts);
function record(loop:ReturnType<typeof newLoop>, id:string, commandId:string, exitCode=0) {
  const task=loop.tasks.find((t:{id:string})=>t.id===id);
  return {commandId,command:registeredCommand(loop,task,commandId),exitCode,sourceDigest:source,endedDigest:source,evaluationDigest:evaluation,endedEvaluationDigest:evaluation,
    filesHash:files,endedFilesHash:files,log:'synthetic.log',sha256:source,
    artifacts:artifactManifest(loop,task,commandId,syntheticArtifacts)};
}
function checked(loop=newLoop(source,evaluation),id='H07-01') {
  loop=apply(loop,id,'start');
  for(const commandId of [...loop.tasks.find((t:{id:string})=>t.id===id).ac.map((ac:{id:string})=>ac.id),'gates']) loop=apply(loop,id,'check',record(loop,id,commandId));
  return loop;
}
const complete=(loop:ReturnType<typeof newLoop>,id:string)=>apply(checked(loop,id),id,'verify',proof);
function candidate() {return advancePhase(complete(newLoop(source,evaluation),'H07-01'),'candidate',source,evaluation);}

describe('v7 phased development journal',()=>{
  it('requires all registered ACs and exact gates while leaving future gameplay tasks locked and pending',()=>{
    let loop=newLoop(source,evaluation);
    expect(()=>apply(loop,'V07-01','start')).toThrow('locked');
    expect(()=>advancePhase(loop,'candidate',source,evaluation)).toThrow('Finish');
    loop=apply(loop,'H07-01','start');
    loop=apply(loop,'H07-01','check',record(loop,'H07-01','harness'));
    loop=apply(loop,'H07-01','check',record(loop,'H07-01','gates'));
    expect(()=>apply(loop,'H07-01','verify',proof)).toThrow('Every registered AC');
    const done=complete(newLoop(source,evaluation),'H07-01');
    expect(done.tasks.slice(1).every((t:{status:string})=>t.status==='pending')).toBe(true);
    expect(()=>advancePhase(done,'release',source,evaluation)).toThrow('exactly one');
    expect(()=>advancePhase(done,'candidate','d'.repeat(64),evaluation)).toThrow('stale');
    expect(advancePhase(done,'candidate',source,evaluation).phase).toBe('candidate');
  });
  it('rejects unregistered commands and edited task/legacy journals without mutating their state',()=>{
    const loop=apply(newLoop(source,evaluation),'H07-01','start'),before=JSON.stringify(loop);
    expect(()=>apply(loop,'H07-01','check',{...record(loop,'H07-01','harness'),command:'node -e 0'})).toThrow('registered');
    expect(()=>registeredCommand(loop,loop.tasks[0],'arbitrary')).toThrow('registered');
    expect(()=>apply({...loop,version:1},'H07-01','verify',proof)).toThrow('v7');
    const edited=structuredClone(loop);edited.tasks[0].ac=[];
    expect(()=>apply(edited,'H07-01','verify',proof)).toThrow('contract changed');
    expect(JSON.stringify(loop)).toBe(before);
  });
  it('preserves failed and mid-check changed evidence, requires every latest command to pass',()=>{
    let loop=checked();
    loop=apply(loop,'H07-01','check',{...record(loop,'H07-01','baseline',1),endedDigest:'d'.repeat(64)},'d'.repeat(64));
    expect(loop.tasks[0].attempts[0].checks.at(-1).exitCode).toBe(1);
    expect(()=>apply(loop,'H07-01','verify',proof)).toThrow('Failed or stale');
    loop=apply(loop,'H07-01','check',record(loop,'H07-01','baseline'));
    const done=apply(loop,'H07-01','verify',proof);
    expect(done.tasks[0].verificationHistory[0].checks).toHaveLength(4);
    expect(done.tasks[0].attempts[0].checks).toHaveLength(6);
    expect(()=>apply(newLoop(source,evaluation),'H07-01','start',{},'d'.repeat(64))).toThrow('preserve');
    expect(()=>apply(checked(),'H07-01','verify',proof,source,'d'.repeat(64))).toThrow('stale');
  });
  it('enforces actual ownership and dependencies and preserves attempts while invalidating descendants',()=>{
    let loop=candidate();
    expect(()=>apply(loop,'V07-02','start')).toThrow('Dependencies');
    loop=complete(loop,'V07-01');
    loop=apply(loop,'V07-02','start');
    expect(()=>apply(loop,'V07-03','start')).toThrow('already owned');
    loop=apply(loop,'V07-02','retry',{reason:'worker interrupted'});
    expect(loop.tasks.find((t:{id:string})=>t.id==='V07-02').attempts).toHaveLength(1);
    loop=complete(loop,'V07-02');
    loop=apply(loop,'V07-04','start');
    loop=apply(loop,'V07-01','invalidate',{reason:'preregistration changed'});
    expect(loop.tasks.find((t:{id:string})=>t.id==='V07-02').status).toBe('pending');
    expect(loop.tasks.find((t:{id:string})=>t.id==='V07-02').verificationHistory).toHaveLength(1);
    expect(loop.tasks.find((t:{id:string})=>t.id==='V07-04').status).toBe('pending');
    expect(loop.tasks[0].status).toBe('verified');
  });
  it('unlocks release only after every candidate task; a candidate change returns release to candidate',()=>{
    let loop=candidate();
    for(const task of loop.tasks.filter((t:{stage:string})=>t.stage==='candidate'))loop=complete(loop,task.id);
    loop=advancePhase(loop,'release',source,evaluation);
    loop=apply(loop,'V07-07','start');
    loop=apply(loop,'V07-05','invalidate',{reason:'progression fix'});
    expect(loop.phase).toBe('candidate');
    expect(loop.tasks.find((t:{id:string})=>t.id==='V07-07').status).toBe('pending');
    expect(()=>apply(loop,'V07-07','start')).toThrow('locked');
  });
  it('rejects mandatory exclusion and requires three distinct environmental recovery records',()=>{
    const loop=apply(newLoop(source,evaluation),'H07-01','start');
    expect(()=>apply(loop,'H07-01','exclude',{reason:'skip'})).toThrow('mandatory');
    expect(()=>apply(loop,'H07-01','block',{reason:'environment',attemptEvidence:['same','same','same']})).toThrow('three different');
    expect(apply(loop,'H07-01','block',{reason:'environment',attemptEvidence:['one','two','three']}).tasks[0].status).toBe('blocked');
    expect(pathsOverlap('tests','tests/a.ts')).toBe(true);
    expect(pathsOverlap('tests','tests-other/a.ts')).toBe(false);
  });
  it('rechecks accepted AC and command log bytes before a later phase can trust their history',()=>{
    const loop=complete(newLoop(source,evaluation),'H07-01');
    expect(()=>verifyRecordedEvidence(loop)).toThrow('Missing recorded');
    const verification=loop.tasks[0].verificationHistory.at(-1);
    verification.ac={path:'synthetic-ac.md',sha256:sha256('fixture')};
    for(const check of verification.checks)check.sha256=sha256('fixture');
    expect(verifyRecordedEvidence(loop,()=>Buffer.from('fixture'),syntheticArtifacts)).toBe(loop);
    expect(()=>verifyRecordedEvidence(loop,()=>Buffer.from('replaced'))).toThrow('AC evidence changed');
    expect(()=>verifyRecordedEvidence(loop,(path:string)=>Buffer.from(path==='synthetic-ac.md'?'fixture':'replaced'))).toThrow('check log changed');
  });
  it('quotes a run directory containing shell metacharacters literally',()=>{
    const directory="/tmp/v7 O'Brien $(echo dangerous)`echo dangerous`";
    const loop=newLoop(source,evaluation,directory);
    const command=registeredCommand(loop,loop.tasks[0],'baseline');
    const result=spawnSync('/bin/zsh',['-c',`set -- ${command}; printf '%s' "$4"`],{encoding:'utf8'});
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(directory+'/evidence/baseline.json');
    expect(registeredCommand(loop,loop.tasks[0],'gates')).toBe(GATES);
  });
  it('records generated artifacts after checks and rejects changed/deleted originals at verification and phase resume',()=>{
    const dir=mkdtempSync(join(tmpdir(),'desmon-v7-artifacts-'));
    const step=(loop:ReturnType<typeof newLoop>,action:string,payload={})=>transition(loop,'H07-01',action,payload,source,evaluation,files);
    try {
      let loop=step(newLoop(source,evaluation,dir),'start');
      const log=join(dir,'command.log'),review=join(dir,'review.md');
      writeFileSync(log,'fixture');writeFileSync(review,'fixture');
      const result=(commandId:string)=>({...record(loop,'H07-01',commandId),log,sha256:sha256('fixture'),
        artifacts:artifactManifest(loop,loop.tasks[0],commandId)});
      const missing=result('baseline');
      expect(Object.values(missing.artifacts)[0]).toEqual({[join(dir,'evidence/baseline.json')]:null});
      loop=step(loop,'check',missing);
      for(const ac of loop.tasks[0].ac)for(const path of ac.artifacts) {
        const artifact=resolve(path.replaceAll('{runDir}',dir));mkdirSync(dirname(artifact),{recursive:true});writeFileSync(artifact,'original');
      }
      for(const id of ['harness','preservation','gates'])loop=step(loop,'check',result(id));
      const evidence={...proof,ac:{path:review,sha256:sha256('fixture')}};
      expect(()=>step(loop,'verify',evidence)).toThrow('incomplete AC artifact');
      const baseline=result('baseline');
      expect(()=>step(loop,'check',{...baseline,artifacts:{}})).toThrow('every registered artifact');
      loop=step(loop,'check',baseline);
      const artifact=join(dir,'evidence/baseline.json');
      writeFileSync(artifact,'changed');expect(()=>step(loop,'verify',evidence)).toThrow('artifact changed');
      rmSync(artifact);expect(()=>step(loop,'verify',evidence)).toThrow('artifact changed');
      writeFileSync(artifact,'original');const done=step(loop,'verify',evidence);
      expect(done.tasks[0].attempts[0].checks).toHaveLength(5);
      expect(verifyRecordedEvidence(done)).toBe(done);
      expect(advancePhase(done,'candidate',source,evaluation).phase).toBe('candidate');
      writeFileSync(artifact,'changed after verification');
      expect(()=>verifyRecordedEvidence(done)).toThrow('artifact changed');
      writeFileSync(join(dir,'loop.json'),JSON.stringify(done));
      const resumed=spawnSync(process.execPath,[resolve('.harness/v7/loop/develop.mjs'),'phase',dir,'candidate'],{encoding:'utf8'});
      expect(resumed.status).toBe(1);expect(resumed.stderr).toContain('artifact changed');
      expect(readFileSync(log,'utf8')).toBe('fixture');
    } finally {rmSync(dir,{recursive:true,force:true});}
  });
  it('binds every file in a registered artifact directory and rejects omitted paths and added files',()=>{
    const dir=mkdtempSync(join(tmpdir(),'desmon-v7-directory-'));
    try {
      let loop=candidate();for(const task of loop.tasks.filter((t:{stage:string})=>t.stage==='candidate'))loop=complete(loop,task.id);
      loop=advancePhase(loop,'release',source,evaluation);loop.runDir=dir;
      loop=apply(loop,'V07-07','start');
      const task=loop.tasks.find((t:{id:string})=>t.id==='V07-07'),native=join(dir,'evidence/native');
      mkdirSync(native,{recursive:true});writeFileSync(join(native,'matrix.json'),'original');writeFileSync(join(native,'screen.png'),'picture');
      const reader=(paths:string[])=>paths[0]===native?fileManifest(paths):syntheticArtifacts(paths);
      for(const id of [...task.ac.map((ac:{id:string})=>ac.id),'gates'])loop=apply(loop,'V07-07','check',{
        ...record(loop,'V07-07',id),artifacts:artifactManifest(loop,task,id,reader)});
      const verify=()=>transition(loop,'V07-07','verify',proof,source,evaluation,files,reader);
      expect(verify().tasks.at(-1).status).toBe('verified');
      writeFileSync(join(native,'extra.png'),'new');expect(verify).toThrow('artifact changed');
      rmSync(join(native,'extra.png'));expect(verify().tasks.at(-1).status).toBe('verified');
      const latest=loop.tasks.at(-1).attempts.at(-1).checks.find((check:{commandId:string})=>check.commandId==='matrix');
      delete latest.artifacts[native][join(native,'screen.png')];expect(verify).toThrow('artifact changed');
      latest.artifacts={};expect(verify).toThrow('artifact paths');
    } finally {rmSync(dir,{recursive:true,force:true});}
  });
  it('CLI records an actual failed registered check, rejects changed logs and resumes the same journal',()=>{
    const dir=mkdtempSync(join(tmpdir(),'desmon-v7-journal-'));
    const cli=(...args:string[])=>spawnSync(process.execPath,[resolve('.harness/v7/loop/develop.mjs'),...args],{encoding:'utf8'});
    try {
      expect(cli('init',dir).status).toBe(0);
      expect(cli('init',dir).status).toBe(1);
      expect(cli('start',dir,'H07-01').status).toBe(0);
      const failed=cli('check',dir,'H07-01','baseline');
      expect(failed.status).not.toBe(0);
      const state=JSON.parse(readFileSync(join(dir,'loop.json'),'utf8'));
      const check=state.tasks[0].attempts[0].checks[0];
      expect(check.commandId).toBe('baseline');expect(existsSync(check.log)).toBe(true);
      writeFileSync(check.log,'tampered');
      const rejected=cli('verify',dir,'H07-01',check.log);
      expect(rejected.status).toBe(1);expect(rejected.stderr).toContain('log changed');
      expect(cli('retry',dir,'H07-01','recorded failure').status).toBe(0);
      expect(JSON.parse(readFileSync(join(dir,'loop.json'),'utf8')).tasks[0].attempts).toHaveLength(1);
    } finally {rmSync(dir,{recursive:true,force:true});}
  });
});
