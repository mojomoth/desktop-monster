# SPEC — Desktop Monster (DesMon)
<!-- RULES: no TBDs. Every feature row must have an AC a shell can decide.
     Ambiguities become numbered Assumptions with rationale. -->

## Summary

<2–4 sentences: what the product is>

## Assumptions

1. <assumption> — <rationale>

## Features

| ID | Name | Behavior | AC (pass = what) |
|---|---|---|---|
| F01 | <name> | <observable behavior> | `<runnable command>` exits 0 / test `<file> :: <name>` passes |

## Input Abstraction (mandatory)

- `InputDriver` interface: emits `{ source: 'keyboard' | 'mouse' }` events.
- `SimulatedInputDriver`: used by ALL tests and by `npm run smoke`.
- Global hook path (uiohook-napi): production only, behind an Accessibility
  permission check, with automatic fallback to window-focused input.

## Non-Goals

- <explicit exclusions>

## Manual Verification Appendix

<the ONLY place for non-automatable checks (real global hooks after the
Accessibility grant, visual quality). Each entry: steps + expected observation.>
