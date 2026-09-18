import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import ts from 'typescript';
import { sha } from './run.mjs';
import { summarize, validateRows, verifyBalance } from './balance-verify.mjs';
const protocol={policies:['new-active'],horizonsMinutes:[120,480],hardGates:{maxProcessingMsPerVirtualHour:10000},selection:{firstCommonPurchaseActiveMedianMinutes:{minimum:10,maximum:120},activeMedianWeaponAttackGainAfterTwoHoursMinimumPercent:5}};
const row=(seed,minutes)=>({policy:'new-active',seed,minutes,coins:'90071992547409930000',income:'90071992547409930100',sales:'0',spent:'100',enhanceSpend:'50',expansionSpend:'0',attack:'100',
  firstPurchase:20,firstCommonPurchase:20,purchases:1,level:15,reincarnations:0,kills:500,bosses:60,legendaryBosses:1,eligibleBossObservations:50,eligibleAttempts:30,epicItems:0,rebirthUnequips:0,tempDestroyed:0,enhanceDestroyed:0,bag:0,capacity:24,temporary:0,
  sameFourCopyFraction:0,epicZeroPrediction:.94,processingMs:100,weaponGainPercent:10,weaponlessLongestMs:1000,tierMinutes:[1,1,1,1],templateMinutes:{sword:4},templateZeroPredictions:Object.fromEntries(Array.from({length:56},(_,i)=>['epic'+i,.999]))});
const rows=()=>Array.from({length:4},(_,i)=>protocol.horizonsMinutes.map(minutes=>row(i+50001,minutes))).flat();
test('held-out denominator, distinct tuples, seed ranges and exact huge-wallet conservation are enforced',()=>{
  const data=rows(),seeds={first:50001,count:4};
  assert.equal(validateRows(data,protocol,seeds).passed,true);
  assert.throws(()=>validateRows(data.slice(1),protocol,seeds),/denominator/);
  assert.throws(()=>validateRows([data[0],...data.slice(0,-1)],protocol,seeds),/Duplicate/);
  const exploration=structuredClone(data);exploration[0].seed=10001;
  assert.throws(()=>validateRows(exploration,protocol,seeds),/Wrong seed/);
  const money=structuredClone(data);money[0].coins='90071992547409930001';
  assert.throws(()=>validateRows(money,protocol,seeds),/Currency conservation/);
});
test('non-arrival remains in unconditional percentiles and cannot turn an unsuccessful policy into a pass',()=>{
  const data=rows();for(const item of data.filter(item=>item.seed!==50001)){item.firstPurchase=null;item.firstCommonPurchase=null;}
  const report=summarize(data,protocol),group=report.summaries[0];
  assert.equal(group.firstCommonPurchase.p50,null);assert.equal(group.firstCommonPurchase.nonarrival,3);
  assert.equal(report.checks.firstPurchase,false);assert.equal(report.passed,false);
});
test('a never-used level tier and processing budget breach reject selection',()=>{
  const data=rows();data.forEach(item=>{item.tierMinutes[3]=0;item.processingMs=100000000;});
  const report=summarize(data,protocol);assert.equal(report.checks.allTiersUsed,false);assert.equal(report.checks.processing,false);
});
test('registered selection-only source change is accepted, but forged summary and non-parameter compile changes are rejected',()=>{
  const root=mkdtempSync(join(tmpdir(),'v10-balance-proof-'));
  const write=(path,value)=>{const file=join(root,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
  try {
    const p={...protocol,policies:['new-active','intermittent','companion-idle','wealthy-save','immediate-rebirth','deferred-rebirth','enhance-first','collect-first'],horizonsMinutes:[30,120,480],explorationSeeds:{first:10001,count:20},heldOutSeeds:{first:50001,count:100}};
    const candidates=['A','B','C'].map((id,i)=>({id,prices:[1500+i,6000,24000,96000],weaponAttack:[2+i,12,45,120],bossDropBps:6000,successK:39}));
    const code=candidate=>`export const balance = { prices: ${JSON.stringify(candidate.prices)}, weaponAttack: ${JSON.stringify(candidate.weaponAttack)}, bossDropBps: 6000, successK: 39 };\n`;
    write('docs/v0.10/EVALUATION_PROTOCOL.json',p);
    write('docs/v0.10/BALANCE_CANDIDATE.json',{candidateComparison:candidates.map(({weaponAttack,...candidate})=>({...candidate,weaponAttackPercent:weaponAttack}))});
    write('.harness/v10/balance.mjs','// frozen measurement code');write('src/core/equipment.ts',code(candidates[1]));
    const binding=candidate=>{const files={'equipment.ts':sha(code(candidate))};return {files,coreHash:sha(JSON.stringify(files,null,2)),protocolHash:sha(readFileSync(join(root,'docs/v0.10/EVALUATION_PROTOCOL.json'))),candidateHash:sha(readFileSync(join(root,'docs/v0.10/BALANCE_CANDIDATE.json'))),scriptHash:sha('// frozen measurement code'),candidates,definitions:{}};};
    for(const mode of ['explore','validate']) {
      const b=binding(candidates[mode==='explore'?0:1]),seeds=mode==='explore'?p.explorationSeeds:p.heldOutSeeds,reports=[];
      write(mode+'/binding.json',b);if(mode==='explore')write(mode+'/source-core/equipment.ts',code(candidates[0]));
      for(const candidate of mode==='explore'?candidates:[candidates[1]]) {
        write(`${mode}/compiled-${candidate.id}/equipment.js`,ts.transpileModule(code(candidate),{fileName:'equipment.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true}}).outputText);
        const all=[];
        for(const policy of p.policies) {
          const data=Array.from({length:seeds.count},(_,i)=>p.horizonsMinutes.map(minutes=>{
            const value={...row(seeds.first+i,minutes),policy};if(policy==='wealthy-save')value.coins=String(BigInt(value.coins)+1000000n);return value;
          })).flat();all.push(...data);write(`${mode}/${candidate.id}-${policy}.jsonl`,data.map(value=>JSON.stringify(value)).join('\n')+'\n');
        }
        const report={candidate,...summarize(all,p)};reports.push(report);write(`${mode}/${candidate.id}-report.json`,report);
      }
      write(mode+'/report.json',{mode,binding:b,after:b,reports});
    }
    const b=binding(candidates[1]);write('derivation.md','Registered B selected after comparison; simulations do not certify enjoyment.');
    write('final.json',{version:10,selected:'B',exploration:'explore',validation:'validate',report:'derivation.md',coreHash:b.coreHash,protocolHash:b.protocolHash,candidateHash:b.candidateHash,rows:2400,policies:8,seedsPerPolicy:100,hardGates:p.hardGates});
    assert.equal(verifyBalance(join(root,'final.json'),root).passed,true);
    const path=join(root,'validate/B-report.json'),previous=readFileSync(path,'utf8'),forged=JSON.parse(previous);forged.summaries[0].n=101;writeFileSync(path,JSON.stringify(forged));
    assert.throws(()=>verifyBalance(join(root,'final.json'),root),/Recomputed candidate report/);writeFileSync(path,previous);
    write('explore/compiled-A/equipment.js','exports.balance = {};');
    assert.throws(()=>verifyBalance(join(root,'final.json'),root),/Measured candidate compile/);
  } finally {rmSync(root,{recursive:true,force:true});}
});
