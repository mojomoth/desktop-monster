#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { launchRuntime } from './launcher.mjs';
import { controls, motionCases, equipmentCases, until } from './ui-cases.mjs';
import { digest, sha } from './run.mjs';
const require=createRequire(import.meta.url),core=require(resolve('dist/electron/core/index.js'));
const gear=require(resolve('dist/electron/core/equipment.js'));
const [outputArg,appArg='release/mac-arm64/DesMon.app']=process.argv.slice(2);
if(!outputArg)throw Error('Usage: runtime.mjs OUTPUT_JSON [APP]');
const output=resolve(outputArg),directory=join(dirname(output),'attempt-'+basename(output,'.json')+'-'+Date.now());
if(existsSync(output))throw Error('Preserve previous attempt; choose a new report path');
mkdirSync(directory,{recursive:true});
const result={version:10,source:digest(),startedAt:new Date().toISOString(),attempts:[],artifacts:{},errors:[],passed:false};
const settings={gameScale:1,muted:true,screenShake:true,welcomeSeen:true,globalInputRequested:false};
const identity={name:'FixtureMe',playerId:'fixture-me',token:'fixture-me-token',notifiedTheftIds:[]};
function fixture(family='sword',vertical=false) {
  const equipment=gear.newEquipment(Date.now(),71010);
  const item=templateId=>{const copy=gear.createEquipmentItem(equipment,templateId);copy.roll=100;return copy;};
  if(family!=='bare')equipment.loadout.weapon=item(`w-${family}-rare-3`);
  if(vertical){
    equipment.loadout.accessories=Array.from({length:4},()=>item('a-ring-critical-rare-2'));
    equipment.bag=[item('w-staff-rare-2')];equipment.capacity=1;
  }
  gear.refreshEquipmentShop(equipment,Date.now(),30);
  const hero=core.newHeroProgress();hero.collection=[{formId:'h01',buffPercent:20},{formId:'h02',buffPercent:20}];
  return core.createEngine(core.parseSave({ ...core.DEFAULT_SAVE,level:30,coins:'1000000000000000000000000000000000',
    hero,equipment,bestIndex:1000,monsterIndex:1000,monsterSpeciesId:'slime',monsterHp:'9'.repeat(80)})).toSave();
}
let active;
const launch=async(name,save,userData,recovery)=>{active=await launchRuntime({appPath:appArg,outputDir:join(directory,name),userData,
  ...(userData?{}:{save,settings,identity,recovery})});return active;};
