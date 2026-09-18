# Native action pipeline timing — bounded instrumentation proposal

Read-only audit and proposed harness code. No Electron process was launched, no
production/registered source was edited, and the snippets below have not yet been
validated in the pinned Electron39.8.10 runtime. Designer owns implementation.

## Finding

Current samples establish trusted click→initial feedback and click→applied-result
feedback, but do not separately identify IPC ingress or core application. The
menu's `actionResultAt` is an ACK received after renderer action application,
input/update/shop work, save flush, and return IPC. It must not be labeled apply.
`paintAt` may be pending feedback before application. Use `resultAt`, the existing
success-feedback double-rAF marker, for the final apply→feedback interval.
Double-rAF remains a visible-feedback frame proxy, not exact monitor presentation.

Production route:
`preload.sendAction/invoke → main MENU_ACTION → field onAction queue → settleFrame
→ game.apply → engine.apply → update/save flush → reportActionResult/send → main
relay → menu onActionResult → success feedback`.

The installed public Electron declarations explicitly restrict `ipc-message` to
`ipcRenderer.send`; it cannot observe the `invoke` ingress. Installing a
webContents-scoped invoke handler would shadow the production main handler.
Do not use that approach or private invoke-handler maps.

## Public APIs available in the existing harness

`launchRuntime` returns `evaluate`, metadata/report, and close; it does not expose
a raw inspector send method. `runtime.evaluate` runs in main and can access the
existing `__v010Runtime` object: `p.require`, `p.fs`, `p.e`, `p.field`, `p.menu`.
Use the public `node:inspector.Session` from that context for main tracepoints,
and public `p.field.webContents.debugger` for renderer tracepoints. Existing v10
`controls` detaches its one setup debugger before returning. Install new probes
after controls/openMenu and before any measured click. Keep v10 files unchanged.

Use `Debugger.setBreakpointByUrl` with a condition that only records into a bounded
test-owned array and returns false. The public Node inspector declaration states
that a conditional breakpoint stops only when its condition evaluates true.
No per-action pause, stepping, inspector evaluation, disk write or host round-trip
belongs inside the measured path.

Exact source anchors (zero-based resolved line numbers, found from packaged source):

| Role | sourcePath | Unique statement | In-scope action |
|---|---|---|---|
|ipcEntry|dist/electron/main/ipc.js|`let action = narrowAction(payload);`|payload|
|applyStart|dist/web/renderer/game.js|`const events = engine.apply(a);`|a|
|applyEnd|dist/web/renderer/game.js|`handleEvents(events, verdictScene);`|a|

The applyEnd statement is immediately after the actual synchronous core call
returns, before game presentation handling. Read `engine.lastActionError()` there
for the outcome. This is not an ACK or wrapper-completion approximation.

For each breakpoint require exactly one matching source statement, one resolved
location on that exact line, the expected URL suffix, and a source hash matching
the packaged file. Capture `Debugger.scriptParsed` URLs and use
`Debugger.getScriptSource` to bind the actual loaded script bytes. If pinned Node
reports a source wrapper/hash difference, investigate during the pilot; do not
silently adjust lines or normalize unknown source bytes.

## Recorder and conditions

This helper can be serialized into the main/field context; it changes only its
own diagnostic array. Bound the array and fail on overflow. Store primitives,
not live mutable action references. The action key includes the actual revision.

```js
function makeRecorder(perf, limit = 2000) {
  const rows = [];
  return {
    rows, overflow: false,
    record(stage, action, error) {
      const at = perf.now();
      if (rows.length >= limit) { this.overflow = true; return; }
      const key = JSON.stringify([
        action.type, action.itemId ?? null,
        action.replaceId ?? null, action.revision ?? null,
      ]);
      rows.push({ stage, key, timeOrigin: perf.timeOrigin, at,
        ...(stage === 'applyEnd' ? { error } : {}) });
    },
  };
}
```

Main setup runs through `runtime.evaluate`; all session calls are setup/teardown,
not measurement work. Retain session/breakpoint IDs in a diagnostic-only namespace.

```js
const p = globalThis.__v010Runtime;
const { Session } = p.require('node:inspector');
const perf = p.require('node:perf_hooks').performance;
const session = new Session();
session.connect();
const post = (method, params = {}) => new Promise((resolve, reject) =>
  session.post(method, params, (error, result) => error ? reject(error) : resolve(result)));
globalThis.__v11MainTiming = makeRecorder(perf);
// Subscribe to scriptParsed and paused BEFORE enabling. Any pause invalidates batch.
await post('Debugger.enable');
const entry = await post('Debugger.setBreakpointByUrl', {
  urlRegex: '/dist/electron/main/ipc[.]js$', lineNumber: mainLine,
  condition: '(globalThis.__v11MainTiming.record("ipcEntry", payload), false)',
});
// Verify entry.locations and its loaded script bytes, then retain entry.breakpointId.
```

Install the field recorder using `webContents.executeJavaScript`, passing
`performance` to `makeRecorder`. Then install renderer conditions through the
public debugger object. The code below omits the shared source/location checks,
which are required before samples are armed.

