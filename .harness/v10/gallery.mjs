#!/usr/bin/env node
// Packaged Electron art evidence. Never opens personal data or invokes input.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { launchRuntime, fingerprints } from './launcher.mjs';
import { controls } from './ui-cases.mjs';

const require = createRequire(import.meta.url), core = require(resolve('dist/electron/core/index.js'));
const [reportArg, appArg = 'release/mac-arm64/DesMon.app'] = process.argv.slice(2);
if (!reportArg) throw Error('Usage: gallery.mjs REPORT_JSON [PACKAGED_APP]');
const reportPath = resolve(reportArg), directory = dirname(reportPath), runDirectory = join(directory, 'native-art');
assert(!existsSync(reportPath), 'Preserve previous attempt; use a new report directory');
assert(!existsSync(runDirectory), 'Preserve previous native-art attempt');
mkdirSync(directory, { recursive: true });
const sha = data => createHash('sha256').update(data).digest('hex');
const sourceBefore = fingerprints();
const report = { version: 10, startedAt: new Date().toISOString(), generatorHash: sha(readFileSync(new URL(import.meta.url))),
  source: sourceBefore, pages: [], overviews: [], samples: 0, errors: [], passed: false,
  visualApproval: 'Pending independent Host review; the implementing Designer only produces evidence.' };

// This entire function executes inside the actual packaged renderer. It calls
// the same sprite APIs as the field/menu and never mutates the game or save.
async function generate() {
  const [{ renderEquipmentContactSheets }, { EQUIPMENT_CATALOG, RARITY_COLORS }, { drawEquipmentIcon }, { drawEquippedHero }, { HERO_FORM_IDS }] = await Promise.all([
    import('../dist/web/renderer/sprites/equipmentGallery.js'), import('../dist/web/core/equipment.js'),
    import('../dist/web/renderer/sprites/equipment.js'), import('../dist/web/renderer/sprites/equippedHero.js'),
    import('../dist/web/renderer/sprites/heroForms.js'),
  ]);
  const before = JSON.stringify(globalThis.__v010Read().save), pages = renderEquipmentContactSheets(document), overviews = [];
  for (const [theme, background, foreground] of [['dark', '#140c1c', '#eef1e9'], ['light', '#f2eee7', '#140c1c']]) {
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 1452;
    const ctx = canvas.getContext('2d'); if (!ctx) throw Error('Native overview Canvas unavailable');
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = foreground; ctx.font = '18px monospace'; ctx.fillText(`224 production icons / native Canvas / 3x pixels / ${theme}`, 12, 28);
    const manifest = [];
    EQUIPMENT_CATALOG.forEach((template, index) => {
      const x = index % 16 * 80, y = 48 + Math.floor(index / 16) * 100;
      drawEquipmentIcon(ctx, template.id, x + 16, y + 4, { scale: 3 });
      ctx.fillStyle = RARITY_COLORS[template.rarity]; ctx.font = '9px monospace';
      ctx.fillText(template.weaponType ?? template.accessoryType, x + 3, y + 67);
      ctx.fillText(`${template.rarity[0]} T${template.tier + 1}${template.kind === 'accessory' ? ' ' + template.bonus.slice(0, 4) : ''}`, x + 3, y + 81);
      manifest.push({ index, id: template.id, x, y });
    });
    overviews.push({ name: `all-224-icons-${theme}`, dataUrl: canvas.toDataURL('image/png'), manifest });
    const heroes = document.createElement('canvas'); heroes.width = 1152; heroes.height = 624;
    const hc = heroes.getContext('2d'); if (!hc) throw Error('Native hero overview unavailable');
    hc.imageSmoothingEnabled = false; hc.fillStyle = background; hc.fillRect(0, 0, heroes.width, heroes.height);
    hc.fillStyle = foreground; hc.font = '18px monospace'; hc.fillText(`71 weapon-free heroes / native Canvas / 4x pixels / ${theme}`, 12, 28);
    const heroManifest = [];
    ['h00', ...HERO_FORM_IDS].forEach((id, index) => {
      const x = index % 12 * 96, y = 48 + Math.floor(index / 12) * 96;
      drawEquippedHero(hc, id, null, x + 20, y + 8, { scale: 4 });
      hc.fillStyle = foreground; hc.font = '12px monospace'; hc.fillText(id, x + 32, y + 84);
      heroManifest.push({ id, x, y });
    });
    overviews.push({ name: `all-71-bare-${theme}`, dataUrl: heroes.toDataURL('image/png'), manifest: heroManifest });
  }
  return { pages, overviews, fixtureSaveUnchangedDuringDrawing: before === JSON.stringify(globalThis.__v010Read().save) };
}

let runtime;
try {
  runtime = await launchRuntime({ appPath: appArg, outputDir: runDirectory,
    save: core.createEngine(core.DEFAULT_SAVE).toSave(),
    settings: { gameScale: 1, muted: true, screenShake: false, welcomeSeen: true, globalInputRequested: false },
    identity: { name: 'FixtureMe', playerId: 'fixture-me', token: 'fixture-me-token', notifiedTheftIds: [] } });
  const ui = await controls(runtime);
  const art = await ui.field(`(${generate.toString()})()`);
  assert(art.fixtureSaveUnchangedDuringDrawing, 'Art generation mutated the fixture save');
  const saveImage = value => {
    assert(/^data:image\/png;base64,/.test(value.dataUrl), 'Expected a native PNG');
    const bytes = Buffer.from(value.dataUrl.slice(value.dataUrl.indexOf(',') + 1), 'base64');
    const path = join(runDirectory, value.name + '.png'); writeFileSync(path, bytes);
    const { dataUrl: _dataUrl, ...metadata } = value;
    return { ...metadata, path, bytes: bytes.length, sha256: sha(bytes) };
  };
  report.pages = art.pages.map(saveImage); report.overviews = art.overviews.map(saveImage);
  report.samples = report.pages.reduce((count, page) => count + page.samples.length, 0);
  assert.equal(report.pages.length, 150); assert.equal(report.samples, 7148); assert.equal(report.overviews.length, 4);
  assert(report.pages.every(page => page.samples.every(sample => sample.pixels > 0)), 'Blank art sample');
  report.fixtureSaveUnchangedDuringDrawing = true;
  report.fieldScreenshot = await ui.capture('native-field');
  report.runtime = await runtime.close(); runtime = null;
  assert(report.runtime.passed, 'Native runtime errors; see runtime.json');
  report.sourceUnchanged = JSON.stringify(sourceBefore) === JSON.stringify(fingerprints());
  assert(report.sourceUnchanged, 'Source/build changed during capture');
  report.passed = true;
} catch (error) {
  report.errors.push(String(error));
  if (runtime) report.runtime = await runtime.close();
}
report.finishedAt = new Date().toISOString();
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ reportPath, passed: report.passed, pages: report.pages.length, samples: report.samples,
  overviews: report.overviews.map(value => value.path), errors: report.errors }));
if (!report.passed) process.exitCode = 1;
