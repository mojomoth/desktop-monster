#!/usr/bin/env node
// Review artifacts use production modules and synthetic in-memory saves only.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildSync } from 'esbuild';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const out = resolve(root, 'docs/v0.5');
const bundle = (contents) => buildSync({ stdin: { contents, resolveDir: root }, bundle: true,
  write: false, platform: 'browser', format: 'iife', target: 'es2022' }).outputFiles[0].text.replaceAll('</script', '<\\/script');
const menu = readFileSync(resolve(root, 'static/menu.html'), 'utf8')
  .replace('<link rel="stylesheet" href="menu.css" />', `<style>${readFileSync(resolve(root, 'static/menu.css'), 'utf8')}</style>`)
  .replace(/<script type="module"[^>]*><\/script>/, '')
  .replace('<body>', '<body><aside style="padding:12px;margin-bottom:12px;border:1px dashed #8595a1">v0.5 검토용 · 합성 세이브 / 메모리에서만 동작 · 서버 연결 없음<br><button id="fixture-fresh">새 게임</button> <button id="fixture-offer">환생 후보</button> <button id="fixture-discovered">발견·기록 예시</button> <button id="fixture-tick">플레이 5초 진행</button></aside>');
const client = `
import { createEngine, DEFAULT_SAVE, mulberry32, newHeroProgress, newProgress, HERO_FORMS, SPECIES_IDS } from './src/core/index.ts';
let engine, emit = () => {}, playerName = 'Bongo_Knight';
const fixture = (kind) => {
  const hero = { ...newHeroProgress(), reincarnations: 4, equipped: { formId:'h01', buffPercent:25, stacks:2 },
    collection:[{ formId:'h01', buffPercent:25, stacks:2 },{ formId:'h02', buffPercent:18 }],
    choices:[{formId:'h01',buffPercent:10},{formId:'h03',buffPercent:18},{formId:'h57',buffPercent:24}],offerSerial:7,offerLevel:14 };
  const progress = { ...newProgress(), playTimeMs: 1_210_000, speciesKills:{dragon:3,slime:5,golem:3},
    heroCounts:{h01:3,h02:1}, seenHeroes:['h01','h02','h03','h57'], seenMonsters:SPECIES_IDS.slice(0,40), goldSpent:1000,
    reincarnationHistory:[{number:1,formId:'h01',level:12,playTimeMs:79000,buffPercent:25,stacks:0},
      {number:2,formId:'h02',level:13,playTimeMs:199000,buffPercent:18,stacks:0},
      {number:3,formId:'h01',level:13,playTimeMs:319000,buffPercent:25,stacks:1},
      {number:4,formId:'h01',level:14,playTimeMs:439000,buffPercent:25,stacks:2}] };
  if(kind === 'discovered') { hero.choices=[]; progress.seenHeroes=HERO_FORMS.map(f=>f.id); progress.seenMonsters=[...SPECIES_IDS]; }
  engine=createEngine(kind==='fresh'?null:{...DEFAULT_SAVE,level:14,coins:1800,killCount:342,hero,progress,
    monsterSpeciesId:'crownwyrm', monsterHp:'10', rebirths:4},mulberry32(505));
  emit(engine.toSave());
};
fixture('offer');
const offline = async () => ({ok:false,error:'offline'});
window.desmon={onStateChanged:cb=>{emit=cb;},reportMenuReady:()=>emit(engine.toSave()),
  sendAction:async action=>{engine.apply(action);emit(engine.toSave());},
  getIdentity:async()=>({name:playerName,playerId:null,online:false}),
  setName:async name=>({name:playerName=/^[A-Za-z0-9_-]{1,16}$/.test(name)?name:playerName,playerId:null,online:false}),
  getLeaderboard:offline,pvpOpponents:offline,pvpMatch:offline,pvp:offline,thefts:offline,reclaim:offline};
import('./src/menu/index.ts');
for(const kind of ['fresh','offer','discovered']) document.getElementById('fixture-'+kind).onclick=()=>fixture(kind);
document.getElementById('fixture-tick').onclick=()=>{engine.tick(5000);emit(engine.toSave());};
window.v5Review={state:()=>engine.toSave(),fixture};
`;
writeFileSync(resolve(out, 'menu-preview.html'), menu.replace('</body>', `<script>${bundle(client)}</script></body>`));

const art = `
import { RARE_HERO_FORMS, RARE_MONSTERS } from './src/core/discovery.ts';
import { heroFormSprite } from './src/renderer/sprites/heroForms.ts';
import { monsterSprites } from './src/renderer/sprites/monsters.ts';
import { drawSprite } from './src/renderer/sprites/sprite.ts';
const entries=[];
for(const [label,forms,hero] of [['레어 영웅 20종',RARE_HERO_FORMS,true],['레어 몬스터 30종',RARE_MONSTERS,false]]) {
  const heading=document.createElement('h2');heading.textContent=label;document.body.append(heading);
  const grid=document.createElement('section');document.body.append(grid);
  for(const form of forms){
    const card=document.createElement('article'),canvas=document.createElement('canvas');canvas.width=144;canvas.height=120;
    card.append(canvas);const name=document.createElement('p');name.textContent=form.id+' · '+form.name;card.append(name);grid.append(card);
    entries.push({canvas,form,hero});
  }
}
let frame=0,silhouette=false;
function paint(){for(const {canvas,form,hero} of entries){
  const sprite=hero?heroFormSprite(form.id,frame>=2):monsterSprites[form.id].idle;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,144,120);
  drawSprite(ctx,sprite,frame%sprite.frames.length,(144-sprite.w*4)/2,112-sprite.h*4,{scale:4,...(silhouette?{tint:'#8595a1'}:{})});
}}
document.getElementById('frame').onclick=()=>{frame=(frame+1)%5;paint();};
document.getElementById('silhouette').onclick=()=>{silhouette=!silhouette;paint();};paint();
`;
writeFileSync(resolve(out, 'rare-gallery.html'), `<!doctype html><html lang="ko"><meta charset="utf-8"><title>DesMon v0.5 레어 50종</title>
<style>body{margin:24px;background:#140c1c;color:#deeed6;font:13px system-ui}h1{font-size:24px}section{display:grid;grid-template-columns:repeat(10,minmax(120px,1fr));gap:8px}article{background:#242338;text-align:center;border:1px solid #514a63;border-radius:8px}canvas{image-rendering:pixelated;max-width:100%}button{padding:8px;margin-right:6px}p{min-height:30px;margin:6px}@media(max-width:900px){section{grid-template-columns:repeat(5,1fr)}}</style>
<h1>DesMon v0.5 · 새로운 만남 50종</h1><p>프로덕션 스프라이트 · 픽셀당 4배 · 영웅 14×14 / 몬스터 고유 크기</p>
<button id="frame">다음 프레임</button><button id="silhouette">실루엣 전환</button><script>${bundle(art)}</script></html>`);
console.log('Generated docs/v0.5/menu-preview.html and rare-gallery.html (synthetic, offline).');