```js
const d = p.field.webContents.debugger;
if (d.isAttached()) throw Error('Another field debugger owns this runtime');
d.attach('1.3');
// Subscribe to scriptParsed and paused BEFORE enabling; any pause invalidates batch.
await d.sendCommand('Debugger.enable');
const start = await d.sendCommand('Debugger.setBreakpointByUrl', {
  urlRegex: '/dist/web/renderer/game[.]js$', lineNumber: applyStartLine,
  condition: '(globalThis.__v11FieldTiming.record("applyStart", a), false)',
});
const end = await d.sendCommand('Debugger.setBreakpointByUrl', {
  urlRegex: '/dist/web/renderer/game[.]js$', lineNumber: applyEndLine,
  condition: '(globalThis.__v11FieldTiming.record("applyEnd", a, engine.lastActionError()), false)',
});
```

## Clock calibration, before and after the batch

Do not subtract uncalibrated `performance.now()` values across processes. The menu,
field and main have separate time origins. In main, bracket a renderer-clock read
with main-clock readings. The host inspector trip is outside these brackets.

```js
async function probe(window, phase) {
  const perf = p.require('node:perf_hooks').performance;
  const epoch = () => perf.timeOrigin + perf.now();
  const mainBeforeEpochMs = epoch();
  const remote = await window.webContents.executeJavaScript(
    '({rendererTimeOrigin:performance.timeOrigin,rendererAt:performance.now()})');
  const mainAfterEpochMs = epoch();
  return { phase, mainBeforeEpochMs, ...remote, mainAfterEpochMs };
}
```

For each raw probe, the renderer-minus-main offset lies in:
`[rendererTimeOrigin + rendererAt - mainAfterEpochMs,
  rendererTimeOrigin + rendererAt - mainBeforeEpochMs]`.
Repeat for both menu and field before and after the full sample batch. Retain every
raw probe and reconstruct the intersection: lower=max(all lower bounds),
upper=min(all upper bounds). Empty intersection, changed renderer timeOrigin,
missing before/after probes or samples outside the calibration bracket fail the
measurement. Report uncertainty; do not silently clamp negative stage estimates.
Twenty probes per renderer per phase is a small setup-only starting schedule.

Convert a renderer timestamp E to the main-clock interval
`[E-offsetHighMs, E-offsetLowMs]`. Main timestamps are exact in that reference.
A stage duration interval is `[endLow-startHigh, endHigh-startLow]`. Cross-clock
causal order fails when the entire end interval precedes the entire start interval.
Short overlapping intervals are unresolved within measured uncertainty and must
be reported that way. Same-field applyStart/applyEnd use their own clock directly.

## Locked proposed evidence schema

For action samples only (`tabs`, disclosures and growth selection are local UI):

```js
sample.pipeline = {
  basis: 'cdp-conditional-false',
  key: JSON.stringify([type, itemId ?? null, replaceId ?? null, revision ?? null]),
  events: {
    ipcEntry: [{ key, timeOrigin, at }],
    applyStart: [{ key, timeOrigin, at }],
    applyEnd: [{ key, timeOrigin, at, error: null }],
  },
  locations: {
    ipcEntry: { scriptId, url, lineNumber, columnNumber, scriptSha256, sourcePath },
    applyStart: { scriptId, url, lineNumber, columnNumber, scriptSha256, sourcePath },
    applyEnd: { scriptId, url, lineNumber, columnNumber, scriptSha256, sourcePath },
  },
  calibration: {
    id,
    menu: { rendererTimeOrigin, offsetLowMs, offsetHighMs, probes },
    field: { rendererTimeOrigin, offsetLowMs, offsetHighMs, probes },
  },
  pauseCount: 0,
};
```

Probe fields are exactly
`{phase:'before'|'after',mainBeforeEpochMs,rendererTimeOrigin,rendererAt,mainAfterEpochMs}`.
Locations use zero-based actual resolved line/column. Correlate after observation
using the full production `sample.result.action`, not the partial armed selector.
For this single-flight equipment sequence, require exactly one ingress/start/end
per ACK-derived key and reject missing/duplicate matches. Do not add a test ID to
production action payloads. Retain the complete raw per-context arrays in the
scenario's evidence so extra events cannot disappear during per-sample grouping.

Compute input→main IPC entry, IPC entry→applyStart, core apply duration, and
applyEnd→success feedback using sample.resultAt. Keep existing click→paintAt,
click→actionResultAt(ACK), and click→resultAt separately. Total latency gates remain
measured on the menu's single clock and retain their existing thresholds. Pipeline
segments diagnose the delay; no new game-performance threshold is being invented.

## Teardown and caveats

After samples, run the after calibration, snapshot arrays, remove all three
breakpoints, disable/disconnect the Node inspector session, and detach the field
debugger. Use try/finally and invalidate the batch on any actual debugger pause,
script mismatch, detach, missing marker, overflow or calibration contradiction.
Diagnostic pause recovery may resume solely for cleanup, never to accept a sample.
Allow a few normal frames after installation before arming the first click.

Conditional probes execute JavaScript and may change JIT optimization. They are
not zero-overhead; retain this method caveat and do not subtract guessed overhead.
Run a small pinned-runtime pilot to verify ordering, unique events and no pauses
before the100+ action sample batch. Keep this observer entirely out of the existing
long CPU/RAM observations, which currently own the native app. Do not change app
source, private Electron fields, preload APIs, event payloads, queues or clocks.
