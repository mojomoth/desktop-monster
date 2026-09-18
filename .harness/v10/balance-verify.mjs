#!/usr/bin/env node
// Independent receipt verification: never invokes the simulation or changes its frozen script.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { ROOT, sha } from './run.mjs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const money = n => typeof n === 'string' && /^(0|[1-9][0-9]*)$/.test(n);
const parameterKeys=['prices','weaponAttack','bossDropBps','successK'];
function substitute(source,candidate) {
  for(const key of parameterKeys) {
    const regex=new RegExp('('+key+': )'+(Array.isArray(candidate[key])?'\\[[^\\]]*\\]':'[0-9_]+'));
    assert(regex.test(source),'Missing registered parameter '+key);
    source=source.replace(regex,(_,prefix)=>prefix+JSON.stringify(candidate[key]));
  }
  return source;
}
function parameters(source) {
  return Object.fromEntries(parameterKeys.map(key=>{
    const match=source.match(new RegExp('\\b'+key+':\\s*(\\[[^\\]]*\\]|[0-9_]+)'));
    assert(match,'Missing production parameter '+key); return [key,JSON.parse(match[1].replaceAll('_',''))];
  }));
}
const percentile = (values, fraction) => {
  const n = [...values].sort((a,b) => a-b)[Math.floor((values.length-1)*fraction)];
  return Number.isFinite(n) ? n : null;
};
export function summarize(rows, protocol) {
  const summaries = [];
  for (const policy of protocol.policies) for (const minutes of protocol.horizonsMinutes) {
    const group = rows.filter(row => row.policy === policy && row.minutes === minutes);
    assert(group.length, 'Missing policy/horizon');
    const stats = {policy, minutes, n:group.length};
    for (const key of ['coins','income','spent','firstPurchase','firstCommonPurchase','weaponGainPercent','enhanceSpend','expansionSpend','tempDestroyed','enhanceDestroyed','bag','capacity','weaponlessLongestMs']) {
      const values = group.map(row => row[key] === null ? Infinity : Number(row[key]));
      stats[key] = {p10:percentile(values,.1),p50:percentile(values,.5),p90:percentile(values,.9),nonarrival:values.filter(n=>n===Infinity).length};
    }
    stats.tierMinutes = Array.from({length:4},(_,i)=>({p50:percentile(group.map(row=>row.tierMinutes[i]),.5),users:group.filter(row=>row.tierMinutes[i]>0).length}));
    stats.epicZeroRate = group.filter(row=>row.epicItems===0).length/group.length;
    stats.predictedEpicZeroRate = group.reduce((sum,row)=>sum+row.epicZeroPrediction,0)/group.length;
    stats.predictedSpecificEpicZeroRates = Object.fromEntries(Object.keys(group[0].templateZeroPredictions).map(id=>[id,group.reduce((sum,row)=>sum+row.templateZeroPredictions[id],0)/group.length]));
    stats.fourCopyRate = group.reduce((sum,row)=>sum+row.sameFourCopyFraction,0)/group.length;
    stats.processingMsPerVirtualHour = group.reduce((sum,row)=>sum+row.processingMs,0)/(group.length*minutes/60);
    summaries.push(stats);
  }
  const active = summaries.find(row=>row.policy==='new-active'&&row.minutes===120);
  const allTierUsers = Array.from({length:4},(_,i)=>rows.filter(row=>row.minutes===480&&!['wealthy-save','companion-idle'].includes(row.policy)&&row.tierMinutes[i]>0).length);
  const range = protocol.selection.firstCommonPurchaseActiveMedianMinutes;
  const checks = {
    firstPurchase: !!active && active.firstCommonPurchase.p50!==null && active.firstCommonPurchase.p50>=range.minimum && active.firstCommonPurchase.p50<=range.maximum,
    weaponBenefit: !!active && active.weaponGainPercent.p50>=protocol.selection.activeMedianWeaponAttackGainAfterTwoHoursMinimumPercent,
    allTiersUsed: allTierUsers.every(n=>n>0),
    processing: summaries.every(row=>row.processingMsPerVirtualHour<=protocol.hardGates.maxProcessingMsPerVirtualHour),
  };
  return {summaries,allTierUsers,checks,passed:Object.values(checks).every(Boolean),humanPlaytest:false};
}
export function validateRows(rows, protocol, seeds) {
  assert.equal(rows.length, protocol.policies.length*seeds.count*protocol.horizonsMinutes.length, 'Raw row denominator');
  const seen = new Set();
  let templateIds;
  for (const row of rows) {
    assert(protocol.policies.includes(row.policy) && protocol.horizonsMinutes.includes(row.minutes), 'Unknown policy/horizon');
    assert(Number.isInteger(row.seed) && row.seed>=seeds.first && row.seed<seeds.first+seeds.count, 'Wrong seed set');
    const key = `${row.policy}/${row.seed}/${row.minutes}`;
    assert(!seen.has(key), 'Duplicate seed/horizon row'); seen.add(key);
    for (const key of ['coins','income','sales','spent','enhanceSpend','expansionSpend','attack']) assert(money(row[key]), 'Noncanonical currency '+key);
    assert.equal(BigInt(row.coins), (row.policy==='wealthy-save'?1000000n:0n)+BigInt(row.income)+BigInt(row.sales)-BigInt(row.spent), 'Currency conservation');
    assert(BigInt(row.enhanceSpend)+BigInt(row.expansionSpend)<=BigInt(row.spent), 'Spending exceeds total');
    for (const key of ['firstPurchase','firstCommonPurchase']) assert(row[key]===null || finite(row[key])&&row[key]<=row.minutes, 'Invalid purchase time');
    for (const key of ['purchases','level','reincarnations','kills','bosses','legendaryBosses','eligibleBossObservations','eligibleAttempts','epicItems','rebirthUnequips','tempDestroyed','enhanceDestroyed','bag','capacity','temporary']) assert(Number.isSafeInteger(row[key])&&row[key]>=0, 'Invalid counter '+key);
    assert(row.bag<=row.capacity && row.legendaryBosses<=row.bosses && row.epicItems<=row.legendaryBosses && row.bosses<=row.kills, 'Impossible inventory/loot counts');
    assert(row.firstCommonPurchase===null || row.firstPurchase!==null&&row.firstCommonPurchase>=row.firstPurchase, 'Purchase order');
    for (const key of ['sameFourCopyFraction','epicZeroPrediction']) assert(finite(row[key])&&row[key]<=1, 'Invalid probability/fraction');
    assert(finite(row.processingMs)&&finite(row.weaponGainPercent)&&finite(row.weaponlessLongestMs)&&row.weaponlessLongestMs<=row.minutes*60000, 'Invalid measurement');
    assert(Array.isArray(row.tierMinutes)&&row.tierMinutes.length===4&&row.tierMinutes.every(finite)&&row.tierMinutes.reduce((a,b)=>a+b,0)<=row.minutes+1e-8, 'Tier duration');
    assert(row.templateMinutes&&Object.values(row.templateMinutes).every(finite), 'Template durations');
    const ids = Object.keys(row.templateZeroPredictions??{}).sort();
    assert.equal(ids.length,56,'Expected 32 epic weapons and 24 epic accessories');
    templateIds ??= ids; assert.deepEqual(ids,templateIds,'Epic template denominators differ');
    assert(Object.values(row.templateZeroPredictions).every(n=>finite(n)&&n<=1), 'Invalid per-template probability');
  }
  return summarize(rows,protocol);
}
function bindingNow(root) {
  const files = Object.fromEntries(readdirSync(resolve(root,'src/core')).filter(name=>name.endsWith('.ts')).sort().map(name=>[name,sha(readFileSync(resolve(root,'src/core',name)))]));
  return {files,coreHash:sha(JSON.stringify(files,null,2)),protocolHash:sha(readFileSync(resolve(root,'docs/v0.10/EVALUATION_PROTOCOL.json'))),
    candidateHash:sha(readFileSync(resolve(root,'docs/v0.10/BALANCE_CANDIDATE.json'))),scriptHash:sha(readFileSync(resolve(root,'.harness/v10/balance.mjs')))};
}
export function verifyBalance(file, root=ROOT) {
  const final = read(file), protocol = read(resolve(root,'docs/v0.10/EVALUATION_PROTOCOL.json'));
  const registered = read(resolve(root,'docs/v0.10/BALANCE_CANDIDATE.json')).candidateComparison.map(({weaponAttackPercent,...candidate})=>({...candidate,weaponAttack:weaponAttackPercent}));
  assert.equal(final.version,10); assert(registered.length>=3 && registered.some(candidate=>candidate.id===final.selected),'Unregistered selection');
  assert(protocol.heldOutSeeds.count>=100 && protocol.policies.length>=8,'Insufficient held-out contract');
  const current=bindingNow(root);
  for (const key of ['coreHash','protocolHash','candidateHash']) assert.equal(final[key],current[key],'Stale final '+key);
  assert.equal(final.rows,protocol.policies.length*protocol.heldOutSeeds.count*protocol.horizonsMinutes.length);
  assert.equal(final.policies,protocol.policies.length); assert.equal(final.seedsPerPolicy,protocol.heldOutSeeds.count);
  assert.deepEqual(final.hardGates,protocol.hardGates,'Hard gates changed');
  const result = {};
  for (const [mode,directory,seeds] of [['explore',final.exploration,protocol.explorationSeeds],['validate',final.validation,protocol.heldOutSeeds]]) {
    assert(typeof directory==='string','Missing run directory');
    const run=resolve(root,directory), report=read(resolve(run,'report.json')), binding=read(resolve(run,'binding.json'));
    assert.equal(report.mode,mode); assert.deepEqual(report.binding,binding); assert.deepEqual(report.after,binding,'Source changed during measurement');
    for (const key of ['protocolHash','candidateHash','scriptHash']) assert.equal(binding[key],current[key],'Stale measurement '+key);
    assert.equal(binding.coreHash,sha(JSON.stringify(binding.files,null,2)),'Invalid core manifest hash');
    if(mode==='validate') {assert.deepEqual(binding.files,current.files,'Stale held-out core');assert.equal(binding.coreHash,current.coreHash);}
    else {
      assert.deepEqual(Object.keys(binding.files),Object.keys(current.files),'Core file set changed');
      for(const name of Object.keys(current.files)) {
        if(name!=='equipment.ts'||binding.files[name]===current.files[name])assert.equal(binding.files[name],current.files[name],'Core changed after exploration: '+name);
        else {
          const before=readFileSync(resolve(run,'source-core/equipment.ts'),'utf8'),now=readFileSync(resolve(root,'src/core/equipment.ts'),'utf8');
          assert.equal(sha(before),binding.files[name],'Missing original exploration equipment source');
          assert(registered.some(({id:_id,...candidate})=>JSON.stringify(parameters(before))===JSON.stringify(Object.fromEntries(parameterKeys.map(key=>[key,candidate[key]])))),'Original exploration parameters were not registered');
          assert.equal(substitute(before,registered[0]),substitute(now,registered[0]),'Non-parameter source changed after exploration');
        }
      }
    }
    assert.deepEqual(binding.candidates,registered,'Candidate registry mismatch');
    const candidates=mode==='explore'?registered:registered.filter(candidate=>candidate.id===final.selected);
    assert.equal(report.reports.length,candidates.length,'Missing candidate report');
    result[mode]=[];
    for (const candidate of candidates) {
      for(const name of Object.keys(current.files)) {
        const source=readFileSync(resolve(root,'src/core',name),'utf8');
        const transformed=name==='equipment.ts'?substitute(source,candidate):source;
        const expected=ts.transpileModule(transformed,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true}}).outputText;
        assert.equal(readFileSync(resolve(run,'compiled-'+candidate.id,name.replace(/\.ts$/,'.js')),'utf8'),expected,'Measured candidate compile differs: '+candidate.id+'/'+name);
      }
      const rows=protocol.policies.flatMap(policy=>readFileSync(resolve(run,`${candidate.id}-${policy}.jsonl`),'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)));
      const expected={candidate,...validateRows(rows,protocol,seeds)};
      assert.deepEqual(read(resolve(run,`${candidate.id}-report.json`)),expected,'Recomputed candidate report differs');
      assert.deepEqual(report.reports.find(row=>row.candidate.id===candidate.id),expected,'Aggregate report differs');
      result[mode].push(expected);
    }
  }
  assert(protocol.explorationSeeds.first+protocol.explorationSeeds.count<=protocol.heldOutSeeds.first || protocol.heldOutSeeds.first+protocol.heldOutSeeds.count<=protocol.explorationSeeds.first,'Seeds overlap');
  assert(result.explore.find(row=>row.candidate.id===final.selected).passed,'Selected exploration failed');
  assert(result.validate[0].passed,'Held-out selection failed');
  const production=readFileSync(resolve(root,'src/core/equipment.ts'),'utf8');
  for (const key of parameterKeys) assert.deepEqual(parameters(production)[key],registered.find(row=>row.id===final.selected)[key],'Production differs from selected '+key);
  assert(typeof final.report==='string' && readFileSync(resolve(root,final.report),'utf8').trim().length>0,'Missing balance derivation report');
  return {passed:true,selected:final.selected,rows:final.rows,coreHash:current.coreHash};
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try { assert(process.argv[2],'Usage: balance-verify.mjs FINAL_JSON'); console.log(JSON.stringify(verifyBalance(resolve(process.argv[2])))); }
  catch(error) { console.error(error.message); process.exitCode=1; }
}
