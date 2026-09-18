#!/usr/bin/env node
// Actual packaged Electron Canvas diagnostics. Injected presentation time is not a playtime measurement.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launchRuntime } from './runtime.mjs';

const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const [appPath, directory] = process.argv.slice(2);
if (appPath === 'verify') {
  const result = JSON.parse(readFileSync(resolve(directory), 'utf8'));
  if (!result.passed || !result.runtime.passed || result.errors.length || result.samples.length !== 410
    || result.samples.some(sample => !sample.visible || sample.maxActive > 200 || sample.poolSize !== 200)
    || result.uniqueGeometry.heroes !== 70 || result.uniqueGeometry.monsters !== 135
    || !Object.entries(result.artifacts).every(([path, sha]) => existsSync(path) && hash(path) === sha)
    || hash(join(result.runtime.appPath, 'Contents/Resources/app.asar')) !== result.runtime.appHash) {
    throw Error('Visual evidence incomplete or changed');
  }
  console.log('V09_VISUAL_OK');
  process.exit(0);
}
if (!appPath || !directory) throw Error('Usage: node .harness/v9/visual.mjs APP OUTPUT_DIR');
const outputDir = resolve(directory);
if (existsSync(outputDir)) throw Error('Use a new visual evidence directory');
mkdirSync(outputDir, { recursive: true });
const core = createRequire(import.meta.url)(resolve('dist/electron/core/index.js'));
const result = { version: 9, startedAt: new Date().toISOString(), artifacts: {}, samples: [], errors: [], passed: false,
  isolation: 'Packaged production drawing modules in actual Electron Canvas; injected visual clock only; no user input, production network, or personal save.' };
let runtime;

// This function executes in the packaged field renderer. Native PNG encoding happens in Electron main.
async function renderAtlases() {
  const module = path => import(new URL('../dist/web/' + path + '.js', location.href).href);
  const [core, effects, anim, sprites] = await Promise.all([
    module('core/index'), module('renderer/effects'), module('renderer/anim'), module('renderer/sprites/index'),
  ]);
  const canvas = (w, h) => { const el = document.createElement('canvas'); el.width = w; el.height = h; return el; };
  const samples = [], images = [];
  const groups = [['heroes', core.HERO_FORMS.map(form => [form.id, form.name, effects.heroImpactOf(form.id)])],
    ['monsters', core.SPECIES_IDS.map(id => [id, id, effects.companionImpactOf(id)])]];
  const frame = (preset, age, background, many = false) => {
    const el = canvas(64, 64), ctx = el.getContext('2d');
    ctx.fillStyle = background; ctx.fillRect(0, 0, 64, 64);
    const pool = anim.createParticlePool(), queue = effects.createImpactQueue();
    const chosen = many ? core.SPECIES_IDS.slice(0, 5).map(effects.companionImpactOf) : [preset];
    for (const item of chosen) effects.spawnImpact(pool, queue, item, 32, 32);
    let maxActive = pool.filter(p => p.active).length;
    for (let elapsed = 0; elapsed < age; elapsed += 20) {
      const dt = Math.min(20, age - elapsed);
      anim.tickParticles(pool, dt); effects.tickImpacts(pool, queue, dt);
      maxActive = Math.max(maxActive, pool.filter(p => p.active).length);
    }
    anim.drawParticles(ctx, pool);
    const pixels = ctx.getImageData(0, 0, 64, 64).data;
    const rgb = [1, 3, 5].map(start => Number.parseInt(background.slice(start, start + 2), 16));
    const mask = [];
    for (let i = 0; i < pixels.length; i += 4) if (rgb.some((value, channel) => pixels[i + channel] !== value)) mask.push(i / 4);
    return { el, mask, maxActive, poolSize: pool.length };
  };
  for (const [theme, background, foreground] of [['dark', '#140c1c', '#deeed6'], ['light', '#f2eee7', '#140c1c']]) {
    for (const [kind, entries] of groups) {
      for (let page = 0; page < Math.ceil(entries.length / 35); page++) {
        const subset = entries.slice(page * 35, (page + 1) * 35);
        const sheet = canvas(2000, 52 + Math.ceil(subset.length / 5) * 184), ctx = sheet.getContext('2d');
        ctx.imageSmoothingEnabled = false; ctx.fillStyle = background; ctx.fillRect(0, 0, sheet.width, sheet.height);
        ctx.fillStyle = foreground; ctx.font = 'bold 19px monospace';
        ctx.fillText(`${kind} ${theme} ${page + 1} / ${Math.ceil(entries.length / 35)} | native Canvas | 0 / 120 / 240 ms`, 12, 30);
        for (const [[id, name, preset], index] of subset.map((entry, index) => [entry, index])) {
          const x = index % 5 * 400, y = 52 + Math.floor(index / 5) * 184;
          ctx.fillStyle = foreground; ctx.font = '12px monospace';
          ctx.fillText(`${id} ${name}`.slice(0, 33), x + 7, y + 15);
          ctx.fillText(`${preset.shape} r${preset.radius} ${preset.pulses}x${preset.pulseMs}ms`, x + 7, y + 31);
          const masks = [], frames = [0, 60, 120, 180, 240, 360].map(age => {
            const painted = frame(preset, age, background); masks.push(painted.mask);
            return { age, ...painted };
          });
          for (const [column, age] of [0, 120, 240].entries()) {
            const painted = frames.find(item => item.age === age);
            ctx.drawImage(painted.el, x + column * 132, y + 38, 128, 128);
          }
          samples.push({ kind, id, theme, visible: masks[0].length > 0, pixelCounts: masks.map(mask => mask.length),
            geometry: JSON.stringify(masks), maxActive: Math.max(...frames.map(item => item.maxActive)), poolSize: frames[0].poolSize });
        }
        images.push({ name: `${kind}-${theme}-${page + 1}`, dataUrl: sheet.toDataURL('image/png') });
      }
    }
  }
  const sheet = canvas(1200, 596), ctx = sheet.getContext('2d'); ctx.imageSmoothingEnabled = false;
  for (const [row, background] of ['#140c1c', '#f2eee7'].entries()) {
    for (const [col, age] of [0, 120, 240].entries()) {
      const x = col * 400, y = row * 298;
      ctx.fillStyle = background; ctx.fillRect(x, y, 400, 298);
      ctx.fillStyle = row ? '#140c1c' : '#deeed6'; ctx.font = '16px monospace';
      ctx.fillText(`5 sources, same target | ${age}ms`, x + 8, y + 24);
      const painted = frame(effects.heroImpactOf('h01'), age, background, true);
      ctx.drawImage(painted.el, x + 72, y + 35, 256, 256);
      if (painted.poolSize !== 200 || painted.maxActive > 200) throw Error('Concentration particle cap failed');
    }
  }
  images.push({ name: 'five-source-concentration', dataUrl: sheet.toDataURL('image/png') });
  // Source sprites are verified in native share exports; these images isolate impact pixels for attribution.
  if (!sprites.COLORS || groups[0][1].length !== 70 || groups[1][1].length !== 135) throw Error('Unexpected production catalogs');
  return { samples, images };
}

