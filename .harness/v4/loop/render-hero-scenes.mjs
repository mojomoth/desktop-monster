#!/usr/bin/env node
// Production menu + field/replay renderers with an in-memory bridge only.
// node .harness/v4/loop/render-hero-scenes.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const bundle = contents => buildSync({stdin:{contents,resolveDir:root},bundle:true,write:false,platform:'browser',format:'iife',target:'es2022'}).outputFiles[0].text.replaceAll('</script','<\\/script');
const fixture = bundle(`
import { createEngine, DEFAULT_SAVE, mulberry32, monsterMaxHp, simulateBattle } from './src/core/index.ts';
import { HERO_FORMS, newHeroProgress, heroForm } from './src/core/hero.ts';
import { createGame, ATTACK_FRAME_MS } from './src/renderer/game.ts';
const companions = ['slime','wolf','golem'].map((speciesId,index)=>({id:'c'+(index+1),speciesId,bossIndex:4+index*5,level:4+index,stars:1}));
const initial = {...DEFAULT_SAVE,level:12,coins:500,xp:0,killCount:80,bestIndex:32,nextCompanionId:4,companions,pvpParty:companions.map(c=>c.id),hero:{...newHeroProgress(),equipped:{formId:'h41',buffPercent:20},collection:HERO_FORMS.map(form=>({formId:form.id,buffPercent:20})),choices:['h01','h25','h49'].map((formId,index)=>({formId,buffPercent:13+index*5})),reincarnations:5,offerSerial:1}};
const engine=createEngine(initial,mulberry32(7));
const opponents=['h25','h49','h50'].map((formId,index)=>({playerId:'preview'+index,rank:index+1,name:['Moonshade','DawnGuard','StarCaller'][index],bestIndex:35+index*8,rebirths:index+2,wins:[14,22,31][index],losses:[5,8,9][index],hero:{formId,buffPercent:18+index*3},party:['slime','dragon','golem'].map((speciesId,n)=>({id:'d'+index+n,speciesId,bossIndex:4+n*5,level:4+n,stars:1+Number(index===2)}))}));
let subscriber=()=>{}, selected=opponents[0];
const ok=value=>({ok:true,value});
const replayFor=(mine,opponent)=>{const battle=simulateBattle(mine,opponent.party,{attacker:engine.toSave().hero.equipped,defender:opponent.hero});return {...battle,blows:battle.blows.map(blow=>({...blow,damage:String(blow.damage)}))};};
window.desmon={
 reportMenuReady(){subscriber(engine.toSave());},onStateChanged(cb){subscriber=cb;return()=>{};},
 async sendAction(action){engine.apply(action);subscriber(engine.toSave());document.getElementById('fixture-status').textContent='미리보기 안에서만 실행됨: '+action.type;},
 async getIdentity(){return {name:'ArtPreview',playerId:'preview',online:true};},
 async setName(name){return {name,playerId:'preview',online:true};},
 async getLeaderboard(){return ok({top:opponents.map(({rank,name,bestIndex,rebirths})=>({rank,name,bestIndex,rebirths})),me:null,removed:[]});},
 async pvpOpponents(){return ok({opponents});},
 async pvpMatch(id){selected=opponents.find(opponent=>opponent.playerId===id)??opponents[0];return ok({matchId:'preview-match',seed:7,bot:false,opponent:selected,expiresAt:2000000000000});},
 async pvp(matchId,ids){const result=replayFor(companions.filter(c=>ids.includes(c.id)),selected);return ok({bot:false,seed:7,win:result.attackerWon,opponent:selected,blows:result.blows,stolen:null,lost:null,removed:[]});},
 async thefts(){return ok({thefts:[]});},async reclaim(){return {ok:false,error:'gone'};},
};
const entries=[{formId:'h01'},{formId:'h25'},{formId:'h49'},{formId:'h41',replay:true}];
let stage=0;
function renderScenes(){
 const fields=document.getElementById('fields');fields.replaceChildren();
 for(const entry of entries){
  const fieldSave={...initial,level:8,monsterIndex:32,monsterHp:String(monsterMaxHp(32)),hero:{...initial.hero,equipped:{formId:entry.formId,buffPercent:20},choices:[]}};
  const game=createGame(createEngine(fieldSave,mulberry32(7)));
  if(entry.replay){const opponent=opponents[2];game.playReplay({opponentName:opponent.name,opponentHero:opponent.hero,opponentParty:opponent.party,blows:replayFor(companions,opponent).blows});if(stage)game.update(ATTACK_FRAME_MS*stage);}
  else if(stage){game.attack('keyboard');game.update(ATTACK_FRAME_MS*(stage-1));}
  const scene=document.createElement('article'),title=document.createElement('h3'),canvas=document.createElement('canvas');
  title.textContent=entry.replay?'PvP · '+heroForm(entry.formId).name+' vs '+heroForm('h50').name:heroForm(entry.formId).name+' · 필드';
  canvas.width=200;canvas.height=130;canvas.setAttribute('aria-label',title.textContent);canvas.dataset.form=entry.formId;
  game.draw(canvas.getContext('2d'));scene.append(title,canvas);fields.append(scene);
 }
 for(const [index,id]of ['scene-idle','scene-windup','scene-strike','scene-recover'].entries())document.getElementById(id).setAttribute('aria-pressed',String(stage===index));
}
for(const [index,id]of ['scene-idle','scene-windup','scene-strike','scene-recover'].entries())document.getElementById(id).onclick=()=>{stage=index;renderScenes();};
renderScenes();
`);
const menu = bundle(`import './src/menu/index.ts';`);
const productionBody = readFileSync(resolve(root,'static/menu.html'),'utf8').match(/<body>([\s\S]*?)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/,'');
const css = readFileSync(resolve(root,'static/menu.css'),'utf8');
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DesMon · 영웅 실제 화면 검토</title>
<style>${css}
.review-header,.review-scenes{max-width:840px;margin:16px auto 28px}.review-header h1{font-size:23px;margin:8px 0}.review-header p{color:#a9b0c5;line-height:1.7}.review-tag{color:#dad45e;font-size:11px}.review-menu{width:420px;margin:24px auto;padding:12px;border:1px solid #8595a1}.review-menu>h2{font-size:13px;margin:0 0 12px}.review-controls{display:flex;gap:6px;margin-bottom:12px}.review-controls button[aria-pressed=true]{background:#6dc2ca;color:#140c1c}#fields{display:grid;grid-template-columns:400px 400px;gap:20px}#fields article{background:#23243f}#fields h3{font-size:11px;padding:10px;margin:0}#fields canvas{width:400px;height:260px;display:block;image-rendering:pixelated}#fixture-status{font-size:11px;color:#a9b0c5;min-height:16px}.review-footer{max-width:840px;margin:24px auto;color:#a9b0c5;line-height:1.7}@media(max-width:860px){#fields{grid-template-columns:400px;justify-content:center}.review-menu{max-width:100%}}
</style><body><header class="review-header"><span class="review-tag">DESMON / PRODUCTION RENDER REVIEW</span><h1>같은 영웅, 실제 게임 화면에서</h1><p>현재 게임의 필드·환생·도감·PvP 화면을 그대로 실행한 검토 페이지입니다.<br>모든 플레이어와 데이터는 메모리에만 있는 예시입니다. 실제 서버 연결과 저장 파일 변경은 없습니다.</p></header>
<section class="review-scenes"><div class="review-controls"><button class="btn" id="scene-idle">대기</button><button class="btn" id="scene-windup">준비</button><button class="btn" id="scene-strike">타격</button><button class="btn" id="scene-recover">회수</button></div><div id="fields"></div></section>
<main class="review-menu" id="menu-preview"><h2>실제 Collection & Battle · 420px 창</h2>${productionBody}<p id="fixture-status">검토용 예시 데이터 · 원본 메뉴 코드와 CSS</p></main>
<footer class="review-footer">영웅 14×14 / 필드 400×260 / 환생 카드 96px / PvP 목록 64px<br>모든 화면에서 영웅은 56px, 도트 하나는 4px로 표시됩니다. 위의 네 장면은 같은 시점의 정지 화면입니다.</footer>
<script>${fixture}</script><script>${menu}</script></body></html>`;
writeFileSync(resolve(root,'docs/v0.4/hero-game-preview.html'),html);
console.log('Rendered production menu, field and PvP replay: docs/v0.4/hero-game-preview.html');
