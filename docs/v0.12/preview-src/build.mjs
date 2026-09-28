// Run from the repository: node docs/v0.12/preview-src/build.mjs
import { buildSync } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = resolve(root, 'docs/v0.12/play-preview');
mkdirSync(output, { recursive: true });
const read = path => readFileSync(resolve(root, path), 'utf8');
const sources = new Set(['static/style.css', 'static/menu.css', 'docs/v0.12/preview-src/build.mjs', 'docs/v0.12/preview-src/field.css', 'docs/v0.12/preview-src/menu.css']);
const bundle = contents => {
  const result = buildSync({ stdin: { contents, resolveDir: root, loader: 'ts' }, bundle: true, write: false,
    format: 'iife', platform: 'browser', target: 'es2022', minify: true, metafile: true });
  for (const path of Object.keys(result.metafile.inputs)) if (path !== '<stdin>') sources.add(path);
  return result.outputFiles[0].text.replaceAll('</script', '<\\/script');
};
const doc = (title, css, body, js = '') => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>${title}</title><style>${css}</style></head><body>${body}<script>${js}</script></body></html>`;
const fieldJs = bundle(`import {mountFieldPreview} from './docs/v0.12/preview-src/field.ts';
 const query=new URLSearchParams(location.search); document.body.style.background=query.get('bg')==='light'?'#eeeae3':query.get('bg')==='transparent'?'transparent':'#282c34';
 mountFieldPreview(document.querySelector('canvas'),document.querySelector('#raid-status'),query.get('state')??'battle',Number(query.get('players')??32));`);
writeFileSync(resolve(output, 'field.html'), doc('DesMon · 실제 크기 필드 프리뷰',
  read('static/style.css') + read('docs/v0.12/preview-src/field.css'),
  '<canvas aria-label="게임 화면" width="200" height="130"></canvas><div class="drag-handle"></div><button id="raid-status" type="button" hidden></button>', fieldJs));
const menuJs = bundle(`import {mountRaidPreview} from './docs/v0.12/preview-src/menu.ts';
 mountRaidPreview(document.body,new URLSearchParams(location.search).get('state')??'countdown');`);
writeFileSync(resolve(output, 'menu.html'), doc('DesMon · 레이드 메뉴 프리뷰',
  read('static/menu.css') + read('docs/v0.12/preview-src/menu.css'), '', menuJs));

const chrome = `*{box-sizing:border-box}body{margin:0;padding:24px;background:#17191f;color:#deeed6;font:13px/1.6 system-ui,-apple-system,sans-serif}
main{max-width:1200px;margin:auto}h1{font-size:22px;font-weight:650;margin:0 0 8px}h2{font-size:15px;margin:0 0 8px}p{margin:4px 0 18px;color:#aeb8c1}
a{color:#6dc2ca}label{display:inline-flex;align-items:center;gap:8px;margin-right:12px}select,button{font:inherit;color:#deeed6;background:#272c36;border:1px solid #757161;padding:5px 9px;border-radius:0}
button{cursor:pointer}button:focus-visible,select:focus-visible{outline:2px solid #dad45e;outline-offset:2px}header{margin-bottom:22px}iframe{border:0;display:block;color-scheme:dark}
.controls{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 14px}.screens{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start}.frame-wrap{outline:1px solid #4e4a4e;width:400px;height:260px;overflow:hidden;background:#282c34}
.menu-wrap{width:560px;height:640px;outline:1px solid #4e4a4e}.notes{max-width:430px;margin-top:16px}.caption{font-size:12px;color:#aeb8c1;margin:8px 0 20px}.board{display:grid;gap:22px 24px}figure{margin:0}figcaption{margin-bottom:8px;color:#deeed6;font-size:14px}.board iframe{outline:1px solid #4e4a4e}.legend{font-size:12px;color:#aeb8c1}.board-foot{margin-top:20px}.frame-wrap iframe{transform-origin:0 0}@media(max-width:660px){body{padding:16px}.screens{overflow:auto}}`;
const fieldStates = [['baseline','현재 사냥 화면'],['countdown','레이드 시작 전'],['alert','참전 확인'],['confirmed','참여 완료'],['battle','보스 레이드'],['victory','레이드 승리'],['defeat','레이드 실패']];
const menuStates = [['gathering','해금 조건 모집'],['countdown','시작 전 · 참여 모집'],['confirming','참전 확인 팝업'],['result','결과 · 보상 팝업'],['full','정원 마감'],['battle','전투 중'],['failure','실패 · 결과 팝업']];
const options = (items, selected) => items.map(([value,label])=>`<option value="${value}"${value===selected?' selected':''}>${label}</option>`).join('');
const body = `<main><header><h1>DesMon v0.12 · 플레이 화면 보정용 프리뷰</h1>
<p>실제 앱의 createGame·레이드 장면·메뉴·픽셀 팝업 모듈을 합성 데이터로 렌더링합니다. 이 화면의 버튼과 보상은 예시이며 실서버 통신과 저장은 없습니다.</p>
<a href="play-preview/field-board.html">인게임 전체 비교</a> · <a href="play-preview/crowd-board.html">참여 인원별 비교</a> · <a href="play-preview/menu-board.html">메뉴 전체 비교</a></header>
<div class="screens"><section><h2>인게임 · 실제 창 400 × 260</h2><div class="controls"><label>화면 <select id="field-state">${options(fieldStates,'battle')}</select></label></div>
<div class="controls"><label>참여 인원 <select id="players"><option value="8">8명</option><option value="20">20명</option><option value="32" selected>32명</option><option value="50">50명</option></select></label></div>
<div class="controls"><label>배경 <select id="background"><option value="dark">어두운 바탕</option><option value="light">밝은 바탕</option></select></label>
<label>보기 <select id="zoom"><option value="1">실제 크기</option><option value="2">2배 확대</option></select></label><label><input id="motion" type="checkbox">움직임</label></div>
<div id="field-wrap" class="frame-wrap"><iframe id="field" title="400×260 게임 화면" src="play-preview/field.html?state=battle" width="400" height="260"></iframe></div>
<p class="notes">보스 도트는 이전 프리뷰의 2배입니다. 영웅들은 보스 앞 중앙을 포함한 필드 전체에 겹쳐 서며, 내 영웅은 노란 표식과 함께 맨 앞 중앙에 표시됩니다. 전투 화면을 클릭하면 공격 데미지를 확인할 수 있습니다.</p>
<p class="notes">배경색은 투명 게임 창을 비교하기 위한 바탕입니다. 실제 게임의 배경으로 추가되지 않습니다.</p></section>
<section><h2>레이드 메뉴 · 현재 메뉴 폭 560</h2><div class="controls"><label>화면 <select id="menu-state">${options(menuStates,'countdown')}</select></label><button id="menu-reset" type="button">선택 화면 다시 보기</button></div>
<div class="menu-wrap"><iframe id="menu" title="560×640 레이드 메뉴" src="play-preview/menu.html?state=countdown" width="560" height="640"></iframe></div>
<p class="caption">참여·확인 버튼은 프리뷰 안에서 동작합니다. 서버나 저장 파일에 반영되지 않습니다.</p></section></div></main>`;
const js = `const el=id=>document.getElementById(id); const refreshField=()=>{el('field').src='play-preview/field.html?state='+el('field-state').value+'&players='+el('players').value+'&bg='+el('background').value+'&motion='+(el('motion').checked?'1':'0')};
for(const id of ['field-state','players','background','motion'])el(id).addEventListener('change',refreshField);
el('zoom').addEventListener('change',()=>{const n=Number(el('zoom').value);el('field-wrap').style.width=400*n+'px';el('field-wrap').style.height=260*n+'px';el('field').style.transform='scale('+n+')'});
const refreshMenu=()=>{el('menu').src='play-preview/menu.html?state='+el('menu-state').value};el('menu-state').addEventListener('change',refreshMenu);el('menu-reset').addEventListener('click',refreshMenu);`;
writeFileSync(resolve(root,'docs/v0.12/play-screen-preview.html'),doc('DesMon v0.12 · 플레이 화면 프리뷰',chrome,body,js));

const board = (type, states, w, h, columns) => {
  const width=48+columns*w+(columns-1)*24;
  return doc(`DesMon · ${type==='field'?'인게임':'메뉴'} 비교`,chrome+`body{width:${width}px}.board{grid-template-columns:repeat(${columns},${w}px)}`,
  `<header><h1>DesMon v0.12 · ${type==='field'?'현재 게임과 레이드 화면 비교':'레이드 메뉴와 픽셀 팝업'}</h1>
  <p>${type==='field'?'모든 창은 400 × 260 실제 크기 · 기존 렌더러와 실제 스프라이트 사용':'모든 창은 560 × 640 실제 크기 · 기존 메뉴 CSS 사용'}</p></header>
  <div class="board">${states.map(([state,label],i)=>`<figure><figcaption>${String(i+1).padStart(2,'0')} · ${label}</figcaption><iframe title="${label}" src="${type}.html?state=${state}" width="${w}" height="${h}"></iframe></figure>`).join('')}</div>
  <p class="board-foot legend">${type==='field'?'사냥·레이드: 실제 앱의 createGame().draw(). 보스 도트 2배, 예시 영웅 32명 겹침 배치. 배경은 투명 창 비교용 바탕.':'실제 앱과 같은 레이드 카드·팝업 모듈. 나머지 4종 보스는 임시 실루엣이며, 보상 수치는 예시.'} 실서버 연결 없음.</p>`);
};
writeFileSync(resolve(output,'field-board.html'),board('field',fieldStates,400,260,3));
writeFileSync(resolve(output,'menu-board.html'),board('menu',menuStates,560,640,2));
writeFileSync(resolve(output,'crowd-board.html'),doc('DesMon · 참여 인원별 레이드 화면',chrome+'body{width:896px}.board{grid-template-columns:repeat(2,400px)}',
  `<header><h1>DesMon v0.12 · 거대 보스와 다인 레이드</h1><p>400 × 260 실제 크기 · 보스 도트 2배 · 모든 영웅 표시 · 내 영웅은 맨 앞</p></header>
  <div class="board">${[8,20,32,50].map(n=>`<figure><figcaption>${n}명 참전</figcaption><iframe title="${n}명 레이드" src="field.html?state=battle&players=${n}" width="400" height="260"></iframe></figure>`).join('')}</div>
  <p class="board-foot legend">보스는 1도트 = 화면 4px, 영웅은 1도트 = 화면 2px. 중앙까지 고르게 채우며, 내 영웅은 맨 앞 중앙에 표시합니다.</p>`));
const hashes=Object.fromEntries([...sources].sort().map(path=>[path,createHash('sha256').update(read(path)).digest('hex')]));
writeFileSync(resolve(output,'sources.json'),JSON.stringify({purpose:'code-rendered review preview; not a release or approval',sources:hashes},null,2)+'\n');
process.stdout.write(`Built ${relative(root,output)} and docs/v0.12/play-screen-preview.html\n`);
