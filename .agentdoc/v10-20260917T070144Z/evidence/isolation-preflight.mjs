import {setInterval,clearInterval} from 'node:timers';
import console from 'node:console';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {snapshot,validateSlotIsolation} from '../../../.harness/v10/performance-isolation.mjs';
import {runObservedChild} from '../../../.harness/v10/run-performance.mjs';
const run=resolve('.agentdoc/v10-20260917T070144Z'),out=join(run,'evidence/isolation-normal-01');
mkdirSync(out);const results=[];
for(const [slot,observer,app] of [
 ['baseline-active','.harness/v10/performance.mjs',join(run,'preservation/DesMon-0.9.1.app')],
 ['candidate-active','.harness/v10/performance-v4.mjs',resolve('release/mac-arm64/DesMon.app')],
]){
 const output=join(out,slot+'.json'),rows=[snapshot(slot,'before')];assert.equal(rows[0].processes.length,0);
 let timer,error;
 const result=await runObservedChild([observer,app,output,'active','0.5'],child=>{
  timer=setInterval(()=>{try{rows.push(snapshot(slot,'during'));}catch(e){error=e;child.kill('SIGTERM');}},5000);
 },()=>{});
 clearInterval(timer);rows.push(snapshot(slot,'after'));
 writeFileSync(output+'.inventories.json',JSON.stringify(rows,null,2)+'\n');
 assert(!error,String(error));assert.equal(result.code,0);
 const report=JSON.parse(readFileSync(output)),lifecycle=JSON.parse(readFileSync(report.lifecyclePath));
 const verified=validateSlotIsolation(rows,lifecycle,report);results.push({slot,...verified,report:output});
 writeFileSync(join(out,'summary.json'),JSON.stringify({purpose:'Normal completion and process-isolation preflight only; not duration or performance acceptance',results},null,2)+'\n');
 console.log(JSON.stringify(results.at(-1)));
}
