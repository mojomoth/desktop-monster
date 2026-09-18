import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {binding,sha,json} from '../../../../.harness/v11/balance.mjs';
const here=dirname(fileURLToPath(import.meta.url)), compiled=resolve(here,'../r19-finite-screen-guards/compiled-R19-B'), c=createRequire(import.meta.url)(resolve(compiled,'index.js'));
const beforeBinding=binding();
function run(kind){
 let now=0,nextInput=0,phase='onboarding',draws=null,lastKill=0,longestGap=0,recoveredAtMs=null,nextCaptureMs=null,firstHeroMs=null,nextCheckpoint=1800000;
 const seeded=c.mulberry32(424242),actions=[],checkpoints=[],captures=[];
 const rng={next(){const value=phase==='onboarding'?(kind==='zero-companions'?.99:0):seeded.next();draws?.push(value);return value;}};
 const engine=c.createEngine(null,rng,{equipmentSeed:0xe011,now:()=>now});
 const observe=events=>{for(const event of events){if(event.type==='monsterKilled'){longestGap=Math.max(longestGap,now-lastKill);lastKill=now;}if(event.type==='bossCaptured'){captures.push({atMs:now,companion:event.companion});if(recoveredAtMs!==null)nextCaptureMs??=now;}}};
 const act=action=>{const before=engine.toSave();draws=[];observe(engine.apply(action));const record={atMs:now,action,before,after:engine.toSave(),rngDraws:draws,error:engine.lastActionError()};draws=null;if(record.error)throw Error(record.error);actions.push(record);};
 while(now<18*3600000&&firstHeroMs===null){
  while(nextInput<=now){observe(engine.attack('keyboard'));nextInput+=125;}
  observe(engine.tick(100));now+=100;
  let state=engine.getState();
  if(recoveredAtMs===null&&state.monster.index>=40){
   if(kind==='removed-last-companion')for(const member of state.companions)act({type:'sacrifice',id:member.id});
   state=engine.getState();if(state.companions.length)throw Error('Boundary is not empty');
   phase='after-recovery';
   act({type:'rebirth',equipmentConfirmation:c.heroChangeWarning(state.equipment,state.hero?.equipped.formId??'h00')});recoveredAtMs=now;
  }else if(recoveredAtMs!==null&&now%5000===0&&c.heroReady(state.level,state.hero)){
   if(!state.hero?.choices.length)act({type:'heroOffer'});state=engine.getState();const choice=state.hero.choices[0];
   act({type:'heroChoose',formId:choice.formId,offerSerial:state.hero.offerSerial,equipmentConfirmation:c.heroChangeWarning(state.equipment,choice.formId,state.hero.offerSerial)});firstHeroMs=now;
  }
  if(now>=nextCheckpoint){state=engine.getState();checkpoints.push({atMs:now,level:state.level,stage:state.monster.index,hp:String(state.monsterHp),maxHp:String(state.monster.maxHp),roster:state.companions.length,souls:state.souls});nextCheckpoint+=1800000;}
 }
 const final=engine.toSave();return{kind,controlled:true,input:'high8/s',onboardingRng:kind==='zero-companions'?.99:0,afterRecoverySeed:424242,shopPolicy:'no-purchases-or-training; normal drops and auto-equipment',boundary:'first actual stage>=40; legal sacrifice of every owned companion only for removal case',recoveredAtMs,nextCaptureMs,firstHeroMs,durationMs:now,longestKillGapMs:Math.max(longestGap,now-lastKill),actions,actionsSha256:sha(json(actions)),captures,checkpoints,final};
}
const rows=[run('zero-companions'),run('removed-last-companion')],afterBinding=binding();if(json(beforeBinding)!==json(afterBinding))throw Error('Source changed');
const result={diagnostic:true,protocol:'controlled empty-party boundary; not a timing-quantile sample',binding:beforeBinding,after:afterBinding,compiledFiles:Object.fromEntries(readdirSync(compiled).sort().map(file=>[file,sha(readFileSync(resolve(compiled,file)))])),scriptSha256:sha(readFileSync(fileURLToPath(import.meta.url))),rows};
writeFileSync(resolve(here,'report.json'),json(result));
console.log(json(rows.map(({kind,recoveredAtMs,nextCaptureMs,firstHeroMs,longestKillGapMs,actions})=>({kind,recoveredAtMs,nextCaptureMs,firstHeroMs,longestKillGapMs,actions:actions.length}))));
