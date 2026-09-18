import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { fixture, instrumentLifecycle } from './runtime.mjs';
import { installLatencyObserver, installHudInputObserver, latencyFamilies, inspectHudPixels, assertDamageRaster, assertDamageRise, assertDamageTimeline, assertHudLabel, hudLabelGeometry, assertDuplicateBurst, assertGrowthCompletion,
  makeStageRecorder, calibrateClock, sampleClockResolution, epochRoundingErrorMs, attachPipeline, installPipeline, assertFieldPartyAgreement, assertGrowthPowerPreview, assertLiveDisclosureState } from './ui-cases.mjs';
import { validatePipeline, validatePipelineTrace } from './final-check.mjs';

// Current source, isolated output: never overwrite the package/performance build.
const directory = mkdtempSync(join(tmpdir(), 'desmon-v11-native-fixtures-'));
function compile(folder) {
  mkdirSync(join(directory, folder), { recursive: true });
  for (const file of readdirSync(new URL('../../src/' + folder + '/', import.meta.url), { withFileTypes: true })) {
    if (file.isDirectory()) { compile(folder + '/' + file.name); continue; }
    if (!file.name.endsWith('.ts')) continue;
    const source = readFileSync(new URL('../../src/' + folder + '/' + file.name, import.meta.url), 'utf8');
    writeFileSync(join(directory, folder, file.name.replace(/\.ts$/, '.js')), ts.transpileModule(source,
      { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText);
  }
}
for (const folder of ['core', 'renderer', 'shared']) compile(folder);
const require = createRequire(import.meta.url), core = require(join(directory, 'core/index.js'));
const progression = require(join(directory, 'core/progression.js'));
const hud = require(join(directory, 'renderer/hud.js'));
const sprites = require(join(directory, 'renderer/sprites/index.js'));
test.after(() => rmSync(directory, { recursive: true, force: true }));

function withProgression(parameters, run) {
  const original = progression.PROGRESSION_PARAMETERS;
  progression.PROGRESSION_PARAMETERS = { ...original, fieldHpResumeIndex: null, fieldRebirthCountCap: null,
    fieldCompanionFeverMultiplier: 3, ...parameters };
  try { run(); } finally { progression.PROGRESSION_PARAMETERS = original; }
}

test('field fixture chooses a discriminating trained level for different adopted tail scales and waits for one native hit', () => {
  assert.throws(() => fixture({ ...core, PROGRESSION_PARAMETERS: { ...core.PROGRESSION_PARAMETERS, fieldCompanionTailPolynomial: 0 } }, core, 'field'), /adopted field curve/);
  for (const polynomial of [1, 2]) for (const scale of [1, 8, 12, 64, 256]) withProgression({
    fieldCompanionTailPolynomial: polynomial, fieldCompanionTailScale: scale,
    fieldHpIndexCap: null, fieldCompanionIndexCap: null, fieldCompanionGrowthBonus: null, fieldCompanionBaseFloor: 0,
  }, () => {
      const { save, ids } = fixture(core, core, 'field', 1000), engine = core.createEngine(save, core.mulberry32(7));
      assert.equal(save.hero.reincarnations, 1); assert.equal(save.rebirths, 1); assert.equal(save.monsterCurveRebirths, 1);
      const trained = save.companions.find(c=>c.id===ids.trained), target = save.companions.find(c=>c.id===ids.target);
      assert.equal(trained.bossIndex, 31);
      assert(core.fieldCompanionPower(trained) > core.fieldCompanionPower(target));
      assert(core.fieldCompanionPower(trained) < core.fieldCompanionPower({ ...target, level:3 }));
      assert(core.companionPower(trained) < core.companionPower(target));
      engine.tick(60_000);
      assert.equal(engine.getState().monster.index, 1000); assert.equal(engine.getState().killCount, 0);
      assert(engine.attack('keyboard').some(event=>event.type==='monsterSpawned'));
      assert.equal(engine.getState().monster.index, 1001); assert.equal(engine.getState().monster.curveVersion, 11);
      assert.equal(engine.getState().monster.curveRebirths, 1); assert.equal(engine.toSave().monsterCurveRebirths, 1);
      engine.apply({ type:'consume', targetId:ids.target, foodId:ids.food });
      assert.equal(engine.lastActionError(), null);
      assert.equal(engine.getState().companions.find(c=>c.id===ids.target).level, 3);
      assert(!engine.getState().companions.some(c=>c.id===ids.food));
    });
});

test('field fixture uses Q2→Q3 to reverse real capped hunting membership with or without a base floor', () => {
  for (const polynomial of [1, 2]) for (const scale of [1, 64, 256]) for (const bonus of [25, 50, 100]) for (const floor of [0, 10000]) withProgression({
    fieldCompanionTailPolynomial: polynomial, fieldCompanionTailScale: scale,
    fieldHpIndexCap: 159, fieldCompanionIndexCap: 79, fieldCompanionGrowthBonus: bonus, fieldCompanionBaseFloor: floor,
  }, () => {
    const { save, ids } = fixture(core, core, 'field', 1000), engine = core.createEngine(save, core.mulberry32(7));
    const trained = save.companions.find(c=>c.id===ids.trained), target = save.companions.find(c=>c.id===ids.target);
    assert.deepEqual([trained.bossIndex, trained.level, trained.stars], [79, 1, 1]);
    assert.deepEqual([target.bossIndex, target.level, target.stars], [95, 1, 0]);
    // Independent F31=38; clipped F79 is95 linear or237 quadratic before scaling.
    const uncappedBase = 38n + BigInt(scale) * ((polynomial === 1 ? 95n : 237n) - 38n);
    const base = uncappedBase > BigInt(floor) ? uncappedBase : BigInt(floor);
    assert.equal(core.fieldCompanionPower(target), base);
    assert.equal(core.fieldCompanionPower(trained), base * BigInt(200 + bonus) / 200n);
    const rawIds = ['c1', 'c2', 'c3', 'c4', 'c6'], trainedIds = ['c1', 'c2', 'c3', 'c4', 'c5'];
    const fieldIds = () => { const state=engine.getState(); return core.activeFieldCompanions(state.companions,
      state.monster.type,state.hero.equipped,state.monster.curveRebirths??0,state.monster.curveVersion??10).map(c=>c.id); };
    assert.deepEqual(fieldIds(), rawIds);
    engine.tick(60_000); assert.equal(engine.getState().monster.index, 1000);
    assert(engine.attack('keyboard').some(event=>event.type==='monsterSpawned'));
    assert.deepEqual(fieldIds(), trainedIds);
    engine.apply({ type:'consume', targetId:ids.target, foodId:ids.food });
    assert.equal(engine.lastActionError(), null);
    const grown = engine.getState().companions.find(c=>c.id===ids.target);
    assert.equal(grown.level, 3);
    assert.equal(core.fieldCompanionPower(grown), base * BigInt(300 + 2 * bonus) / 300n);
    assert(!engine.getState().companions.some(c=>c.id===ids.food));
    assert.deepEqual(fieldIds(), rawIds);
    assert.deepEqual(core.activeCompanions(engine.getState().companions, 'water').map(c=>c.id), rawIds);
  });
});

test('field agreement rejects a stale/raw draw party or a misleading hunting/PvP label', () => {
  const view={version:11,curveRebirths:1,monsterIndex:1001,frame:{replay:false,curveVersion:11,curveRebirths:1,monsterIndex:1001,ids:['c5']},
    fieldIds:['c5'],pvpIds:['c6'],labels:[{id:'c5',raw:'PvP 760',hunting:'사냥 공격력 760'},{id:'c6',raw:'PvP 291.92A',hunting:'사냥 공격력 342'}]};
  const cards=view.labels.map(row=>({...row,pvp:row.id==='c6'}));
  assert.doesNotThrow(()=>assertFieldPartyAgreement(view,cards));
  assert.throws(()=>assertFieldPartyAgreement({...view,frame:{...view.frame,ids:['c6']}},cards),/membership/);
  assert.throws(()=>assertFieldPartyAgreement({...view,frame:{...view.frame,curveVersion:10}},cards),/stale/);
  assert.throws(()=>assertFieldPartyAgreement({...view,frame:{...view.frame,curveRebirths:0}},cards),/stale/);
  assert.throws(()=>assertFieldPartyAgreement(view,cards.map(row=>row.id==='c6'?{...row,hunting:row.raw}:row)),/label differs/);
  assert.throws(()=>assertFieldPartyAgreement(view,cards.map(row=>({...row,pvp:true}))),/PvP membership/);
});

test('growth preview must match actual applied hunting and PvP powers including integers hidden by formatting', () => {
  const before={id:'c6',hunting:'사냥 공격력 1.23A',raw:'PvP 9.87A',huntingValue:'1234',rawValue:'9876'};
  const after={id:'c6',hunting:'사냥 공격력 1.23A',raw:'PvP 29.62A',huntingValue:'1235',rawValue:'29628'};
  const preview={text:'사냥 1.23A → 1.23A · PvP 9.87A → 29.62A',title:'사냥 1234 → 1235 · PvP 9876 → 29628'};
  assert.doesNotThrow(()=>assertGrowthPowerPreview(preview,before,after));
  assert.throws(()=>assertGrowthPowerPreview({...preview,title:'사냥 1234 → 1234 · PvP 9876 → 29628'},before,after),/exact integers/);
  assert.throws(()=>assertGrowthPowerPreview({...preview,text:'사냥 1.23A → 1.24A · PvP 9.87A → 29.62A'},before,after),/applied hunting/);
  assert.throws(()=>assertGrowthPowerPreview(preview,before,{...after,id:'c5'}),/target changed/);
});

test('lifecycle observer records quit stacks and shutdown events while preserving original calls and errors', t => {
  const app=new EventEmitter(), processEmitter=new EventEmitter(), window=new EventEmitter(), rows=[], calls=[];
  window.id=7;
  app.quit=function(...args){calls.push({method:'quit',args,receiver:this});return 73;};
  app.exit=function(code){calls.push({method:'exit',code,receiver:this});if(code===9)throw Error('original exit error');return code;};
  app.getAppPath=()=>'/packaged';
  const tray={setTitle:title=>calls.push({title}),setToolTip:tooltip=>calls.push({tooltip})};
  const p={e:{app,BrowserWindow:{getAllWindows:()=>[window]}},fs:{appendFileSync:(_path,line)=>rows.push(JSON.parse(line))},
    require:name=>name==='node:process'?processEmitter:{getActiveTray:()=>tray}};
  instrumentLifecycle(p,'/isolated');
  assert.equal(app.quit('reason'),73);assert.equal(app.exit(3),3);assert.throws(()=>app.exit(9),/original exit error/);
  for(const event of ['before-quit','will-quit','window-all-closed'])app.emit(event);
  app.emit('quit',{},3);window.emit('close');window.emit('closed');processEmitter.emit('exit',3);
  app.emit('render-process-gone',{}, {id:5}, {reason:'crashed'});app.emit('child-process-gone',{}, {type:'GPU',reason:'killed'});
  assert(rows.find(row=>row.event==='app.quit').stack.includes('Observed app.quit'));
  assert.deepEqual(calls.filter(row=>row.method).map(row=>row.receiver),[app,app,app]);
  for(const name of ['before-quit','will-quit','window-all-closed','quit','window-close','window-closed','process-exit','render-process-gone','child-process-gone'])assert(rows.some(row=>row.event===name));
  t.mock.method(console,'error',()=>{});p.fs.appendFileSync=()=>{throw Error('disk unavailable');};
  assert.equal(app.quit(),73); // Diagnostic I/O failure must never block shutdown.
});

test('HUD fixture starts with a surviving boss hit and reaches normal + ready + level-up + fever in one burst', () => {
  const { save } = fixture(core, core, 'hud', 1000), engine = core.createEngine(save, core.mulberry32(3));
  assert.equal(typeof core.heroRequiredLevel, 'function');
  assert(engine.getState().monster.boss);
  engine.attack('keyboard'); assert(engine.getState().monster.boss);
  engine.tick(520);
  const events = [];
  for (let index = 1; index < core.FEVER_INPUTS; index++) events.push(...engine.attack('keyboard'));
  const state = engine.getState();
  assert(!state.monster.boss && state.monster.index === 1000 && state.fever.active);
  assert(events.some(event => event.type === 'levelUp'));
  assert.equal(state.companions.length, 0);
  assert(core.heroReady(state.level, state.hero));
  const hp = state.monsterHp; engine.attack('keyboard');
  assert(engine.getState().monsterHp < hp && engine.getState().monster.index === 1000);
});

test('menu live-save fixture progresses gold without removing its paginated bag or growth material', () => {
  const { save } = fixture(core, core, 'menu', 1000), engine = core.createEngine(save, core.mulberry32(7));
  assert(save.equipment.bag.length > 24 && save.companions.length >= 2);
  const ids = save.equipment.bag.map(item => item.id), snapshots = [];
  for (let index = 0; index < 200; index++) { engine.tick(500); snapshots.push(engine.toSave()); }
  assert(snapshots.every(saved => ids.every(id => saved.equipment.bag.some(item => item.id === id))));
  assert(snapshots.every(saved => JSON.stringify(saved.equipment.loadout) === JSON.stringify(save.equipment.loadout)));
  assert(snapshots.at(-1).progress.playTimeMs >= 100_000);
  assert(BigInt(snapshots.at(-1).coins) > BigInt(save.coins));
  assert(snapshots.at(-1).companions.some(companion => companion.id === 'c2'));
});

test('live disclosure evidence requires the same state across a later coin-changing production save', () => {
  const before = { playTimeMs: 38_000, coins: '100', order: ['e1', 'e2'], scrollY: 50, cardTop: 70 };
  const stable = { sameNode: true, focused: true, open: true, order: ['e1', 'e2'], scrollY: 50, cardTop: 70,
    saves: [{ playTimeMs: 39_000, coins: '100' }, { playTimeMs: 41_200, coins: '100' }] };
  assert.doesNotThrow(() => assertLiveDisclosureState(before, stable));
  assert.throws(() => assertLiveDisclosureState(before, stable, true), /coin-changing save/);
  const rewarded = { ...stable, saves: [...stable.saves, { playTimeMs: 41_500, coins: '101' }] };
  assert.doesNotThrow(() => assertLiveDisclosureState(before, rewarded, true));
  for (const change of [{ sameNode: false }, { focused: false }, { open: false }, { order: ['e2', 'e1'] }, { scrollY: 51 }, { cardTop: 71 }]) {
    assert.throws(() => assertLiveDisclosureState(before, { ...rewarded, ...change }, true), /must survive/);
  }
  assert.throws(() => assertLiveDisclosureState(before, { ...stable, saves: [] }), /live saves/);
  assert.throws(() => assertLiveDisclosureState(before, { ...stable, saves: [{ playTimeMs: 38_000, coins: '200' }] }), /live saves/);
  assert.throws(() => assertLiveDisclosureState({ ...before, playTimeMs: undefined }, rewarded), /live saves/);
  assert.throws(() => assertLiveDisclosureState(before, { ...stable, saves: [{ coins: '200' }] }), /live saves/);
});

test('full-bag native fixture supports explicit accessory swap, acquisitions, hero reconciliation and a weaker restart', () => {
  const { save, ids } = fixture(core, core, 'manual', 1000), engine = core.createEngine(save, core.mulberry32(5));
  const apply = action => {
    const equipment = engine.getState().equipment;
    engine.apply({ ...action, revision: equipment.revision, shopSerial: equipment.shop.serial });
    assert.equal(engine.lastActionError(), null);
  };
  apply({ type: 'equipmentEquip', itemId: ids.manual });
  let equipment = engine.toSave().equipment;
  assert.equal(equipment.bag.length, equipment.capacity);
  const slot = equipment.bag.findIndex(item => item.id === ids.accessory), replaced = equipment.loadout.accessories[1].id;
  apply({ type: 'equipmentEquip', itemId: ids.accessory, replaceId: replaced });
  equipment = engine.toSave().equipment;
  assert.equal(equipment.loadout.accessories[1].id, ids.accessory);
  assert.equal(equipment.bag[slot].id, replaced);
  apply({ type: 'equipmentBuy', itemId: ids.weakPurchase });
  assert.equal(engine.getState().equipment.loadout.weapon.id, ids.manual);
  apply({ type: 'equipmentSell', itemId: ids.weakPurchase });
  assert.equal(engine.getState().equipment.loadout.weapon.id, ids.manual);
  apply({ type: 'equipmentBuy', itemId: ids.strongPurchase });
  assert.equal(engine.getState().equipment.loadout.weapon.id, ids.strongPurchase);
  apply({ type: 'equipmentEquip', itemId: ids.manual });
  apply({ type: 'equipmentEquip', itemId: ids.disposable });
  const protectedIds = engine.toSave().equipment.bag.map(item => item.id);
  for (const formId of ['h02', 'h01']) {
    equipment = engine.toSave().equipment;
    engine.apply({ type: 'heroEquip', formId, equipmentConfirmation: {
      targetFormId: formId, heroChangeSerial: equipment.heroChangeSerial, temporaryRevision: equipment.temporaryRevision,
      lostIds: equipment.temporary.map(item => item.id),
    } });
    assert.equal(engine.lastActionError(), null);
    equipment = engine.toSave().equipment;
    const all = core.equipmentItems(equipment).map(item => item.id);
    assert(protectedIds.every(id => all.includes(id)));
    if (formId === 'h02') {
      assert.equal(equipment.loadout.weapon, null);
      assert(equipment.temporary.some(item => item.id === ids.disposable));
    } else {
      assert.equal(equipment.loadout.weapon.id, ids.previous);
      assert(!all.includes(ids.disposable));
    }
  }
  apply({ type: 'equipmentEquip', itemId: ids.manual });
  const restored = core.createEngine(core.parseSave(engine.toSave())).toSave();
  assert.equal(restored.equipment.loadout.weapon.id, ids.manual);
  assert(restored.equipment.bag.some(item => item.id === ids.previous));
});

function observer() {
  let now = 10, raf = [], sequence = 0, click;
  const timers = new Map(), results = [];
  const target = { disabled: false, contains: node => node === target, getAttribute: () => 'true', parentElement: { open: true } };
  const feedback = { getAttribute: () => feedback.state, state: 'pending' };
  const context = { performance: { now: () => now, timeOrigin: 1000 },
    document: { addEventListener: (name, callback) => { if (name === 'click') click = callback; },
      querySelector: selector => selector === '#result' ? feedback : selector === '#panel' ? { hidden: false } : target },
    requestAnimationFrame: callback => raf.push(callback),
    setTimeout: callback => { timers.set(++sequence, callback); return sequence; }, clearTimeout: id => timers.delete(id),
    desmon: { onActionResult: callback => results.push(callback), onStateChanged: () => {} } };
  context.window = context; vm.runInNewContext(`(${installLatencyObserver.toString()})()`, context);
  return { api: context.__v11Latency, feedback, click: (trusted = true) => click({ target, isTrusted: trusted }),
    frame(at) { now = at; const callbacks = raf; raf = []; callbacks.forEach(callback => callback()); },
    result(value, at) { now = at; results.forEach(callback => callback(value)); },
    timeout() { [...timers.values()].forEach(callback => callback()); } };
}

test('local latency starts at a trusted click and finishes after two rendered frames', async () => {
  const observed = observer(); observed.api.arm({ family: 'tabs', selector: '#button', kind: 'tab', panel: '#panel' });
  observed.click(); observed.frame(23.125); observed.frame(39.75);
  const sample = await observed.api.take();
  assert.equal(sample.clickAt, 10); assert.equal(sample.paintAt, 39.75); assert.equal(sample.resultAt, 39.75);
  assert.equal(sample.eventType, 'click'); assert.equal(sample.isTrusted, true);
  assert.equal(latencyFamilies([sample])[0].visualMs[0], 29.75);
});

test('applied latency waits for its matching production ACK and painted success', async () => {
  const observed = observer(), action = { type: 'equipmentEquip', itemId: 'e3' };
  observed.api.arm({ family: 'equipment-actions', selector: '#equip', kind: 'action', action });
  observed.click(); observed.frame(20); observed.frame(36);
  observed.result({ ok: true, action: { ...action, itemId: 'unrelated' } }, 40);
  assert.equal(observed.api.snapshot().samples.length, 0);
  observed.feedback.state = 'success'; observed.result({ ok: true, action: { ...action, revision: 12 } }, 45.5);
  observed.frame(53); observed.frame(69.25);
  const sample = await observed.api.take();
  assert.equal(sample.paintAt, 36); assert.equal(sample.actionResultAt, 45.5); assert.equal(sample.resultAt, 69.25);
  assert.equal(sample.resultBasis, 'production-onActionResult-and-painted-feedback');
  assert.equal(latencyFamilies([sample])[3].resultMs[0], 59.25);
});

test('native growth completion consumes a material, persists its level gain and remains separate from latency families', async () => {
  const { save } = fixture(core, core, 'menu', 1000), engine = core.createEngine(save, core.mulberry32(7));
  const action = { type: 'consume', targetId: 'c1', foodId: 'c2' }, observed = observer();
  observed.api.arm({ family: 'growth-completion', retain: false, selector: '#food', kind: 'action', action });
  observed.click(); observed.frame(20); observed.frame(36); engine.apply(action);
  assert.equal(engine.lastActionError(), null);
  observed.feedback.state = 'success'; observed.result({ ok: true, action }, 45);
  observed.frame(53); observed.frame(69);
  const sample = await observed.api.take(), grown = engine.toSave(), restored = core.parseSave(JSON.parse(JSON.stringify(grown)));
  assertGrowthCompletion(save, grown, sample); assertGrowthCompletion(save, restored, sample);
  assert.equal(grown.companions.find(row => row.id === 'c1').level, 1_000_000_000_001);
  assert.equal(observed.api.snapshot().samples.length, 0);
  assert.throws(() => assertGrowthCompletion(save, save, sample), /increase/);
  assert.throws(() => assertGrowthCompletion(save, { ...grown, companions: [...grown.companions, save.companions[1]] }, sample), /remove/);
  assert.throws(() => assertGrowthCompletion(save, grown, { ...sample, isTrusted: false }), /trusted/);
  assert.throws(() => assertGrowthCompletion(save, grown, { ...sample, result: { action, ok: false } }), /ACK/);
});

test('untrusted clicks and rejected or absent production acknowledgments never count as samples', async () => {
  for (const kind of ['synthetic', 'rejected', 'timeout']) {
    const observed = observer(), action = { type: 'equipmentEquip', itemId: 'e3' };
    observed.api.arm({ family: 'equipment-actions', selector: '#equip', kind: 'action', action });
    observed.click(kind !== 'synthetic');
    if (kind === 'rejected') observed.result({ ok: false, action, error: 'stale' }, 15);
    if (kind === 'timeout') observed.timeout();
    await assert.rejects(observed.api.take()); assert.equal(observed.api.snapshot().samples.length, 0);
  }
});

function rasterCanvas() {
  const pixels = new Uint8ClampedArray(200 * 130 * 4);
  const ctx = { fillStyle: '', fillRect(x, y, width, height) {
    const rgb = this.fillStyle.match(/[0-9a-f]{2}/g).map(value => parseInt(value, 16));
    for (let yy = y; yy < y + height; yy++) for (let xx = x; xx < x + width; xx++) {
      if (xx < 0 || xx >= 200 || yy < 0 || yy >= 130) continue;
      pixels.set([...rgb, 255], (yy * 200 + xx) * 4);
    }
  } };
  return { pixels, ctx, clear: () => pixels.fill(0) };
}

test('native raster checks reject the startup-aged invisible boss float and verify actual rise', () => {
  const canvas = rasterCanvas(), pool = hud.createFloatPool();
  hud.spawnFieldFloat(pool, 163, 72, '1.25A', false);
  const snapshot = () => { canvas.clear(); hud.drawFloats(canvas.ctx, pool);
    return inspectHudPixels(canvas.pixels, 200, 130, { damage: [110, 0, 200, 80] }).damage; };
  hud.tickFloats(pool, 100);
  const misleadingStart = snapshot(); assert.equal(misleadingStart.bounds.top, 62);
  hud.tickFloats(pool, 512);
  const expired = snapshot();
  assert.throws(() => assertDamageRaster(expired), /missing/);
  assert.throws(() => assertDamageRise(misleadingStart, expired), /missing/);
  hud.spawnFieldFloat(pool, 163, 72, '1.25A', false); hud.tickFloats(pool, 13);
  const start = snapshot(); hud.tickFloats(pool, 500); const end = snapshot();
  assert.equal(assertDamageRise(start, end), 23);
  assert.throws(() => assertDamageRise(start, start), /rise/);
  assert.throws(() => assertDamageRaster({ ...end, bounds: { ...end.bounds, right: 200 } }), /clipped/);
});

test('native damage validation follows actual age through a startup dt jump without changing the rise curve', () => {
  const canvas = rasterCanvas(), pool = hud.createFloatPool();
  hud.spawnFieldFloat(pool, 163, 72, '1.25A', false);
  const shot = () => {
    canvas.clear(); hud.drawFloats(canvas.ctx, pool);
    const time = { effects: { floats: structuredClone(pool) } };
    return { raster: inspectHudPixels(canvas.pixels, 200, 130, { damage: [110, 0, 200, 80] }), timing: { before: time, after: time } };
  };
  hud.tickFloats(pool, 14); hud.tickFloats(pool, 100); const start = shot();
  hud.tickFloats(pool, 406); const end = shot(), result = assertDamageTimeline(start, end);
  assert.deepEqual(result.actualStartAges, [114, 114]); assert.deepEqual(result.actualEndAges, [520, 520]);
  assert.equal(result.totalRisePx, 28); assert.equal(result.rise, 19);
  const wrong = structuredClone(end); wrong.raster.damage.bounds.top += 2;
  assert.throws(() => assertDamageTimeline(start, wrong), /animation age/);
  hud.tickFloats(pool, 100); assert.throws(() => assertDamageTimeline(start, shot()), /missing/);
  const early = structuredClone(end); early.timing.before.effects.floats[0].ageMs = 490;
  early.timing.after = early.timing.before;
  assert.throws(() => assertDamageTimeline(start, early));
});

test('native raster checks require complete glyph ink, outline and actual flash phase', () => {
  const canvas = rasterCanvas();
  const read = () => inspectHudPixels(canvas.pixels, 200, 130, { fever: [56, 51, 104, 63] }).fever;
  hud.drawFeverLabel(canvas.ctx, 80, 52, 250);
  assertHudLabel(read(), 'white', 212, 52);
  assert.throws(() => assertHudLabel(read(), 'yellow', 212, 52), /phase/);
  canvas.clear(); hud.drawFeverLabel(canvas.ctx, 80, 52, 1250);
  assertHudLabel(read(), 'yellow', 212, 52);
  assert.throws(() => assertHudLabel(read(), 'white', 212, 52), /phase/);
  canvas.clear(); assert.throws(() => assertHudLabel(read(), 'yellow', 212, 52), /missing/);
});

test('serialized HUD geometry matches actual font drawing, including spaces with no glyph frame', () => {
  const geometry = vm.runInNewContext(`(${hudLabelGeometry.toString()})`), canvas = rasterCanvas();
  assert.equal(sprites.glyphIndex(' '), -1);
  for (const text of ['REBIRTH READY', 'LEVEL UP!', 'A A', ' ', '?']) {
    canvas.clear(); const label = geometry(sprites, text, 10);
    sprites.drawText(canvas.ctx, text, label.region[0] + 1, 10);
    const raster = inspectHudPixels(canvas.pixels, 200, 130, { label: label.region }).label;
    assert.equal(label.inkPixels, raster.inkPixels, text);
    assert.equal(label.region[2] - label.region[0], sprites.textWidth(text) + 2);
  }
  assert.equal(geometry(sprites, ' ', 10).inkPixels, 0);
  assert.equal(geometry(sprites, 'A A', 10).inkPixels, geometry(sprites, 'A', 10).inkPixels * 2);
  canvas.clear(); const fever = geometry(sprites, 'FEVER!', 52, 2);
  hud.drawFeverLabel(canvas.ctx, 80, 52, 250);
  assert.equal(fever.inkPixels, 212);
  assertHudLabel(inspectHudPixels(canvas.pixels, 200, 130, { fever: fever.region }).fever, 'white', fever.inkPixels, 52);
});

test('HUD provenance distinguishes native repeats, mouse input and production input IPC without intercepting them', () => {
  let at = 0, input, mode; const listeners = new Map();
  const context = { performance: { timeOrigin: 1000, now: () => ++at }, document: { hasFocus: () => true },
    addEventListener(type, callback, capture) { assert.equal(capture, true); listeners.set(type, callback); },
    desmon: { onInput: callback => { input = callback; }, onInputMode: callback => { mode = callback; } } };
  context.window = context; vm.runInNewContext(`(${installHudInputObserver.toString()})()`, context);
  listeners.get('keydown')({ type: 'keydown', code: 'KeyA', key: 'a', repeat: true, isTrusted: true });
  listeners.get('mousedown')({ type: 'mousedown', button: 0, isTrusted: true, target: { closest: () => ({}) } });
  input({ source: 'keyboard' }); mode({ mode: 'global', accessibilityGranted: false });
  const trace = JSON.parse(JSON.stringify(context.__v11HudInputs));
  assert.equal(trace.events[0].repeat, true); assert.equal(trace.events[0].code, 'KeyA'); assert(!('key' in trace.events[0]));
  assert.equal(trace.events[1].type, 'mousedown'); assert.equal(trace.events[1].dragStrip, true);
  assert.deepEqual(trace.ipc, [{ at: 3, source: 'keyboard' }]); assert.equal(trace.modes[0].mode, 'global');
  assert.throws(() => vm.runInNewContext(`(${installHudInputObserver.toString()})()`, context), /already installed/);
});

test('duplicate-click evidence rejects sequential clicks, extra ACKs and repeated mutations', () => {
  const evidence = { clicks: [{ eventType: 'click', isTrusted: true, at: 10 }, { eventType: 'click', isTrusted: true, at: 11 }],
    results: [{ at: 25, result: { ok: true } }], feedback: 'success' };
  assertDuplicateBurst(evidence, 4, 5);
  assert.throws(() => assertDuplicateBurst({ ...evidence, clicks: [evidence.clicks[0], { ...evidence.clicks[1], at: 26 }] }, 4, 5), /precede/);
  assert.throws(() => assertDuplicateBurst({ ...evidence, results: [...evidence.results, ...evidence.results] }, 4, 5), /exactly one/);
  assert.throws(() => assertDuplicateBurst(evidence, 4, 6), /revision twice/);
  assert.throws(() => assertDuplicateBurst({ ...evidence, feedback: 'error' }, 4, 5), /feedback/);
});

test('pipeline recorder snapshots action identity and reports overflow without replacing earlier rows', () => {
  let at = 0;
  const recorder = makeStageRecorder({ now: () => ++at, timeOrigin: 1000 }, 2);
  const action = { type: 'equipmentEquip', itemId: 'e1', revision: 7 };
  recorder.record('applyStart', action); action.revision++;
  recorder.record('applyEnd', action, 'stale'); recorder.record('applyStart', action);
  assert.equal(recorder.rows.length, 2); assert.equal(recorder.overflow, true);
  assert.deepEqual(recorder.rows[0], { stage: 'applyStart', key: '["equipmentEquip","e1",null,7]', timeOrigin: 1000, at: 1 });
  assert.equal(recorder.rows[1].error, 'stale'); assert.equal(recorder.rows[1].key, '["equipmentEquip","e1",null,8]');
});

const resolutionObservations = (rendererTimeOrigin, starts = [0, 100]) => ['before', 'after'].map((phase, index) => ({
  phase, rendererTimeOrigin, chromiumVersion: '142.0.7444.265', crossOriginIsolated: false,
  values: Array.from({ length: 64 }, (_, item) => starts[index] + item / 10), iterations: 64,
}));

test('clock calibration intersects resolution-bounded probes and rejects missing phases or drift beyond precision', () => {
  const probes = [
    { phase: 'before', mainBeforeEpochMs: 1010, rendererTimeOrigin: 1000, rendererAt: 12, mainAfterEpochMs: 1014 },
    { phase: 'after', mainBeforeEpochMs: 1110, rendererTimeOrigin: 1000, rendererAt: 13 + 100, mainAfterEpochMs: 1114 },
  ];
  const observations = resolutionObservations(1000), clock = calibrateClock(probes, observations);
  assert.equal(clock.offsetLowMs, -1 - .1 - epochRoundingErrorMs(1114));
  assert.equal(clock.offsetHighMs, 2 + .1 + epochRoundingErrorMs(1014)); assert.equal(clock.probes, probes);
  assert.equal(clock.resolution.quantumMs, .1); assert.equal(clock.unadjustedOffsetLowMs, -1);
  assert.throws(() => calibrateClock(probes.slice(0, 1), observations), /phase/);
  assert.throws(() => calibrateClock([probes[0], { ...probes[1], rendererAt: 130 }], observations), /intersect/);
  assert.throws(() => calibrateClock([probes[0], { ...probes[1], rendererTimeOrigin: 1001 }], observations), /clock/);
  for (const change of [value => value.pop(), value => value[1].crossOriginIsolated = true,
    value => value[1].values[32] += .025, value => value[1].values = value[1].values.map(at => at * 2)]) {
    const broken = structuredClone(observations); change(broken); assert.throws(() => calibrateClock(probes, broken));
  }
});

test('dense timer observations retain repeated-read provenance and bounded distinct readings', () => {
  let calls = 0;
  const observed = sampleClockResolution('before', '142.0.7444.265', { timeOrigin: 1000, now: () => Math.floor(calls++ / 3) / 10 }, false);
  assert.equal(observed.values.length, 64); assert.equal(observed.values[1], .1); assert.equal(observed.iterations, 190);
  assert.deepEqual(observed, { ...resolutionObservations(1000)[0], iterations: 190 });
  assert.equal(sampleClockResolution('before', '142.0.7444.265', { timeOrigin: 1000, now: () => 5 }, false).values.length, 1);
});

test('pilot02 quantization gap is represented explicitly while larger drift remains a failure', () => {
  // Two original raw probes responsible for the preserved pilot02 failure.
  const origin = 1789712052389.5, probes = [
    { phase: 'before', mainBeforeEpochMs: 1789712052734.7317, rendererTimeOrigin: origin,
      rendererAt: 345.2000000476837, mainAfterEpochMs: 1789712052734.8035 },
    { phase: 'after', mainBeforeEpochMs: 1789712071431.266, rendererTimeOrigin: origin,
      rendererAt: 19041.899999976158, mainAfterEpochMs: 1789712071431.3384 },
  ];
  const observations = resolutionObservations(origin, [330, 19000]), measured = calibrateClock(probes, observations);
  assert.equal(measured.unadjustedOffsetLowMs - measured.unadjustedOffsetHighMs, .09326171875);
  assert(measured.offsetLowMs <= measured.offsetHighMs);
  assert.equal(measured.resolution.maxErrorMs, .1);
  assert.throws(() => calibrateClock(probes.map((probe, i) => ({ ...probe, rendererAt: probe.rendererAt + i })), observations), /intersect/);
});

test('public conditional tracepoints bind real source lines, preserve raw rows and clean up without pausing', async () => {
  const scripts = {
    'dist/electron/main/ipc.js': '\n    let action = narrowAction(payload);\n',
    'dist/web/renderer/game.js': '\n    const events = engine.apply(a);\n    handleEvents(events, verdictScene);\n',
  };
  const definitions = Object.entries(scripts).map(([sourcePath, source], index) => ({
    scriptId: String(index), url: 'file:///fixture/app.asar/' + sourcePath, sourcePath, source,
  }));
  let ticks = 0, nextId = 0;
  const clock = timeOrigin => ({ timeOrigin, now: () => ++ticks / 10 });
  const mainPerf = clock(100000), menuPerf = clock(100005), fieldPerf = clock(100010);
  const points = new Map(); let session;
  const dispatch = (owner, method, params = {}) => {
    if (method === 'Debugger.enable') {
      for (const definition of definitions.filter(row => owner === 'main' ? row.sourcePath.includes('/main/') : row.sourcePath.includes('/renderer/')))
        if (owner === 'main') session.emit('Debugger.scriptParsed', { params: definition });
        else debuggerApi.emit('message', {}, 'Debugger.scriptParsed', definition);
      return {};
    }
    if (method === 'Debugger.setBreakpointByUrl') {
      const script = definitions.find(row => new RegExp(params.urlRegex).test(row.url));
      assert(script); const breakpointId = String(++nextId);
      points.set(breakpointId, { ...params, scriptId: script.scriptId, owner });
      return { breakpointId, locations: [{ scriptId: script.scriptId, lineNumber: params.lineNumber,
        columnNumber: script.source.split('\n')[params.lineNumber].search(/\S/) }] };
    }
    if (method === 'Debugger.getScriptSource') return { scriptSource: definitions.find(row => row.scriptId === params.scriptId).source };
    if (method === 'Debugger.removeBreakpoint') { assert(points.delete(params.breakpointId)); return {}; }
    assert.equal(method, 'Debugger.disable'); return {};
  };
  class Session extends EventEmitter {
    constructor() { super(); session = this; }
    connect() { this.connected = true; }
    disconnect() { this.connected = false; }
    post(method, params, callback) { try { callback(null, dispatch('main', method, params)); } catch (error) { callback(error); } }
  }
  const debuggerApi = Object.assign(new EventEmitter(), { attached: false,
    isAttached() { return this.attached; }, attach() { assert(!this.attached); this.attached = true; }, detach() { this.attached = false; },
    async sendCommand(method, params) { return dispatch('field', method, params); } });
  const menuContext = vm.createContext({ performance: menuPerf, crossOriginIsolated: false, requestAnimationFrame: callback => callback() });
  const fieldContext = vm.createContext({ performance: fieldPerf, crossOriginIsolated: false });
  const p = { require(name) { return name === 'node:perf_hooks' ? { performance: mainPerf } : name === 'node:inspector' ? { Session } : require(name); },
    fs: { readFileSync: path => scripts[path.replace('/fixture/app.asar/', '')] }, e: { app: { getAppPath: () => '/fixture/app.asar' } },
    menu: { webContents: { executeJavaScript: source => vm.runInContext(source, menuContext) } },
    field: { webContents: { debugger: debuggerApi, executeJavaScript: source => vm.runInContext(source, fieldContext) } } };
  const mainContext = vm.createContext({ p, process: { versions: { chrome: '142.0.7444.265' } } });
  const plain = value => value === undefined ? value : JSON.parse(JSON.stringify(value));
  const ui = { main: async source => plain(await vm.runInContext(source, mainContext)),
    menu: source => p.menu.webContents.executeJavaScript(source) };
  const observer = await installPipeline(ui);
  assert.equal(points.size, 3); assert.equal(debuggerApi.attached, true);
  const action = { type: 'equipmentEquip', itemId: 'e1', revision: 1 };
  const sample = { family: 'equipment-actions', timeOrigin: menuPerf.timeOrigin, clickAt: menuPerf.now(), result: { ok: true, action } };
  mainContext.payload = action; fieldContext.a = action; fieldContext.engine = { lastActionError: () => null };
  for (const point of points.values()) assert.equal(vm.runInContext(point.condition, point.owner === 'main' ? mainContext : fieldContext), false);
  sample.actionResultAt = menuPerf.now(); sample.paintAt = menuPerf.now(); sample.resultAt = menuPerf.now();
  const trace = await observer.finish(), [measured] = attachPipeline([sample], trace);
  const derived = validatePipeline(measured, path => Buffer.from(scripts[path]));
  validatePipelineTrace(trace, [measured]);
  assert.equal(derived.applyDurationMs, measured.pipeline.events.applyEnd[0].at - measured.pipeline.events.applyStart[0].at);
  assert.equal(measured.pipeline.segments.coreApply.rawMs, derived.applyDurationMs);
  assert.equal(measured.pipeline.segments.coreApply.order, 'unresolved-within-timer-resolution');
  assert.equal(trace.main.rows.length, 1); assert.equal(trace.field.rows.length, 2);
  assert.equal(trace.calibration.menu.probes.length, 40); assert.equal(trace.calibration.field.probes.length, 40);
  assert.equal(points.size, 0); assert.equal(debuggerApi.attached, false); assert.equal(session.connected, false);
  assert.equal(session.listenerCount('Debugger.paused'), 0); assert.equal(debuggerApi.listenerCount('message'), 0);
  await ui.main('p.v11Pipeline.cleanup()'); // Safe when runtime failure collection follows finish().
  const ambiguous = structuredClone(trace); ambiguous.main.rows[0].at -= .1;
  const [uncertain] = attachPipeline([sample], ambiguous);
  assert.equal(uncertain.pipeline.segments.clickToIpc.order, 'unresolved-within-clock-uncertainty');
  assert(uncertain.pipeline.segments.clickToIpc.lowMs < 0 && uncertain.pipeline.segments.clickToIpc.highMs > 0);
  validatePipeline(uncertain, path => Buffer.from(scripts[path]));
  const local = { family: 'tabs' }; assert.equal(attachPipeline([local], trace)[0], local);
  for (const change of [value => value.field.rows.pop(), value => value.main.rows.push(value.main.rows[0]),
    value => value.pauseCount++, value => value.field.overflow = true, value => value.field.rows[1].error = 'rejected',
    value => value.field.rows[1].at = value.field.rows[0].at - 10]) {
    const broken = structuredClone(trace); change(broken); assert.throws(() => attachPipeline([sample], broken));
  }
});
