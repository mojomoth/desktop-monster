# AGENTS.md — Desktop Monster (DesMon)

This file is the heart of the loop: the single source of truth for how to build,
test, run, and package this project, and for what must pass before any work is
declared done. Every agent (human or AI) reads this first.

## What this project is

DesMon is a BongoCat-style desktop companion game: a small transparent
always-on-top pixel-art overlay where every keystroke/mouse click makes a knight
attack a monster (HP bar, kills, item drops, auto-collect, XP, levels).
Electron + TypeScript. It is built autonomously by the Ralph loop defined in
`.harness/` — see `.harness/<version>/HARNESS.md` (version in `.harness/CURRENT`).

## Commands (the contract)

These script names are FROZEN. Changing any of them requires a harness version
bump (see HARNESS.md §Versioning).

| Command | Purpose |
|---|---|
| `npm ci` | install dependencies (lockfile is committed) |
| `npm start` | build then launch the app (Electron) |
| `npm test` | unit tests (Vitest; deterministic — no network, no real timers, no real OS input hooks) |
| `npm run lint` | ESLint, zero warnings allowed (`--max-warnings 0`) |
| `npm run typecheck` | `tsc --noEmit` over all tsconfig projects, strict |
| `npm run smoke` | build, launch Electron with `SMOKE=1`; the app prints `SMOKE_OK` to stdout after the window loads and exits 0 by itself (non-zero exit or 20s watchdog timeout = failure). Must run headful on macOS without user interaction |
| `npm run package` | unsigned macOS build via electron-builder (`CSC_IDENTITY_AUTO_DISCOVERY=false`); output under `release/` |

## Verification gates (the exit condition)

The gates line, verbatim — run it exactly like this:

    npm test && npm run lint && npm run typecheck

Rules:
- No task may be checked off in `IMPLEMENTATION_PLAN.md` unless this line exits 0.
- No commit is "done" while gates are red.
- The loop may not emit the completion sentinel unless this line exits 0 AND the
  plan file has no open tasks.

## Definition of done (loop level)

ALL of the following:
1. Every task in `IMPLEMENTATION_PLAN.md` is `[x]` or `[s]` (no `[ ]`, `[~]`, `[!]`).
2. The gates line exits 0.
3. `npm run smoke` exits 0.
4. `npm run package` produces `release/` containing the DesMon .app and .dmg.
5. Every `AC:` in `SPEC.md`'s feature table passes when executed literally.

## Hard rules

- NEVER delete, skip (`.skip`/`xit`), weaken, or comment out a test to make gates pass.
- NEVER lower tsconfig or ESLint strictness, and never add `|| true`-style shims.
- NEVER mark a task done without executing its `AC:` command in the same
  iteration and seeing it pass.
- One task per iteration. Keep changes scoped to the adopted task.
- Tests must be deterministic: injected RNG (seeded), injected input driver
  (`SimulatedInputDriver`), no reliance on real global hooks or wall-clock time.

## Commit convention

`<type>(T<NN>): imperative subject` — e.g. `feat(T03): knight attack animation state machine`.
Loop auto-commits use `chore(wip): ... [ralph]`.

## macOS environment notes

- Global input capture (uiohook-napi) requires the Accessibility permission,
  which CANNOT be granted programmatically — and uiohook crashes the process if
  started without it. Automated tests and `npm run smoke` MUST use the simulated
  input driver. Real global hooks are verified manually only
  (see SPEC.md §Manual Verification Appendix).
- In dev the TCC grant target is "Electron" (`node_modules/electron/dist/Electron.app`);
  the packaged app needs its own "DesMon" grant.

## Pointers

- `SPEC.md` — what to build; each feature's "pass = what".
- `IMPLEMENTATION_PLAN.md` — what to do next; the loop's memory on disk.
- `.harness/<CURRENT>/HARNESS.md` — how the autonomous loop operates.
- `.harness/<CURRENT>/reference/GAME_ARCHITECTURE.md` — verified tech decisions
  (dependency version matrix, window options, IPC design, sprite system). Treat
  its version pins as normative unless they demonstrably fail.
