# Lane {{TASK}} — Graphics Worker (Codex, round {{ROUND}})

You are a fresh agent in an isolated git worktree, running in a sandbox (no network, no
Electron, no git commits). Complete EXACTLY ONE graphics task — {{TASK}} "{{TITLE}}" — with the
task's tests green, then end with the JSON status object. Then stop.

- Working directory: {{LANE_DIR}} (branch `lane/{{TASK}}`; `node_modules` is a symlink — never reinstall)
- Harness: `.harness/v12/` — your charter is `.harness/v12/agents/gfx-worker.md` (binding).
- Files you may edit: {{FILES}} (plus nothing else; `tests/sprites.test.ts` may be extended, never weakened).
- Task AC (run it verbatim before you finish): `{{AC}}`
- Gates (also run): `npm test && npm run lint && npm run typecheck`

## Orient (read, in this order)
1. `AGENTS.md` (ponytail code style, hard rules, test integrity).
2. `.harness/v12/agents/gfx-worker.md`, then the pinned art skill
   `.harness/v12/vendor/awesome-gamedev-agent-skills/skills/disciplines/create-game-assets/SKILL.md`
   and its `references/art-direction.md` (approve one visual target, judge at game scale, families stay invariant).
3. `src/renderer/sprites/sprite.ts` (Sprite shape, registerSprites), `palette.ts` (COLORS, hue helpers),
   the recording-canvas pattern in `tests/renderer.test.ts` (`makeCtx`) and the registry sweep in `tests/sprites.test.ts`.
4. Only then the files named in the brief.

## Brief

{{BRIEF}}

## Previous round critique (empty in round 1)

{{CRITIQUE}}

## Rules that end a lane
- Round 1 of an art lane: produce TWO variants (`<name>A`, `<name>B`) so the vision critic can pick.
  Round ≥2: keep only the picked variant under its final name and apply the critique's fixes; delete the loser.
- Never run: `npm start|smoke|package`, `electron`, `npm install`, `git commit|push|checkout|worktree|merge|rebase|reset`.
  Leave the working tree dirty; the orchestrator commits as `art({{TASK}}): {{TITLE}} [codex]`.
- Never add dependencies; never edit `package.json`, `tsconfig*.json`, `eslint.config.mjs`, `vitest.config.ts`, `SPEC.md`, `IMPLEMENTATION_PLAN.md`.
- Proof is vitest only. NEVER delete, skip or weaken a test.
- Session record: write `{{SESSION_DIR}}/sessions/{{TASK}}-r{{ROUND}}.md` (what you did, files, dead ends).

## Final message (schema-enforced by `.harness/v12/codex/status.schema.json`)
{"task":"{{TASK}}","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"none","note":"<≤600 chars>","children":[]}
