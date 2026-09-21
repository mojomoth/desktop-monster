#!/usr/bin/env node
// raid-preview.mjs — the pre-development preview gate (plan §6.3) and the art-lane boards (plan §6.2).
//   html                      → docs/v0.12/raid-preview.html + docs/v0.12/preview/{game,menu,board}.html (esbuild, production modules, fixtures)
//   capture OUT_DIR           → PNG per state + OUT_DIR/index.json (png hashes + source hashes); refuses to overwrite an attempt
//   board --lane DIR --out O  → sprite boards bundled FROM A LANE worktree (round critique), PNGs in O
//   verify FINAL_JSON         → passes only when docs/v0.12/RAID_ART.md's last approval line matches the captured sources
import { buildSync } from 'esbuild';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join, relative, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, sha } from './run.mjs';

export const PREVIEW_DIR = 'docs/v0.12/preview';
export const SOURCE_GLOBS = ['src/renderer/raidScene.ts', 'src/renderer/sprites/raidBosses.ts', 'src/renderer/sprites/raidEquipment.ts', 'src/renderer/sprites/raidBoss',
  'src/menu/raid.ts', 'src/menu/popup.ts', 'static/style.css', 'static/menu.css', 'static/index.html', 'static/menu.html', '.harness/v12/fixtures/raid.mjs'];
const ELECTRON = join(ROOT, 'node_modules/.bin/electron');
const bundle = (contents, resolveDir) => buildSync({ stdin: { contents, resolveDir, loader: 'ts' }, bundle: true, write: false, platform: 'browser',
  format: 'iife', target: 'es2022', logLevel: 'silent' }).outputFiles[0].text.replaceAll('</script', '<\\/script');
