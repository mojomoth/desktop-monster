# Session record — iter 21

- agent role: builder
- worker: claude
- lane: .worktrees/T74 (branch lane/T74)
- harness version: v3
- task: T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
- result: DONE
- commit: ae2b2b4 (work commit; this follow-up only records the sha)
- graphify affected used: none (deploy/config task; the single file is AGENTS.md)

## What I did

- Ran the hermetic half of the AC against the recorded `DEPLOYED_SHA=23cf0cf` (T73's deploy):
  ancestor of HEAD ✔, but `git log 23cf0cf..HEAD -- <build-filter paths>` was NOT empty —
  T72's `b057037` (version bump to 0.3.0) touched `package.json` + `package-lock.json`.
  Live `/healthz` confirmed the stale sha `23cf0cf`. So a redeploy was required, exactly as the
  task Notes predicted (the T51 pattern).
- `render services list` showed `desmon-server-v3` (`srv-dacmju6k1f9s73csi2v0`) already exists on
  branch `v3`, so the bootstrap was NOT re-run (it is only for a missing service).
- Gates green first, then the one allowed push: `git push origin HEAD:v3` → `23cf0cf..3aa900a`.
- `render deploys create srv-dacmju6k1f9s73csi2v0 --wait --confirm` →
  `dep-dacn3cvavr4c73fr6pag`, `status: live`, commit `3aa900a5d62f…`.
- Verified live: `/healthz` → `{"ok":true,"sha":"3aa900a5d62f1b0b6d457dd503d31fdcbafb60c2"}`,
  sha is an ancestor of HEAD and `git log <sha>..HEAD -- <filter paths>` is empty; the probe
  `node dist/electron/server/probe.js https://desmon-server-v3.onrender.com` →
  `{"playerId":"2091e9ed-…","rank":5}` (register → upload → leaderboard, no PvP, no reclaim).
- Recorded `DEPLOYED_SHA=3aa900a5d62f1b0b6d457dd503d31fdcbafb60c2` in AGENTS.md §Server — the
  only file changed, and not a build-filter path, so this commit cannot make the sha stale again.
- `DB_EXPIRES=2026-10-03` is in the future (today 2026-09-03); `RENDER_POSTGRES_ID`/`DB_CREATED`
  untouched (same shared `desmon-db`). `.agentdoc/.../meta.json` already carries the unchanged
  `server_url`/`db_expires` from T73 — nothing to update.
- No test written: the task changes one recorded fact, and the AC itself is the runnable check
  (`tests/deploy.test.ts` already derives its expectations from `SERVER_URL` and passed in gates).

## Files touched

- AGENTS.md
- .agentdoc/2026-09-03T13-22-02/sessions/iter-21.md

## Gate results

```
 Test Files  34 passed (34)
      Tests  589 passed (589)

> desmon@0.3.0 lint
> eslint . --max-warnings 0

> desmon@0.3.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
GATES_EXIT=0
```

AC (network half included, `DESMON_SKIP_NET` unset):

```
> desmon@0.3.0 build
> tsc -p tsconfig.main.json && tsc -p tsconfig.renderer.json
{"ok":true,"sha":"3aa900a5d62f1b0b6d457dd503d31fdcbafb60c2"}
{"playerId":"2091e9ed-e631-4238-9067-a68ab6f29ff7","rank":5}
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- Running the AC verbatim from a zsh prompt: `test "$D" '>' "$(date -u …)"` dies with
  `condition expected: >` because zsh's `test` builtin has no string `>`. The AC is a bash/sh
  line — run it with `bash -c` (or from a script file), not from an interactive zsh shell.
  This is a shell artifact only; the condition itself holds.
- Do NOT re-run `render-bootstrap.sh` on a re-verify: the service already exists and the
  bootstrap is only the recovery path for a missing one (and, per T73, Render's
  `services update --branch` cannot repair a wrong branch anyway — delete + re-bootstrap).
