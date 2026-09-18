import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EventEmitter} from 'node:events';
import {observationCancellation,cleanupOwnedApp} from './performance.mjs';
import {runObservedChild} from './run-performance.mjs';
import {validateProtocol,validateObservation,observerVersions,comparableFixture} from './performance-report.mjs';
const protocol=JSON.parse(readFileSync(new URL('../../docs/v0.10/PERFORMANCE_PROTOCOL.json',import.meta.url)));
test('v10 keeps the registered full durations and budgets; missing/short evidence fails',()=>{
  assert.equal(validateProtocol(protocol).mixedMinutes,180);
  for(const [field,value] of [['comparisonMinutes',1],['mixedMinutes',3],['sampleMs',60000]]){
    const changed=structuredClone(protocol);changed.performance[field]=value;assert.throws(()=>validateProtocol(changed));
  }
  const changed=structuredClone(protocol);changed.performance.cpuP95Max.baselineMultiplier=2;assert.throws(()=>validateProtocol(changed));
  assert.throws(()=>validateObservation({passed:true,profile:'active',requestedMinutes:30},[],'candidate-active',protocol));
});
function idleFixture() {
  const fixture={version:3,level:1,killCount:0,coins:0,companions:Array.from({length:5},(_,i)=>({id:`c${i+1}`,speciesId:'slime',bossIndex:7,level:1,stars:0}))};
  const rows=Array.from({length:360},(_,i)=>({elapsedMs:(i+1)*5000,inputs:0,errors:[],cpu:1,workingSetMiB:2,
    processes:[{pid:1,creationTime:1,type:'Browser',cpu:.5,workingSetKiB:1024},{pid:2,creationTime:1,type:'Tab',cpu:.5,workingSetKiB:1024}],
    save:{...structuredClone(fixture),killCount:i,progress:{playTimeMs:(i+1)*5000}}}));
  const report={version:1,profile:'idle',requestedMinutes:30,passed:true,checks:Object.fromEntries(['duration','metrics','samples','progress','inputs','errors','appUnchanged','observerUnchanged'].map(k=>[k,true])),
    errors:[],exitCode:0,exitSignal:null,observationMs:1800000,startedAt:'2026-01-01T00:00:00.000Z',finishedAt:'2026-01-01T00:30:00.000Z',inputCount:0,
    isolation:{globalHooks:false,osPermissionPrompts:false,network:'offline',input:'synthetic production IPC',time:'real wall time; no engine ticks injected',userData:'/owned-fixture'},
    machine:{platform:'darwin',arch:'arm64',os:'fixture',cpu:'fixture',logicalCpus:8},metadata:{version:'0.9.1',runtime:{electron:'fixture'},fixture},raw:{samples:360},finalSave:structuredClone(rows.at(-1).save),
    summary:{cpuP95:1,workingSetMiBP95:2,initialMemoryMedian:2,finalMemoryMedian:null}};
  return {report,rows};
}
test('only the exact initial save can precede periodic clock persistence, within the unchanged lag limit',()=>{
  const {report,rows}=idleFixture();
  assert.deepEqual(validateObservation(report,rows,'baseline-idle',protocol).initialFixtureSamples,[]);
  rows[0].save=structuredClone(report.metadata.fixture);
  assert.deepEqual(validateObservation(report,rows,'baseline-idle',protocol).initialFixtureSamples,[5000]);
  const mismatched=structuredClone(rows);mismatched[0].save.coins=1;
  assert.throws(()=>validateObservation(report,mismatched,'baseline-idle',protocol),/Persisted play time/);
  const stale=structuredClone(rows);for(let i=0;i<3;i++)stale[i].save=structuredClone(report.metadata.fixture);
  assert.throws(()=>validateObservation(report,stale,'baseline-idle',protocol),/Persisted play time/);
  const later=idleFixture();later.rows[1].save=structuredClone(later.report.metadata.fixture);
  assert.throws(()=>validateObservation(later.report,later.rows,'baseline-idle',protocol),/Persisted play time/);
});
test('terminal capture inputs follow the measured schedule and remain outside the 180-minute result',()=>{
  const {report,rows:seed}=idleFixture();
  const active=ms=>Math.floor(ms/600000)*300000+Math.min(ms%600000,300000);
  const rows=Array.from({length:2160},(_,i)=>({...structuredClone(seed[0]),elapsedMs:(i+1)*5000,inputs:active((i+1)*5000)/500,
    save:{...structuredClone(seed[0].save),killCount:i,progress:{playTimeMs:(i+1)*5000}}}));
  Object.assign(report,{profile:'mixed',requestedMinutes:180,observationMs:10801750,finishedAt:'2026-01-01T03:00:01.750Z',inputCount:10803,
    finalSave:structuredClone(rows.at(-1).save)});
  report.metadata.version='0.10.0';report.metadata.fixture.version=4;report.metadata.fixture.coins='0';for(const row of rows){row.save.version=4;row.save.coins='0';}report.finalSave.version=4;report.finalSave.coins='0';report.raw.samples=2160;report.summary.finalMemoryMedian=2;
  report.finalSave.progress.playTimeMs=10801750;
  const result=validateObservation(report,rows,'mixed',protocol);
  assert.equal(result.input.actual,10800);
  assert.deepEqual(result.input.closeout,{elapsedMs:1750,expectedInputs:3.5,actualInputs:3,totalAtShutdown:10803});
  for(const count of [10799,10800,10807])assert.throws(()=>validateObservation({...report,inputCount:count},rows,'mixed',protocol),/Final input/);
  assert.throws(()=>validateObservation({...report,observationMs:10820000,finishedAt:'2026-01-01T03:00:20.000Z'},rows,'mixed',protocol),/duration/);
  const idle=idleFixture();idle.report.observationMs+=1750;idle.report.finishedAt='2026-01-01T00:30:01.750Z';idle.report.inputCount=1;
  assert.throws(()=>validateObservation(idle.report,idle.rows,'baseline-idle',protocol),/Final input/);
  const missing=structuredClone(rows);missing[100].inputs=0;
  assert.throws(()=>validateObservation(report,missing,'mixed',protocol),/input cadence/);
});

