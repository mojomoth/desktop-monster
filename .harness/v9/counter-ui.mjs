#!/usr/bin/env node
// Actual Electron counter pixels. Only body background changes; live game state/time/RNG stay untouched.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launchRuntime } from './runtime.mjs';

const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]).sort();
const requiredChecks = ['live-counter-geometry', 'light-background-compositing', 'dark-background-compositing',
  'ten-value-pop-cases', 'state-unchanged-by-probes'].sort();
const requiredImages = ['field-transparent.png', 'field-light.png', 'field-dark.png', 'counters-light.png', 'counters-dark.png'];
const validChecks = result => result.version === 9 && result.checks.every(check => check.passed === true)
  && JSON.stringify(result.checks.map(check => check.name).sort()) === JSON.stringify(requiredChecks)
  && result.cases.length === 10 && JSON.stringify(result.cases.map(item => `${item.value}/${item.pop}`).sort())
    === JSON.stringify([0, 7, 999, 1000, Number.MAX_SAFE_INTEGER].flatMap(value => [false, true].map(pop => `${value}/${pop}`)).sort());
const [appPath, destination] = process.argv.slice(2);
if (appPath === 'verify') {
  const result = JSON.parse(readFileSync(resolve(destination), 'utf8'));
  if (!result.passed || !result.sourceUnchanged || result.errors.length || !validChecks(result)
    || !result.runtime?.passed || result.runtime.exitCode !== 0 || result.runtime.signal !== null
    || !Object.entries({ ...result.sources, ...result.artifacts }).every(([path, sha]) => existsSync(path) && hash(path) === sha)
    || requiredImages.some(name => !Object.hasOwn(result.artifacts, join(result.outputDir, name)))
    || hash(join(result.runtime.appPath, 'Contents/Resources/app.asar')) !== result.runtime.appHash) {
    throw Error('Counter native evidence failed, incomplete, or changed');
  }
  console.log('V09_COUNTER_UI_OK'); process.exit(0);
}
if (!appPath || !destination) throw Error('Usage: node .harness/v9/counter-ui.mjs APP OUTPUT_DIR');
const outputDir = resolve(destination);
if (existsSync(outputDir)) throw Error('Use a new evidence directory');
mkdirSync(outputDir, { recursive: true });
const sourcePaths = [...files(resolve('src')), ...files(resolve('static')), ...files(resolve('dist')),
  resolve('.harness/v9/counter-ui.mjs'), resolve('.harness/v9/runtime.mjs'), resolve('.harness/v7/loop/package-check.mjs')];
const result = { version: 9, outputDir, startedAt: new Date().toISOString(), passed: false, sourceUnchanged: false,
  sources: Object.fromEntries(sourcePaths.map(path => [path, hash(path)])), artifacts: {}, checks: [], cases: [], errors: [], runtime: null,
  scope: 'Synthetic Lv.18 / coins 1234567 / kills 999 fixture. Actual packaged field screenshots, live LV/READY glyph and outline pixels, and production hud.drawCounters on separate real Canvas surfaces. Head labels are compared with the original font glyphs at their unchanged positions/colors; XP separation and surrounding transparency are checked. Only document.body background is temporarily changed for light/dark capture and restored. No live renderer override, input, clock/RNG injection, personal save, or production network. Sheet counters are displayed at integer 2x; label text belongs to the diagnostic sheet.' };
const check = (name, passed, details = {}) => {
  result.checks.push({ name, passed: Boolean(passed), details });
  if (!passed) throw Error(name + ': ' + JSON.stringify(details));
};

