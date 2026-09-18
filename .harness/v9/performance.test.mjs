import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProtocol,validateObservation} from './performance-report.mjs';
const protocol=JSON.parse(readFileSync(new URL('../../docs/v0.9/EVALUATION_PROTOCOL.json',import.meta.url)));
test('v9 keeps the registered full durations and budgets; missing/short evidence fails',()=>{
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
    machine:{platform:'darwin',arch:'arm64',os:'fixture',cpu:'fixture',logicalCpus:8},metadata:{version:'0.8.0',runtime:{electron:'fixture'},fixture},raw:{samples:360},finalSave:structuredClone(rows.at(-1).save),
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
  report.metadata.version='0.9.0';report.raw.samples=2160;report.summary.finalMemoryMedian=2;
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
