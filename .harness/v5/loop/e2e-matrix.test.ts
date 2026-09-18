import { describe, it, expect } from 'vitest';
// @ts-expect-error executable Node harness has no declaration file
import { aggregateRuns, COMBINATIONS, processGroupAlive } from './e2e-matrix.mjs';
// @ts-expect-error executable Node harness has no declaration file
import { sha256 } from './evidence.mjs';
const digest = 'a'.repeat(64);
function fixture() {
  const files = new Map<string, Buffer>(); let now = 0;
  const records = COMBINATIONS.map(({minutes, profile}: {minutes: number; profile: string}, i: number) => {
    const path = `/case/${i}.json`; const screenshot = `/case/${i}.png`;
    files.set(screenshot, Buffer.from(`pixels${i}`));
    const run = {mode:'electron-e2e',sourceDigest:digest,evaluationDigest:digest,startedAt:new Date(now).toISOString(),elapsedMs:minutes*60000+100,status:'passed',
      sessions:[{minutes,profile,mode:'real-time',elapsedMs:minutes*60000,inputs:profile==='idle'?0:100,start:{},end:{},timeline:[{elapsedMs:minutes*60000}]}],
      screenshots:[{path:screenshot,sha256:sha256(files.get(screenshot))}],checks:[{id:'native',passed:true,details:{}}],errors:[]};
    now += run.elapsedMs + 1;
    files.set(path,Buffer.from(JSON.stringify(run)));
    return {path,sha256:sha256(files.get(path)),exitCode:0};
  });
  return {files,records,read:(path:string)=>files.get(path)!};
}
describe('nine independent real-time E2E aggregation', () => {
  it('aggregates all originals and preserves screenshot hashes and observed time', () => {
    const f = fixture(); const aggregate = aggregateRuns(f.records,digest,digest,f.read);
    expect(aggregate.status).toBe('passed');expect(aggregate.observationMs).toBe(150*60000);
    expect(aggregate.sessions).toHaveLength(9);expect(aggregate.screenshots).toHaveLength(9);
  });
  it('rejects missing, duplicate, altered and mismatched evidence', () => {
    const f = fixture();
    expect(()=>aggregateRuns(f.records.slice(1),digest,digest,f.read)).toThrow(/nine/);
    expect(()=>aggregateRuns([f.records[0],...f.records.slice(0,8)],digest,digest,f.read)).toThrow(/Duplicate/);
    expect(()=>aggregateRuns(f.records,'b'.repeat(64),digest,f.read)).toThrow(/Stale/);
    f.files.set('/case/0.png',Buffer.from('changed'));
    expect(()=>aggregateRuns(f.records,digest,digest,f.read)).toThrow(/Screenshot/);
  });
  it('rejects short or overlapping real-time claims and retains genuine failures', () => {
    const mutate = (field: string, value: unknown) => {
      const f = fixture(); const run=JSON.parse(f.files.get('/case/1.json')!.toString());
      if(field==='short')run.sessions[0].elapsedMs=1;else run[field]=value;
      f.files.set('/case/1.json',Buffer.from(JSON.stringify(run)));f.records[1].sha256=sha256(f.files.get('/case/1.json'));return f;
    };
    let f=mutate('short',null);expect(()=>aggregateRuns(f.records,digest,digest,f.read)).toThrow(/too short/);
    f=mutate('startedAt',new Date(0).toISOString());expect(()=>aggregateRuns(f.records,digest,digest,f.read)).toThrow(/overlap/);
    f=mutate('status','failed');f.records[1].exitCode=1;
    expect(aggregateRuns(f.records,digest,digest,f.read).status).toBe('failed');
    f=fixture();f.records[1].exitCode=1;expect(()=>aggregateRuns(f.records,digest,digest,f.read)).toThrow(/hidden/);
  });
  it.each([
    ['elapsedMs', '300000', false, /elapsed/],
    ['elapsedMs', null, false, /elapsed/],
    ['elapsedMs', '300100', true, /timestamps/],
    ['inputs', 100, false, /zero inputs/],
    ['inputs', '0', false, /input count/],
    ['inputs', -1, false, /input count/],
    ['inputs', .5, false, /input count/],
    ['timeline', [{}], false, /timeline/],
    ['timeline', [{elapsedMs:20},{elapsedMs:10}], false, /timeline/],
    ['checks', [{passed:true,details:{}}], true, /checks/],
  ])('rejects malformed native observation %s=%j', (field, value, topLevel, message) => {
    const f=fixture(); const run=JSON.parse(f.files.get('/case/1.json')!.toString());
    (topLevel?run:run.sessions[0])[field]=value;
    f.files.set('/case/1.json',Buffer.from(JSON.stringify(run)));f.records[1].sha256=sha256(f.files.get('/case/1.json'));
    expect(()=>aggregateRuns(f.records,digest,digest,f.read)).toThrow(message);
  });
  it('checks the detached process group even after the wrapper has exited, refusing ambiguous legacy resumes', () => {
    const running={pid:123,processGroupId:123};const calls:number[]=[];
    expect(processGroupAlive(running,(pid:number,signal:number)=>{calls.push(pid);expect(signal).toBe(0);})).toBe(true);
    expect(calls).toEqual([-123]);
    expect(processGroupAlive(running,()=>{throw Object.assign(new Error('gone'),{code:'ESRCH'});})).toBe(false);
    expect(processGroupAlive(running,()=>{throw Object.assign(new Error('permission'),{code:'EPERM'});})).toBe(true);
    expect(()=>processGroupAlive({pid:123},()=>undefined)).toThrow(/process group identity/);
    expect(()=>processGroupAlive({pid:0,processGroupId:0},()=>undefined)).toThrow(/process group identity/);
  });
});
