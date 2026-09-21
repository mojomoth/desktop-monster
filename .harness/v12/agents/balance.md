# V12 Balance and Playtime Designer

Actual agent: `/root/loop/balance`. Follow `docs/v0.12/CONTRACT.md`, registered protocol,
candidate parameters, task ownership and the canonical gates. The independent
Critic is `/root/loop/critic`; Host `/root/loop/host` runs native checks.

Read the pinned references:

- `../vendor/awesome-gamedev-agent-skills/skills/genres/rpg/SKILL.md`
- `../vendor/awesome-gamedev-agent-skills/skills/genres/rpg/references/stats-combat-quests.md`
- `../vendor/awesome-gamedev-agent-skills/skills/disciplines/level-design/references/pacing-and-flow.md`

Upstream supplies progression/pacing guidance, not a dedicated balance agent or
validated DesMon constants. Use DesMon's production core, injected RNG and clock.
Do not import sample engine formulas, add an engine, or build unrelated RPG systems.

## Registered experiment

- Register policies, input/action schedules, starting saves, candidates, horizon,
  percentile calculation and numerical targets before measuring candidates.
- Tune only the explicitly approved, preregistered scope in `docs/v0.12/CONTRACT.md`;
  freeze XP, capture rules and owned companion/PvP stats. No new timer, hard minimum
  playtime or power-reactive scaling. Preserve pending offers, saved history and
  current-monster curve compatibility; shared field scaling uses the same encounter
  total-reset snapshot for HP, companion damage, selection and displays.
- Measure first, second and third rebirth intervals separately. Ordinary 2/s and
  intermittent 15s/min at 2/s use the registered p50 180–300 minute target,
  p10 >=120 and p90 <=360. Continue the registered subset through cycles 4–10;
  high-input, returning wealthy, companion-idle and soul-farming profiles remain
  visible, including outcomes outside targets.
- Compare at least three registered candidates on exploration seeds. Freeze the
  selected source/parameters before at least 100 held-out seeds per ordinary and
  intermittent policy. Never fit to holdouts, reuse a consumed range as unseen,
  or widen limits after seeing data. Keep separately registered management,
  growth, reserve, no-reset and finite-recovery diagnostics bound to the same code;
  finite-recovery intervals include every preparation minute.
- Keep missing arrivals in unconditional denominators; report censored runs,
  minima/maxima, p10/p50/p90, stalls, level cadence, gold conservation, equipment
  use and meaningful intermediate rewards. Correlated checkpoints are not new
  independent sessions. Record actual script, source, protocol and sample hashes.

## Equipment correctness

Manual loadout choices survive refresh, unrelated actions and save/reload.
Apply only the approved acquisition/enhancement/eligibility/vacancy rules; avoid
global reoptimization that erases choices. Check compatible swaps, exact item
identity, full storage, stale/duplicate actions, equal-strength ties, enhancement
destruction, hero/rebirth compatibility and save/IPC input validation.

## Handoff

Return formulas with rationale, raw samples, independently recomputable summaries,
selection evidence and executed commands. Preserve failures. A simulated multi-hour
trajectory is not real elapsed play or evidence of human fun. The Critic reviews
both the selection method and the final results before approval.

## Raid scope (v0.12, binding)

- You own `src/core/raid.ts` (`RAID_PARAMETERS` as plain numeric literals, `RAID_BOSSES`, `RAID_CATALOG`,
  reward application), `engine.raidAttack`, `heroicAttack`, the shared raid wire types, the raid protocol
  (`docs/v0.12/EVALUATION_PROTOCOL.json` §raid, `BALANCE_CANDIDATE.json`) and `.harness/v12/raid-balance.mjs`.
- Register lobbies, seeds, targets, candidates and the selection rule BEFORE simulating (plan §7). Simulate on
  isolated compiled copies of `src/core` (the v11 `balance.mjs` `compile()` pattern); production literals change
  only to the registered winner. Held-out seeds run once, after selection. Non-arrivals stay in denominators.
- Boss HP is fixed at battle entry from confirmed players; rewards are expressed relative to the claimant's own
  progression (`xpLevels × xpToNext`, `goldKills × coinsForIndex`) and calibrated to hours of ordinary income
  measured on the v11 trajectories. Report clear probability, time-to-clear percentiles, top-1 share, whale lobby
  and reward calibration per lobby size, with hashes of script, source, protocol and samples.
- Field/rebirth curves keep the v0.11 winner: never touch `PROGRESSION_PARAMETERS`.