test('only the BigInt JSON boundary differs between the observers',()=>{
  const versions=observerVersions();assert.notEqual(versions.baseline.sha256,versions.candidate.sha256);
  assert.deepEqual(comparableFixture({version:3,coins:0,progress:{goldSpent:0}}),comparableFixture({version:4,coins:'0',progress:{goldSpent:'0'},equipment:{}}));
});

test('observer cancellation records the first signal and keeps handling repeated signals until disposal',()=>{
  const signals=new EventEmitter(),received=[];
  const cancellation=observationCancellation(signal=>received.push(signal),signals);
  signals.emit('SIGTERM');signals.emit('SIGINT');signals.emit('SIGTERM');
  assert.equal(cancellation.signal.aborted,true);
  assert.match(String(cancellation.signal.reason),/SIGTERM/);
  assert.deepEqual(received,['SIGTERM']);
  assert.equal(signals.listenerCount('SIGINT'),1);
  cancellation.dispose();assert.equal(signals.listenerCount('SIGTERM'),0);assert.equal(signals.listenerCount('SIGINT'),0);
});

function ownedProcessFixture() {
  const appPath='/fixture/DesMon.app',userData='/tmp/unique-owned-fixture';
  const root={pid:41,ppid:40,pgid:40,started:'Fri Sep 18 01:02:03 2026',command:appPath+'/Contents/MacOS/DesMon --user-data-dir='+userData};
  const helper={pid:42,ppid:41,pgid:900,started:root.started,command:appPath+'/Contents/Frameworks/DesMon Helper.app/Contents/MacOS/DesMon Helper --type=renderer'};
  const unrelated={...root,pid:99,ppid:1,command:appPath+'/Contents/MacOS/DesMon --user-data-dir=/personal-data'};
  return {appPath,userData,root,helper,unrelated};
}

