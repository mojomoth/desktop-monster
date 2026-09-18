#!/usr/bin/env node
// Native production Canvas previews for the epic art revision; isolated save only.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { launchRuntime, fingerprints } from './launcher.mjs';
import { controls } from './ui-cases.mjs';
import { digest, sha } from './run.mjs';

const [outputArg, appArg = 'release/mac-arm64/DesMon.app', beforeArg] = process.argv.slice(2);
assert(outputArg, 'Usage: epic-gallery.mjs OUTPUT_JSON [APP] [BEFORE_ICONS_JSON]');
const output = resolve(outputArg), directory = dirname(output);
assert(!existsSync(output), 'Use a new report path; preserve prior attempts');
mkdirSync(directory, { recursive: true });
const require = createRequire(import.meta.url), core = require(resolve('dist/electron/core/index.js'));
const before = beforeArg ? JSON.parse(readFileSync(beforeArg, 'utf8')) : null;
const report = { version: 1, source: digest(), fingerprints: fingerprints(), startedAt: new Date().toISOString(),
  generatorHash: sha(readFileSync(new URL(import.meta.url))), images: [], errors: [], passed: false };

async function render(beforeIcons) {
  const [{ EQUIPMENT_CATALOG }, { drawEquipmentIcon }, { drawEquippedHero }, { drawSprite }] = await Promise.all([
    import('../dist/web/core/equipment.js'), import('../dist/web/renderer/sprites/equipment.js'),
    import('../dist/web/renderer/sprites/equippedHero.js'), import('../dist/web/renderer/sprites/sprite.js'),
  ]);
  const saveBefore = JSON.stringify(globalThis.__v010Read().save), results = [];
  const weapons = EQUIPMENT_CATALOG.filter(t => t.kind === 'weapon' && t.rarity === 'epic');
  const accessories = EQUIPMENT_CATALOG.filter(t => t.kind === 'accessory' && t.rarity === 'epic');
  const familyNames = { sword: '검', greatsword: '대검', spear: '창', gun: '총', dagger: '단검', staff: '지팡이', hammer: '망치', gauntlet: '건틀릿' };
  for (const [theme, background, foreground] of [['dark', '#140c1c', '#f2eee7'], ['light', '#f2eee7', '#140c1c']]) {
    const boards = [
      { name: 'epic-weapons-' + theme, items: weapons, columns: 4, width: 360, height: 176, title: '에픽 무기 32종 · 아이콘 / 장착 / 공격' },
      { name: 'epic-accessories-' + theme, items: accessories, columns: 6, width: 180, height: 156, title: '에픽 악세사리 24종 · 이전 / 현재' },
      { name: 'epic-showcase-' + theme, items: ['sword', 'greatsword', 'spear', 'gun', 'dagger', 'staff', 'hammer', 'gauntlet'].map((type, i) => weapons.find(t => t.weaponType === type && t.tier === [0, 3, 1, 3, 0, 2, 1, 2][i])), columns: 4, width: 360, height: 176, title: 'DesMon · 에픽 장비 전용 외형' },
    ];
    for (const board of boards) {
      const canvas = document.createElement('canvas');
      canvas.width = board.columns * board.width; canvas.height = 52 + Math.ceil(board.items.length / board.columns) * board.height;
      const ctx = canvas.getContext('2d'); if (!ctx) throw Error('Canvas unavailable');
      ctx.imageSmoothingEnabled = false; ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = foreground; ctx.font = 'bold 18px sans-serif'; ctx.fillText(board.title, 16, 31);
      board.items.forEach((template, index) => {
        const x = index % board.columns * board.width, y = 52 + Math.floor(index / board.columns) * board.height;
        ctx.fillStyle = '#de8aff'; ctx.font = '13px sans-serif';
        ctx.fillText(template.kind === 'weapon' ? `${familyNames[template.weaponType]} · Lv${template.requiredLevel}` : template.name, x + 10, y + 18);
        if (template.kind === 'weapon') {
          drawEquipmentIcon(ctx, template.id, x + 12, y + 35, { scale: 4 });
          const weapon = { id: 'preview', templateId: template.id, enhancement: '0', roll: 100, seed: 1, attempts: '0' };
          drawEquippedHero(ctx, 'h00', weapon, x + 112, y + 40, { scale: 4, timeMs: 120 });
          drawEquippedHero(ctx, 'h00', weapon, x + 250, y + 40, { scale: 4, attacking: true, frame: 1, timeMs: 120 });
          ctx.fillStyle = foreground; ctx.font = '11px sans-serif'; ctx.fillText('실제 크기 2×', x + 12, y + 135);
          drawEquippedHero(ctx, 'h00', weapon, x + 112, y + 113, { scale: 2, timeMs: 120 });
          drawEquippedHero(ctx, 'h00', weapon, x + 250, y + 113, { scale: 2, attacking: true, frame: 1, timeMs: 120 });
        } else {
          if (beforeIcons?.[template.id]) drawSprite(ctx, beforeIcons[template.id], 0, x + 10, y + 40, { scale: 4 });
          drawEquipmentIcon(ctx, template.id, x + 90, y + 40, { scale: 4 });
          ctx.fillStyle = foreground; ctx.font = '11px sans-serif'; ctx.fillText('이전', x + 22, y + 121); ctx.fillText('현재', x + 106, y + 121);
        }
      });
      results.push({ name: board.name, items: board.items.map(t => t.id), dataUrl: canvas.toDataURL('image/png') });
    }
  }
  return { images: results, saveUnchanged: saveBefore === JSON.stringify(globalThis.__v010Read().save) };
}

let runtime;
try {
  runtime = await launchRuntime({ appPath: appArg, outputDir: join(directory, 'epic-native'), save: core.createEngine(core.DEFAULT_SAVE).toSave(),
    settings: { gameScale: 1, muted: true, screenShake: false, welcomeSeen: true, globalInputRequested: false },
    identity: { name: 'FixtureMe', playerId: 'fixture-me', token: 'fixture-me-token', notifiedTheftIds: [] } });
  const ui = await controls(runtime), result = await ui.field(`(${render.toString()})(${JSON.stringify(before)})`);
  assert(result.saveUnchanged, 'Preview changed fixture save');
  for (const { name, items, dataUrl } of result.images) {
    assert(dataUrl.startsWith('data:image/png;base64,'));
    const bytes = Buffer.from(dataUrl.split(',')[1], 'base64'), path = join(directory, name + '.png');
    assert(!existsSync(path), 'Preserve previous PNG'); writeFileSync(path, bytes);
    report.images.push({ name, items, path, sha256: sha(bytes) });
  }
  assert.equal(report.images.length, 6);
  report.runtime = await runtime.close(); runtime = null;
  assert(report.runtime.passed, 'Native runtime failed');
  assert.equal(digest(), report.source, 'Source changed during preview');
  assert.deepEqual(fingerprints(), report.fingerprints, 'Build changed during preview');
  report.passed = true;
} catch (error) { report.errors.push(String(error)); if (runtime) report.runtime = await runtime.close(); }
report.finishedAt = new Date().toISOString(); writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, passed: report.passed, images: report.images.map(i => i.path), errors: report.errors }));
if (!report.passed) process.exitCode = 1;
