#!/usr/bin/env node
// Source-bound, isolated candidate exploration and a single held-out evaluation.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';
const root = process.cwd(), require = createRequire(import.meta.url);
const hash = text => createHash('sha256').update(text).digest('hex');
const json = value => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? String(v) : v, 2);
const protocolFile = resolve(root, 'docs/v0.10/EVALUATION_PROTOCOL.json');
const protocol = JSON.parse(readFileSync(protocolFile));
export const candidates = [
  { id: 'A', prices: [1500,6000,24000,96000], weaponAttack: [2,12,45,120], bossDropBps: 6000, successK: 39 },
  { id: 'B', prices: [3000,12000,48000,192000], weaponAttack: [5,15,40,80], bossDropBps: 4000, successK: 29 },
  { id: 'C', prices: [4500,18000,72000,288000], weaponAttack: [8,20,50,100], bossDropBps: 3000, successK: 19 },
];
const definitions = {
  tickMs: 500, input: 'One keyboard attack before each 500ms tick (2/s); intermittent only first15s/min; idle two minute onboarding.',
  decisionsEveryMs: 5000, equipmentShoppingEveryMs: 30000,
  hero: 'immediate-rebirth at every decision; deferred-rebirth/new-active/wealthy/enhance/collect each10m; intermittent once/min; idle never.',
  spending: 'One affordable improvement each shopping visit; maximize displayed damage improvement per gold, ties cheaper then UID. Expansion if full. Enhance equipped weapon at most+8 (policy stopping preference, no gameplay cap), enhance-first before shopping, other active after shopping to+5. collect-first skips enhancement. Sell bag overflow at visits except collect-first; never sell equipped/temporary.',
  wealthy: 'Exact starting wallet1000000, Lv15/souls20, five companions bossIndex39/level5; income excludes initial money.',
  temporary: 'Automatic hero choices acknowledge current exact temporary IDs; every destroyed physical copy counted. No equipment gold mode.',
  missingPurchase: 'Null counts as nonarrival; unconditional percentile maps null to Infinity. Report successful and unsuccessful counts.',
  candidateMutation: 'Only declared EQUIPMENT_BALANCE field initializers in isolated compiled copies; production source remains unchanged.',
};
function bind() {
  const files = Object.fromEntries(readdirSync(resolve(root,'src/core')).filter(f=>f.endsWith('.ts')).sort().map(f=>[f,hash(readFileSync(resolve(root,'src/core',f)))]));
  return { files, coreHash: hash(json(files)), protocolHash: hash(readFileSync(protocolFile)), candidateHash: hash(readFileSync(resolve(root,'docs/v0.10/BALANCE_CANDIDATE.json'))), scriptHash:hash(readFileSync(new URL(import.meta.url))), candidates, definitions };
}
function compile(run, candidate) {
  const directory = resolve(run, 'compiled-'+candidate.id); mkdirSync(directory,{recursive:true});
  for (const file of readdirSync(resolve(root,'src/core')).filter(f=>f.endsWith('.ts'))) {
    let source = readFileSync(resolve(root,'src/core',file),'utf8');
    if (file === 'equipment.ts') for(const [key,value] of Object.entries(candidate).filter(([k])=>k!=='id')) {
      const re = new RegExp('('+key+': )'+(Array.isArray(value)?'\\[[^\\]]*\\]':'[0-9_]+'));
      if(!re.test(source)) throw Error('Missing parameter '+key);
      source=source.replace(re,(_,prefix)=>prefix+JSON.stringify(value));
    }
    const compiled = ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true}});
    writeFileSync(resolve(directory,file.replace(/\.ts$/,'.js')),compiled.outputText);
  }
  return directory;
}
const assert = (ok, message) => { if(!ok) throw Error(message); };
function simulate(core, policy, seed, maxMs, tickMs=500) {
  const start=performance.now(); let now=0;
  const c=core, wealthy=policy==='wealthy-save', initialCoins=wealthy?1000000n:0n;
  const save=wealthy?{...c.DEFAULT_SAVE,level:15,souls:20,coins:String(initialCoins),companions:Array.from({length:5},(_,i)=>({id:`c${i+1}`,speciesId:['slime','bat','ghost','golem','dragon'][i],bossIndex:39,level:5,stars:0})),nextCompanionId:6}:null;
  const engine=c.createEngine(save,c.mulberry32(seed),{equipmentSeed:seed^0xe010,now:()=>now});
  let income=0n,saleIncome=0n,purchases=0,firstPurchase=null,firstCommonPurchase=null,enhanceSpend=0n,expansionSpend=0n;
  let tempDestroyed=0,enhanceDestroyed=0,rebirthUnequips=0,bosses=0,legendaryBosses=0,eligibleBosses=0,epicItems=0;
  let owned=new Set(), newItems=new Set(), sold=new Set(), destroyed=new Set();
  let kills=save?.killCount??0,eligibleAttempts=0,logEpicZero=0,lastKilledBoss=false;
  const templateLogZero=Object.fromEntries(c.EQUIPMENT_CATALOG.filter(t=>t.rarity==='epic').map(t=>[t.id,0]));
  const tierMs=[0,0,0,0],templateMs={},weaponless={started:null,longest:0}; let concentrationMs=0;
  const result=[];
  const measure = events => { for(const event of events) {
    if(event.type==='itemDropped') income+=event.drops.filter(d=>d.item.kind==='coin').reduce((n,d)=>n+BigInt(d.amount),0n);
    if(event.type==='equipmentDropped') {assert(lastKilledBoss,'Gear dropped on an ordinary monster');newItems.add(event.item.id); if(c.equipmentTemplate(event.item.templateId).rarity==='epic') epicItems++;}
    if(event.type==='equipmentDestroyed') {enhanceDestroyed++;destroyed.add(event.item.id);}
    if(event.type==='monsterKilled') { kills++;lastKilledBoss=event.monster.boss;if(event.monster.boss) bosses++; if(event.monster.epicBossId) legendaryBosses++; }
    if(event.type==='monsterSpawned'&&event.monster.boss){const pool=c.EPIC_BOSSES.filter(b=>b.requirements.every(r=>r.kind==='totalKills'&&kills>=r.count));if(pool.length){eligibleAttempts++;const p=c.EQUIPMENT_BALANCE.epicEncounterBps/10000*c.EQUIPMENT_BALANCE.epicDropBps/10000;logEpicZero+=Math.log1p(-p);for(const boss of pool){const loot=c.epicLootForBoss(boss.id);for(const template of loot)templateLogZero[template.id]+=Math.log1p(-p/pool.length/loot.length);}}}
  }};
  const observe = state => {
    const eq=state.equipment,items=c.equipmentItems(eq),ids=items.map(i=>i.id);
    assert(new Set(ids).size===ids.length,'Duplicate instance'); assert(state.coins>=0n,'Negative wallet');
    assert(eq.loadout.accessories.length<=4 && [...(eq.loadout.weapon?[eq.loadout.weapon]:[]),...eq.loadout.accessories].every(i=>c.canEquip(i,state.hero?.equipped.formId??'h00',state.level)),'Invalid equipment');
    for(const id of new Set([...owned,...newItems])) if(!ids.includes(id)&&!sold.has(id)&&!destroyed.has(id)) tempDestroyed++;
    owned=new Set(ids);newItems.clear();sold.clear();destroyed.clear();
    const weapon=eq.loadout.weapon;
    if(weapon) {tierMs[c.equipmentTemplate(weapon.templateId).tier]+=5000;templateMs[weapon.templateId]=(templateMs[weapon.templateId]??0)+5000;if(weaponless.started!==null){weaponless.longest=Math.max(weaponless.longest,now-weaponless.started);weaponless.started=null;}}
    else weaponless.started??=now;
    if(eq.loadout.accessories.length===4 && new Set(eq.loadout.accessories.map(i=>i.templateId)).size===1) concentrationMs+=5000;
  };
  const heroVisit = state => {
    const immediate=policy==='immediate-rebirth', deferred=['deferred-rebirth','new-active','wealthy-save','enhance-first','collect-first'].includes(policy);
    const visit=immediate || deferred&&now%600000===0 || policy==='intermittent'&&now%60000===0;
    if(!visit||!c.heroReady(state.level,state.hero))return;
    measure(engine.apply({type:'heroOffer'}));state=engine.getState();
    const hero=state.hero,choice=hero?.choices[0];if(!choice)return;
    const before=c.equippedItems(state.equipment).map(i=>i.id);
    measure(engine.apply({type:'heroChoose',formId:choice.formId,offerSerial:hero.offerSerial,equipmentConfirmation:c.heroChangeWarning(state.equipment,choice.formId,hero.offerSerial)}));
    const after=new Set(c.equippedItems(engine.getState().equipment).map(i=>i.id));rebirthUnequips+=before.filter(id=>!after.has(id)).length;
  };
  const enhance = () => {
    const state=engine.getState(),eq=state.equipment,item=eq.loadout.weapon;
    if(!item||policy==='collect-first'||policy==='companion-idle'||BigInt(item.enhancement)>=(policy==='enhance-first'?8n:5n))return;
    const price=c.affordableEquipmentCost(c.enhancementCost(item),state.coins);if(price===null)return;
    const events=engine.apply({type:'equipmentEnhance',itemId:item.id,revision:eq.revision});measure(events);
    if(events.length)enhanceSpend+=price;
  };
  const shop = () => {
    let state=engine.getState(),eq=state.equipment;
    if(eq.bag.length===eq.capacity) {
      const cost=c.affordableEquipmentCost(c.expansionCost(eq),state.coins);
      if(cost!==null){const events=engine.apply({type:'equipmentExpand',revision:eq.revision});measure(events);if(events.length)expansionSpend+=cost;}
    }
    if(policy==='enhance-first')enhance();
    state=engine.getState();eq=state.equipment;
    const current=c.displayedHeroAttack(state),base=c.trainedHeroPower(c.heroAttackPower(state.level,state.souls,state.hero?.reincarnations),state.progress.trainingLevel);
    let best=null;
    for(const offer of eq.shop.stock) {
      if(eq.shop.boughtIds.includes(offer.id)||!c.canEquip(offer,state.hero?.equipped.formId??'h00',state.level))continue;
      const price=BigInt(c.equipmentTemplate(offer.templateId).price);if(price>state.coins)continue;
      const trial=c.copyEquipment(eq);c.acquireEquipment(trial,{...offer},state.hero?.equipped.formId??'h00',state.level,undefined,base);
      if(eq.temporary.some(i=>!c.equipmentItems(trial).some(j=>j.id===i.id)))continue;
      const gain=c.loadoutAttack(base,trial.loadout)-current;if(gain<=0n)continue;
      if(!best||gain*best.price>best.gain*price||gain*best.price===best.gain*price&&price<best.price)best={item:offer,price,gain};
    }
    if(best) {const events=engine.apply({type:'equipmentBuy',itemId:best.item.id,shopSerial:eq.shop.serial,revision:eq.revision});measure(events);if(events.length){purchases++;newItems.add(best.item.id);firstPurchase??=now/60000;if(c.equipmentTemplate(best.item.templateId).rarity==='common')firstCommonPurchase??=now/60000;}}
    if(policy!=='enhance-first')enhance();
    if(policy!=='collect-first') {
      state=engine.getState();eq=state.equipment;
      // Keep one spare per template/level for hero changes and risky enhancement recovery.
      const seen=new Set();for(const item of eq.bag){if(!seen.has(item.templateId)){seen.add(item.templateId);continue;}
        const live=engine.getState();const events=engine.apply({type:'equipmentSell',itemId:item.id,revision:live.equipment.revision});
        if(events.length){sold.add(item.id);saleIncome+=c.sellPrice(item);}measure(events);
      }
    }
  };
  for(now=0;now<maxMs;) {
    engine.beginEquipmentBatch();
    const active=policy!=='companion-idle'&&policy!=='intermittent'||now<120000||policy==='intermittent'&&now%60000<15000;
    if(now%500===0&&active) measure(engine.attack('keyboard'));
    measure(engine.tick(tickMs));now+=tickMs;
    if(now%5000===0){let state=engine.getState();if(state.killCount>=200&&state.monster.boss)eligibleBosses++;heroVisit(state);engine.refreshShop(now);if(now%30000===0&&policy!=='companion-idle')shop();observe(engine.getState());}
    engine.endEquipmentBatch();
    if(protocol.horizonsMinutes.some(m=>now===m*60000)) {
      const state=engine.getState(),eq=state.equipment,base=c.trainedHeroPower(c.heroAttackPower(state.level,state.souls,state.hero?.reincarnations),state.progress.trainingLevel);
      assert(state.coins===initialCoins+income+saleIncome-state.progress.goldSpent,'Currency conservation');
      const without=c.loadoutAttack(base,{...eq.loadout,weapon:null}),attack=c.displayedHeroAttack(state);
      result.push({policy,seed,minutes:now/60000,coins:String(state.coins),income:String(income),sales:String(saleIncome),spent:String(state.progress.goldSpent),purchases,firstPurchase,firstCommonPurchase,
        enhanceSpend:String(enhanceSpend),expansionSpend:String(expansionSpend),level:state.level,reincarnations:state.hero?.reincarnations??0,kills:state.killCount,bosses,legendaryBosses,eligibleBossObservations:eligibleBosses,eligibleAttempts,epicItems,epicZeroPrediction:Math.exp(logEpicZero),templateZeroPredictions:Object.fromEntries(Object.entries(templateLogZero).map(([k,v])=>[k,Math.exp(v)])),
        tierMinutes:tierMs.map(t=>t/60000),templateMinutes:Object.fromEntries(Object.entries(templateMs).map(([k,v])=>[k,v/60000])),sameFourCopyFraction:concentrationMs/now,
        weaponGainPercent:Number((attack-without)*10000n/(without||1n))/100,attack:String(attack),rebirthUnequips,tempDestroyed,enhanceDestroyed,bag:eq.bag.length,capacity:eq.capacity,temporary:eq.temporary.length,
        weaponlessLongestMs:Math.max(weaponless.longest,weaponless.started===null?0:now-weaponless.started),processingMs:performance.now()-start});
    }
  }
  return {rows:result,save:engine.toSave()};
}
function summarize(rows) {
  const quantile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);const v=sorted[Math.min(sorted.length-1,Math.floor(p*(sorted.length-1)))];return Number.isFinite(v)?v:null;};
  const summaries=[];
  for(const policy of protocol.policies) for(const minutes of protocol.horizonsMinutes){const group=rows.filter(r=>r.policy===policy&&r.minutes===minutes);if(!group.length)continue;
    const stats={policy,minutes,n:group.length};for(const key of ['coins','income','spent','firstPurchase','firstCommonPurchase','weaponGainPercent','enhanceSpend','expansionSpend','tempDestroyed','enhanceDestroyed','bag','capacity','weaponlessLongestMs']){const values=group.map(r=>r[key]===null?Infinity:Number(r[key]));stats[key]={p10:quantile(values,.1),p50:quantile(values,.5),p90:quantile(values,.9),nonarrival:values.filter(x=>x===Infinity).length};}
    stats.tierMinutes=Array.from({length:4},(_,i)=>({p50:quantile(group.map(r=>r.tierMinutes[i]),.5),users:group.filter(r=>r.tierMinutes[i]>0).length}));
    stats.epicZeroRate=group.filter(r=>r.epicItems===0).length/group.length;stats.predictedEpicZeroRate=group.reduce((n,r)=>n+r.epicZeroPrediction,0)/group.length;stats.predictedSpecificEpicZeroRates=Object.fromEntries(Object.keys(group[0].templateZeroPredictions).map(id=>[id,group.reduce((n,r)=>n+r.templateZeroPredictions[id],0)/group.length]));stats.fourCopyRate=group.reduce((a,r)=>a+r.sameFourCopyFraction,0)/group.length;
    stats.processingMsPerVirtualHour=group.reduce((a,r)=>a+r.processingMs,0)/(group.length*minutes/60);summaries.push(stats);
  }
  const active=summaries.find(r=>r.policy==='new-active'&&r.minutes===120),allTierUsers=Array.from({length:4},(_,i)=>rows.filter(r=>r.minutes===480&&!['wealthy-save','companion-idle'].includes(r.policy)&&r.tierMinutes[i]>0).length);
  const checks={firstPurchase:!!active&&active.firstCommonPurchase.p50!==null&&active.firstCommonPurchase.p50>=10&&active.firstCommonPurchase.p50<=120,
    weaponBenefit:!!active&&active.weaponGainPercent.p50>=5,allTiersUsed:allTierUsers.every(n=>n>0),processing:summaries.every(r=>r.processingMsPerVirtualHour<=protocol.hardGates.maxProcessingMsPerVirtualHour)};
  return {summaries,allTierUsers,checks,passed:Object.values(checks).every(Boolean),humanPlaytest:false};
}
async function jobs(run, candidate, count, first, minutes, workers=2){
  const queue=protocol.policies.map(policy=>({candidate,policy,count,first,minutes}));const files=[];
  await Promise.all(Array.from({length:workers},async()=>{while(queue.length){const job=queue.shift(),path=resolve(run,`${candidate.id}-${job.policy}.jsonl`);files.push(path);
    assert(!existsSync(path),'Output already exists '+path);await new Promise((yes,no)=>{const child=spawn(process.execPath,[new URL(import.meta.url).pathname,'worker',run,JSON.stringify(job),path],{stdio:['ignore','inherit','inherit']});child.on('error',no);child.on('exit',code=>code===0?yes():no(Error('Worker exit '+code)));});}}));
  return files.flatMap(file=>readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)));
}
async function main(){const[mode,output,arg]=process.argv.slice(2);const run=resolve(output??'.agentdoc/v10-balance');
  if(mode==='worker'){const job=JSON.parse(arg),file=process.argv[5],core=require(resolve(run,'compiled-'+job.candidate.id,'index.js'));for(let i=0;i<job.count;i++){const{rows}=simulate(core,job.policy,job.first+i,job.minutes*60000);appendFileSync(file,rows.map(row=>JSON.stringify(row)).join('\n')+'\n');}return;}
  mkdirSync(run,{recursive:true});const binding=bind();
  assert(!existsSync(resolve(run,'binding.json')),'New run directory required');writeFileSync(resolve(run,'binding.json'),json(binding));
  if(mode==='pilot'){const dir=compile(run,candidates[0]),core=require(resolve(dir,'index.js'));for(const policy of ['new-active','immediate-rebirth','companion-idle']){
      const a=simulate(core,policy,10001,1800000,100),b=simulate(core,policy,10001,1800000,500);assert(JSON.stringify(a.save)===JSON.stringify(b.save),'100/500ms cadence mismatch '+policy);writeFileSync(resolve(run,policy+'.json'),json(b.rows));}
    writeFileSync(resolve(run,'report.json'),json({cadenceEqual:true,binding,after:bind()}));return;}
  assert(mode==='explore'||mode==='validate','Use pilot|explore|validate RUN [A|B|C]');
  const choices=mode==='explore'?candidates:[candidates.find(c=>c.id===arg)];assert(choices.every(Boolean),'Candidate must be A/B/C');const reports=[];
  for(const candidate of choices){compile(run,candidate);const seeds=mode==='explore'?protocol.explorationSeeds:protocol.heldOutSeeds;
    const rows=await jobs(run,candidate,seeds.count,seeds.first,480,Number(process.env.DESMON_BALANCE_WORKERS??2));const report={candidate,...summarize(rows)};reports.push(report);writeFileSync(resolve(run,candidate.id+'-report.json'),json(report));}
  const after=bind();assert(binding.coreHash===after.coreHash&&binding.protocolHash===after.protocolHash&&binding.scriptHash===after.scriptHash&&binding.candidateHash===after.candidateHash,'Source changed during measurement; keep evidence but rerun');
  writeFileSync(resolve(run,'report.json'),json({mode,binding,after,reports}));
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
