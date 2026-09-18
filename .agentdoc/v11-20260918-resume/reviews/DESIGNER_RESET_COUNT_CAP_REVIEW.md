# Designer: fixed reset-HP count saturation review

Status: design GO for preregistered bounded candidate evaluation, not production adoption or evidence of passing. Read-only analysis; no app, evaluator, protocol, gates, policies or horizon changed. Shared with Host, Critic and Balance on 2026-09-18; Critic/Host review remains responsible for approval and adoption.

## Proposed rule and meaning

Keep the existing exact rational factor `R(t) = 1 + (9/16) * t/(1+t)`, replacing only its argument by `min(totalResets, cap)`. Neutral `fieldRebirthCountCap = null` must preserve the prior formula; candidates are 3, 4 and 5. This count is the existing total reset counter, not accepted hero count. The independent `M(hero.reincarnations)` still multiplies both field HP and companion power; do not cap M or use total resets in M. Keep current single-final-division integer order.

A cap stops the additional reset penalty after a predetermined count. R is still nondecreasing and never drops at the cap boundary. Stage HP (including its resumed tail after399), M, G25, FEVER2/hero3, type bonuses, owned statistics and PvP remain unchanged. This is preferable to further reducing permanent growth or type rewards. It is not a time gate or response to the player's current loadout.

| Cap | Immediate-hero-policy cycles preserved exactly | Saturated R | HP reduction at t=9 (cycle10) | Limiting reduction vs old R as t→∞ |
| --- | --- | --- | --- | --- |
| 3 | 4 | 91/64 | 5.6017% | 9.0% |
| 4 | 5 | 29/20 | 3.7344% | 7.2% |
| 5 | 6 | 47/32 | 2.4896% | 6.0% |

Cycle preservation assumes no extra soul resets; this was verified for all20 ordinary aggressive-growth rows. More generally, equality holds while total resets≤cap. A UI explanation must not say that all HP stops scaling: M and stage HP still grow.

## Observed evidence and limits

R17-A's original23 timing groups pass. Its reserve-growth20 high trajectories pass all10 p10 guards. Those results describe R17-A only; modified candidates require fresh measurement under the unchanged rules.

The20 ordinary aggressive-growth trajectories retain their complete denominator. Zero reached cycle10. Fourteen reached cycle9 before the60h horizon; six were already censored after cycle2 at the18h first-three horizon. The14 continue progressing rather than proving a permanent mechanical deadlock. At60h seed120001 was stage351 and seed120004 stage362, close to the normal368 frontier, while other late trajectories were less advanced. Every final ordinary growth roster contains5 companions. Losing future elemental reserves remains a material strategic limitation.

**Cap≥3 cannot fix the six early censored trajectories:** their first three cycles are unchanged. It can only reduce subsequent reset penalties for those who continued. This change must not be described as making every growth strategy take3–5h, recovering consumed reserves, or making aggressive growth universally beneficial. Existing per-target hunting/PvP previews and warnings about weakening other elemental/PvP parties remain necessary.

The narrowest R17-A reserve margin is cycle8 p10=126.083333min. A deliberately simplified fixed-roster HP-only scaling for cap3 gives `126.083333 × R(3)/R(7) = 120.142234min`, only about8.53s above120min. **This is sensitivity analysis, not a prediction or counterfactual simulation.** Kill timing, capture RNG, equipment availability, phase alignment and policy choices may change. It shows why a small HP reduction is not automatically safe. Caps4/5 disturb less of the late curve, but candidate selection must retain the registered ranking rule rather than adopting a design preference outside it.

Keep all existing timing, growth, reserve, management, soul-farming and no-reset evaluations. Saturating total-reset R also removes further HP penalties from additional soul recovery after the cap; earned souls may still strengthen the hero. The existing soul-farming diagnostic must remain explicit. V10 saved encounter HP/damage stay legacy; normal spawn/reset/reload paths must agree for v11. Pure boundary/identity checks and source-bound measurements belong to Balance/Critic; no new execution was performed by Designer.

## Source and evidence binding

Production progression was still neutral while reviewing; R17-A parameter values come from its registered candidate/report, not from assuming current defaults were adopted. Hashes identify the exact bytes inspected.

- `src/core/formulas.ts` — SHA-256 `903234f439ddee6376ab8e73c7d092ef1899a3297a32d0e163026c5512302836`
- `src/core/progression.ts` — SHA-256 `91507fe9994bdf59e99b202347db6ea6f05fb94250049b9514387055c4cfbebf`
- `.agentdoc/v11-20260918-resume/balance/r17-explore/source-core/formulas.ts` — SHA-256 `903234f439ddee6376ab8e73c7d092ef1899a3297a32d0e163026c5512302836`
- `.agentdoc/v11-20260918-resume/balance/r17-explore/candidates.registered.json` — SHA-256 `35dbaca9b588406cd1dd0a7da15b21f28d0e9fe08d4673bb7394642841035a41`
- `.agentdoc/v11-20260918-resume/balance/r17-explore/R17-A-report.json` — SHA-256 `fb4ef4a4dfb29d3bc44a0fa2d7a0f989280f6155e705104196175a7d401c055e`
- `.agentdoc/v11-20260918-resume/balance/r17-growth-a/R17-A-report.json` — SHA-256 `1acfaea689f4fd74379532a8447be581e57d168c46323efdd718eb9874bdb845`
- `.agentdoc/v11-20260918-resume/balance/r17-growth-a/R17-A-ordinary-10.jsonl` — SHA-256 `350a6246e1f8612f485b061e42ec89333d6090c38d5f787dee749b2b24b6a932`
- `.agentdoc/v11-20260918-resume/balance/r17-reserve-a/R17-A-report.json` — SHA-256 `74670042d4ef650052d9ca2635dca4b9a3c2123fcde10581456d2c5153a6501a`
- `.agentdoc/v11-20260918-resume/balance/r17-reserve-a/R17-A-high-10.jsonl` — SHA-256 `e3bcf8899f571faafdd22437160cc763440b39dc7425df7800080ae1d1c5c27b`
