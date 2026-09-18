// Production renderer/preload/IPC scenarios. Native mouse events activate controls;
// native dialogs/clipboard and fetch are isolated by runtime.mjs before app boot.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sleep = ms => new Promise(done=>setTimeout(done,ms));
/** Verify decoded PNG scanlines, not only a data URL or filename. */
export function inspectPng(bytes) {
  if (bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw Error('PNG signature');
  let offset=8,width,height,depth,color,end=false; const compressed=[];
  while(offset+12<=bytes.length) {
    const size=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);
    if(offset+size+12>bytes.length) throw Error('Truncated PNG chunk');
    const data=bytes.subarray(offset+8,offset+8+size);
    if(type==='IHDR') { width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];color=data[9]; }
    if(type==='IDAT') compressed.push(data);
    if(type==='IEND') end=true;
    offset+=size+12;
  }
  if(!end||depth!==8||![2,6].includes(color)) throw Error('Unsupported or incomplete PNG');
  const pixels=inflateSync(Buffer.concat(compressed)),expected=height*(1+width*(color===6?4:3));
  if(pixels.length!==expected) throw Error('PNG scanline length');
  return {width,height,bytes:bytes.length,decodedBytes:pixels.length,sha256:hash(bytes)};
}

export async function runUiCases({evaluate,outputDir,userData,phase,restore}) {
  const result={version:9,phase,startedAt:new Date().toISOString(),checks:[],screenshots:[],pngs:[],errors:[],restore:null};
  const main = expression => evaluate(`(()=>{const p=__v09Runtime;return (${expression});})()`);
  const renderer = (fn,...args) => main(`p.menu.webContents.executeJavaScript(${JSON.stringify(`(${fn})(...${JSON.stringify(args)})`)})`);
  const field = (fn,...args) => main(`p.field.webContents.executeJavaScript(${JSON.stringify(`(${fn})(...${JSON.stringify(args)})`)})`);
  const check=(name,passed,details={})=>result.checks.push({name,passed:Boolean(passed),details});
  const until=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){const x=await fn();if(x)return x;await sleep(50);}throw Error('Timeout: '+label);};
  const scenario=async(name,run)=>{try{await run();}catch(error){result.errors.push({name,error:String(error)});check(name,false,{error:String(error)});}};
  const snapshot=()=>field(async()=>await window.desmon.loadState());
  const capture=async(name,target='menu')=>{
    const encoded=await main(`(async()=> (await p.${target}.webContents.capturePage()).toPNG().toString('base64'))()`);
    const bytes=Buffer.from(encoded,'base64'),path=join(outputDir,name+'.png');writeFileSync(path,bytes);
    result.screenshots.push({name,path,sha256:hash(bytes)});
  };
  const click=async selector=>{
    const point=await renderer(selector=>{const el=document.querySelector(selector);if(!el||el.disabled)return {error:'Missing/disabled '+selector};
      el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();if(r.width===0||r.height===0)return {error:'Hidden '+selector};
      return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};},selector);
    if(point.error)throw Error(point.error);
    await main(`(()=>{for(const type of ['mouseDown','mouseUp'])p.menu.webContents.sendInputEvent({type,button:'left',clickCount:1,...${JSON.stringify(point)}});return true;})()`);
    await sleep(90);
  };
  const select=async(selector,value)=>renderer((selector,value)=>{const el=document.querySelector(selector);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},selector,value);
  const queueDialog=response=>main(`p.dialogAnswers.push(${response})`);
  const identity=()=>main(`JSON.parse(p.fs.readFileSync(${JSON.stringify(join(userData,'identity.json'))},'utf8'))`);
  const settings=()=>renderer(async()=>await window.desmon.getSettings());
  await scenario('open-production-windows',async()=>{
    await main(`(()=>{p.menu=p.require(p.e.app.getAppPath()+'/dist/electron/main/menuWindow.js').showMenuWindow();return true;})()`);
    await until(()=>main('!p.menu.webContents.isLoading()'),'menu load');
    await until(()=>renderer(()=>document.querySelector('#game-content')?.hidden===false&&document.querySelector('.hero-summary')),'actual production menu');
    await capture('field-hud','field');await capture('hero');
    check('isolated-production-windows',await main(`p.field.webContents.getURL().endsWith('/static/index.html')&&p.menu.webContents.getURL().endsWith('/static/menu.html')`));
  });
  if(phase==='first') {
    await scenario('four-independent-rankings',async()=>{
      await click('#tab-ranking');
      const expected=[['level','FixtureFoe'],['pvpWins','FixtureFoe'],['bestIndex','FixtureMe'],['rebirths','FixtureFoe']];
      for(let i=0;i<expected.length;i++) {
        const [metric,leader]=expected[i];
        await click(`.rank-tools button:nth-child(${i+1})`);
        const response=await until(()=>main(`p.requests.filter(r=>r.path==='/v1/leaderboard'&&r.query.metric===${JSON.stringify(metric)}).at(-1)`),'ranking '+metric);
        const ui=await renderer(()=>({text:document.querySelector('#ranking').textContent,pressed:[...document.querySelectorAll('.rank-tools button')].map(b=>b.getAttribute('aria-pressed'))}));
        check('ranking-'+metric,response.status===200&&response.result.top[0].name===leader&&response.result.me!==null&&ui.pressed[i]==='true', {response,ui});
      }
      await capture('ranking-rebirths');
    });
    await scenario('selected-opponent-immediate-battle',async()=>{
      await click('#tab-battle');
      await until(()=>renderer(()=>document.querySelector('[data-player-id="fixture-foe"] button')),'opponent directory');
      const collapsed=await renderer(()=>!document.querySelector('#party-editor').open);
      const before=await main('p.requests.length');
      await click('[data-player-id="fixture-foe"] button');
      const battle=await until(()=>main(`p.requests.slice(${before}).find(r=>r.path==='/v1/pvp'&&r.status===200)`),'one click battle');
      const requests=await main(`p.requests.slice(${before})`),match=requests.find(r=>r.path==='/v1/pvp/match');
      const last=await until(()=>renderer(async()=>await window.desmon.getLastBattle()),'durable battle record');
      check('selected-id-chains-match-and-fight',collapsed&&match?.body.opponentId==='fixture-foe'&&battle.body.matchId===match.result.matchId&&
        requests.filter(r=>r.path==='/v1/pvp').length===1&&battle.body.party.join(',')==='c1'&&last.result.opponent.playerId==='fixture-foe', {requests,last,collapsed});
      const blockedBefore=await main(`p.requests.filter(r=>r.path==='/v1/pvp').length`);
      await click('[data-player-id="fixture-foe"] button');
      check('cooldown-click-does-not-submit-again',await main(`p.requests.filter(r=>r.path==='/v1/pvp').length`)===blockedBefore);
      await capture('battle-result');
    });
    await scenario('all-share-cards-save-and-copy',async()=>{
      await click('#share-open');
      await until(()=>renderer(()=>document.querySelector('#share-dialog').open),'share modal');
      const kinds=await renderer(()=>[...document.querySelector('#share-kind').options].map(o=>o.value));
      check('six-share-kinds',JSON.stringify(kinds)===JSON.stringify(['hero','companion','party','codex','field','pvp']),{kinds});
      for(const kind of kinds) {
        await select('#share-kind',kind);
        await until(()=>renderer(()=>!document.querySelector('#share-save').disabled),'export enabled '+kind);
        await main(`p.saveAnswers.push(${JSON.stringify('share-'+kind)})`);await click('#share-save');
        await until(()=>renderer(()=>document.querySelector('#share-status').textContent==='PNG를 저장했습니다.'),'saved '+kind);
        const path=join(outputDir,'share-'+kind+'.png'),png=inspectPng(readFileSync(path));result.pngs.push({kind,path,...png});
        check('real-png-'+kind,png.width===1200&&png.height===1200,png);
        if(kind==='hero'||kind==='pvp') await capture('share-modal-'+kind);
        if(kind==='codex') {
          const before=await renderer(()=>document.querySelector('#share-page').textContent);
          await click('#share-next');const after=await renderer(()=>document.querySelector('#share-page').textContent);
          check('codex-page-navigation',before!==after,{before,after});
          await select('#share-codex','monster');
          await main(`p.saveAnswers.push('share-codex-monster')`);await click('#share-save');
          await until(()=>renderer(()=>document.querySelector('#share-status').textContent==='PNG를 저장했습니다.'),'monster codex saved');
          const path=join(outputDir,'share-codex-monster.png');result.pngs.push({kind:'codex-monster',path,...inspectPng(readFileSync(path))});
        }
      }
      await click('#share-copy');
      const copied=await until(()=>main(`p.exports.find(e=>e.kind==='clipboard')`),'clipboard image');
      const png=inspectPng(readFileSync(copied.filePath));result.pngs.push({kind:'clipboard',path:copied.filePath,...png});
      check('real-native-image-copy',png.width===1200&&png.height===1200,png);
      await main(`p.saveAnswers.push('cancel')`);await click('#share-save');
      const canceled=await renderer(()=>document.querySelector('#share-status').textContent);
      check('save-dialog-cancel-visible',canceled.includes('취소'),{canceled});
      await click('#share-close');
      check('share-close-returns-focus',await renderer(()=>!document.querySelector('#share-dialog').open&&document.activeElement.id==='share-open'));
    });
    await scenario('confirmed-reset-and-stale-generation',async()=>{
      // A failed sharing case must not leave its modal blocking subsequent input.
      await renderer(()=>{const d=document.querySelector('#share-dialog');if(d?.open)d.close();});
      await click('#tab-profile');await click('#progress-recovery summary');
      const before=await snapshot(),generation=await field(async()=>await window.desmon.getGeneration()),priorIdentity=await identity(),priorSettings=await settings();
      await queueDialog(0);await click('#reset-progress');
      const canceled=await snapshot(),backups=await renderer(async()=>await window.desmon.listCheckpoints());
      check('reset-cancel-preserves-progress',canceled.level===before.level&&canceled.coins===before.coins&&
        JSON.stringify(canceled.companions)===JSON.stringify(before.companions)&&backups.length===0,{before,canceled,backups});
      await queueDialog(1);await click('#reset-progress');
      const reset=await until(async()=>{const s=await snapshot();return s.level===1&&s.companions.length===0?s:null;},'confirmed reset');
      const list=await renderer(async()=>await window.desmon.listCheckpoints());
      const dialog=await main(`p.dialogs.filter(d=>d.kind==='message').at(-1)`);
      check('reset-requires-safe-default-dialog',dialog.options.defaultId===0&&dialog.options.cancelId===0&&dialog.options.buttons.length===2,{dialog});
      check('reset-preserves-identity-settings-and-id-highwater',JSON.stringify(await identity())===JSON.stringify(priorIdentity)&&
        JSON.stringify(await settings())===JSON.stringify(priorSettings)&&reset.nextCompanionId>=before.nextCompanionId&&reset.earlyCaptureUsed===0&&
        reset.progress.pvpWins===before.progress.pvpWins&&reset.progress.pvpLosses===before.progress.pvpLosses,
        {reset,priorIdentity,priorSettings});
      check('reset-creates-verified-visible-checkpoint',list.length===1&&list[0].reason==='reset'&&list[0].level===before.level&&
        await renderer(()=>document.querySelectorAll('.checkpoint-row').length===1),{list});
      const accepted=await field(async(save,generation)=>await window.desmon.saveState(save,generation),before,generation);
      check('stale-generation-rejected-through-real-preload',accepted===false&&(await snapshot()).level===1,{accepted,generation,currentGeneration:await field(async()=>await window.desmon.getGeneration())});
      if(list.length)result.restore={checkpointId:list[0].id,before,identity:priorIdentity,settings:priorSettings,nextCompanionId:reset.nextCompanionId};
      await capture('reset-checkpoint');
    });
  } else {
    await scenario('restart-and-restore',async()=>{
      const fresh=await snapshot();
      check('reset-survives-app-restart',fresh.level===1&&fresh.companions.length===0&&fresh.nextCompanionId>=restore.nextCompanionId,{fresh});
      await click('#tab-profile');await click('#progress-recovery summary');
      const list=await renderer(async()=>await window.desmon.listCheckpoints());
      check('checkpoint-survives-app-restart',list.some(c=>c.id===restore.checkpointId),{list});
      await capture('restart-checkpoint');
      await queueDialog(0);await click('.checkpoint-row button');
      check('restore-cancel-preserves-current-progress',(await snapshot()).level===1&&(await renderer(async()=>await window.desmon.listCheckpoints())).length===1);
      await queueDialog(1);await click('.checkpoint-row button');
      const restored=await until(async()=>{const s=await snapshot();return s.level===restore.before.level?s:null;},'checkpoint restored');
      check('restore-recovers-progress-with-durable-identity-and-ids',restored.coins===restore.before.coins&&
        JSON.stringify(restored.companions)===JSON.stringify(restore.before.companions)&&restored.nextCompanionId>=restore.nextCompanionId&&
        restored.earlyCaptureUsed===restore.before.earlyCaptureUsed&&restored.progress.pvpWins===restore.before.progress.pvpWins&&restored.progress.pvpLosses===restore.before.progress.pvpLosses&&
        JSON.stringify(await identity())===JSON.stringify(restore.identity)&&JSON.stringify(await settings())===JSON.stringify(restore.settings),{restored});
      const after=await renderer(async()=>await window.desmon.listCheckpoints());
      check('restore-backs-up-current-progress-first',after.length===2&&after.some(c=>c.reason==='restore'&&c.level===1),{after});
      await capture('restored-checkpoints');await click('#tab-hero');await capture('restored-hero');
    });
  }
  result.finishedAt=new Date().toISOString();result.passed=result.errors.length===0&&result.checks.every(c=>c.passed);
  writeFileSync(join(outputDir,'ui.json'),JSON.stringify(result,null,2)+'\n');return result;
}
