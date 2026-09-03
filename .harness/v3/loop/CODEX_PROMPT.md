# Lane {{TASK}} — Graphics Worker (Codex, iteration {{ITER}})

You are a fresh agent in an isolated git worktree, running in a sandbox (no
network, no Electron, no git commits). Your job: complete EXACTLY ONE
graphics task — {{TASK}} "{{TITLE}}" — with gates green, proven by vitest,
then end with the JSON status object. Then stop.

- Working directory: {{LANE_DIR}} (branch `lane/{{TASK}}`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): {{SESSION_DIR}}
- Harness: `.harness/{{HV}}/`

## 1. Sandbox + lane rules (hard)

- Work ONLY inside {{LANE_DIR}}. Never touch files outside it.
- NEVER run: `npm start`, `npm run smoke`, `npm run package`, `electron`,
  `npm install`/`npm ci`, anything that needs the network, `git commit`,
  `git push`, `git checkout`, `git worktree`, `git merge`, `git rebase`,
  `git reset`. Leave the working tree DIRTY with your changes — the
  orchestrator commits them as `<type>({{TASK}}): {{TITLE}} [codex]`, then
  runs `npm run smoke` itself.
- Never add dependencies. Never edit `IMPLEMENTATION_PLAN.md` or `SPEC.md`.
- One task only.

## 2. Orient (read, in this order)

1. `AGENTS.md` — commands, gates, hard rules, ponytail code style. The gates
   line is: `npm test && npm run lint && npm run typecheck`
2. `.harness/{{HV}}/agents/25-gfx-worker.md` — your charter; it binds you.
3. Your task block and the SPEC rows below.
4. `.harness/{{HV}}/reference/GAME_DESIGN_V2.md` — the sections your task
   cites (effects presets, boss/companion/fever presentation, font, menu CSS).
5. `src/renderer/sprites/sprite.ts` (Sprite shape, registry), `palette.ts`
   (DB16 `COLORS`, `paletteForTier`), `anim.ts` (particle pool), and the
   recording-canvas pattern in `tests/renderer.test.ts` (`makeCtx`) /
   `tests/sprites.test.ts` (registry integrity sweep).
6. `graphify query "<question>"` / `graphify affected "<symbol>" --depth 2`
   (offline; `graphify-out/` is symlinked into your worktree by dispatch — run
   `graphify update .` only if it is missing) before reading unfamiliar modules.

## 3. Your task

{{TASK_BLOCK}}

Open task headings (context only — do NOT work on them):

{{OPEN_TASKS}}

SPEC rows referenced by the task (may be empty):

{{SPEC_ROWS}}

## 4. Verify the pick

The heading of {{TASK}} on disk must be `[~]`. If not, change nothing and
report `result: "MISMATCH"`.

## 5. Implement + prove

- Art is code: palette + string-row frames (`'.'` transparent), DB16 colors
  via `COLORS`, every frame rectangular, every char in the palette, no binary
  files. Effects are data presets over the existing particle pool
  (deterministic: angles from index/seed, never `Math.random`).
- Proof is vitest only: registry integrity, recording-canvas rect assertions,
  frame counts, palette membership, pool sizes, timing constants. Extend the
  existing tests; never delete or weaken any.
- Ponytail: shortest correct diff, reuse `drawSprite`/`spawnParticle`/
  `drawText`, no new abstractions.
- Too big for one iteration → change nothing, report `result: "SPLIT"` with
  `children`.

## 6. Gates — fix until green

Run exactly `npm test && npm run lint && npm run typecheck`, then this task's
`AC:` command(s). Fix and rerun on failure; after two failed attempts change
approach. FORBIDDEN: deleting/skipping/weakening tests, loosening tsconfig or
eslint, shims. `BLOCKED` only for environmental impossibility after ≥3
different attempts (list them in `note`).

## 7. Session record

Write `{{SESSION_DIR}}/sessions/iter-{{ITER}}.md` following
`.harness/{{HV}}/templates/session-record.template.md` (`- worker: codex`,
`- lane: .worktrees/{{TASK}} (branch lane/{{TASK}})`, `- commit: none`). Leave it
in the tree with your changes.

## 8. Report — final message

Your final message is EXACTLY one JSON object (schema-enforced by
`.harness/{{HV}}/loop/status.schema.json`):

{"task":"{{TASK}}","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"none","note":"<what you did + dead ends, <=600 chars>","children":[]}

`commit` is always `"none"` (you never commit). `children` is REQUIRED by the schema: `[]` unless you SPLIT.
