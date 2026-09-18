#!/usr/bin/env node
// Approved three-look reference, plus the archived original outfit study.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const jobs = process.argv.includes('--jobs');
const studyModule = jobs ? 'heroJobStudies' : 'heroEvolutionStudies';
const studyExport = jobs ? 'HERO_JOB_STUDIES' : 'HERO_EVOLUTION_STUDIES';
const basename = jobs ? 'hero-job-study' : 'hero-three-study';
const title = jobs ? '눈동자와 피부색까지 다른 3종' : '처음 영웅에서 발전하는 3가지 모습';
const intro = jobs
  ? '14×14 크기와 원본의 공격 자세는 그대로.<br>직업에 맞는 눈동자와 피부색을 얼굴과 손에 적용했습니다.'
  : '같은 얼굴, 같은 자세, 같은 크기.<br>원본의 갈색 머리와 초록 옷을 이어받아 장비를 발전시켰습니다.';
const code = `
import { heroIdle, heroAttack } from './src/renderer/sprites/hero.ts';
import { ${studyExport} as studies } from './src/renderer/sprites/${studyModule}.ts';
import { drawSprite } from './src/renderer/sprites/sprite.ts';
import { createEngine, DEFAULT_SAVE, mulberry32 } from './src/core/index.ts';
import { createGame } from './src/renderer/game.ts';
const entries = [{id:'original',name:'원본 · 처음 영웅',detail:'갈색 머리 · 초록 튜닉',idle:heroIdle,attack:heroAttack},...studies];
const cards=[];
for (const [index, entry] of entries.entries()) {
 const card=document.createElement('article');card.className='card';
 const title=document.createElement('h2');title.textContent=entry.name;card.append(title);
 const stage=document.createElement('div');stage.className='stage';
 const canvas=document.createElement('canvas');canvas.width=14;canvas.height=14;canvas.className='large';canvas.setAttribute('aria-label',entry.name);stage.append(canvas);card.append(stage);
 const detail=document.createElement('p');detail.textContent=entry.detail;card.append(detail);
 const actual=document.createElement('canvas');actual.width=14;actual.height=14;actual.className='actual';actual.setAttribute('aria-label',entry.name+' 실제 크기');
 const small=document.createElement('div');small.className='small';small.append(actual);card.append(small);
 const label=document.createElement('p');label.className='caption';label.textContent='게임에 보이는 크기 · 동일 배율';card.append(label);
 document.getElementById('compare').append(card);cards.push({entry,canvases:[canvas,actual]});
 const poses=document.createElement('article');poses.className='poses';
 const poseTitle=document.createElement('h3');poseTitle.textContent=entry.name;poses.append(poseTitle);
 const poseRow=document.createElement('div');poseRow.className='pose-row';
 for(let i=0;i<3;i++){
   const cell=document.createElement('div'),pose=document.createElement('canvas'),text=document.createElement('p');pose.width=14;pose.height=14;
   drawSprite(pose.getContext('2d'),entry.attack,i,0,0);text.textContent=['준비','타격','회수'][i];cell.append(pose,text);poseRow.append(cell);
 }
 poses.append(poseRow);document.getElementById('poses').append(poses);
 const formId=${JSON.stringify(jobs ? ['h00','h01','h05','h09'] : ['h00','h01','h11','h21'])}[index];
 const roll={formId,buffPercent:index===0?0:20};
 const engine=createEngine({...DEFAULT_SAVE,level:8,hero:{equipped:roll,collection:index===0?[]:[roll],choices:[],reincarnations:2,offerSerial:0,deferRemainingMs:0}},mulberry32(7));
 const game=createGame(engine),field=document.createElement('canvas'),scene=document.createElement('article'),heading=document.createElement('h3');
 heading.textContent=entry.name;field.width=200;field.height=130;game.draw(field.getContext('2d'));scene.append(heading,field);document.getElementById('fields').append(scene);
}
let attack=false,paused=true,flipX=false;
const states=()=>{for(const [key,value]of[['idle',!attack],['attack',attack],['pause',paused],['mirror',flipX]])document.getElementById(key).setAttribute('aria-pressed',String(value));};
document.getElementById('idle').onclick=()=>{attack=false;states();};
document.getElementById('attack').onclick=()=>{attack=true;paused=false;states();};
document.getElementById('pause').onclick=()=>{paused=!paused;states();};
document.getElementById('mirror').onclick=()=>{flipX=!flipX;states();};
states();
function paint(now){
 for(const {entry,canvases} of cards){const sprite=attack?entry.attack:entry.idle,frame=paused?0:Math.floor(now/(attack?140:500))%sprite.frames.length;
  for(const c of canvases){const ctx=c.getContext('2d');ctx.clearRect(0,0,14,14);drawSprite(ctx,sprite,frame,0,0,{flipX});}
 }
 requestAnimationFrame(paint);
}
requestAnimationFrame(paint);
`;

