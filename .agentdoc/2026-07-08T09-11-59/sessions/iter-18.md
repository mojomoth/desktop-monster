# Session record — iter 18

- agent role: builder
- harness version: v1
- task: T18 — WebAudio blips
- result: DONE
- commit: 77e0997

## What I did

- Adopted T18 (first `[ ]` with dep T15 `[x]`; no `[~]` existed), flipped to
  `[~]`. SPEC F24 + Assumption 13 + Manual M7; GAME_ARCHITECTURE §4 audio
  note (square-wave OscillatorNode blips, synthesized, lazy on first input).
- `src/renderer/audio.ts` (new, DOM-free by injection — the persistence.ts
  pattern): minimal structural WebAudio interfaces (`AudioContextLike`,
  `OscillatorNodeLike`, `GainNodeLike`, `AudioParamLike`) so tests run under
  node; `createGameAudio({createContext?})` returns the three blips of
  Assumption 13 — `attackTick` (1×880Hz, 50ms), `killArpeggio` (C5→E5→G5),
  `levelUpFanfare` (C5→E5→G5→C6, held top note). Each note: square wave,
  `frequency.setValueAtTime`, percussive gain envelope (`setValueAtTime(peak)`
  → `exponentialRampToValueAtTime(GAIN_FLOOR)`), osc→gain→destination,
  start/stop bracketing the note.
- Lazy + guarded per the task notes: the context is created on the FIRST
  blip only (game.ts calls these from attack(), i.e. on user input —
  autoplay-policy friendly) and resumed if `'suspended'`; a factory that
  returns undefined or throws is LATCHED off (silence forever, never retried
  per keypress); per-blip try/catch swallows scheduling failures. The
  default factory is `typeof AudioContext === 'undefined' ? undefined :
  new AudioContext()` — a safe no-op under vitest's node env.
- `src/renderer/game.ts`: `createGame(initialEngine, audio =
  createGameAudio())`; three one-line triggers in the existing attack()
  event switch: `attack` → `audio.attackTick()`, `monsterKilled` →
  `audio.killArpeggio()`, `levelUp` → `audio.levelUpFanfare()`. No draw or
  update changes; every existing `createGame(engine)` call site keeps
  working via the silent default.
- Tests (`tests/audio.test.ts`, +13, 277 total): recording FakeContext pins
  lazy-create/reuse (factory 0 calls at construction, 1 after any number of
  blips), the exact attack-tick schedule at a nonzero currentTime (square
  type, freq/envelope events, node chain, start/stop), ascending staggered
  3-note arpeggio + 4-note fanfare against the exported note tables,
  suspended→resume-on-input, undefined-factory latch, throwing-factory
  latch, broken-context (throwing resume/createOscillator) never
  propagating, node default no-op; plus game.ts trigger counts with a
  counting GameAudio fake on seeded engines (non-kill tick-only, kill
  tick+arpeggio, level-up kill all three, 5-spam = 5 ticks).
- Gates → exit 0 (277 tests, 17 files; lint 0 warnings; 3 tsc projects).
  T18 AC line (createOscillator grep + no-audio-file find + headful smoke)
  → exit 0, SMOKE_OK — note smoke now exercises the REAL AudioContext path
  (3 synthetic attacks → blips in the live renderer) with the guards live.
- Committed feat(T18) as 77e0997; then plan update (T18 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- src/renderer/audio.ts (new)
- src/renderer/game.ts
- tests/audio.test.ts (new)
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-18.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  17 passed (17) / Tests  277 passed (277)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ grep -q createOscillator src/renderer/audio.ts \
  && test -z "$(find src static -type f \( -iname '*.wav' -o -iname '*.mp3' -o -iname '*.ogg' \))" \
  && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log
AC_EXIT=0   (smoke log tail: SMOKE_OK)
```

## Attempts & dead ends (what future iterations must NOT retry)

- No failed approaches — gates, AC and headful smoke passed on the first
  full run. Design notes so later tasks do not undo T18 choices:
  - The `*Like` WebAudio interfaces use METHOD syntax (`connect(d: unknown):
    unknown;`) deliberately: methods are checked bivariantly, so the real
    DOM `AudioContext` stays assignable to `AudioContextLike` despite its
    overloaded `connect`. Rewriting them as function-typed PROPERTIES would
    break `new AudioContext()` under strictFunctionTypes.
  - `typeof AudioContext` compiles in ALL THREE tsc projects because
    tsconfig.base sets no `lib` (TS defaults include DOM) — do not "fix"
    audio.ts by adding lib overrides anywhere.
  - The failed-factory latch (`unavailable`) is intentional: no retry per
    keypress. If a future task wants retry-on-next-input, change the latch,
    not the guards.
  - Note tables (ATTACK_TICK_NOTES / KILL_ARPEGGIO_NOTES /
    LEVEL_UP_FANFARE_NOTES) and GAIN_FLOOR are exported and pinned by
    tests/audio.test.ts (count, ascending freqs, staggered starts, envelope
    shape) — tuning the timbre means updating those pins in the same change.
  - createGame's audio param DEFAULTS to the real `createGameAudio()`;
    smoke therefore covers the live AudioContext path. Do not add a smoke
    carve-out for audio — the guards are the safety, and losing that
    coverage would hide autoplay/context regressions.