test('cleanup follows owned descendants across groups and reparenting without signalling another fixture',async()=>{
  const {appPath,userData,root,helper,unrelated}=ownedProcessFixture();
  let rows=[root,helper,unrelated],ended=false,time=0;
  const sent=[];
  const result=await cleanupOwnedApp({childPid:root.pid,appPath,userData,hasExited:()=>ended},{
    table:()=>rows,now:()=>time,wait:async ms=>{time+=ms;},
    send:(pid,signal)=>{sent.push([pid,signal]);rows=rows.filter(row=>row.pid!==pid);if(pid===root.pid){ended=true;rows=rows.map(row=>row.pid===helper.pid?{...row,ppid:1}:row);}},
  });
  assert.equal(result.state,'complete');assert.deepEqual(result.remaining,[]);
  assert.deepEqual(sent,[[41,'SIGTERM'],[42,'SIGTERM']]);
  assert.deepEqual(result.owned.map(row=>row.pid).sort(),[41,42]);assert.deepEqual(rows,[unrelated]);
});

test('startup cancellation escalates only the exact owned identities when TERM is ignored',async()=>{
  const {appPath,userData,root,helper,unrelated}=ownedProcessFixture();
  let rows=[root,helper,unrelated],ended=false,time=0;
  const sent=[];
  const result=await cleanupOwnedApp({childPid:root.pid,appPath,userData,hasExited:()=>ended},{
    table:()=>rows,now:()=>time,wait:async ms=>{time+=ms;},graceMs:10,killMs:10,
    send:(pid,signal)=>{sent.push([pid,signal]);if(signal==='SIGKILL'){rows=rows.filter(row=>row.pid!==pid);if(pid===root.pid)ended=true;}},
  });
  assert.equal(result.state,'complete');assert.deepEqual(result.remaining,[]);
  assert.deepEqual(sent,[[41,'SIGTERM'],[41,'SIGKILL'],[42,'SIGKILL']]);assert.deepEqual(rows,[unrelated]);
});

test('cleanup recognizes a reparented helper by exact fixture path and does not signal a reused PID',async()=>{
  const {appPath,userData,root,helper,unrelated}=ownedProcessFixture();
  let rows=[root,{...helper,ppid:1,command:helper.command+' --user-data-dir='+userData},unrelated],ended=false,time=0;
  const sent=[];
  const replacement={...unrelated,pid:root.pid,started:'Fri Sep 18 01:02:04 2026'};
  const result=await cleanupOwnedApp({childPid:root.pid,appPath,userData,hasExited:()=>ended},{
    table:()=>rows,now:()=>time,wait:async ms=>{time+=ms;},
    send:(pid,signal)=>{sent.push([pid,signal]);rows=rows.filter(row=>row.pid!==pid);if(pid===root.pid){ended=true;rows.push(replacement);}},
  });
  assert.equal(result.state,'complete');assert.deepEqual(sent,[[41,'SIGTERM'],[42,'SIGTERM']]);
  assert.deepEqual(rows,[unrelated,replacement]);
});

test('surviving owned processes fail cleanup with their exact identities recorded',async()=>{
  const {appPath,userData,root}=ownedProcessFixture();let time=0;
  const result=await cleanupOwnedApp({childPid:root.pid,appPath,userData,hasExited:()=>false},{
    table:()=>[root],send:()=>{},now:()=>time,wait:async ms=>{time+=ms;},graceMs:10,killMs:10,
  });
  assert.equal(result.state,'failed');assert.deepEqual(result.remaining,[root]);assert.equal(time,20);
});