// Approved job looks use the live catalogue; the rejected outfit study is
// retained as an isolated historical preview with its own injected artwork.
const result = await build({
  stdin:{contents:code,resolveDir:root},bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',
  plugins:jobs ? [] : [{name:'three-look-review',setup(builder){
    builder.onLoad({filter:/[/\\]sprites[/\\]heroForms\.ts$/},()=>({
      resolveDir:resolve(root,'src/renderer/sprites'),loader:'ts',contents:`
        import { heroIdle,heroAttack } from './hero.ts';
        import { ${studyExport} as studies } from './${studyModule}.ts';
        import { drawSprite } from './sprite.ts';
        export const HERO_FORM_IDS=['h01','h11','h21'];
        export function heroFormSprite(id,attack=false){const study=studies[HERO_FORM_IDS.indexOf(id)];return study?(attack?study.attack:study.idle):(attack?heroAttack:heroIdle);}
        export function drawHeroForm(ctx,id,x,y,opts){drawSprite(ctx,heroFormSprite(id),0,x,y,opts);}
      `,
    }));
  }}],
});
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DesMon · ${title}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#191b23;color:#eee9dc;font:14px system-ui,sans-serif;padding:30px;max-width:1120px;margin:auto}
h1{font-size:25px;margin:5px 0 12px}h2{font-size:15px;margin:0}h3{font-size:13px;margin:0 0 16px}p{color:#b7b8bd;line-height:1.7;margin:10px 0}.eyebrow{color:#d4ba73;font-size:11px;letter-spacing:.1em}
header{margin-bottom:24px}.controls{display:flex;gap:6px;margin-top:18px}button{background:#292d39;color:#eee9dc;border:1px solid #555a69;padding:8px 12px;border-radius:5px;cursor:pointer}button[aria-pressed=true]{border-color:#d4ba73;background:#4c432d}button:focus-visible{outline:2px solid #d4ba73;outline-offset:3px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.card,.poses{background:#282c37;border:1px solid #424653;border-radius:8px;padding:18px 10px;text-align:center}
.card:first-child{border-color:#869287}.stage{height:155px;display:grid;place-items:center}.large{width:112px;height:112px}.small{height:76px;display:grid;place-items:center;border-top:1px solid #424653;margin-top:18px;padding-top:12px}.actual{width:56px;height:56px}
canvas{image-rendering:pixelated}.caption{font-size:11px;margin-bottom:0}.pose-row{display:flex;justify-content:space-evenly;gap:6px}.pose-row canvas{width:56px;height:56px}.pose-row p{font-size:11px;margin-bottom:0}section{margin:28px 0}section>h2{margin-bottom:16px}
#fields{display:grid;grid-template-columns:400px 400px;gap:20px;justify-content:center}#fields article{background:#282c37;border:1px solid #424653}#fields h3{padding:12px;margin:0}#fields canvas{width:400px;height:260px;display:block}
footer{border-top:1px solid #424653;padding-top:16px;color:#b7b8bd;font-size:12px;line-height:1.7}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}#fields{grid-template-columns:400px}body{padding:16px}}@media(max-width:460px){#fields{justify-content:start}body{padding:10px}.pose-row canvas{width:42px;height:42px}.card{padding:12px 6px}.card>p{min-height:48px}}
</style><div id="review"><header><div class="eyebrow">DESMON / ${jobs ? 'JOB DESIGN' : 'ORIGINAL HERO'} STUDY</div><h1>${title}</h1><p>${intro}</p><div class="controls"><button id="idle">대기</button><button id="attack">공격</button><button id="pause">정지</button><button id="mirror">좌우 반전</button></div></header><div id="compare" class="grid"></div>
<section><h2>공격 자세 비교</h2><div id="poses" class="grid"></div></section></div>
<section><h2>실제 필드에서 같은 배율로 비교</h2><p>원본과 세 모습 모두 14×14 도트입니다. ${jobs ? '게임의 실제 영웅 목록으로 그렸습니다.' : '검토용 도트를 게임 렌더러에 주입했습니다.'}</p><div id="fields"></div></section>
<footer>원본과 세 모습 모두 대기 2프레임·공격 3프레임을 사용합니다.<br>${jobs ? '확정된 세 모습은 50종 목록의 H01·H05·H09에 포함되어 있습니다. <a style="color:#d4ba73" href="hero-gallery.html">50종 도감 보기</a><br>참고: <a style="color:#d4ba73" href="https://www.dfoneople.com/pr/landing/character">던전앤파이터 공식 캐릭터 소개</a>의 귀검사·도적·성직자 계열.' : '이전 의상 시안을 보존한 검토 페이지입니다.'}</footer>
<script>${result.outputFiles[0].text.replaceAll('</script','<\\/script')}</script></html>`;
writeFileSync(resolve(root,`docs/v0.4/${basename}.html`),html);
console.log(`Rendered original hero + exactly 3 studies at identical 14×14 scale: docs/v0.4/${basename}.html`);