// Runs inside the packaged Electron renderer, using actual CanvasRenderingContext2D pixels.
async function probeCounters() {
  const module = path => import(new URL('../dist/web/' + path + '.js', location.href).href);
  const [hud, core, sprites] = await Promise.all([module('renderer/hud'), module('core/index'), module('renderer/sprites/index')]);
  const rgb = color => [1, 3, 5].map(offset => Number.parseInt(color.slice(offset, offset + 2), 16));
  const white = rgb(sprites.COLORS.white), yellow = rgb(sprites.COLORS.yellow), orange = rgb(sprites.COLORS.orange), outline = rgb(sprites.COLORS.void);
  const inspect = (canvas, coins, kills, pop) => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const pixel = (x, y) => pixels.slice((y * canvas.width + x) * 4, (y * canvas.width + x) * 4 + 4);
    const is = (x, y, color) => { const p = pixel(x, y); return p[3] === 255 && color.every((value, channel) => p[channel] === value); };
    const alphaCount = (x, y, w, h) => {
      let count = 0; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (pixel(xx, yy)[3]) count++;
      return count;
    };
    const headGlyph = (text, y, color) => {
      const x = Math.round(80 - sprites.textWidth(text) / 2), ink = new Set(), border = new Set();
      for (let index = 0; index < text.length; index++) {
        const rows = sprites.fontSprite.frames[sprites.glyphIndex(text[index])];
        for (let yy = 0; yy < sprites.FONT_H; yy++) for (let xx = 0; xx < sprites.FONT_W; xx++) {
          const value = rows?.[yy]?.[xx];
          if (value && value !== sprites.TRANSPARENT) ink.add(`${x + index * sprites.FONT_ADVANCE + xx},${y + yy}`);
        }
      }
      for (const point of ink) {
        const [xx, yy] = point.split(',').map(Number);
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const neighbor = `${xx + dx},${yy + dy}`;
          if (!ink.has(neighbor)) border.add(neighbor);
        }
      }
      let inkMismatches = 0, borderMismatches = 0, unexpectedAlpha = 0;
      for (let yy = y - 1; yy <= y + sprites.FONT_H; yy++) for (let xx = x - 2; xx <= x + sprites.textWidth(text) + 1; xx++) {
        const point = `${xx},${yy}`;
        if (ink.has(point)) { if (!is(xx, yy, color)) inkMismatches++; }
        else if (border.has(point)) { if (!is(xx, yy, outline)) borderMismatches++; }
        else if (pixel(xx, yy)[3]) unexpectedAlpha++;
      }
      return { text, x, y, color, scale: 1, inkPixels: ink.size, outlinePixels: border.size,
        inkMismatches, borderMismatches, unexpectedAlpha };
    };
    const glyph = (value, y, color) => {
      const text = core.format(value), x = 198 - sprites.textWidth(text), ink = [], dark = [];
      for (let yy = y - 1; yy <= y + 5; yy++) for (let xx = x - 1; xx <= 198; xx++) {
        if (is(xx, yy, color)) ink.push([xx, yy]);
        if (is(xx, yy, outline)) dark.push([xx, yy]);
      }
      return { text, x, inkPixels: ink.length, outlinePixels: dark.length,
        height: ink.length ? Math.max(...ink.map(p => p[1])) - Math.min(...ink.map(p => p[1])) + 1 : 0,
        allInkHasBorder: ink.every(([xx, yy]) => [[-1, 0], [1, 0], [0, -1], [0, 1]].every(([dx, dy]) => pixel(xx + dx, yy + dy)[3] === 255)) };
    };
    const kill = glyph(kills, 24, white), coin = glyph(coins, 34, pop ? white : yellow);
    const iconRows = [];
    for (let y = 31; y <= 40; y++) for (let x = coin.x - 9; x < coin.x - 3; x++) {
      if (is(x, y, yellow) || is(x, y, orange)) iconRows.push(y);
    }
    return { removedHudAlpha: alphaCount(2, 16, 64, 22), rowGapAlpha: alphaCount(140, 31, 60, 1),
      rightMarginAlpha: alphaCount(199, 20, 1, 24), kill, coin,
      coinIconTop: iconRows.length ? Math.min(...iconRows) : null,
      noPanel: alphaCount(140, 30, 60, 2) === 0, compact: kill.height === 5 && coin.height === 5,
      outlined: kill.outlinePixels > 0 && coin.outlinePixels > 0 && kill.allInkHasBorder && coin.allInkHasBorder,
      headLevelWhite: canvas.height >= 90 ? Array.from({ length: 40 * 5 }, (_, i) => is(60 + i % 40, 79 + Math.floor(i / 40), white)).filter(Boolean).length : null,
      head: canvas.height >= 90 ? { level: headGlyph('LV 18', 79, white), ready: headGlyph('REBIRTH READY', 72, yellow),
        xpGapAlpha: alphaCount(53, 85, 55, 1), topGapAlpha: alphaCount(53, 70, 55, 1),
        sideGapAlpha: alphaCount(53, 71, 1, 14) + alphaCount(107, 71, 1, 14) } : null,
      xpAlpha: canvas.height >= 90 ? alphaCount(60, 86, 40, 4) : null };
  };
  const live = document.querySelector('#game');
  const actual = inspect(live, 1234567, 999, false);
  const createCanvas = (w, h) => { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; return canvas; };
  const cases = [], canvases = [];
  for (const value of [0, 7, 999, 1000, Number.MAX_SAFE_INTEGER]) {
    for (const pop of [false, true]) {
      const canvas = createCanvas(200, 60), state = { coins: value, killCount: value }, before = JSON.stringify(state);
      hud.drawCounters(canvas.getContext('2d'), state, 200, pop);
      cases.push({ value, pop, stateUnchanged: JSON.stringify(state) === before, ...inspect(canvas, value, value, pop) });
      canvases.push(canvas);
    }
  }
  const images = [];
  for (const [theme, background, foreground] of [['light', '#f6f4e4', '#151a25'], ['dark', '#151a25', '#f6f4e4']]) {
    const sheet = createCanvas(720, 720), ctx = sheet.getContext('2d');
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = background; ctx.fillRect(0, 0, 720, 720);
    ctx.fillStyle = foreground; ctx.font = 'bold 18px monospace'; ctx.fillText(`COUNTERS / ${theme} / actual 2x pixels`, 16, 30);
    for (let index = 0; index < cases.length; index++) {
      const item = cases[index], x = index % 2 * 360, y = 60 + Math.floor(index / 2) * 132;
      ctx.fillStyle = foreground; ctx.font = '13px monospace';
      ctx.fillText(`${item.value} / ${item.pop ? 'COLLECT' : 'NORMAL'}`, x + 12, y + 18);
      ctx.fillText(item.coin.text, x + 12, y + 40);
      ctx.drawImage(canvases[index], 140, 20, 60, 24, x + 220, y + 48, 120, 48);
    }
    images.push({ name: `counters-${theme}`, dataUrl: sheet.toDataURL('image/png') });
  }
  return { actual, cases, images, constants: { scale: hud.COUNTER_SCALE, top: hud.COUNTER_TOP, gap: hud.COUNTER_ROW_GAP } };
}