test('a crashed main before first scan does not hide its fixture-owned Crashpad process',async()=>{
  const {appPath,userData,helper,unrelated}=ownedProcessFixture();
  const crashpad={...helper,ppid:1,command:appPath+'/Contents/Frameworks/Electron Framework.framework/Helpers/chrome_crashpad_handler --database='+userData+'/Crashpad'};
  let rows=[crashpad,unrelated],time=0;const sent=[];
  const result=await cleanupOwnedApp({childPid:41,appPath,userData,hasExited:()=>true},{
    table:()=>rows,now:()=>time,wait:async ms=>{time+=ms;},
    send:(pid,signal)=>{sent.push([pid,signal]);rows=rows.filter(row=>row.pid!==pid);},
  });
  assert.equal(result.state,'complete');assert.deepEqual(sent,[[42,'SIGTERM']]);assert.deepEqual(rows,[unrelated]);
});

test('a helper PID reused after its parent is killed is checked again before signalling',async()=>{
  const {appPath,userData,root,helper,unrelated}=ownedProcessFixture();
  const replacement={...unrelated,pid:helper.pid,started:'Fri Sep 18 01:02:04 2026'};
  let rows=[root,helper,unrelated],ended=false,time=0;const sent=[];
  const result=await cleanupOwnedApp({childPid:root.pid,appPath,userData,hasExited:()=>ended},{
    table:()=>rows,now:()=>time,wait:async ms=>{time+=ms;},graceMs:10,killMs:10,
    send:(pid,signal)=>{sent.push([pid,signal]);if(pid===root.pid&&signal==='SIGKILL'){ended=true;rows=[replacement,unrelated];}},
  });
  assert.equal(result.state,'complete');assert.deepEqual(sent,[[41,'SIGTERM'],[41,'SIGKILL']]);assert.deepEqual(rows,[replacement,unrelated]);
});

test('queue signals only its observer and waits for close after exit and cleanup report',async()=>{
  const signals=new EventEmitter(),child=new EventEmitter(),sent=[],interrupted=[];
  child.pid=400;child.kill=signal=>{sent.push(signal);return true;};
  let completed=false,cleanupWritten=false;
  const result=runObservedChild(['observer'],()=>{},signal=>interrupted.push(signal),{
    signals,spawnProcess:(_exe,_args,options)=>{assert.equal(options.detached,true);return child;},
  }).then(value=>{completed=true;assert.equal(cleanupWritten,true);return value;});
  signals.emit('SIGINT');signals.emit('SIGTERM');
  child.emit('exit',1,null);await Promise.resolve();
  assert.equal(completed,false);assert.deepEqual(sent,['SIGINT']);assert.deepEqual(interrupted,['SIGINT']);
  cleanupWritten=true;child.emit('close',1,null);
  assert.deepEqual(await result,{code:1,signal:null,interrupted:'SIGINT'});
  assert.equal(signals.listenerCount('SIGTERM'),0);assert.equal(signals.listenerCount('SIGINT'),0);
});

test('queue still signals and awaits its observer when spawn/interrupt status persistence fails',async()=>{
  for(const stage of ['spawn','interrupt']) {
    const signals=new EventEmitter(),child=new EventEmitter(),sent=[];child.pid=400;
    child.kill=signal=>{sent.push(signal);return true;};
    const fail=()=>{throw Error('ENOSPC status write');};
    let completed=false;
    const pending=runObservedChild(['observer'],stage==='spawn'?fail:()=>{},stage==='interrupt'?fail:()=>{},
      {signals,spawnProcess:()=>child}).then(result=>{completed=true;return result;});
    if(stage==='interrupt')signals.emit('SIGTERM');
    await Promise.resolve();assert.equal(completed,false);assert.deepEqual(sent,['SIGTERM']);
    child.emit('exit',1,null);await Promise.resolve();assert.equal(completed,false);
    child.emit('close',1,null);const result=await pending;
    assert.equal(result.code,1);assert.match(result.error,/ENOSPC/);assert.equal(signals.listenerCount('SIGTERM'),0);
  }
});
