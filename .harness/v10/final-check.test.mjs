import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { artifactHash, validateInstalledCopy, validateReceipts, validateReviews, validatePerformanceReview } from './final-check.mjs';
import { GATES, ROOT, sha } from './run.mjs';
import { isDesmonProcess, parseProcessTable, validateSlotIsolation, verifyIsolation, ISOLATION, SCHEDULE } from './performance-isolation.mjs';
import { observerVersions } from './performance-report.mjs';
const fixture=fn=>{const root=mkdtempSync(join(tmpdir(),'v10-final-'));try{fn(root);}finally{rmSync(root,{recursive:true,force:true});}};
test('directory package identity includes file content and symlink destination without following cycles',()=>fixture(root=>{
  writeFileSync(join(root,'app'),'first');symlinkSync('.',join(root,'cycle'));
  const first=artifactHash(root);assert.equal(first,artifactHash(root));
  writeFileSync(join(root,'app'),'changed');assert.notEqual(first,artifactHash(root));
}));
test('same-version installer with an older payload or changed native file cannot match the verified app',()=>fixture(root=>{
  const current=join(root,'current'), installed=join(root,'installed');
  for(const path of [current,installed]) {
    mkdirSync(path);writeFileSync(join(path,'package.json'),'{"version":"0.10.0"}');
    writeFileSync(join(path,'app.asar'),'current source');writeFileSync(join(path,'native.node'),'native');
  }
  assert.doesNotThrow(()=>validateInstalledCopy(current,installed));
  writeFileSync(join(installed,'app.asar'),'older source, same version');
  assert.throws(()=>validateInstalledCopy(current,installed),/Installer payload differs/);
  writeFileSync(join(installed,'app.asar'),'current source');writeFileSync(join(installed,'native.node'),'older native');
  assert.throws(()=>validateInstalledCopy(current,installed),/Installer payload differs/);
}));
test('only latest canonical gates and exact source-bound task AC are accepted; final task is non-circular',()=>fixture(run=>{
  const log=join(run,'log');writeFileSync(log,'pass');
  const receipt={before:'source',after:'source',exitCode:0,log,logHash:sha('pass'),artifacts:{},at:'2026-09-17T01:00:00Z'};
  const definitions=[{id:'V10-01',ac:'node check.mjs {runDir}'},{id:'V10-10',ac:'node final.mjs'}];
  const task={id:'V10-01',status:'verified',verifiedSource:'source',checks:[{...receipt,id:'ac',command:`node check.mjs '${run}'`},{...receipt,id:'gates',command:GATES}]};
  const journal={version:10,run,tasks:[task,{id:'V10-10',status:'running',checks:[]}]};
  assert.doesNotThrow(()=>validateReceipts(journal,'source',run,definitions));
  task.checks.push({...receipt,id:'gates',command:GATES,exitCode:1,at:'2026-09-17T02:00:00Z'});
  assert.throws(()=>validateReceipts(journal,'source',run,definitions),/Latest canonical/);
  task.checks.pop();task.checks[0].command='echo approved';
  assert.throws(()=>validateReceipts(journal,'source',run,definitions),/Latest AC/);
}));
test('independent review requires author separation, current source and explicit external limitations',()=>fixture(root=>{
  const evidence=join(root,'review.md');writeFileSync(evidence,'Independent review');
  const scopes={
    'core-host':['src/core/equipment.ts','src/core/engine.ts','src/core/save.ts','src/main/ipc.ts','src/main/coordinator.ts','src/main/recovery.ts','src/renderer/index.ts','src/menu/equipment.ts'],
    backend:['src/server/app.ts','src/server/gold.ts','src/server/store.ts','src/server/pgStore.ts','src/main/net.ts','src/shared/api.ts'],
    visual:['src/renderer/game.ts','src/renderer/anim.ts','src/core/fsm.ts'],
  };
  const authors={'core-host':['/root','/root/equipment_economy'],backend:['/root/backend_v10'],visual:['/root/sprite_qa']};
  const reviews=Object.entries(scopes).map(([scope,files])=>({scope,reviewer:'/root/independent',implementedBy:authors[scope],verdict:'approved',evidence:{path:evidence,sha256:sha('Independent review')},sourceHashes:Object.fromEntries(files.map(path=>{
    mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),'source');return[path,sha('source')];
  }))}));
  const document={version:10,source:'current',passed:true,reviews,externalChecks:Object.fromEntries(['windowsHardware','postgresql','humanFun'].map(key=>[key,{performed:false,note:'Not performed'}]))};
  assert.doesNotThrow(()=>validateReviews(document,'current',root));
  reviews[1].reviewer='/root/backend_v10';assert.throws(()=>validateReviews(document,'current',root),/Self-approval/);
  reviews[1].reviewer='/root/independent';document.externalChecks.postgresql={performed:true,note:'Claimed'};
  assert.throws(()=>validateReviews(document,'current',root),/Missing artifact/);
  document.externalChecks.postgresql={performed:false,note:'No live database'};writeFileSync(join(root,'src/main/net.ts'),'new source');
  assert.throws(()=>validateReviews(document,'current',root),/Reviewed source changed/);
}));
function isolationFixture() {
  const lifecycle={version:1,observerPid:10,childPid:20,userData:'/tmp/desmon-v10-perf-unique',appPath:'/tmp/DesMon.app',appHash:'hash',
    startedAt:'2026-09-18T00:00:01.000Z',state:'complete',cancelSignal:null,cleanup:{state:'complete',remaining:[],finishedAt:'2026-09-18T00:00:14.000Z'}};
  const main={pid:20,ppid:10,pgid:10,started:lifecycle.startedAt,command:'/tmp/DesMon.app/Contents/MacOS/DesMon --user-data-dir='+lifecycle.userData};
  const helper={pid:21,ppid:20,pgid:10,started:lifecycle.startedAt,command:'/tmp/DesMon.app/Contents/Frameworks/DesMon Helper (GPU).app/Contents/MacOS/DesMon Helper (GPU) --type=gpu-process'};
  const rows=[[0,'before',[]],[5,'during',[main,helper]],[10,'during',[main,helper]],[15,'after',[]]].map(([second,phase,processes])=>
    ({at:`2026-09-18T00:00:${String(second).padStart(2,'0')}.000Z`,slot:'baseline-active',phase,processes,tableRows:100}));
  const report={appPath:lifecycle.appPath,appHash:lifecycle.appHash,isolation:{userData:lifecycle.userData},cleanup:structuredClone(lifecycle.cleanup),cancelSignal:null,
    startedAt:'2026-09-18T00:00:02.000Z',finishedAt:'2026-09-18T00:00:13.000Z'};
  return {lifecycle,rows,report,main,helper};
}
test('process inventory fails closed on parser loss and includes reparented helpers without treating other Electron apps as DesMon',()=>{
  const text=' 20 1 10 Fri Sep 18 09:00:01 2026 /tmp/DesMon.app/Contents/MacOS/DesMon --user-data-dir=/tmp/desmon-v10-perf-u';
  assert(isDesmonProcess(parseProcessTable(text)[0]));
  assert(isDesmonProcess(isolationFixture().helper));
  assert(isDesmonProcess({command:'/tmp/DesMon.app/Contents/Frameworks/Electron Framework.framework/Helpers/chrome_crashpad_handler --database=/tmp/desmon-v10-perf-old/Crashpad'}));
  assert(!isDesmonProcess({command:'/tmp/Electron.app/Contents/Frameworks/Electron Framework.framework/Helpers/chrome_crashpad_handler --database=/tmp/personal/Crashpad'}));
  assert(!isDesmonProcess({command:'/tmp/Electron.app/Contents/MacOS/Electron /tmp/user-project'}));
  assert.throws(()=>parseProcessTable(text+'\nmalformed row'),/Unparsed/);
  assert.throws(()=>parseProcessTable(''),/Unparsed/);
  assert.throws(()=>parseProcessTable(text+'\n'+text),/duplicate/);
});
test('isolation rejects the surviving app, helper-only boundaries and unexpected mid-observation apps',()=>{
  const {rows,lifecycle,report,main,helper}=isolationFixture();
  assert.doesNotThrow(()=>validateSlotIsolation(rows,lifecycle,report));
  rows[0].processes=[{...main,pid:99,ppid:1}];
  assert.throws(()=>validateSlotIsolation(rows,lifecycle,report),/boundary/);
  rows[0].processes=[];rows.at(-1).processes=[{...helper,ppid:1}];
  assert.throws(()=>validateSlotIsolation(rows,lifecycle,report),/boundary/);
  rows.at(-1).processes=[];rows[2].processes.push({...main,pid:99,ppid:1});
  assert.throws(()=>validateSlotIsolation(rows,lifecycle,report),/Unexpected competing/);
});
test('isolation binds launch, exact app identity, ownership, cadence, and completed cleanup',()=>{
  const check=change=>{const value=isolationFixture();change(value);assert.throws(()=>validateSlotIsolation(value.rows,value.lifecycle,value.report));};
  check(({rows})=>{rows[1].processes[0].ppid=1;});
  check(({rows})=>{rows[1].processes[0].command=rows[1].processes[0].command.replace('unique','old');});
  check(({rows})=>{rows[1].processes[0].started='2026-09-17T00:00:00Z';});
  check(({rows})=>{rows.splice(1,2);});
  check(({lifecycle})=>{lifecycle.cleanup.state='pending';});
  check(({lifecycle})=>{lifecycle.cleanup.remaining=[{pid:20}];});
  check(({lifecycle})=>{lifecycle.cancelSignal='SIGTERM';});
  check(({report})=>{report.appHash='another app';});
  check(({report})=>{report.cleanup.finishedAt='2026-09-18T00:00:20Z';});
  check(({rows})=>{rows[0].at='2026-09-18T00:00:03Z';});
  check(({rows})=>{rows[1].tableRows=0;});
  check(({rows})=>{rows[1].processes=[];});
});
test('a known helper may reparent during cleanup, but a never-observed orphan cannot establish ownership',()=>{
  const {rows,lifecycle,report,helper}=isolationFixture();
  report.finishedAt='2026-09-18T00:00:09Z';
  rows[2].processes=[{...helper,ppid:1}];
  assert.doesNotThrow(()=>validateSlotIsolation(rows,lifecycle,report));
  rows[1].processes.pop();
  assert.throws(()=>validateSlotIsolation(rows,lifecycle,report),/Unexpected competing/);
});
test('numeric pass alone cannot approve performance, and result review binds completed isolation evidence',()=>fixture(root=>{
  const comparison={path:join(root,'comparison.json'),sha256:sha('{}')};writeFileSync(comparison.path,'{}');
  const registered=JSON.stringify({independentReviewer:'/root/equipment_economy'}),registration={path:join(root,'registration.json'),sha256:sha(registered)};writeFileSync(registration.path,registered);
  const data=JSON.stringify({endedAt:'2026-09-18T00:00:00Z',registration}),isolation={path:join(root,'isolation.json'),sha256:sha(data)};writeFileSync(isolation.path,data);
  const review={version:1,source:'current',scope:'performance-result',verdict:'approved',reviewer:'/root/equipment_economy',at:'2026-09-18T00:01:00Z',comparison,isolation};
  assert.doesNotThrow(()=>validatePerformanceReview(review,comparison,isolation,'current'));
  assert.throws(()=>validatePerformanceReview(undefined,comparison,isolation,'current'),/Missing current/);
  assert.throws(()=>validatePerformanceReview({...review,reviewer:'/root/sprite_qa'},comparison,isolation,'current'),/cannot approve/);
  assert.throws(()=>validatePerformanceReview({...review,isolation:{...isolation,sha256:'old'}},comparison,isolation,'current'),/isolation differs/);
  assert.throws(()=>validatePerformanceReview({...review,at:'2026-09-17T23:59:00Z'},comparison,isolation,'current'),/predates/);
}));
test('complete isolation verification binds all five reports and rejects inter-slot gaps, Browser PID mismatch and changed lifecycle artifacts',()=>fixture(root=>{
  const save=(path,value)=>{writeFileSync(path,JSON.stringify(value));return {path,sha256:sha(readFileSync(path))};};
  const bind=path=>({path,sha256:sha(readFileSync(path))});
  const apps=Object.fromEntries(['baseline','candidate'].map(kind=>{
    const path=join(root,kind+'.app/Contents/Resources/app.asar');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,kind);return [kind,bind(path)];
  }));
  const registration=save(join(root,'registration.json'),{version:2,source:'current',registeredAt:'2026-09-17T22:00:00Z',
    registeredBy:'/root',independentReviewer:'/root/equipment_economy',schedule:SCHEDULE,isolation:ISOLATION,apps,observers:observerVersions(),
    protocol:bind(join(ROOT,'docs/v0.10/PERFORMANCE_PROTOCOL.json')),runner:bind(join(ROOT,'.harness/v10/performance-isolation.mjs')),
    rules:{noAgentConcurrentWork:'No agent jobs',selection:'One block',ambient:'Uncontrolled ordinary user apps'}});
  const methodReview=save(join(root,'method.json'),{registration,reviewer:'/root/equipment_economy',verdict:'approved-methodology-only',at:'2026-09-17T23:00:00Z'});
  const allRows=[],comparison={artifacts:{}},slots=[];
  for(const [i,[slot]] of SCHEDULE.entries()) {
    const {lifecycle,report,rows}=isolationFixture(),app=apps[slot.startsWith('baseline')?'baseline':'candidate'];
    const shift=value=>new Date(Date.parse(value)+i*20000).toISOString();
    const appPath=app.path.replace('/Contents/Resources/app.asar','');
    lifecycle.appPath=report.appPath=appPath;lifecycle.appHash=report.appHash=app.sha256;
    lifecycle.startedAt=shift(lifecycle.startedAt);lifecycle.cleanup.finishedAt=shift(lifecycle.cleanup.finishedAt);
    report.cleanup=structuredClone(lifecycle.cleanup);report.startedAt=shift(report.startedAt);report.finishedAt=shift(report.finishedAt);
    for(const row of rows) {
      row.at=shift(row.at);row.slot=slot;
      row.processes=row.processes.map(process=>({...process,started:lifecycle.startedAt,command:process.command.replace('/tmp/DesMon.app',appPath)}));
    }
    allRows.push(...rows);
    const rawPath=join(root,slot+'.metrics');writeFileSync(rawPath,JSON.stringify({processes:[{pid:lifecycle.childPid,type:'Browser',creationTime:Date.parse(lifecycle.startedAt)}]})+'\n');
    report.raw=bind(rawPath);report.lifecyclePath=join(root,slot+'.lifecycle');
    const lifecycleBinding=save(report.lifecyclePath,lifecycle),reportBinding=save(join(root,slot+'.json'),report);
    slots.push({slot,report:reportBinding,lifecycle:lifecycleBinding});comparison.artifacts[slot]=reportBinding;
  }
  const rawPath=join(root,'processes.jsonl'),writeRows=rows=>{writeFileSync(rawPath,rows.map(row=>JSON.stringify(row)).join('\n')+'\n');return bind(rawPath);};
  const document={version:1,source:'current',state:'complete',startedAt:'2026-09-18T00:00:00Z',endedAt:'2026-09-18T00:01:35Z',registration,methodReview,slots,samples:allRows.length,raw:writeRows(allRows)};
  const path=join(root,'isolation.json');save(path,document);
  assert.equal(Object.keys(verifyIsolation(path,comparison,'current')).length,5);
  const gap=structuredClone(allRows);for(const row of gap.filter(row=>row.slot!=='baseline-active'))row.at=new Date(Date.parse(row.at)+20000).toISOString();
  document.raw=writeRows(gap);save(path,document);assert.throws(()=>verifyIsolation(path,comparison,'current'),/Global isolation cadence/);
  document.raw=writeRows(allRows);save(path,document);
  const badComparison=structuredClone(comparison);badComparison.artifacts.mixed.sha256='0'.repeat(64);
  assert.throws(()=>verifyIsolation(path,badComparison,'current'),/report mismatch/);
  const first=slots[0],report=JSON.parse(readFileSync(first.report.path));
  writeFileSync(report.raw.path,JSON.stringify({processes:[{pid:999,type:'Browser',creationTime:Date.parse('2026-09-18T00:00:01Z')}]})+'\n');
  report.raw=bind(report.raw.path);first.report=save(first.report.path,report);comparison.artifacts[first.slot]=first.report;save(path,document);
  assert.throws(()=>verifyIsolation(path,comparison,'current'),/measured Browser/);
  writeFileSync(first.lifecycle.path,'{}');
  assert.throws(()=>verifyIsolation(path,comparison,'current'),/artifact changed/);
}));
