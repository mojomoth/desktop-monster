// Native UI scenarios. Observers read production state; actions use sendInputEvent.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { controls, until } from '../v10/ui-cases.mjs';

/** Serialized into the menu renderer; timestamps never include inspector round trips. */
export function installLatencyObserver() {
  if (globalThis.__v12Latency) throw Error('Latency observer already installed');
  let armed = null;
  const samples = [], saves = [];
  const fail = message => {
    if (!armed || armed.finished) return;
    armed.finished = true; clearTimeout(armed.timer); armed.reject(Error(message));
  };
  const finish = () => {
    if (!armed || armed.finished || armed.paintAt === null || armed.resultAt === null) return;
    armed.finished = true; clearTimeout(armed.timer);
    const sample = { family: armed.spec.family, selector: armed.spec.selector, eventType: 'click', isTrusted: armed.trusted,
      timeOrigin: performance.timeOrigin, clickAt: armed.startMs, paintAt: armed.paintAt, resultAt: armed.resultAt,
      actionResultAt: armed.actionResultAt, resultBasis: armed.spec.action ? 'production-onActionResult-and-painted-feedback' : 'local-ui-double-rAF', result: armed.result };
    if (armed.spec.retain !== false) samples.push(sample);
    armed.resolve(sample);
  };
  const ready = () => {
    const { spec, target } = armed;
    if (spec.kind === 'tab') return target.getAttribute('aria-selected') === 'true' && !document.querySelector(spec.panel).hidden;
    if (spec.kind === 'disclosure') return target.parentElement.open === spec.open;
    if (spec.kind === 'growth') return !document.querySelector('#cancel-selection').hidden === spec.selected &&
      (spec.selected ? document.querySelector('#result').textContent.includes('성장 재료') : document.querySelector('#result').textContent === '');
    return ['pending', 'success', 'error'].includes(document.querySelector('#result').getAttribute('data-state'));
  };
  document.addEventListener('click', event => {
    if (!armed || armed.startMs !== null || !armed.target.contains(event.target)) return;
    if (!event.isTrusted) { fail('Synthetic DOM click is not a native sample'); return; }
    armed.trusted = true; armed.startMs = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!armed || armed.finished) return;
      if (!ready()) { fail('First native click did not produce the expected UI state'); return; }
      armed.paintAt = performance.now();
      if (!armed.spec.action) armed.resultAt = armed.paintAt;
      finish();
    }));
  }, true);
  if (typeof window.desmon.onActionResult !== 'function') throw Error('Production action result bridge unavailable');
  window.desmon.onActionResult(result => {
    if (!armed || armed.finished || armed.startMs === null || !armed.spec.action) return;
    if (!Object.entries(armed.spec.action).every(([key, value]) => result.action?.[key] === value)) return;
    armed.result = result;
    if (!result.ok) { fail('Production action rejected: ' + result.error); return; }
    armed.actionResultAt = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!armed || armed.finished) return;
      if (document.querySelector('#result').getAttribute('data-state') !== 'success') { fail('Applied action feedback was not painted'); return; }
      armed.resultAt = performance.now(); finish();
    }));
  });
  window.desmon.onStateChanged(save => saves.push({ at: performance.now(), coins: save.coins, playTimeMs: save.progress?.playTimeMs }));
  globalThis.__v12Latency = {
    arm(spec) {
      if (armed && !armed.finished) throw Error('Previous native sample is unfinished');
      const target = document.querySelector(spec.selector);
      if (!target || target.disabled) throw Error('Missing/disabled native target: ' + spec.selector);
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      // Retain rejection until the host retrieves the sample; no unhandled promise.
      promise.catch(() => {});
      armed = { spec, target, promise, resolve, reject, finished: false, startMs: null,
        paintAt: null, resultAt: null, actionResultAt: null, result: null, trusted: false };
      armed.timer = setTimeout(() => fail('Native click/result timed out: ' + spec.selector), 5000);
      return true;
    },
    take: () => armed?.promise,
    snapshot: () => ({ samples: [...samples], saves: [...saves] }),
  };
  return true;
}

export function latencyFamilies(samples) {
  return ['tabs', 'disclosures', 'growth-selection', 'equipment-actions'].map(name => {
    const rows = samples.filter(sample => sample.family === name);
    return { name, visualMs: rows.map(row => row.paintAt - row.clickAt), resultMs: rows.map(row => row.resultAt - row.clickAt), samples: rows };
  });
}

export function assertLiveDisclosureState(before, after, requireCoinChange = false) {
  assert(after.sameNode && after.focused && after.open && Math.abs(after.scrollY - before.scrollY) < 1 &&
    Math.abs(after.cardTop - before.cardTop) < 1 &&
    JSON.stringify(after.order.filter(id => before.order.includes(id))) === JSON.stringify(before.order),
  'Disclosure node, focus, page, order and scroll must survive live saves');
  assert(Number.isFinite(before.playTimeMs) && after.saves.length > 0 && after.saves.every(save => Number.isFinite(save.playTimeMs)) &&
    after.saves.some(save => save.playTimeMs > before.playTimeMs), 'Production live saves must advance play time');
  if (requireCoinChange) assert(typeof before.coins === 'string' &&
    after.saves.some(save => typeof save.coins === 'string' && save.coins !== before.coins), 'An actual coin-changing save must reach the open disclosure');
}

/** Inspect decoded native PNG pixels, normalized to the 200×130 game canvas. */
export function inspectHudPixels(data, width, height, regions) {
  const palette = { white: [222, 238, 214], yellow: [218, 212, 94], steel: [133, 149, 161],
    orange: [210, 125, 44], outline: [20, 12, 28] };
  const result = {};
  for (const [name, [left, top, right, bottom]] of Object.entries(regions)) {
    const colors = Object.fromEntries(Object.keys(palette).map(color => [color, 0]));
    let bounds = null;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      const offset = (Math.floor((y + .5) * height / 130) * width + Math.floor((x + .5) * width / 200)) * 4;
      if (data[offset + 3] !== 255) continue;
      const color = Object.keys(palette).find(key => palette[key].every((channel, index) => channel === data[offset + index]));
      if (!color) continue;
      colors[color]++;
      if (color === 'outline') continue;
      bounds = bounds ? { left: Math.min(bounds.left, x), top: Math.min(bounds.top, y),
        right: Math.max(bounds.right, x + 1), bottom: Math.max(bounds.bottom, y + 1) }
        : { left: x, top: y, right: x + 1, bottom: y + 1 };
    }
    result[name] = { colors, bounds, inkPixels: Object.entries(colors).reduce((sum, [key, count]) => sum + (key === 'outline' ? 0 : count), 0) };
  }
  return result;
}