let runtime;
try {
  const core = createRequire(import.meta.url)(resolve('dist/electron/core/index.js'));
  runtime = await launchRuntime({ appPath, outputDir: join(outputDir, 'runtime'),
    save: core.parseSave({ ...core.DEFAULT_SAVE, level: 18, xp: 3, coins: 1234567, killCount: 999, hero: core.newHeroProgress() }),
    settings: { gameScale: 1, muted: true, screenShake: true, welcomeSeen: true, globalInputRequested: false },
    identity: { name: 'FixtureMe', playerId: 'fixture-me', token: 'fixture-me-token', notifiedTheftIds: [] } });
  const main = expression => runtime.evaluate(`(()=>{const p=__v09Runtime;return (${expression});})()`);
  const field = (fn, ...args) => main(`p.field.webContents.executeJavaScript(${JSON.stringify(`(${fn})(...${JSON.stringify(args)})`)})`);
  const snapshot = () => field(async () => {
    const save = await window.desmon.loadState();
    return { level: save.level, xp: save.xp, coins: save.coins, killCount: save.killCount, hero: save.hero, monsterHp: save.monsterHp };
  });
  const capture = async name => {
    const image = await main(`(async()=>{const image=await p.field.webContents.capturePage();return {base64:image.toPNG().toString('base64'),size:image.getSize()};})()`);
    writeFileSync(join(outputDir, name + '.png'), Buffer.from(image.base64, 'base64')); return image.size;
  };
  const before = await snapshot(); await capture('field-transparent');
  const rendered = await main(`(async()=>{const p=__v09Runtime;const result=await p.field.webContents.executeJavaScript(${JSON.stringify(`(${probeCounters.toString()})()`)});
    for(const image of result.images){const decoded=p.e.nativeImage.createFromDataURL(image.dataUrl);if(decoded.isEmpty())throw Error('Empty sheet');
      p.fs.writeFileSync(${JSON.stringify(outputDir)}+'/'+image.name+'.png',decoded.toPNG());}
    delete result.images;return result;})()`);
  result.cases = rendered.cases;
  const acceptable = sample => sample.removedHudAlpha === 0 && sample.rowGapAlpha === 0 && sample.rightMarginAlpha === 0
    && sample.noPanel && sample.compact && sample.outlined && sample.kill.inkPixels > 0 && sample.coin.inkPixels > 0;
  const head = rendered.actual.head;
  const headOutlined = head && [head.level, head.ready].every(label => label.inkPixels > 0 && label.outlinePixels > 0
    && label.inkMismatches === 0 && label.borderMismatches === 0 && label.unexpectedAlpha === 0)
    && head.xpGapAlpha === 0 && head.topGapAlpha === 0 && head.sideGapAlpha === 0;
  check('live-counter-geometry', acceptable(rendered.actual) && rendered.actual.headLevelWhite > 0 && rendered.actual.xpAlpha === 160
    && headOutlined
    && rendered.actual.coinIconTop === 34 && rendered.constants.scale === 1 && rendered.constants.top === 24 && rendered.constants.gap === 10, rendered);
  check('ten-value-pop-cases', result.cases.length === 10 && result.cases.every(sample => acceptable(sample)
    && sample.coinIconTop === (sample.pop ? 33 : 34) && sample.stateUnchanged), { cases: result.cases });
  const originalBackground = await field(() => document.body.style.background);
  try {
    for (const [theme, color] of [['light', '#f6f4e4'], ['dark', '#151a25']]) {
      const background = await field(async color => {
        document.body.style.background = color;
        await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
        return getComputedStyle(document.body).backgroundColor;
      }, color);
      const size = await capture('field-' + theme);
      check(theme + '-background-compositing', size.width === 400 && size.height === 260
        && background === (theme === 'light' ? 'rgb(246, 244, 228)' : 'rgb(21, 26, 37)'), { background, size });
    }
  } finally { await field(background => { document.body.style.background = background; }, originalBackground); }
  const after = await snapshot();
  check('state-unchanged-by-probes', JSON.stringify(after) === JSON.stringify(before)
    && await field(() => document.body.style.background) === originalBackground, { before, after, originalBackground });
} catch (error) { result.errors.push(String(error)); }
finally { if (runtime) result.runtime = await runtime.close(); }
result.sourceUnchanged = Object.entries(result.sources).every(([path, sha]) => existsSync(path) && hash(path) === sha);
result.artifacts = Object.fromEntries(files(outputDir).map(path => [path, hash(path)]));
result.finishedAt = new Date().toISOString();
result.passed = result.sourceUnchanged && result.errors.length === 0 && validChecks(result) && result.runtime?.passed === true
  && result.runtime.exitCode === 0 && result.runtime.signal === null
  && requiredImages.every(name => Object.hasOwn(result.artifacts, join(outputDir, name)));
writeFileSync(join(outputDir, 'counter-ui.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: result.passed, checks: result.checks.length, cases: result.cases.length, errors: result.errors }));
if (!result.passed) process.exitCode = 1;
