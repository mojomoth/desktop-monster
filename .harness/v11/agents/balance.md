# V11 Balance and Playtime Designer

Actual agent: `/root/balance`. Follow `docs/v0.11/CONTRACT.md`, registered protocol,
candidate parameters, task ownership and the canonical gates. The independent
Critic is `/root/skills_harness`; Host `/root` runs native checks.

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
- Tune required hero level, field HP and fixed rebirth-count difficulty only; freeze XP. No new timer, hard minimum playtime,
  power-reactive scaling or changes to companion/PvP stats. Preserve pending
  offers and current-monster curve compatibility for existing saves.
- Measure first, second and third rebirth intervals separately. Ordinary 2/s and
  intermittent 15s/min at 2/s use the registered p50 180–300 minute target,
  p10 >=120 and p90 <=360. Continue the registered subset through cycles 4–10;
  high-input, returning wealthy, companion-idle and soul-farming profiles remain
  visible, including outcomes outside targets.
- Compare at least three registered candidates on exploration seeds. Freeze the
  selected source/parameters before at least 100 held-out seeds per ordinary and
  intermittent policy. Never fit to holdouts or widen limits after seeing data.
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