export function assertDamageRaster(raster) {
  assert(raster?.inkPixels > 0 && raster.bounds && raster.colors.outline > 0, 'Damage glyph ink is missing from native PNG');
  assert(raster.bounds.left >= 122 && raster.bounds.right <= 197 && raster.bounds.top >= 2, 'Damage glyph ink is clipped/outside field bounds');
}
export function assertDamageRise(start, end, minRise = 20, maxRise = 40) {
  assertDamageRaster(start); assertDamageRaster(end);
  const rise = start.bounds.top - end.bounds.top;
  assert(rise >= minRise && rise <= maxRise, 'Native damage rise differs: ' + rise);
  return rise;
}
export function assertDamageTimeline(start, end) {
  const frames = [start, end].map(shot => {
    assertDamageRaster(shot.raster.damage);
    const snapshots = [shot.timing.before, shot.timing.after].map(time => time.effects.floats.filter(float => float.active));
    assert(snapshots.every(floats => floats.length === 1), 'Damage capture does not isolate one active float');
    const floats = snapshots.map(rows => rows[0]);
    const tops = floats.map(float => Math.max(2, float.y - Math.round((float.crit ? 42 : 28) * float.ageMs / 600) - (float.scale - 1) * 5));
    assert(shot.raster.damage.bounds.top >= Math.min(...tops) && shot.raster.damage.bounds.top <= Math.max(...tops),
      'Native damage position differs from its recorded animation age');
    return floats;
  });
  const first = frames[0][0], last = frames[1][1];
  assert(['text', 'crit', 'scale', 'x', 'y'].every(key => first[key] === last[key]) && last.ageMs > first.ageMs &&
    frames[1].every(float => float.ageMs >= 500 && float.ageMs < 600), 'Damage endpoint is not the same float at actual age 500–600ms');
  return { rise: start.raster.damage.bounds.top - end.raster.damage.bounds.top,
    actualStartAges: frames[0].map(float => float.ageMs), actualEndAges: frames[1].map(float => float.ageMs),
    totalRisePx: first.crit ? 42 : 28 };
}
export function assertHudLabel(raster, color, inkPixels, top) {
  assert(raster?.colors[color] === inkPixels && raster.inkPixels === inkPixels && raster.colors.outline > 0 && raster.bounds?.top === top,
    'Native HUD label missing or incorrect phase: expected ' + color + ' at ' + top);
}
/** Serialized with the production sprite exports; spaces advance without ink. */
export function hudLabelGeometry(sprites, text, y, scale = 1) {
  const width = sprites.textWidth(text) * scale, x = Math.round(80 - width / 2);
  let inkPixels = 0;
  for (const char of text) {
    const frame = sprites.glyphIndex(char);
    if (frame < 0) continue; // Same missing-glyph rule as production drawText.
    for (const row of sprites.fontSprite.frames[frame]) for (const pixel of row) if (pixel !== sprites.TRANSPARENT) inkPixels++;
  }
  return { region: [x - 1, y - 1, x + width + 1, y + sprites.FONT_H * scale + 1], inkPixels: inkPixels * scale * scale, top: y };
}
/** Read-only native-event provenance; never suppress or manufacture field input. */
export function installHudInputObserver() {
  if (globalThis.__v12HudInputs) throw Error('HUD input observer already installed');
  const trace = globalThis.__v12HudInputs = { timeOrigin: performance.timeOrigin, requests: [], events: [], ipc: [], modes: [] };
  const record = event => trace.events.push({ at: performance.now(), type: event.type, code: event.code ?? null,
    repeat: event.repeat ?? false, isTrusted: event.isTrusted, button: event.button ?? null,
    dragStrip: Boolean(event.target?.closest?.('.drag-handle')), focused: document.hasFocus() });
  for (const type of ['keydown', 'keyup', 'mousedown', 'mouseup']) window.addEventListener(type, record, true);
  window.desmon.onInput(event => trace.ipc.push({ at: performance.now(), source: event.source }));
  window.desmon.onInputMode(event => trace.modes.push({ at: performance.now(), ...event }));
  return true;
}
export function assertDuplicateBurst(observed, beforeRevision, afterRevision) {
  assert(observed.clicks.length === 2 && observed.clicks.every(click => click.isTrusted && click.eventType === 'click'), 'Two trusted duplicate clicks were not observed');
  assert(observed.results.length === 1 && observed.results[0].result.ok === true, 'Duplicate burst did not produce exactly one accepted result');
  assert(observed.clicks[0].at < observed.clicks[1].at && observed.clicks[1].at < observed.results[0].at,
    'Duplicate clicks did not both precede the applied ACK');
  assert(afterRevision === beforeRevision + 1 && observed.feedback === 'success', 'Duplicate burst changed the revision twice or lost normal feedback');
}
export function assertGrowthCompletion(before, after, sample) {
  const action = sample.result?.action;
  assert(sample.isTrusted === true && sample.eventType === 'click' && sample.result?.ok === true && action?.type === 'consume' &&
    sample.resultBasis === 'production-onActionResult-and-painted-feedback' && sample.actionResultAt >= sample.clickAt &&
    sample.resultAt >= sample.actionResultAt, 'Growth lacks a trusted click and painted successful consume ACK');
  const target = before.companions.find(row => row.id === action.targetId), food = before.companions.find(row => row.id === action.foodId);
  const grown = after.companions.find(row => row.id === action.targetId);
  assert(target && food && target.id !== food.id && grown?.level === target.level + 1 + food.stars &&
    !after.companions.some(row => row.id === action.foodId), 'Growth did not increase the target level and remove its material');
}

export function makeStageRecorder(perf, limit = 2000) {
  return { rows: [], overflow: false, record(stage, action, error) {
    const at = perf.now();
    if (this.rows.length >= limit) { this.overflow = true; return; }
    const key = JSON.stringify([action?.type ?? null, action?.itemId ?? null, action?.replaceId ?? null, action?.revision ?? null]);
    this.rows.push({ stage, key, timeOrigin: perf.timeOrigin, at, ...(stage === 'applyEnd' ? { error } : {}) });
  } };
}

// Two full IEEE754 ULPs conservatively cover epoch sums and bound arithmetic.
export const epochRoundingErrorMs = epoch => 2 ** (Math.floor(Math.log2(Math.abs(epoch))) - 52) * 2;

/** Serialized read-only, outside the measured action batch. Keep the raw lattice. */
export function sampleClockResolution(phase, chromiumVersion, perf = performance, isolated = globalThis.crossOriginIsolated) {
  const values = [perf.now()]; let iterations = 1;
  while (values.length < 64 && iterations < 1_000_000) {
    const now = perf.now(); iterations++;
    if (now < values.at(-1)) throw Error('Renderer clock moved backwards');
    if (now !== values.at(-1)) values.push(now);
  }
  return { phase, rendererTimeOrigin: perf.timeOrigin, chromiumVersion, crossOriginIsolated: isolated, values, iterations };
}

export function calibrateClock(probes, observations) {
  assert(probes.some(probe => probe.phase === 'before') && probes.some(probe => probe.phase === 'after'), 'Missing clock calibration phase');
  const rendererTimeOrigin = probes[0].rendererTimeOrigin;
  assert(Number.isFinite(rendererTimeOrigin) && probes.every(probe => ['before', 'after'].includes(probe.phase) && probe.rendererTimeOrigin === rendererTimeOrigin &&
    [probe.mainBeforeEpochMs, probe.rendererAt, probe.mainAfterEpochMs].every(Number.isFinite) &&
    probe.rendererAt >= 0 && probe.mainBeforeEpochMs <= probe.mainAfterEpochMs), 'Invalid or changed renderer clock');
  // This package's Chromium clamps to either adjacent 100us bucket boundary.
  // A constant clamped time-origin error belongs to the offset; each new now()
  // reading independently has <100us error. Verify the actual lattice twice.
  // https://chromium.googlesource.com/chromium/src/+/142.0.7444.265/third_party/blink/renderer/core/timing/time_clamper.cc
  const quantumMs = 0.1, chromiumVersion = '142.0.7444.265';
  assert(Array.isArray(observations) && observations.length === 2 && observations[0].phase === 'before' && observations[1].phase === 'after',
    'Missing before/after timer resolution observations');
  for (const observation of observations) {
    assert(observation.rendererTimeOrigin === rendererTimeOrigin && observation.chromiumVersion === chromiumVersion &&
      observation.crossOriginIsolated === false && observation.values.length === 64 &&
      Number.isSafeInteger(observation.iterations) && observation.iterations >= 64 && observation.iterations <= 1_000_000,
    'Unsupported or incomplete renderer timer resolution');
    const values = observation.values, error = epochRoundingErrorMs(rendererTimeOrigin + Math.max(...values));
    assert(values.every((value, index) => Number.isFinite(value) && value >= 0 && (index === 0 || value > values[index - 1]) &&
      Math.abs(value - values[0] - Math.round((value - values[0]) / quantumMs) * quantumMs) <= error), 'Renderer timer is not on its documented lattice');
    assert(Math.abs(Math.min(...values.slice(1).map((value, index) => value - values[index])) - quantumMs) <= error,
      'Renderer minimum timer step differs from its documented quantum');
  }
  const resolution = { basis: 'chromium-time-clamper', chromiumVersion, crossOriginIsolated: false, quantumMs, maxErrorMs: quantumMs, observations };
  const allowance = probe => quantumMs + epochRoundingErrorMs(Math.max(rendererTimeOrigin + probe.rendererAt, probe.mainBeforeEpochMs, probe.mainAfterEpochMs));
  const unadjustedOffsetLowMs = Math.max(...probes.map(probe => rendererTimeOrigin + probe.rendererAt - probe.mainAfterEpochMs));
  const unadjustedOffsetHighMs = Math.min(...probes.map(probe => rendererTimeOrigin + probe.rendererAt - probe.mainBeforeEpochMs));
  const offsetLowMs = Math.max(...probes.map(probe => rendererTimeOrigin + probe.rendererAt - probe.mainAfterEpochMs - allowance(probe)));
  const offsetHighMs = Math.min(...probes.map(probe => rendererTimeOrigin + probe.rendererAt - probe.mainBeforeEpochMs + allowance(probe)));
  assert(offsetLowMs <= offsetHighMs, 'Clock calibration intervals do not intersect');
  return { rendererTimeOrigin, offsetLowMs, offsetHighMs, unadjustedOffsetLowMs, unadjustedOffsetHighMs, resolution, probes };
}