const page = (title, css, body, script) => `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${title}</title><style>${css}</style>${body}<script>${script}</script></html>`;
const listBossFiles = root => { const dir = join(root, 'src/renderer/sprites/raidBoss'); return existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.ts')).sort() : []; };
/** sha256 of every source file that the preview renders (directories expanded); missing files hash to null. */
export function sourceHashes(root = ROOT) {
  const out = {};
  const visit = rel => { const full = join(root, rel); if (!existsSync(full)) { out[rel] = null; return; }
    if (readdirSync(full, { withFileTypes: true })?.length !== undefined && !full.endsWith('.ts') && !full.endsWith('.css') && !full.endsWith('.html') && !full.endsWith('.mjs'))
      for (const f of readdirSync(full).sort()) visit(rel + '/' + f); else out[rel] = sha(readFileSync(full)); };
  for (const g of SOURCE_GLOBS) { const full = join(root, g); if (existsSync(full) && !/\.(ts|css|html|mjs)$/.test(g)) for (const f of readdirSync(full).sort()) visit(g + '/' + f); else visit(g); }
  return out;
}

// ---------- board (sprites only; works from a lane worktree with nothing but sprite files) ----------
export function boardHtml(root) {
  const bosses = listBossFiles(root), hasItems = existsSync(join(root, 'src/renderer/sprites/raidEquipment.ts')) && existsSync(join(root, 'src/core/raid.ts'));
  const imports = bosses.map((f, i) => `import * as boss${i} from './src/renderer/sprites/raidBoss/${f}';`).join('\n') +
    (hasItems ? `\nimport { raidEquipmentIcon } from './src/renderer/sprites/raidEquipment.ts';\nimport { RAID_CATALOG } from './src/core/raid.ts';` : '');
  const client = `${imports}
import { drawSprite } from './src/renderer/sprites/sprite.ts';
import { heroFormSprite } from './src/renderer/sprites/heroForms.ts';
const mods = [${bosses.map((f, i) => `['${f.replace('.ts', '')}', boss${i}]`).join(',')}];
const entries = [];
for (const [file, mod] of mods) for (const [name, s] of Object.entries(mod)) if (s && Array.isArray(s.frames) && s.w && s.h) entries.push({ id: file + '.' + name, sprite: s });
const items = ${hasItems ? 'RAID_CATALOG.map(t => ({ id: t.id, sprite: raidEquipmentIcon(t) }))' : '[]'};
const host = document.getElementById('host');
const ground = (ctx, w, h, scale) => { ctx.fillStyle = '#303040'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#6daa2c'; ctx.fillRect(0, h - 10 * scale, w, 2 * scale); ctx.fillStyle = '#854c30'; ctx.fillRect(0, h - 8 * scale, w, 8 * scale); };
const hero = heroFormSprite('h00', false);
function bossBoard(entry) {
  host.textContent = ''; const s = entry.sprite; const cells = [];
  for (const [label, scale, frame, opts] of [['frame 1 ×1', 1, 0, {}], ['frame 2 ×1', 1, 1, {}], ['hit tint ×1', 1, 0, { tint: '#deeed6' }], ['silhouette ×1', 1, 0, { tint: '#8595a1' }], ['frame 1 ×2', 2, 0, {}], ['frame 2 ×2', 2, 1, {}]]) {
    const w = 200 * scale, h = 130 * scale, c = document.createElement('canvas'); c.width = w; c.height = h; c.style.imageRendering = 'pixelated';
    const ctx = c.getContext('2d'); ground(ctx, w, h, scale);
    drawSprite(ctx, s, Math.min(frame, s.frames.length - 1), Math.round(100 * scale - s.w * scale / 2), 120 * scale - s.h * scale, { scale, ...opts });
    drawSprite(ctx, hero, 0, 30 * scale, 120 * scale - hero.h * scale, { scale, ...(opts.tint ? { tint: opts.tint } : {}) });
    const cap = document.createElement('figure'); const t = document.createElement('figcaption'); t.textContent = entry.id + ' · ' + s.w + '×' + s.h + ' · ' + label; cap.append(c, t); host.append(cap); cells.push(cap);
  }
  return { w: 860, h: 840 };
}
function itemBoard() {
  host.textContent = '';
  for (const scale of [1, 2, 4]) for (const { id, sprite } of items) {
    const c = document.createElement('canvas'); c.width = 16 * scale + 8; c.height = 16 * scale + 8; c.style.imageRendering = 'pixelated';
    const ctx = c.getContext('2d'); ctx.fillStyle = '#303040'; ctx.fillRect(0, 0, c.width, c.height); drawSprite(ctx, sprite, 0, 4, 4, { scale });
    const cap = document.createElement('figure'); const t = document.createElement('figcaption'); t.textContent = id + ' ×' + scale; cap.append(c, t); host.append(cap);
  }
  return { w: 860, h: 520 };
}
window.__v12 = { states: [...entries.map(e => 'board-' + e.id), ...(items.length ? ['board-items'] : [])],
  show: name => name === 'board-items' ? itemBoard() : bossBoard(entries.find(e => 'board-' + e.id === name)) };
`;
  const css = 'body{margin:12px;background:#303040;color:#deeed6;font:12px monospace}#host{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0}figcaption{font-size:11px}canvas{display:block}';
  return page('v0.12 raid art board', css, '<div id="host"></div>', bundle(client, root));
}

// ---------- full preview pages (production modules + fixtures) ----------
function gameHtml(root) {
  const style = readFileSync(join(root, 'static/style.css'), 'utf8');
  const client = `
import { createGame, VIEW_W, VIEW_H } from './src/renderer/game.ts';
import { createEngine, DEFAULT_SAVE, mulberry32 } from './src/core/index.ts';
import './src/renderer/sprites/index.ts';
import { createRaidScene, applyRaidState, tickRaid, drawRaid, raidLocalHit } from './src/renderer/raidScene.ts';
import { SCENE, NOW } from './.harness/v12/fixtures/raid.mjs';
const canvas = document.getElementById('game'), ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
const status = document.getElementById('raid-status');
const game = createGame(createEngine(DEFAULT_SAVE, mulberry32(7)));
const field = () => { game.update(16); game.draw(ctx); };
const ground = () => { ctx.clearRect(0, 0, VIEW_W, VIEW_H); ctx.fillStyle = '#6daa2c'; ctx.fillRect(0, 120, VIEW_W, 2); ctx.fillStyle = '#854c30'; ctx.fillRect(0, 122, VIEW_W, 8); };
const raid = view => { const scene = createRaidScene(view); applyRaidState(scene, view, 0); for (let i = 0; i < 6; i++) tickRaid(scene, 100); ground(); drawRaid(ctx, scene, 600); return scene; };
const states = {
  'game-countdown': () => { field(); status.hidden = false; status.className = ''; status.textContent = '레이드 22:34:56'; },
  'game-alert': () => { field(); status.hidden = false; status.className = 'alert'; status.textContent = '경고 · 참여'; },
  'game-alert-done': () => { field(); status.hidden = false; status.className = 'done'; status.textContent = '참여 완료'; },
  'game-battle': () => { status.hidden = true; const s = raid(SCENE.battle); raidLocalHit(s, 4200n, true); raidLocalHit(s, 2100n, false); ground(); drawRaid(ctx, s, 700); },
  'game-victory': () => { status.hidden = true; raid(SCENE.victory); },
};
window.__v12 = { states: Object.keys(states), show: name => { states[name](); return { w: 400, h: 260 }; } };
`;
  const body = `<div id="wrap" style="position:relative;width:400px;height:260px;background:#303040;overflow:hidden"><canvas id="game" width="200" height="130"></canvas><div class="drag-handle"></div><div id="field-pvp-status" aria-live="polite"></div><button id="raid-status" type="button" hidden></button></div>`;
  return page('v0.12 raid in-game preview', style + '\nhtml,body{background:#303040 !important;margin:0}#wrap canvas{width:400px;height:260px;image-rendering:pixelated}', body, bundle(client, root));
}
function menuHtml(root) {
  const menu = readFileSync(join(root, 'static/menu.html'), 'utf8');
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/.exec(menu);
  const body = (bodyMatch ? bodyMatch[1] : menu).replace(/<script type="module"[^>]*><\/script>/g, '');
  const client = `
import { mountRaid } from './src/menu/raid.ts';
import { mountPopup, raidConfirmSpec, raidResultSpec, progressResetSpec, enhanceSpec } from './src/menu/popup.ts';
import { VIEWS, NOW, REWARD } from './.harness/v12/fixtures/raid.mjs';
for (const p of document.querySelectorAll('.panel')) p.hidden = p.id !== 'raid';
for (const t of document.querySelectorAll('.tab')) { t.classList.toggle('active', t.id === 'tab-raid'); t.setAttribute('aria-selected', String(t.id === 'tab-raid')); }
const host = document.getElementById('popup-host') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'popup-host' }));
const popup = mountPopup(document, host);
const sent = []; const update = mountRaid(document, document.getElementById('raid'), a => sent.push(a));
const states = {
  'menu-gathering': () => update(VIEWS.gathering, NOW), 'menu-gathering-qualified': () => update(VIEWS.gatheringQualified, NOW),
  'menu-countdown': () => update(VIEWS.countdown, NOW), 'menu-countdown-joined': () => update(VIEWS.countdownJoined, NOW), 'menu-full': () => update(VIEWS.full, NOW),
  'menu-confirming': () => update(VIEWS.confirming, NOW), 'menu-battle': () => update(VIEWS.battle, NOW), 'menu-settled': () => update(VIEWS.settled, NOW),
  'popup-raid-confirm': () => { update(VIEWS.confirming, NOW); popup.open(raidConfirmSpec(VIEWS.confirming)); },
  'popup-raid-result': () => { update(VIEWS.settled, NOW); popup.open(raidResultSpec(REWARD)); },
  'popup-progress-reset': () => { update(VIEWS.gathering, NOW); popup.open(progressResetSpec('reset')); },
  'popup-enhance': () => { update(VIEWS.gathering, NOW); popup.open(enhanceSpec({ name: '용광로 검 +6', id: 'x' }, 6400, '실패 시 파괴')); },
};
window.__v12 = { states: Object.keys(states), show: name => { popup.close?.(); states[name](); return { w: 560, h: 640 }; }, sent };
`;
  return page('v0.12 raid menu preview', readFileSync(join(root, 'static/menu.css'), 'utf8'), body, bundle(client, root));
}
export function writePreviewPages(root = ROOT) {
  const dir = join(root, PREVIEW_DIR); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'game.html'), gameHtml(root)); writeFileSync(join(dir, 'menu.html'), menuHtml(root)); writeFileSync(join(dir, 'board.html'), boardHtml(root));
  writeFileSync(join(root, 'docs/v0.12/raid-preview.html'), `<!doctype html><html lang="ko"><meta charset="utf-8"><title>DesMon v0.12 레이드 예상 화면</title>
<style>body{margin:24px;background:#140c1c;color:#deeed6;font:14px system-ui}iframe{border:1px solid #514a63;background:#303040}nav a{color:#dad45e;margin-right:12px}</style>
<h1>DesMon v0.12 · 보스 레이드 예상 화면</h1><p>프로덕션 모듈 + 합성 픽스처, 서버 없음. 각 프레임 안의 상태는 아래 버튼으로 바꿉니다. 승인은 docs/v0.12/RAID_ART.md 에 씁니다.</p>
<nav><a href="preview/game.html" target="_blank">인게임</a><a href="preview/menu.html" target="_blank">메뉴</a><a href="preview/board.html" target="_blank">아트 보드</a></nav>
${['game', 'menu', 'board'].map(n => `<h2>${n}</h2><div id="${n}-buttons"></div><iframe id="${n}" src="preview/${n}.html" width="900" height="${n === 'menu' ? 660 : n === 'game' ? 300 : 660}"></iframe>`).join('')}
<script>for (const n of ['game','menu','board']) { const f = document.getElementById(n); f.addEventListener('load', () => { const api = f.contentWindow.__v12; const box = document.getElementById(n + '-buttons');
  for (const s of api.states) { const b = document.createElement('button'); b.textContent = s; b.onclick = () => api.show(s); box.append(b); } if (api.states[0]) api.show(api.states[0]); }); }</script></html>`);
  return dir;
}
function capturePages(pages, outDir, root = ROOT) {
  mkdirSync(outDir, { recursive: true });
  const pngs = {};
  for (const [name, file] of pages) {
    const r = spawnSync(ELECTRON, [join(root, '.harness/v12/preview-shell.mjs'), file, outDir, ''], { cwd: root, encoding: 'utf8', env: { ...process.env, ELECTRON_ENABLE_LOGGING: '0' }, timeout: 300_000 });
    if (r.status !== 0) throw Error(`capture of ${name} failed: ${(r.stderr || r.stdout).slice(-2000)}`);
    for (const f of JSON.parse(r.stdout.trim().split('\n').at(-1)).written) pngs[basename(f)] = sha(readFileSync(f));
  }
  return pngs;
}
export function capture(outDir, root = ROOT) {
  if (existsSync(join(outDir, 'index.json'))) throw Error('Preserve previous attempt: ' + outDir);
  const dir = join(root, PREVIEW_DIR);
  const pngs = capturePages([['game', join(dir, 'game.html')], ['menu', join(dir, 'menu.html')], ['board', join(dir, 'board.html')]], outDir, root);
  const index = { version: 12, at: new Date().toISOString(), sources: sourceHashes(root), pngs };
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  return index;
}
export function board(laneDir, outDir) {
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, 'board.html'); writeFileSync(file, boardHtml(laneDir));
  const pngs = capturePages([['board', file]], outDir, ROOT);
  writeFileSync(join(outDir, 'index.json'), JSON.stringify({ version: 12, lane: laneDir, at: new Date().toISOString(), pngs }, null, 2) + '\n');
  return pngs;
}
export function parseApproval(text) {
  const line = String(text).split('\n').map(l => l.trim()).filter(l => /^(approved|rejected):/.test(l)).at(-1);
  if (!line) return null;
  const m = /^(approved|rejected):\s*([a-f0-9]{64})(?:\s+by\s+(\S+)\s+at\s+(\S+))?/.exec(line);
  return m ? { kind: m[1], sha: m[2], by: m[3] ?? null, at: m[4] ?? null, line } : { kind: line.startsWith('approved') ? 'approved' : 'rejected', sha: null, line };
}
/** Throws unless the last human line is `approved: <sha of index.json>` and every rendered source still hashes the same. */
export function verifyApproval(finalPath, root = ROOT) {
  const final = JSON.parse(readFileSync(finalPath, 'utf8'));
  const indexPath = join(final.attempt, 'index.json'), indexBytes = readFileSync(indexPath), index = JSON.parse(indexBytes);
  if (sha(indexBytes) !== final.indexSha) throw Error('preview attempt changed after final.json was written');
  const current = sourceHashes(root);
  for (const [path, hash] of Object.entries(index.sources)) if (current[path] !== hash) throw Error('Rendered source changed since the preview: ' + path);
  for (const [name, hash] of Object.entries(index.pngs)) if (sha(readFileSync(join(final.attempt, name))) !== hash) throw Error('Preview PNG changed: ' + name);
  const approval = parseApproval(readFileSync(join(root, 'docs/v0.12/RAID_ART.md'), 'utf8'));
  if (!approval || approval.kind !== 'approved') throw Error('No approval line (or a rejection is the latest human line) in docs/v0.12/RAID_ART.md');
  if (approval.sha !== final.indexSha) throw Error(`Approval ${approval.sha} does not match the current preview ${final.indexSha}`);
  if (!approval.by || !approval.at) throw Error('Approval line needs `by <name> at <ISO time>`');
  return { passed: true, version: 12, sha: approval.sha, by: approval.by, at: approval.at, attempt: final.attempt };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action, ...rest] = process.argv.slice(2);
  try {
    if (action === 'html') console.log(JSON.stringify({ pages: writePreviewPages() }));
    else if (action === 'capture') console.log(JSON.stringify(capture(resolve(rest[0]))));
    else if (action === 'board') { const lane = rest[rest.indexOf('--lane') + 1], out = rest[rest.indexOf('--out') + 1]; console.log(JSON.stringify(board(resolve(lane), resolve(out)))); }
    else if (action === 'verify') console.log(JSON.stringify(verifyApproval(resolve(rest[0]))));
    else throw Error('usage: raid-preview.mjs html | capture OUT | board --lane DIR --out OUT | verify FINAL_JSON');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
