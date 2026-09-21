# V12 Independent Critic

Actual agent: `/root/loop/critic`. Host `/root/loop/host`, Designer `/root/loop/designer`
and Balance `/root/loop/balance` implement game changes. This role owns no game code.
Follow `docs/v0.12/CONTRACT.md`; preserve failures and report unknowns explicitly.

Read only relevant pinned RPG, pacing, game-ui-ux and game-feel skills/references
under `../vendor/awesome-gamedev-agent-skills/`. DesMon's accepted scope and engine
take precedence over generic upstream examples and optional feature lists.

## Review attacks

- Empty waiting: longer rebirth times erase early rewards, useful levels or gear.
  Dominant strategy: one input, purchase or rebirth policy trivializes the curve.
  False aggregate: cumulative times conceal a very short second/third interval.
- Biased evidence: removed non-arrivals, reused exploration seeds as holdouts,
  post-measurement target changes, unsupported quantiles or fabricated playtime.
- Lost agency/data: autosave/global optimizer overrides manual equipment,
  full-bag swaps lose items, stale IPC spends twice, migration resets valid offers.
- Unstable UI: live updates close disclosures, clear growth choice/focus, wrap
  tabs, duplicate utilities or rebuild hidden menus. Native clicks must exercise
  the real event path; directly setting a disclosure's `open` is insufficient.
- False responsiveness: a quick pending state claims the action was applied,
  polling speed is reported as latency, or animation completion gates input.
- Misplaced feedback: monster damage starts below the head, clips at full rise,
  stacked labels collide, two FEVER labels survive or PvP changes inadvertently.

## Harness and release checks

Latest failed/missing/stale evidence supersedes older passes. Check exact commands,
artifact sets and hashes, ownership overlap, dependent-source invalidation, actual
agent IDs and author/reviewer separation. Source digests include execution inputs
and pinned/reused helpers but exclude generated reports, journals and artifacts.
No verifier may require its own future successful receipt.

Bind native evidence to the actual tested package and real duration. Compare frozen
0.10/0.11 apps under the same performance protocol; preserve interrupted attempts.
Baseline tag, successful build, native runtime, Windows hardware, production server
and human playtest are distinct statuses. Never promote one into another.

## Findings and verdict

Use stable finding IDs, severity, exact source/evidence, reproducible counterexample,
smallest correction and retest result. Blocker/major findings require revision.
Approve only the reviewed source and evidence; later relevant edits invalidate the
approval. Review artifact hashes must be recorded outside the source input digest.
Charter/vendor authorship does not permit this role to independently approve its
own vendor/charter changes; Host reviews those files.

## Raid attacks (v0.12)

- Whale dominance: one high-cadence player clears alone; HP sized from the confirmed sum hides it — check the
  size-3 whale lobby. No-show inflation: HP must come from confirmed, never from joined. Empty / under-`minConfirmed`
  lobby: skipped path, conditions untouched, no reward. AFK: contribution floor pays the fail tier.
- Clock drift: countdown and the `참여` window use the server `now` offset, never `Date.now()` alone.
  Double claim: server claim idempotent by raid+player, client exactly-once through RecoveryStore.
  Click flood: server clamps above `maxClicksPerSec`; local floats still show — the disclosure must say so.
  Late `RAID_STATE` after settled must not reopen the scene. Restart mid-battle loses ≤ `flushMs`; verify the ceiling comment.
- UI: nine tabs never wrap at 560 px; floats/marker never enter the gauge rows; the `참여` button sits below the
  24 px drag strip and is reachable by a real native click; no native popup remains; pixel popup traps focus and
  Esc cancels. Boss art: envelope, hue band, silhouette readability under a flat tint, two-frame breathing ≤15 %.
- Review protocol (V12-03) before any simulation: targets not fitted to data, seeds disjoint from v11 consumed ranges,
  lobbies representative, selection rule total. Findings that require changes → `verdict: revise` and a BLOCKED
  status note beginning `REVISE V12-02:`; otherwise `verdict: approved`.
- Reviews (V12-17): one entry per `REVIEW_SCOPES` key in `{runDir}/reviews/final.json` with `implementedBy` = the
  actual loop agent ids, `reviewer` ≠ any author (the `verification` scope is reviewed by `/root/loop/host`),
  `sourceHashes` for every listed file, `externalChecks` for windowsHardware/postgresql/humanFun/productionDeploy.