export function attachPipeline(samples, trace) {
  assert(trace.pauseCount === 0 && !trace.main.overflow && !trace.field.overflow, 'Pipeline observer paused or overflowed');
  const interval = (event, clock) => {
    const epoch = event.timeOrigin + event.at;
    const error = (clock?.resolution.maxErrorMs ?? 0) + epochRoundingErrorMs(epoch);
    return clock ? [epoch - clock.offsetHighMs - error, epoch - clock.offsetLowMs + error] : [epoch - error, epoch + error];
  };
  const duration = (start, end) => ({ lowMs: end[0] - start[1], highMs: end[1] - start[0],
    order: end[1] < start[0] ? 'reversed' : end[0] >= start[1] ? 'resolved' : 'unresolved-within-clock-uncertainty' });
  return samples.map(sample => {
    if (sample.family !== 'equipment-actions') return sample;
    const action = sample.result.action, key = JSON.stringify([action.type, action.itemId ?? null, action.replaceId ?? null, action.revision ?? null]);
    const events = Object.fromEntries(['ipcEntry', 'applyStart', 'applyEnd'].map(stage =>
      [stage, (stage === 'ipcEntry' ? trace.main.rows : trace.field.rows).filter(row => row.stage === stage && row.key === key)
        .map(({ stage: _stage, ...event }) => event)]));
    assert(Object.values(events).every(rows => rows.length === 1) && events.applyEnd[0].error === null, 'Missing, duplicate or failed pipeline marker: ' + key);
    const menu = trace.calibration.menu, field = trace.calibration.field;
    const click = interval({ timeOrigin: sample.timeOrigin, at: sample.clickAt }, menu);
    const entry = interval(events.ipcEntry[0]), start = interval(events.applyStart[0], field), end = interval(events.applyEnd[0], field);
    const result = interval({ timeOrigin: sample.timeOrigin, at: sample.resultAt }, menu);
    const coreMs = events.applyEnd[0].at - events.applyStart[0].at;
    const coreError = 2 * (field.resolution.maxErrorMs + epochRoundingErrorMs(events.applyEnd[0].timeOrigin + events.applyEnd[0].at));
    assert(coreMs >= 0, 'Core apply clock moved backwards');
    const segments = { clickToIpc: duration(click, entry), ipcToApply: duration(entry, start),
      coreApply: { rawMs: coreMs, lowMs: coreMs - coreError, highMs: coreMs + coreError,
        order: coreMs >= coreError ? 'resolved' : 'unresolved-within-timer-resolution' }, applyToPaint: duration(end, result) };
    assert(Object.values(segments).every(segment => segment.order !== 'reversed'), 'Pipeline causal order reversed');
    return { ...sample, pipeline: { basis: trace.basis, key, events, locations: trace.locations,
      calibration: trace.calibration, pauseCount: trace.pauseCount, segments } };
  });
}

