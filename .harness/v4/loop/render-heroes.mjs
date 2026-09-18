#!/usr/bin/env node
// Standalone review of the exact production sprites; no Electron or image assets.
// node .harness/v4/loop/render-heroes.mjs [before-sprites.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const out = resolve(root, 'docs/v0.4');
const style = `
*{box-sizing:border-box}body{margin:0;padding:28px;background:#14151e;color:#eee9dd;font:14px system-ui,sans-serif}
header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:22px}
h1{font-size:26px;margin:6px 0 10px}p{color:#b7b5c5;margin:0;line-height:1.7}.eyebrow{color:#e0c174;letter-spacing:.12em;font-size:11px}
.controls{display:flex;gap:6px;flex-wrap:wrap}button{font:inherit;color:inherit;background:#292a39;border:1px solid #565161;padding:9px 12px;border-radius:7px;cursor:pointer}
button[aria-pressed=true]{background:#5d4a2d;border-color:#e0c174}button:focus-visible,.card:focus-visible{outline:2px solid #e0c174;outline-offset:3px}
section{margin-bottom:18px}h2{font-size:14px;color:#e0c174;font-weight:500;margin:0 0 8px}
.grid{display:grid;grid-template-columns:repeat(10,minmax(96px,1fr));gap:8px}.card{background:#242532;border:1px solid #3e3d4d;border-radius:10px;padding:0 3px 12px;text-align:center}
.stage{height:96px;display:grid;place-items:center}canvas{width:96px;height:96px;image-rendering:pixelated}.id{font-size:10px;color:#a09cae}.name{font-size:12px;margin:5px 0}.type{font-size:10px;color:#bbb4ca}
.complexion{display:flex;align-items:center;justify-content:center;gap:5px;margin-top:6px;color:#aca7b9;font-size:10px}.swatch{width:7px;height:7px;display:inline-block;border:1px solid #ffffff33}
.reference{display:flex;align-items:center;gap:18px;margin-bottom:22px;border-bottom:1px solid #3e3d4d;padding-bottom:12px}.reference canvas{flex:none}
footer{border-top:1px solid #3e3d4d;margin-top:24px;padding-top:16px;color:#aaa5b8;font-size:12px;line-height:1.7}
.zoom .grid{grid-template-columns:repeat(5,minmax(194px,1fr))}.zoom .stage{height:192px}.zoom .stage canvas{width:192px;height:192px}
.comparison{max-width:1120px;margin:auto}.comparison .grid{grid-template-columns:repeat(5,1fr)}.comparison .stage{height:160px}.comparison canvas{width:144px;height:144px}
@media(max-width:1120px){.grid{grid-template-columns:repeat(5,minmax(96px,1fr))}header{display:block}.controls{margin-top:16px}}
@media(max-width:600px){body{padding:16px}.grid,.zoom .grid,.comparison .grid{grid-template-columns:repeat(2,minmax(110px,1fr))}h1{font-size:23px}.zoom .stage{height:144px}.zoom .stage canvas{width:144px;height:144px}}
`;
const boot = `
import { HERO_FORMS } from './src/core/hero.ts';
import { heroFormSprite } from './src/renderer/sprites/heroForms.ts';
import { heroIdle } from './src/renderer/sprites/hero.ts';
import { drawSprite } from './src/renderer/sprites/sprite.ts';
const elements = { fire:'불', water:'물', wind:'바람', earth:'대지', dark:'어둠' };
const atlas = document.getElementById('atlas');
const cards = [];
function card(form, oldSprite, comparison = false) {
  const node = document.createElement('article'); node.className = 'card'; node.tabIndex = 0; node.dataset.form = form.id;
  const stage = document.createElement('div'); stage.className = 'stage';
  const canvas = document.createElement('canvas'); canvas.width = comparison ? 144 : 96; canvas.height = canvas.width;
  canvas.setAttribute('aria-label', form.name + ' 도트'); stage.append(canvas); node.append(stage);
  const sprite = oldSprite ?? heroFormSprite(form.id);
  for (const [cls, text] of [['id', form.id.toUpperCase()], ['name', form.name], ['type', form.type ? elements[form.type] + ' · ' + (form.buff === 'element' ? '속성 동료' : '모든 동료') : '처음 영웅 · 14 × 14']]) {
    const label = document.createElement('div'); label.className = cls; label.textContent = text; node.append(label);
  }
  if (sprite.palette.i) {
    const row = document.createElement('div'); row.className = 'complexion';
    for (const [label, key] of [['피부','s'], ['눈','i']]) {
      const dot = document.createElement('span'); dot.className = 'swatch'; dot.style.background = sprite.palette[key];
      dot.title = label + ' ' + sprite.palette[key]; row.append(dot, document.createTextNode(label));
    }
    node.append(row);
  }
  const entry = {form, canvas, active:false, oldSprite}; cards.push(entry);
  node.onmouseenter = node.onfocus = () => { entry.active = true; };
  node.onmouseleave = node.onblur = () => { entry.active = false; };
  return node;
}
function section(title, entries, comparison = false) {
  const node = document.createElement('section');
  const heading = document.createElement('h2'); heading.textContent = title; node.append(heading);
  const grid = document.createElement('div'); grid.className = 'grid'; entries.forEach(e => grid.append(card(e.form, e.oldSprite, comparison)));
  node.append(grid); atlas.append(node);
}
function drawCard(item, sprite, frame, flipX = false) {
  const ctx = item.canvas.getContext('2d'), size = item.canvas.width;
  ctx.clearRect(0,0,size,size);
  // A real art pixel is exactly four screen pixels. Even 32px historical art
  // is shown at that scale in the comparison, never enlarged to fill a card.
  const floor = size === 144 ? 136 : 76;
  drawSprite(ctx, sprite, frame, (size - sprite.w * 4) / 2, floor - sprite.h * 4, {flipX, scale:4});
}
`;
const gallery = `
const reference = document.getElementById('original');
drawSprite(reference.getContext('2d'), heroIdle, 0, 20,20, {scale:4});
for (let rank = 1; rank <= 5; rank++) section(rank + '단계 · ' + ['새벽','서약','왕실','천상','신화'][rank-1], HERO_FORMS.filter(f => f.rank === rank).map(form => ({form})));
let attacking = false, paused = true, flipX = false, enlarged = false, elapsed = 0, previous = 0;
function controls() {
  for (const [id, value] of [['idle',!attacking],['attack',attacking],['pause',paused],['mirror',flipX],['zoom',enlarged]]) document.getElementById(id).setAttribute('aria-pressed', String(value));
}
document.getElementById('idle').onclick = () => { attacking = false; elapsed = 0; controls(); };
document.getElementById('attack').onclick = () => { attacking = true; elapsed = 0; paused = false; controls(); };
document.getElementById('pause').onclick = () => { paused = !paused; controls(); };
document.getElementById('mirror').onclick = () => { flipX = !flipX; controls(); };
document.getElementById('zoom').onclick = () => { enlarged = !enlarged; document.body.classList.toggle('zoom',enlarged); controls(); };
controls();
function paint(now) {
  if (!paused && previous) elapsed += Math.min(100,now-previous);
  previous = now;
  for (const item of cards) {
    const action = attacking || (!paused && item.active);
    const sprite = heroFormSprite(item.form.id, action);
    drawCard(item, sprite, Math.floor(elapsed / (action ? 140 : 650)) % sprite.frames.length, flipX);
  }
  requestAnimationFrame(paint);
}
requestAnimationFrame(paint);
`;
function html(title, description, client, comparison = false) {
  const bundle = buildSync({stdin:{contents:boot + client, resolveDir:root}, bundle:true, write:false, platform:'browser', format:'iife', target:'es2022'}).outputFiles[0].text;
  return `<!doctype html>
<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DesMon · ${title}</title><style>${style}</style><body${comparison ? ' class="comparison"' : ''}>
<header><div><div class="eyebrow">DESMON / HERO COLLECTION</div><h1>${title}</h1><p>${description}</p></div>${comparison ? '' : '<div class="controls"><button id="idle" aria-pressed="true">대기</button><button id="attack" aria-pressed="false">공격</button><button id="pause" aria-pressed="true">정지</button><button id="mirror" aria-pressed="false">좌우 반전</button><button id="zoom" aria-pressed="false">확대 보기</button></div>'}</header>
${comparison ? '' : '<div class="reference"><canvas id="original" width="96" height="96" aria-label="원본 수습 영웅"></canvas><div><strong>시작을 함께한 영웅, 같은 크기의 새로운 직업</strong><p>14 × 14 · 원본의 눈·손·발과 공격 자세 유지<br>후드와 투구, 의상과 무기, 피부와 눈 색으로 구분되는 50종</p></div></div>'}
<main id="atlas"></main><footer>10개 직업 × 5단계 · 50종 / 250프레임 · 모습당 7색 이내<br>게임 코드에서 직접 불러온 도트입니다. ${comparison ? '변경 전후 모두 픽셀당 4배, 발 위치를 맞춰 비교합니다.' : '게임과 같은 픽셀당 4배 · 대기 2프레임 / 공격 3프레임 · 확대 보기는 8배입니다. 애니메이션 재생 중 카드에 포인터나 키보드 포커스를 두면 공격합니다.'}</footer>
<script>${bundle.replaceAll('</script', '<\\/script')}</script></body></html>\n`;
}
writeFileSync(resolve(out, 'hero-gallery.html'), html('50명의 영웅, 50개의 새로운 모습', '작은 몸집 그대로, 각자의 얼굴과 장비를 가진 영웅들.', gallery));
if (process.argv[2]) {
  const before = JSON.parse(readFileSync(resolve(process.argv[2]), 'utf8'));
  const ids = ['h01','h05','h09','h27','h41'];
  const sample = ids.map(id => before.find(form => form.id === id)).filter(Boolean);
  const compare = `
const old = ${JSON.stringify(sample)};
section('이전 디자인 · 동일한 픽셀 배율', old.map(form => ({form, oldSprite:form.idle})), true);
section('승인된 14px 스타일 · 새 50종에서 같은 ID', old.map(previous => ({form:HERO_FORMS.find(f => f.id === previous.id)})), true);
for (const item of cards) drawCard(item, item.oldSprite ?? heroFormSprite(item.form.id), 0);
`;
  writeFileSync(resolve(out, 'hero-redesign-comparison.html'), html('영웅 디자인 변경 전 · 후', '검사 · 자객 · 수호기사 · 마법사 · 최상위 검사', compare, true));
}
console.log(`Rendered 50-form gallery${process.argv[2] ? ' and before/after comparison' : ''} in docs/v0.4`);