try {
  runtime = await launchRuntime({ appPath, outputDir: join(outputDir, 'runtime'),
    save: core.createEngine({ ...core.DEFAULT_SAVE, hero: core.newHeroProgress() }, core.mulberry32(1)).toSave(),
    settings: { gameScale: 1, muted: true, screenShake: true, welcomeSeen: true, globalInputRequested: false },
    identity: { name: 'FixtureMe', playerId: 'fixture-me', token: 'fixture-me-token', notifiedTheftIds: [] } });
  const script = `(${renderAtlases.toString()})()`;
  const rendered = await runtime.evaluate(`(async()=>{const p=__v09Runtime;
    const result=await p.field.webContents.executeJavaScript(${JSON.stringify(script)});
    for(const item of result.images){const image=p.e.nativeImage.createFromDataURL(item.dataUrl);
      if(image.isEmpty())throw Error('Empty native image');
      p.fs.writeFileSync(${JSON.stringify(outputDir)}+'/'+item.name+'.png',image.toPNG());}
    return {samples:result.samples,names:result.images.map(item=>item.name)};})()`);
  result.samples = rendered.samples.map(({ geometry, ...sample }) => ({ ...sample,
    geometrySha256: createHash('sha256').update(geometry).digest('hex') }));
  for (const name of rendered.names) result.artifacts[join(outputDir, name + '.png')] = hash(join(outputDir, name + '.png'));
  result.uniqueGeometry = Object.fromEntries(['heroes', 'monsters'].map(kind => [kind,
    new Set(result.samples.filter(sample => sample.kind === kind && sample.theme === 'dark').map(sample => sample.geometrySha256)).size]));
  if (result.samples.length !== 410 || result.samples.some(sample => !sample.visible || sample.poolSize !== 200 || sample.maxActive > 200)
    || result.uniqueGeometry.heroes !== 70 || result.uniqueGeometry.monsters !== 135) throw Error('Native pixel coverage failed');
} catch (error) { result.errors.push(String(error)); }
finally { if (runtime) result.runtime = await runtime.close(); }
result.artifacts[resolve('.harness/v9/visual.mjs')] = hash(resolve('.harness/v9/visual.mjs'));
result.finishedAt = new Date().toISOString(); result.passed = result.errors.length === 0 && result.runtime?.passed === true;
writeFileSync(join(outputDir, 'visual.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: result.passed, samples: result.samples.length, uniqueGeometry: result.uniqueGeometry, errors: result.errors }));
if (!result.passed) process.exitCode = 1;