export async function installPipeline(ui) {
  const setup = await ui.main(`(async()=>{
    if(p.v12Pipeline)throw Error('Pipeline observer already installed');
    const perf=p.require('node:perf_hooks').performance,session=new(p.require('node:inspector').Session)();session.connect();
    const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,result)=>error?reject(error):resolve(result)));
    const d=p.field.webContents.debugger,state=p.v12Pipeline={pauseCount:0,mainIds:[],fieldIds:[],attached:false,mainScripts:new Map(),fieldScripts:new Map(),probes:{menu:[],field:[]},resolutionObservations:{menu:[],field:[]}};
    globalThis.__v12MainTiming=(${makeStageRecorder.toString()})(perf);
    const mainMessage=event=>state.mainScripts.set(event.params.scriptId,event.params.url);
    const mainPause=()=>{state.pauseCount++;void post('Debugger.resume');};
    const fieldMessage=(_event,method,params)=>{if(method==='Debugger.scriptParsed')state.fieldScripts.set(params.scriptId,params.url);
      if(method==='Debugger.paused'){state.pauseCount++;void d.sendCommand('Debugger.resume');}};
    session.on('Debugger.scriptParsed',mainMessage);session.on('Debugger.paused',mainPause);
    state.cleanup=async()=>{if(state.cleaned)return;state.cleaned=true;try{
      for(const breakpointId of state.mainIds)await post('Debugger.removeBreakpoint',{breakpointId});
      if(state.attached)for(const breakpointId of state.fieldIds)await d.sendCommand('Debugger.removeBreakpoint',{breakpointId});
      await post('Debugger.disable');
    }finally{session.removeListener('Debugger.scriptParsed',mainMessage);session.removeListener('Debugger.paused',mainPause);session.disconnect();
      if(state.attached){d.removeListener('message',fieldMessage);d.detach();state.attached=false;}}};
    const hash=value=>p.require('node:crypto').createHash('sha256').update(value).digest('hex');
    const bind=async(stage,sourcePath,anchor,api,scripts,condition,ids)=>{
      const source=p.fs.readFileSync(p.e.app.getAppPath()+'/'+sourcePath,'utf8'),lines=source.split(/\\r?\\n/);
      const matches=lines.flatMap((line,index)=>line.trim()===anchor?[index]:[]);
      if(matches.length!==1)throw Error('Expected unique pipeline source anchor: '+stage);
      const response=await api('Debugger.setBreakpointByUrl',{urlRegex:'/'+sourcePath.replaceAll('.','[.]')+'$',lineNumber:matches[0],condition});
      ids.push(response.breakpointId);
      if(response.locations.length!==1)throw Error('Pipeline breakpoint did not resolve exactly once: '+stage);
      const location=response.locations[0],url=scripts.get(location.scriptId);
      if(location.lineNumber!==matches[0]||!url?.endsWith('/'+sourcePath))throw Error('Unexpected pipeline source location: '+stage);
      const loaded=await api('Debugger.getScriptSource',{scriptId:location.scriptId});
      if(hash(loaded.scriptSource)!==hash(source))throw Error('Loaded pipeline source differs: '+stage);
      return{...location,url,sourcePath,scriptSha256:hash(source)};
    };
    try{
      await post('Debugger.enable');
      const ipcEntry=await bind('ipcEntry','dist/electron/main/ipc.js','let action = narrowAction(payload);',post,state.mainScripts,
        '(globalThis.__v12MainTiming.record("ipcEntry", payload), false)',state.mainIds);
      await p.field.webContents.executeJavaScript(${JSON.stringify(`globalThis.__v12FieldTiming=(${makeStageRecorder.toString()})(performance);true`)});
      if(d.isAttached())throw Error('Another debugger owns the field');d.attach('1.3');state.attached=true;d.on('message',fieldMessage);
      await d.sendCommand('Debugger.enable');const fieldPost=(method,params)=>d.sendCommand(method,params);
      const applyStart=await bind('applyStart','dist/web/renderer/game.js','const events = engine.apply(a);',fieldPost,state.fieldScripts,
        '(globalThis.__v12FieldTiming.record("applyStart", a), false)',state.fieldIds);
      const applyEnd=await bind('applyEnd','dist/web/renderer/game.js','handleEvents(events, verdictScene);',fieldPost,state.fieldScripts,
        '(globalThis.__v12FieldTiming.record("applyEnd", a, engine.lastActionError()), false)',state.fieldIds);
      state.locations={ipcEntry,applyStart,applyEnd};return state.locations;
    }catch(error){await state.cleanup();throw error;}
  })()`);
  const probes = { menu: [], field: [] }, observations = { menu: [], field: [] };
  const calibrate = async phase => {
    for (const target of ['menu', 'field']) {
      observations[target].push(await ui.main(`(async()=>{const value=await p.${target}.webContents.executeJavaScript(
        '('+${JSON.stringify(sampleClockResolution.toString())}+')('+JSON.stringify(${JSON.stringify(phase)})+','+JSON.stringify(process.versions.chrome)+')');
        p.v12Pipeline.resolutionObservations.${target}.push(value);return value;})()`));
      for (let index = 0; index < 20; index++) probes[target].push(await ui.main(`(async()=>{
      const perf=p.require('node:perf_hooks').performance,mainBeforeEpochMs=perf.timeOrigin+perf.now();
      const remote=await p.${target}.webContents.executeJavaScript('({rendererTimeOrigin:performance.timeOrigin,rendererAt:performance.now()})');
      const probe={phase:${JSON.stringify(phase)},mainBeforeEpochMs,...remote,mainAfterEpochMs:perf.timeOrigin+perf.now()};
      p.v12Pipeline.probes.${target}.push(probe);return probe;})()`));
    }
  };
  try { await calibrate('before'); await ui.menu('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); }
  catch (error) { await ui.main('p.v12Pipeline.cleanup()'); throw error; }
  return { async finish() {
    try {
      await calibrate('after');
      const raw = await ui.main(`(async()=>({main:{rows:__v12MainTiming.rows,overflow:__v12MainTiming.overflow},
        field:await p.field.webContents.executeJavaScript('({rows:__v12FieldTiming.rows,overflow:__v12FieldTiming.overflow})'),pauseCount:p.v12Pipeline.pauseCount}))()`);
      return { basis: 'cdp-conditional-false', ...raw, locations: setup,
        calibration: { id: 'native-' + probes.menu[0].mainBeforeEpochMs,
          menu: calibrateClock(probes.menu, observations.menu), field: calibrateClock(probes.field, observations.field) } };
    } finally { await ui.main('p.v12Pipeline.cleanup()'); }
  } };
}

async function menuControls(runtime) {
  const ui = await controls(runtime); await ui.openMenu();
  await ui.menu(`(${installLatencyObserver.toString()})()`);
  const pipeline = await installPipeline(ui);
  const measuredUi = { ...ui, async measured(spec) {
    await ui.menu(`globalThis.__v12Latency.arm(${JSON.stringify(spec)})`);
    await ui.click(spec.selector);
    return ui.menu('globalThis.__v12Latency.take()');
  }, samples: async () => {
    const samples = (await ui.menu('globalThis.__v12Latency.snapshot()')).samples;
    measuredUi.pipelineTrace = await pipeline.finish();
    return attachPipeline(samples, measuredUi.pipelineTrace);
  } };
  return measuredUi;
}
function report() {
  const value = { passed: false, checks: [], screenshots: [], samples: [] };
  return { value, check(name, passed, details = {}) {
    value.checks.push({ name, passed: Boolean(passed), details });
    try { assert(passed, name); } catch (error) { error.ui = value; throw error; }
  } };
}
const itemSelector = (panel, id) => `${panel} [data-item-id="${id}"]`;
const growth = '#roster .card .row button:first-child';
const rowOrder = panel => `Array.from(document.querySelectorAll(${JSON.stringify(panel + ' [data-item-id]')}),node=>node.dataset.itemId)`;
const rafDelay = ms => `new Promise(resolve=>{const start=performance.now();const frame=()=>performance.now()-start>=${ms}?resolve(performance.now()-start):requestAnimationFrame(frame);requestAnimationFrame(frame);})`;

export async function menuLiveCases(runtime, fixture) {
  const ui = await menuControls(runtime), { value, check } = report();
  const layout = await ui.menu(`(()=>{const tabs=[...document.querySelectorAll('.tabs > button')];return {width:innerWidth,
    rects:tabs.map(node=>{const r=node.getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,bottom:r.bottom};}),
    soulPanel:document.querySelector('#rebirth').closest('.panel')?.id,
    exportPanel:document.querySelector('#share-open').closest('.panel')?.id,
    soulCount:document.querySelectorAll('#rebirth').length,exportCount:document.querySelectorAll('#share-open').length};})()`);
  check('eight-tabs-one-row-at-560', layout.width === 560 && layout.rects.length === 8 &&
    layout.rects.every(rect => Math.abs(rect.top - layout.rects[0].top) < 1 && rect.left >= 0 && rect.right <= 560), layout);
  check('utilities-only-in-intended-panels', layout.soulPanel === 'hero' && layout.exportPanel === 'profile' && layout.soulCount === 1 && layout.exportCount === 1);
  // All eight tab buttons are real native samples, including online fixture panels.
  const tabs = ['hero', 'codex', 'roster', 'inventory', 'shop', 'battle', 'ranking', 'profile'];
  for (let index = 0; index < 100; index++) {
    const id = tabs[(index + 1) % tabs.length];
    await ui.measured({ family: 'tabs', selector: '#tab-' + id, kind: 'tab', panel: '#' + id });
  }
  await ui.click('#tab-inventory');
  const initial = await ui.menu(rowOrder('#inventory'));
  const disclosure = '#inventory .equipment-details > summary';
  for (let index = 0; index < 100; index++) {
    const open = await ui.menu(`!document.querySelector(${JSON.stringify(disclosure)}).parentElement.open`);
    await ui.measured({ family: 'disclosures', selector: disclosure, kind: 'disclosure', open });
  }
  // Page two and a focused, open disclosure must survive live game saves.
  const next = '#inventory .equipment-section:nth-of-type(2) .equipment-pages button:nth-child(2)';
  await ui.click(next);
  const pageCard = await ui.menu(`document.querySelector('#inventory .equipment-section:nth-of-type(2) [data-item-id]').dataset.itemId`);
  const pageSummary = itemSelector('#inventory', pageCard) + ' .equipment-details > summary';
  await ui.click(pageSummary);
  const bagSection = '#inventory .equipment-section:nth-of-type(2)';
  const before = await ui.menu(`(()=>{globalThis.__v12Focused=document.activeElement;globalThis.__v12OpenSummary=document.querySelector(${JSON.stringify(pageSummary)});return {order:${rowOrder(bagSection)},scrollY,
    cardTop:document.querySelector(${JSON.stringify(pageSummary)}).getBoundingClientRect().top,
    saves:__v12Latency.snapshot().saves.length,coins:__v12Latency.snapshot().saves.at(-1)?.coins,
    playTimeMs:__v12Latency.snapshot().saves.at(-1)?.playTimeMs};})()`);
  const elapsedMs = await ui.menu(rafDelay(3200));
  const readDisclosure = () => ui.menu(`({order:${rowOrder(bagSection)},focused:document.activeElement===globalThis.__v12Focused,scrollY,
    sameNode:document.querySelector(${JSON.stringify(pageSummary)})===globalThis.__v12OpenSummary,
    cardTop:document.querySelector(${JSON.stringify(pageSummary)}).getBoundingClientRect().top,
    open:document.querySelector(${JSON.stringify(pageSummary)}).parentElement.open,saves:__v12Latency.snapshot().saves.slice(${before.saves})})`);
  const after = await readDisclosure();
  let liveSaveError; try { assertLiveDisclosureState(before, after); } catch (error) { liveSaveError = String(error); }
  check('inventory-open-focus-order-page-survive-live-saves', elapsedMs >= 3000 && !liveSaveError,
    { before, after, elapsedMs, initial, error: liveSaveError });
  // Bounded hunting growth makes later kills slower than the save interval.
  // Preserve the same open card across an actual coin update, without imposing
  // a kill-every-3s requirement or including this wait in click latency samples.
  let coinUpdate = after, coinUpdateError;
  try {
    await until(async () => {
      coinUpdate = await readDisclosure(); assertLiveDisclosureState(before, coinUpdate);
      return coinUpdate.saves.some(save => save.coins !== before.coins);
    }, 'coin-changing save while the same disclosure remains open', 60_000);
    assertLiveDisclosureState(before, coinUpdate, true);
  } catch (error) { coinUpdateError = String(error); }
  check('inventory-open-focus-order-page-survive-coin-update', !coinUpdateError,
    { before, after: coinUpdate, maxAdditionalWaitMs: 60_000, error: coinUpdateError });
  value.screenshots.push(await ui.capture('inventory-live-page-two', 'menu'));
  await ui.click('#tab-shop');
  const shopSummary = '#shop .equipment-details > summary'; await ui.click(shopSummary);
  const shopBefore = await ui.menu(`(()=>{globalThis.__v12Focused=document.activeElement;return {saves:__v12Latency.snapshot().saves.length,order:${rowOrder('#shop .equipment-section:first-of-type')},scrollY};})()`);
  await ui.menu(rafDelay(3200));
  const shopAfter = await ui.menu(`({focused:document.activeElement===globalThis.__v12Focused,open:document.querySelector(${JSON.stringify(shopSummary)}).parentElement.open,
    saves:__v12Latency.snapshot().saves.length,order:${rowOrder('#shop .equipment-section:first-of-type')},scrollY})`);
  check('shop-open-focus-order-survive-live-saves', shopAfter.focused && shopAfter.open && shopAfter.saves > shopBefore.saves &&
    Math.abs(shopAfter.scrollY - shopBefore.scrollY) < 1 &&
    JSON.stringify(shopAfter.order.filter(id => shopBefore.order.includes(id))) === JSON.stringify(shopBefore.order), { before: shopBefore, after: shopAfter });
  value.screenshots.push(await ui.capture('shop-live-disclosure', 'menu'));
  await ui.click('#tab-roster');
  for (let index = 0; index < 100; index++) await ui.measured({ family: 'growth-selection',
    selector: index % 2 ? '#cancel-selection' : growth, kind: 'growth', selected: index % 2 === 0 });
  await ui.click(growth);
  const selected = await ui.menu(`({text:document.querySelector('#result').textContent,saves:__v12Latency.snapshot().saves.length})`);
  await ui.menu(rafDelay(3200));
  const retained = await ui.menu(`({text:document.querySelector('#result').textContent,cancel:!document.querySelector('#cancel-selection').hidden,
    saves:__v12Latency.snapshot().saves.length,food:[...document.querySelectorAll('#roster button')].filter(b=>b.textContent==='이 동료를 재료로'&&!b.disabled).length,
    feedback:document.querySelector('.menu-feedback').getBoundingClientRect().top,roster:document.querySelector('#roster').getBoundingClientRect().top})`);
  check('growth-selection-nearby-and-survives-live-saves', retained.cancel && retained.food > 0 && retained.text === selected.text &&
    retained.saves > selected.saves && retained.feedback < retained.roster, { selected, retained });
  value.screenshots.push(await ui.capture('growth-live-selection', 'menu'));
  const beforeGrowth = (await ui.read()).save;
  await ui.click('#cancel-selection');
  const canceledGrowth = await ui.menu(`({text:document.querySelector('#result').textContent,cancel:document.querySelector('#cancel-selection').hidden})`);
  const afterCancel = (await ui.read()).save;
  check('growth-cancel-preserves-owned-companions', canceledGrowth.cancel && canceledGrowth.text === '' &&
    beforeGrowth.companions.every(row => afterCancel.companions.some(current => current.id === row.id && current.level === row.level)), canceledGrowth);
  await ui.click(growth);
  // The final (weakest) card stays stable when later, stronger bosses arrive.
  // Retain this complete action separately from the four latency families.
  const completion = await ui.measured({ family: 'growth-completion', retain: false, kind: 'action',
    selector: '#roster .card:last-child .row button:first-child', action: { type: 'consume', targetId: fixture.companions[0].id } });
  const grown = (await ui.read()).save;
  let growthError; try { assertGrowthCompletion(beforeGrowth, grown, completion); } catch (error) { growthError = String(error); }
  check('growth-completes-from-trusted-material-click', !growthError, { completion, error: growthError });
  const persisted = await until(() => {
    const disk = JSON.parse(readFileSync(join(runtime.userData, 'save.json'), 'utf8'));
    return disk.companions.find(row => row.id === completion.result.action.targetId)?.level ===
      grown.companions.find(row => row.id === completion.result.action.targetId)?.level &&
      !disk.companions.some(row => row.id === completion.result.action.foodId) ? disk : null;
  }, 'grown companion and consumed material durable');
  assertGrowthCompletion(beforeGrowth, persisted, completion);
  value.growthCompletion = { sample: completion, before: beforeGrowth.companions, after: grown.companions, persisted: persisted.companions };
  check('growth-result-is-durable', true, value.growthCompletion);
  value.screenshots.push(await ui.capture('growth-completed', 'menu'));
  await ui.click('#tab-codex');
  for (const selector of ['.codex-heroes', '.codex-monsters']) {
    await ui.click(selector);
    const summary = '#codex .codex-grid:not([hidden]) .codex-summary'; await ui.click(summary);
    const affordance = await ui.menu(`(()=>{const node=document.querySelector(${JSON.stringify(summary)}),style=getComputedStyle(node,'::after');return {
      open:node.parentElement.open,content:style.content,position:style.position,right:style.right,bottom:style.bottom,
      focus:document.activeElement===node};})()`);
    check('codex-bottom-right-' + selector.slice(1), affordance.open && affordance.focus && affordance.position === 'absolute' &&
      affordance.right !== 'auto' && affordance.bottom !== 'auto' && !['none', 'normal'].includes(affordance.content), affordance);
    await ui.main(`(()=>{p.menu.webContents.sendInputEvent({type:'keyDown',keyCode:'Space'});p.menu.webContents.sendInputEvent({type:'keyUp',keyCode:'Space'});return true;})()`);
    await until(() => ui.menu(`!document.querySelector(${JSON.stringify(summary)}).parentElement.open`), 'keyboard disclosure');
    value.screenshots.push(await ui.capture(selector.slice(1), 'menu'));
  }
  check('fixture-progression-really-updated', (await ui.read()).save.progress.playTimeMs > fixture.progress.playTimeMs);
  value.samples = await ui.samples(); value.pipelineTrace = ui.pipelineTrace; value.passed = value.checks.every(row => row.passed); return value;
}

export async function manualEquipmentCases(runtime, ids) {
  const ui = await menuControls(runtime), { value, check } = report();
  await ui.click('#tab-inventory');
  for (let index = 0; index < 100; index++) {
    const id = index % 2 ? ids.alternate : ids.manual;
    await ui.measured({ family: 'equipment-actions', kind: 'action',
      selector: itemSelector('#inventory', id) + ' .equipment-equip', action: { type: 'equipmentEquip', itemId: id } });
    check('manual-latency-applied-' + index, (await ui.read()).save.equipment.loadout.weapon.id === id);
  }
  const duplicateSelector = itemSelector('#inventory', ids.manual) + ' .equipment-equip';
  const beforeDuplicate = (await ui.read()).save.equipment.revision;
  const duplicatePoint = await ui.menu(`(()=>{const selector=${JSON.stringify(duplicateSelector)},target=document.querySelector(selector);
    if(!target||target.disabled||target.hidden)throw Error('Duplicate target unavailable');target.scrollIntoView({block:'center'});
    const value=globalThis.__v12Duplicate={clicks:[],results:[]};
    const click=event=>{if(target.contains(event.target))value.clicks.push({selector,eventType:event.type,isTrusted:event.isTrusted,at:performance.now()});};
    document.addEventListener('click',click,true);
    const off=window.desmon.onActionResult(result=>{if(result.action?.type==='equipmentEquip'&&result.action?.itemId===${JSON.stringify(ids.manual)})
      value.results.push({at:performance.now(),result});});value.dispose=()=>{document.removeEventListener('click',click,true);off();};
    const r=target.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`);
  await ui.main(`(()=>{p.menu.focus();for(const type of ['mouseDown','mouseUp','mouseDown','mouseUp'])
    p.menu.webContents.sendInputEvent({type,button:'left',clickCount:1,...${JSON.stringify(duplicatePoint)}});return true;})()`);
  await until(() => ui.menu('__v12Duplicate.results.length>0'), 'duplicate burst applied ACK');
  await ui.menu(rafDelay(250));
  const duplicate = await ui.menu(`(()=>{const v=__v12Duplicate;v.dispose();return{clicks:v.clicks,results:v.results,feedback:document.querySelector('#result').getAttribute('data-state')};})()`);
  const afterDuplicate = (await ui.read()).save.equipment.revision;
  let duplicateError; try { assertDuplicateBurst(duplicate, beforeDuplicate, afterDuplicate); } catch (error) { duplicateError = String(error); }
  check('trusted-duplicate-clicks-apply-once-before-ack', !duplicateError,
    { ...duplicate, beforeRevision: beforeDuplicate, afterRevision: afterDuplicate, error: duplicateError, excludedFromLatency: true });
  const selected = (await ui.read()).save;
  check('manual-weaker-selection-with-stronger-owned', selected.equipment.loadout.weapon.id === ids.manual && selected.equipment.bag.some(item => item.id === ids.previous));
  value.screenshots.push(await ui.capture('manual-weaker', 'menu'));
  await ui.menu(rafDelay(3200));
  check('manual-choice-survives-ticks', (await ui.read()).save.equipment.loadout.weapon.id === ids.manual);
  const fullBag = (await ui.read()).save.equipment;
  check('manual-fixture-bag-is-full', fullBag.bag.length === fullBag.capacity);
  const replaced = fullBag.loadout.accessories[1].id;
  await ui.click(itemSelector('#inventory', ids.accessory) + ' .equipment-equip-choice > summary');
  await ui.measured({ family: 'equipment-actions', kind: 'action',
    selector: itemSelector('#inventory', ids.accessory) + ` .equipment-replace[data-replace-id="${replaced}"]`,
    action: { type: 'equipmentEquip', itemId: ids.accessory, replaceId: replaced } });
  const swapped = (await ui.read()).save.equipment;
  check('full-bag-explicit-accessory-replacement', swapped.bag.length === swapped.capacity &&
    swapped.loadout.accessories[1].id === ids.accessory &&
    swapped.bag[fullBag.bag.findIndex(item => item.id === ids.accessory)].id === replaced &&
    swapped.loadout.accessories.every((item, index) => index === 1 || item.id === fullBag.loadout.accessories[index].id), { replaced });
  value.screenshots.push(await ui.capture('full-bag-accessory-swap', 'menu'));
  value.screenshots.push(await ui.capture('hud-full-bag-counters'));
  // Deliberately invalid input uses the real IPC boundary, separately from native
  // click latency. It cannot be produced by a fresh, revision-aware menu button.
  const beforeStale = (await ui.read()).save;
  const stale = { type: 'equipmentEquip', itemId: ids.alternate, revision: fullBag.revision };
  const rejected = await ui.menu(`new Promise((resolve,reject)=>{const timer=setTimeout(()=>{off();reject(Error('Stale IPC result timeout'));},5000);
    const off=window.desmon.onActionResult(result=>{if(result.action?.type==='equipmentEquip'&&result.action?.revision===${stale.revision}){
      clearTimeout(timer);off();resolve(result);}});window.desmon.sendAction(${JSON.stringify(stale)}).catch(reject);})`);
  const afterStale = (await ui.read()).save;
  // Every live frame advances the shop's wall-clock watermark without an action.
  const durableEquipment = equipment => JSON.stringify(equipment, (key, entry) => key === 'lastObservedAt' ? null : entry);
  check('stale-revision-rejected-without-mutation', rejected.ok === false && /stale/i.test(rejected.error) &&
    durableEquipment(beforeStale.equipment) === durableEquipment(afterStale.equipment) && beforeStale.coins === afterStale.coins &&
    afterStale.equipment.shop.lastObservedAt >= beforeStale.equipment.shop.lastObservedAt,
  { transport: 'production IPC invalid-input probe; excluded from latency', rejected });
  await ui.click('#tab-shop');
  for (const [itemId, expected] of [[ids.weakPurchase, ids.manual], [ids.strongPurchase, ids.strongPurchase]]) {
    await ui.measured({ family: 'equipment-actions', kind: 'action', selector: itemSelector('#shop', itemId) + ' .equipment-buy',
      action: { type: 'equipmentBuy', itemId } });
    const saved = (await ui.read()).save;
    check('purchase-equipment-' + itemId, saved.equipment.loadout.weapon.id === expected && saved.equipment.shop.boughtIds.includes(itemId));
    if (itemId === ids.weakPurchase) {
      await ui.measured({ family: 'equipment-actions', kind: 'action', selector: itemSelector('#shop', itemId) + ' .equipment-sell',
        action: { type: 'equipmentSell', itemId } });
      check('unrelated-sale-retains-manual-loadout', (await ui.read()).save.equipment.loadout.weapon.id === ids.manual);
    }
  }
  value.screenshots.push(await ui.capture('stronger-new-purchase', 'menu'));
  // Protect the two manual test weapons in the bag while a disposable equipped
  // weapon demonstrates compatibility reconciliation and temporary-item loss.
  await ui.click('#tab-inventory');
  await ui.measured({ family: 'equipment-actions', kind: 'action', selector: itemSelector('#inventory', ids.manual) + ' .equipment-equip',
    action: { type: 'equipmentEquip', itemId: ids.manual } });
  await ui.measured({ family: 'equipment-actions', kind: 'action', selector: itemSelector('#inventory', ids.disposable) + ' .equipment-equip',
    action: { type: 'equipmentEquip', itemId: ids.disposable } });
  const beforeHero = (await ui.read()).save.equipment;
  const protectedIds = beforeHero.bag.map(item => item.id);
  await ui.click('#tab-codex'); await ui.click('.codex-heroes');
  for (const [formId, ordinal] of [['h02', 2], ['h01', 1]]) {
    const card = `#codex .hero-gallery .codex-card:nth-child(${ordinal})`;
    await ui.click(card + ' > summary');
    await ui.main('p.dialogAnswers.push(1)');
    await ui.click(card + ' .codex-equip');
    const changed = await until(async () => { const saved = (await ui.read()).save; return saved.hero.equipped.formId === formId ? saved : null; }, 'native hero equip ' + formId);
    const allIds = [changed.equipment.loadout.weapon, ...changed.equipment.loadout.accessories, ...changed.equipment.bag, ...changed.equipment.temporary]
      .filter(Boolean).map(item => item.id);
    check('hero-change-' + formId + '-preserves-stored-items', protectedIds.every(id => allIds.includes(id)) &&
      (formId === 'h02' ? changed.equipment.loadout.weapon === null && changed.equipment.temporary.some(item => item.id === ids.disposable)
        : changed.equipment.loadout.weapon?.id === ids.previous && !allIds.includes(ids.disposable)),
    { temporary: changed.equipment.temporary.map(item => item.id), allIds });
  }
  value.screenshots.push(await ui.capture('hero-change-compatibility', 'menu'));
  // End with a deliberately weaker manual choice, proving restart does not optimize the bag.
  await ui.click('#tab-inventory');
  await ui.measured({ family: 'equipment-actions', kind: 'action', selector: itemSelector('#inventory', ids.manual) + ' .equipment-equip',
    action: { type: 'equipmentEquip', itemId: ids.manual } });
  const expected = (await ui.read()).save;
  await until(() => {
    const disk = JSON.parse(readFileSync(join(runtime.userData, 'save.json'), 'utf8'));
    return disk.equipment?.loadout.weapon?.id === ids.manual && disk.equipment.shop.boughtIds.includes(ids.strongPurchase);
  }, 'manual loadout durable');
  value.expectedOnRestart = expected; value.samples = await ui.samples(); value.pipelineTrace = ui.pipelineTrace; value.passed = true; return value;
}

export async function equipmentRestartCase(runtime, expected) {
  const ui = await controls(runtime), { value, check } = report();
  const save = (await ui.read()).save;
  for (const key of ['bag', 'loadout', 'temporary']) check('restart-' + key, JSON.stringify(save.equipment[key]) === JSON.stringify(expected.equipment[key]));
  check('restart-wallet-and-purchases', save.coins === expected.coins && JSON.stringify(save.equipment.shop.boughtIds) === JSON.stringify(expected.equipment.shop.boughtIds));
  await ui.openMenu(); await ui.click('#tab-inventory'); value.screenshots.push(await ui.capture('restarted-manual-loadout', 'menu'));
  value.passed = true; return value;
}

export function assertFieldPartyAgreement(view, cards) {
  assert(view.frame && !view.frame.replay && view.frame.curveVersion === view.version && view.frame.curveRebirths === view.curveRebirths && view.frame.monsterIndex === view.monsterIndex,
    'Rendered party has stale encounter/replay context');
  assert.deepEqual(view.frame.ids, view.fieldIds, 'Rendered hunting membership differs from actual field power');
  assert.equal(cards.length, view.labels.length, 'Roster labels omit or duplicate a companion');
  for (const expected of view.labels) {
    const card = cards.find(row => row.id === expected.id);
    assert(card && card.raw === expected.raw && card.hunting === expected.hunting, 'Owned/hunting label differs for ' + expected.id);
    assert.equal(card.pvp, view.pvpIds.includes(expected.id), 'PvP membership label differs for ' + expected.id);
  }
}

export function assertGrowthPowerPreview(preview, before, after) {
  assert(before && after && before.id === after.id, 'Growth preview target changed');
  assert.equal(preview.text, `사냥 ${before.hunting.slice('사냥 공격력 '.length)} → ${after.hunting.slice('사냥 공격력 '.length)} · PvP ${before.raw.slice(4)} → ${after.raw.slice(4)}`,
    'Growth preview differs from the applied hunting/PvP labels');
  assert.equal(preview.title, `사냥 ${before.huntingValue} → ${after.huntingValue} · PvP ${before.rawValue} → ${after.rawValue}`,
    'Growth preview exact integers differ from applied powers');
}

/** Public conditional breakpoint reads the actual drawParty arguments without pausing. */
async function observeFieldParty(ui) {
  await ui.field(`(()=>{globalThis.__v12PartyFrames={rows:[],overflow:false,record(row){if(this.rows.length>=10000){this.overflow=true;return;}this.rows.push(row);}};return true;})()`);
  const location = await ui.main(`(async()=>{
    const d=p.field.webContents.debugger,path='dist/web/renderer/game.js',source=p.fs.readFileSync(p.e.app.getAppPath()+'/'+path,'utf8'),lines=source.split(String.fromCharCode(10));
    const matches=lines.map((line,i)=>line.trim()==='drawParty(ctx, myParty, partyFrame, GROUND_Y);'?i:-1).filter(i=>i>=0);
    if(matches.length!==1)throw Error('Expected one field drawParty call');
    const state=p.v12PartyObserver={pauseCount:0,breakpointId:null};
    state.listener=(_event,method)=>{if(method==='Debugger.paused')state.pauseCount++;};
    d.attach('1.3');d.on('message',state.listener);
    state.cleanup=async()=>{if(state.closed)return;state.closed=true;try{if(d.isAttached()&&state.breakpointId)await d.sendCommand('Debugger.removeBreakpoint',{breakpointId:state.breakpointId});}
      finally{d.removeListener('message',state.listener);if(d.isAttached())d.detach();}};
    try{
      await d.sendCommand('Debugger.enable');
      const result=await d.sendCommand('Debugger.setBreakpointByUrl',{urlRegex:'/dist/web/renderer/game[.]js$',lineNumber:matches[0],
        condition:'(globalThis.__v12PartyFrames.record({at:performance.now(),ids:myParty.map(c=>c.id),frame:partyFrame,curveVersion:state.monster.curveVersion,curveRebirths:state.monster.curveRebirths??0,monsterIndex:state.monster.index,replay:scene!==null}),false)'});
      state.breakpointId=result.breakpointId;
      if(result.locations.length!==1)throw Error('Field party observer did not resolve once');
      const resolved=result.locations[0],loaded=await d.sendCommand('Debugger.getScriptSource',{scriptId:resolved.scriptId});
      const hash=text=>p.require('node:crypto').createHash('sha256').update(text).digest('hex');
      if(hash(loaded.scriptSource)!==hash(source))throw Error('Field party source mismatch');
      return {sourcePath:path,scriptSha256:hash(source),...resolved};
    }catch(error){await state.cleanup();throw error;}
  })()`);
  return { location, finish: () => ui.main(`(async()=>{const s=p.v12PartyObserver;try{return {location:${JSON.stringify(location)},pauseCount:s.pauseCount,
    ...await p.field.webContents.executeJavaScript('({rows:__v12PartyFrames.rows,overflow:__v12PartyFrames.overflow})')};}finally{await s.cleanup();}})()`) };
}

export async function fieldPartyCases(runtime, ids) {
  const ui = await controls(runtime), { value, check } = report();
  const observer = await observeFieldParty(ui);
  value.snapshots = [];
  try {
    await ui.field(`(${installHudInputObserver.toString()})()`);
    await ui.openMenu(); await ui.menu(`(${installLatencyObserver.toString()})()`); await ui.click('#tab-roster');
    const inspect = async () => ({ view: await ui.field(`(async()=>{const core=await import('../dist/web/core/index.js'),v=__v010Read(),s=v.state;
      const version=s.monster.curveVersion??10,resets=s.monster.curveRebirths??0;
      return {version,curveRebirths:resets,monsterIndex:s.monster.index,totalResets:s.rebirths,acceptedHeroCount:s.hero?.reincarnations??0,save:v.save,frame:__v12PartyFrames.rows.at(-1),
        fieldIds:core.partyOrder(core.activeFieldCompanions(s.companions,s.monster.type,s.hero?.equipped,resets,version)).map(c=>c.id),
        pvpIds:core.pvpParty(s.companions,s.pvpParty,s.hero?.equipped).map(c=>c.id),
        labels:s.companions.map(c=>({id:c.id,raw:'PvP '+core.format(core.companionPower(c)),hunting:'사냥 공격력 '+core.format(core.fieldCompanionPower(c,resets,version)),
          rawValue:String(core.companionPower(c)),huntingValue:String(core.fieldCompanionPower(c,resets,version))}))};})()`),
      cards: await ui.menu(`Array.from(document.querySelectorAll('#roster [data-companion-id]'),node=>({id:node.dataset.companionId,
        raw:node.querySelector('.power').textContent,hunting:node.querySelector('.hunting-power').textContent,pvp:!!node.querySelector('.pvp-mark')}))`) });
    const snapshot = async (name, version, fifth) => {
      let last;
      const observed = await until(async () => {
        last = await inspect();
        try { assertFieldPartyAgreement(last.view, last.cards); return last.view.version === version ? last : null; }
        catch (error) { if (error.code !== 'ERR_ASSERTION') throw error; return null; }
      }, 'matching rendered field party and menu labels: ' + name);
      check(name + '-draw-and-label-agreement', true, observed);
      check(name + '-encounter-reset-metadata-agrees', observed.view.curveRebirths === 1 && observed.view.save.monsterCurveRebirths === 1 &&
        observed.view.totalResets === 1 && observed.view.acceptedHeroCount === 1, observed.view);
      check(name + '-independent-membership', JSON.stringify(observed.view.fieldIds) === JSON.stringify(['c1','c2','c3','c4',fifth]) &&
        JSON.stringify(observed.view.pvpIds) === JSON.stringify(['c1','c2','c3','c4',ids.target]), observed.view);
      value.snapshots.push({ name, ...observed });
      value.screenshots.push(await ui.capture('field-party-' + name));
      value.screenshots.push(await ui.capture('field-party-' + name + '-labels', 'menu'));
      return observed.view;
    };
    const legacy = await snapshot('legacy', 10, ids.target);
    check('legacy-encounter-not-killed-by-setup', legacy.monsterIndex === 1000 && legacy.save.killCount === 0);
    await ui.field('__v12HudInputs.requests.push({at:performance.now(),kind:"native-sendInputEvent",source:"keyboard",keyCode:"A"})');
    await ui.input();
    await until(async () => (await ui.read()).state.monster.curveVersion === 11, 'one native hit spawns v11 encounter');
    const hunting = await snapshot('new-curve', 11, ids.trained);
    check('one-native-hit-switches-encounter-without-rewriting-roster', hunting.monsterIndex === 1001 && hunting.save.killCount === 1 &&
      JSON.stringify(hunting.save.companions) === JSON.stringify(legacy.save.companions));
    const selector = '#roster [data-companion-id="' + ids.target + '"] .row button:first-child';
    await ui.click(selector);
    check('growth-selection-open', await ui.menu('!document.querySelector("#cancel-selection").hidden'));
    const action = { type: 'consume', targetId: ids.target, foodId: ids.food };
    const material = '#roster [data-companion-id="' + ids.food + '"] .row button:first-child';
    const previewSelector = '#roster [data-companion-id="' + ids.food + '"] .growth-power';
    value.growthPreview = await ui.menu(`(()=>{const node=document.querySelector(${JSON.stringify(previewSelector)});
      return node?{text:node.textContent,title:node.getAttribute('title')}:null;})()`);
    await ui.menu(`__v12Latency.arm(${JSON.stringify({ family:'field-party',selector:material,kind:'action',retain:false,action })})`);
    await ui.click(material); value.growthResult = await ui.menu('__v12Latency.take()');
    const grown = await snapshot('grown', 11, ids.target);
    assertGrowthCompletion(hunting.save, grown.save, value.growthResult);
    assert(value.growthPreview, 'Growth material has no hunting/PvP preview');
    assertGrowthPowerPreview(value.growthPreview, hunting.labels.find(c=>c.id===ids.target), grown.labels.find(c=>c.id===ids.target));
    check('growth-preview-matches-applied-hunting-and-pvp', true, value.growthPreview);
    check('growth-native-ack-updates-hunting-power-and-party', grown.save.companions.find(c=>c.id===ids.target)?.level === 3 &&
      !grown.save.companions.some(c=>c.id===ids.food), value.growthResult);
    const disk = await until(async () => {
      const save = await ui.main(`JSON.parse(p.fs.readFileSync(${JSON.stringify(join(runtime.userData,'save.json'))},'utf8'))`);
      return save.companions.find(c=>c.id===ids.target)?.level === 3 && !save.companions.some(c=>c.id===ids.food) ? save : null;
    }, 'field growth persisted');
    check('field-growth-disk-and-live-agree', JSON.stringify(disk.companions) === JSON.stringify(grown.save.companions));
    value.inputTrace = await ui.field('__v12HudInputs');
    check('exactly-one-native-field-keydown', value.inputTrace.requests.length === 1 && value.inputTrace.ipc.length === 0 &&
      value.inputTrace.events.filter(event=>event.type==='keydown').length === 1 &&
      value.inputTrace.events.filter(event=>event.type==='keyup').length === 1 &&
      value.inputTrace.events.every(event=>event.isTrusted && event.code==='KeyA' && !event.repeat), value.inputTrace);
  } catch (error) { error.ui = value; throw error; }
  finally { value.partyTrace = await observer.finish(); }
  check('actual-draw-observer-never-paused-or-overflowed', value.partyTrace.pauseCount === 0 && !value.partyTrace.overflow && value.partyTrace.rows.length > 0,
    { location: value.partyTrace.location, rows: value.partyTrace.rows.length });
  value.passed = true; return value;
}

export async function hudCases(runtime, feverInputs) {
  const ui = await controls(runtime), { value, check } = report();
  await ui.field(`(${installHudInputObserver.toString()})()`);
  const input = async () => {
    await ui.field(`__v12HudInputs.requests.push({at:performance.now(),type:'native-sendInputEvent',code:'KeyA'})`);
    await ui.input();
  };
  // Capture a read-only closure; unlike wall time, these are the animation's
  // actual ages after startup stalls and the renderer's 100ms dt clamp.
  value.effectsObserver = await ui.main(`(async()=>{const d=p.field.webContents.debugger;
    const sourcePath='dist/web/renderer/game.js',source=p.fs.readFileSync(p.e.app.getAppPath()+'/'+sourcePath,'utf8'),lines=source.split(String.fromCharCode(10));
    const matches=lines.flatMap((line,index)=>line.trim()==='tickFloats(floats, dt);'?[index]:[]);if(matches.length!==1)throw Error('HUD age anchor must be unique');
    let breakpointId,pauseCount=0;const onMessage=(_event,method)=>{if(method==='Debugger.paused'){pauseCount++;void d.sendCommand('Debugger.resume');}};
    d.attach('1.3');d.on('message',onMessage);
    try{await d.sendCommand('Debugger.enable');const installed=await d.sendCommand('Debugger.setBreakpointByUrl',{
      urlRegex:'/dist/web/renderer/game[.]js$',lineNumber:matches[0],
      condition:'(globalThis.__v12HudEffects=()=>({presentationMs:timeMs,levelUp:{...banner},floats:floats.map(f=>({...f}))}),false)'});
      breakpointId=installed.breakpointId;if(installed.locations.length!==1||installed.locations[0].lineNumber!==matches[0])throw Error('HUD age probe not resolved');
      const loaded=await d.sendCommand('Debugger.getScriptSource',{scriptId:installed.locations[0].scriptId});if(loaded.scriptSource!==source)throw Error('HUD age source differs');
      await p.field.webContents.executeJavaScript('new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error("HUD age observer timeout")),5000);const frame=()=>globalThis.__v12HudEffects?(clearTimeout(timer),resolve(true)):requestAnimationFrame(frame);requestAnimationFrame(frame);})');
      if(pauseCount)throw Error('HUD age observer paused');
      return{basis:'cdp-conditional-false',pauseCount,sourcePath,location:installed.locations[0],scriptSha256:p.require('node:crypto').createHash('sha256').update(source).digest('hex')};
    }finally{if(breakpointId)await d.sendCommand('Debugger.removeBreakpoint',{breakpointId});d.removeListener('message',onMessage);d.detach();}})()`);
  const geometry = await ui.field(`(async()=>{const g=await import('../dist/web/renderer/game.js'),h=await import('../dist/web/renderer/hud.js'),
    s=await import('../dist/web/renderer/sprites/index.js');globalThis.__v12HudBarY=g.monsterHpBarY;
    const lvY=g.heroHudTop('h00')-2-h.XP_BAR_H-s.FONT_H-2,readyY=lvY-s.FONT_H-2,levelY=readyY-s.FONT_H-2;
    const label=(text,y,scale=1)=>(${hudLabelGeometry.toString()})(s,text,y,scale);
    return {ready:label('REBIRTH READY',readyY),level:label('LEVEL UP!',levelY),
      fever:label('FEVER!',levelY-s.FONT_H*2-3,2),feverAfter:label('FEVER!',readyY-s.FONT_H*2-3,2)};})()`);
  await ui.field(`(()=>{let previous=__v010Read(),previousMs=__v12HudEffects().presentationMs;const o=globalThis.__v12Hud={initial:previous.save.level,levelAt:null,feverAt:null,damageAt:null,frames:[]};
    const frame=()=>{const s=__v010Read(),now=performance.now();if(o.levelAt===null&&s.save.level>o.initial)o.levelAt=now;
      if(o.feverAt===null&&s.state.fever.active)o.feverAt=now;
      if(s.save.monsterIndex===previous.save.monsterIndex&&BigInt(s.save.monsterHp)<BigInt(previous.save.monsterHp))o.damageAt=now;
      const effects=__v12HudEffects();o.frames.push({at:now,level:s.save.level,fever:s.state.fever.active,monsterIndex:s.save.monsterIndex,hp:s.save.monsterHp,
        dt:effects.presentationMs-previousMs,effects});previousMs=effects.presentationMs;
      if(o.frames.length>600)o.frames.shift();previous=s;requestAnimationFrame(frame);};requestAnimationFrame(frame);return true;})()`);
  const timing = () => ui.field(`(()=>{const now=performance.now(),o=__v12Hud,effects=__v12HudEffects();return {now,levelAge:o.levelAt===null?null:now-o.levelAt,
    feverAge:o.feverAt===null?null:now-o.feverAt,wallDamageAge:o.damageAt===null?null:now-o.damageAt,
    damageAge:effects.floats.find(float=>float.active)?.ageMs??null,effects,
    damageBottom:__v12HudBarY(__v010Read().state.monster),state:__v010Read().state};})()`);
  const at = (anchor, age) => ui.field(`new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('HUD frame timeout')),5000);
    const frame=()=>(${anchor === 'damageAt' ? '__v12HudEffects().floats.find(float=>float.active)?.ageMs' : `performance.now()-__v12Hud.${anchor}`})>=${age}
      ?(clearTimeout(timeout),resolve(true)):requestAnimationFrame(frame);requestAnimationFrame(frame);})`);
  const shot = async name => {
    const before = await timing(), captured = await ui.capture(name), after = await timing();
    const levelActive = after.levelAge !== null && after.levelAge < 2400, fever = levelActive ? geometry.fever : geometry.feverAfter;
    const regions = { damage: [110, 0, 200, before.damageBottom], ready: geometry.ready.region, level: geometry.level.region, fever: fever.region };
    // Decode the captured PNG, not the potentially newer live canvas. This is a
    // detached analysis canvas and cannot change the production scene.
    const encoded = readFileSync(captured.path).toString('base64');
    const raster = await ui.field(`(async()=>{const picture=new Image();picture.src='data:image/png;base64,${encoded}';await picture.decode();
      const canvas=document.createElement('canvas');canvas.width=picture.width;canvas.height=picture.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(picture,0,0);
      return (${inspectHudPixels.toString()})(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,${JSON.stringify(regions)});})()`);
    value.screenshots.push({ ...captured, timing: { before, after }, raster });
    const verifyLabel = (key, color, definition) => {
      let error; try { assertHudLabel(raster[key], color, definition.inkPixels, definition.top); } catch (failure) { error = String(failure); }
      check(name + '-visible-' + key + '-' + color, !error, { raster: raster[key], expected: definition, error });
    };
    verifyLabel('ready', Math.floor(after.effects.presentationMs / 800) % 2 ? 'steel' : 'yellow', geometry.ready);
    if (levelActive) verifyLabel('level', Math.floor(after.levelAge / 600) % 2 ? 'white' : 'yellow', geometry.level);
    if (after.state.fever.active) verifyLabel('fever', Math.floor((5000 - after.state.fever.remainingMs) / 200) % 2 ? 'white' : 'yellow', fever);
    return { ...after, raster, timing: { before, after } };
  };
  // Inspector installation can leave a clamped 100ms first frame. Let queued
  // frame time settle before spawning any float whose lifetime we will measure.
  await ui.field('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))');
  await input();
  await until(() => ui.field('__v12Hud.damageAt!==null'), 'boss damage');
  const bossStart = await shot('hud-boss-damage-start');
  check('boss-damage-start', bossStart.state.monster.boss && bossStart.damageAge < 200, bossStart);
  await at('damageAt', 500);
  const bossEnd = await shot('hud-boss-damage-end');
  check('boss-damage-end-still-visible', bossEnd.state.monster.boss && bossEnd.damageAge >= 500 && bossEnd.damageAge < 600, bossEnd);
  let bossRise, bossRasterError;
  try { bossRise = assertDamageTimeline(bossStart, bossEnd); }
  catch (error) { bossRasterError = String(error); }
  check('boss-native-ink-visible-and-rises', !bossRasterError, { rise: bossRise, error: bossRasterError });
  for (let index = 1; index < feverInputs; index++) await input();
  await until(() => ui.field('Boolean(__v12Hud.levelAt!==null&&__v12Hud.feverAt!==null&& !__v010Read().state.monster.boss)'), 'simultaneous level-up and fever');
  const combinedStart = await shot('hud-combined-start');
  check('combined-start', combinedStart.levelAge < 600 && combinedStart.state.fever.active, combinedStart);
  await at('feverAt', 250);
  const flash = await shot('hud-fever-white-phase');
  check('fever-white-phase', flash.feverAge >= 200 && flash.feverAge < 400, flash);
  await at('levelAt', 650);
  const whiteLevel = await shot('hud-combined-level-white');
  check('combined-level-white-real-clock', whiteLevel.levelAge >= 650 && whiteLevel.levelAge < 1200 && whiteLevel.state.fever.active, whiteLevel);
  check('burst-floats-expired-before-isolated-normal-hit', whiteLevel.raster.damage.inkPixels === 0, whiteLevel.raster.damage);
  // Wait beyond every burst float's 600ms lifetime; both normal screenshots now
  // measure the same single hit, independently of earlier random criticals.
  await at('levelAt', 850);
  const priorDamageAt = await ui.field('__v12Hud.damageAt'); await input();
  await until(() => ui.field(`__v12Hud.damageAt>${priorDamageAt}`), 'normal damage');
  const normalStart = await shot('hud-normal-damage-start');
  check('isolated-normal-damage-start', !normalStart.state.monster.boss && normalStart.damageAge < 200 && normalStart.state.fever.active, normalStart);
  await at('damageAt', 500);
  const normalEnd = await shot('hud-normal-damage-end');
  check('normal-damage-end-still-visible', !normalEnd.state.monster.boss && normalEnd.damageAge >= 500 && normalEnd.damageAge < 600, normalEnd);
  let normalRise, normalRasterError;
  try { normalRise = assertDamageTimeline(normalStart, normalEnd); }
  catch (error) { normalRasterError = String(error); }
  check('normal-native-ink-visible-and-rises', !normalRasterError, { rise: normalRise, error: normalRasterError });
  for (const [name, age, ceiling] of [['middle', 1500, 1800], ['end', 2250, 2400], ['expired', 2450, 3000]]) {
    await at('levelAt', age);
    const observed = await shot('hud-combined-' + name);
    check('combined-' + name + '-real-clock', observed.levelAge >= age && observed.levelAge < ceiling && observed.state.fever.active, observed);
  }
  value.observedFrames = await ui.field('__v12Hud.frames');
  value.inputTrace = await ui.field('__v12HudInputs');
  const accepted = value.inputTrace.events.filter(event => event.type === 'keydown' && !event.repeat || event.type === 'mousedown' && !event.dragStrip);
  check('hud-native-inputs-match-intended-requests', accepted.length === value.inputTrace.requests.length &&
    accepted.every(event => event.type === 'keydown' && event.code === 'KeyA' && event.isTrusted) && value.inputTrace.ipc.length === 0,
    { accepted: accepted.length, requests: value.inputTrace.requests.length, inputTrace: value.inputTrace });
  value.passed = true; return value;
}