const finish=async(name,ui)=>{const runtime=await active.close();active=null;result.attempts.push({name,ui,runtime});assert(runtime.passed,'Native runtime failed '+name);assert(ui.passed,'Native UI failed '+name);};
try {
  for(const family of ['bare',...gear.WEAPON_TYPES]) {
    const runtime=await launch('motion-'+family,fixture(family));
    await finish('motion-'+family,await motionCases(runtime,family));
  }
  const epic=fixture('sword');epic.equipment.loadout.weapon.templateId='w-sword-epic-3';
  const epicRuntime=await launch('motion-epic',epic);
  await finish('motion-epic',await motionCases(epicRuntime,'epic'));
  const runtime=await launch('equipment',fixture('sword',true));
  const ui=await equipmentCases(runtime),userData=runtime.userData;
  await finish('equipment',ui);
  const restarted=await launch('equipment-restart',undefined,userData),restartedUi=await controls(restarted);
  const save=(await restartedUi.read()).save;
  const before=ui.expectedOnRestart;
  assert.equal(save.coins,before.coins);assert.deepEqual(save.equipment.bag,before.equipment.bag);
  assert.deepEqual(save.equipment.loadout,before.equipment.loadout);assert.deepEqual(save.equipment.temporary,before.equipment.temporary);
  assert.deepEqual(save.equipment.shop.stock,before.equipment.shop.stock);assert.equal(save.equipment.shop.nextRefreshAt,before.equipment.shop.nextRefreshAt);
  await finish('equipment-restart',{passed:true,checks:['wallet','bag','five-slots','temporary','saved-hourly-stock']});
  const boss=fixture('sword');boss.monsterIndex=7;boss.monsterHp='1';
  for(let seed=1;seed<10000;seed++){
    const copy=gear.copyEquipment(boss.equipment);copy.rngState=seed;
    if(gear.rollBossEquipment(copy,boss.level)){boss.equipment.rngState=seed;break;}
  }
  const bossRuntime=await launch('boss-drop',boss),bossUi=await controls(bossRuntime);
  await bossUi.input();const killed=await until(async()=>{const value=await bossUi.read();return value.save.killCount>boss.killCount?value:null;},'boss killed');
  assert(Object.values(killed.save.equipment.acquired).some(count=>count>0));
  await until(()=>existsSync(join(bossRuntime.userData,'save.json'))&&JSON.parse(readFileSync(join(bossRuntime.userData,'save.json'))).killCount===killed.save.killCount,'kill+drop durable');
  const disk=JSON.parse(readFileSync(join(bossRuntime.userData,'save.json')));
  assert.deepEqual(disk.equipment.acquired,killed.save.equipment.acquired);
  await finish('boss-drop',{passed:true,checks:['boss-only-acquisition','same-save-kill-and-equipment'],screenshots:[await bossUi.capture('boss-drop')]});
  for(const party of [false,true]) {
  const name=party?'hero-party-pvp':'hero-pvp',battleSave=fixture('dagger',true);
  if(party){battleSave.companions=Array.from({length:5},(_,i)=>({id:'c'+(i+1),speciesId:'slime',bossIndex:63,level:5,stars:0}));
    battleSave.nextCompanionId=6;battleSave.pvpParty=battleSave.companions.map(c=>c.id);}
  const battle=await launch(name,battleSave),battleUi=await controls(battle);
  await battleUi.openMenu();await battleUi.click('#tab-battle');
  await until(()=>battleUi.menu(`Boolean(document.querySelector('[data-player-id="fixture-foe"] button'))`),'opponent list');
  await battleUi.click('[data-player-id="fixture-foe"] button');
  const presentation=await until(()=>battleUi.field('window.desmon.getPendingReplays().then(queue=>queue[0])'),'hero replay');
  assert(presentation.ownCombat&&presentation.replay.opponentCombat);assert.equal(presentation.replay.ownFighters[0].kind,'hero');
  assert.equal(presentation.ownCombat.loadout.accessories.length,4);
  assert.equal(presentation.replay.opponentCombat.loadout.accessories.length,4);
  assert.equal(presentation.replay.ownFighters.length,party?6:1);
  assert(presentation.replay.blows.some(b=>b.actorKind==='hero'));
  if(party)assert(presentation.replay.blows.some(b=>b.actorKind==='companion'));
  const battleShot=await battleUi.capture(name);
  await until(async()=>!(await battleUi.read()).replaying,'hero replay ends',30000);
  const motion=(await battleUi.read()).motions.filter(m=>m.replaying);
  const starts=motion.filter((m,i)=>m.state==='attack'&&(i===0||motion[i-1].state!=='attack'||m.t<motion[i-1].t)).length;
  const heroTurns=presentation.replay.blows.filter(b=>b.side==='A'&&b.actorKind==='hero').length;
  assert(starts>0&&starts<=heroTurns,'Hero animation must not restart on companion turns');
  await finish(name,{passed:true,checks:['native-opponent-button',party?'hero-plus-five-companions':'hero-only-actor','frozen-five-gear-slots','initial-hp','real-replay-completion','no-extra-hero-swings'],heroTurns,observedHeroSwings:starts,presentation,screenshots:[battleShot]});
  }
  const legacy={battleId:'legacy-A',role:'attack',won:false,goldDelta:0,ownParty:[{id:'c1',speciesId:'slime',bossIndex:7,level:10,stars:0}],
    replay:{opponentName:'LegacyFoe',opponentParty:[{id:'d1',speciesId:'slime',bossIndex:7,level:10,stars:0}],
      blows:Array.from({length:12},(_,i)=>({side:i%2?'D':'A',actorId:i%2?'d1':'c1',targetId:i%2?'c1':'d1',damage:'1',ko:false}))}};
  const historical=await launch('historical-replay',fixture('bare'),undefined,{version:1,highWater:1,reconcilePending:false,replays:[legacy]});
  const historicalUi=await controls(historical);assert((await historicalUi.read()).replaying);
  const historyShot=await historicalUi.capture('historical-replay');
  await until(async()=>!(await historicalUi.read()).replaying,'old replay ends',30000);
  await finish('historical-replay',{passed:true,checks:['numeric-gold-legacy-receipt','legacy-companion-replay'],screenshots:[historyShot]});
} catch(error){result.errors.push(String(error));if(active){result.attempts.push({name:'failed',runtime:await active.close()});active=null;}}
for(const attempt of result.attempts)for(const shot of attempt.ui?.screenshots??[])result.artifacts[shot.path]=sha(readFileSync(shot.path));
result.sourceUnchanged=result.source===digest();result.passed=result.sourceUnchanged&&result.errors.length===0&&result.attempts.length===16;
result.finishedAt=new Date().toISOString();writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({output,passed:result.passed,errors:result.errors}));if(!result.passed)process.exitCode=1;
