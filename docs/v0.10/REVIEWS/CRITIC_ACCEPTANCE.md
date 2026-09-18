# Independent Critic acceptance contract

Agent: `/root/harness_critic`. This is a test/review plan, not a final approval.
Final judgment follows Designer → Critic → Balance → Host/Playtester and must
name the frozen production, protocol, evaluator and artifact hashes.

## User invariants

- Weapon 1 + accessory 4; distinct owned copies may share a template, one instance cannot occupy multiple slots.
- Automatic equipment maximizes displayed non-critical, non-fever hero attack.
- At least 128 weapons + 96 accessories, four meaningful required-level tiers;
  h00 has unrestricted weapon family compatibility but still obeys current-level requirements.
- Gold stays exact beyond Number.MAX_SAFE_INTEGER. Costs and wallet must not saturate.
- +1 through +5 enhancement is certain. From +6, failure destroys the item,
  success probability decreases while remaining positive, no gameplay enhancement cap;
  successive enhancement prices at least double. Inventory expansion price doubles.
- Epic encounter and drop remain independent rare chances; no pity, focus or guaranteed fallback.
- A simulation frame accumulates all simultaneous overflow into one dynamic temporary batch.
  The next independent overflow batch replaces the entire old batch.
  A hero change with an existing temporary batch requires confirmation bound to its revision.
- No commit, PR, production deployment, personal saves, real OS hooks or real account PvP.

## Required independent counterexamples

1. **Money:** legacy v1–v3 safe integer migration, save v4 string roundtrip,
   huge spending/earning/transfer/debt beyond safe integer, negative/decimal/exponent/leading-zero rejection,
   exact server pair conservation, stale CAS, duplicate receipts and old receipt recovery.
   Discovery lifetime spending and all old shop purchases must use the same exact units.
2. **Optimization:** exhaustive comparison against a brute-force oracle on small bags,
   duplicate templates with independent rolls, duplicate instance rejection, h00 and all class restrictions,
   level loss after reincarnation, stable tie handling, inventory-size scaling without combinatorial search.
3. **Temporary ownership:** four accessories + weapon displaced at once; same-frame boss drops;
   next-frame replacement; popup-time drops/sales; delayed A→B approval after A→B→C;
   repeated change, duplicate confirmation, cancel, unchanged hero, quit and crash at each commit phase.
   Every acquired instance is in exactly one live location or one explicit disposal/sale/destruction event.
4. **Enhancement:** stages 0–5, 6, 10, 100 and extreme encoded stages;
   positive strictly decreasing exact rational probability, unbiased injected random sampling,
   cost ratio ≥2 without rounding/saturation, no allocation of an enormous power merely to show unaffordability,
   no duplicated cost/destruction after retry or recovery. Same attempt must not reroll on reload.
5. **PvP:** hero-only and six-fighter parties; independent hero turns, companion protection order,
   death skipping, finite replay, field/server attack equality, frozen defender preview and first-resolve attacker,
   old/new capability mismatch, immutable attack/defense replay after sale/destruction/restart,
   no current-save lookup that replaces historical equipment or level.
6. **Art/UI:** catalogue images and held sprites cannot differ only by color/rarity border/label;
   all compatible placements pass bounds/anchor/mirror tests, actual PNGs are opened,
   rare/epic effects do not erase silhouettes, inventory DOM stays bounded while capacity grows.

## Balance evidence requirements

The preserved baseline is measured independently under
`.agentdoc/v10-20260917T070144Z/baseline/`. Policies, seed IDs, fixtures, time,
purchase policy and hero-selection cadence must stay explicit. Thirty-minute,
two-hour and eight-hour checkpoints share trajectories and are not independent sessions.
Pilot results are hypotheses only; the 100-seed report owns distribution claims.

Candidate prices and level requirements must be justified against policy-specific
gold distributions and **current-level residence**, not a single average income rate
or lifetime maximum level. Immediate reincarnation, delayed visits and returning idle
have materially different reachable levels and incomes. An item that becomes unusable
after reincarnation needs correct UI and overflow handling, not a hidden level bypass.

Economy tuning must not secretly multiply baseline coin issuance just to make high
prices affordable. Catalogue effects and sale proceeds are named sources; purchases,
expansions, enhancement and replacement losses are named sinks. Report p10/p50/p90,
extrema, unreached counts and policy assumptions, including epic-tail non-attainment.

Tunable numbers are preregistered before measurement. A changed curve, tier, reward
or price creates a new protocol revision and retained prior result. User invariants,
seed counts, evidence completeness and test strictness cannot be relaxed to pass.
Native play, virtual simulation, automated image checks and human enjoyment remain
different claims. No unavailable hardware/Steam/production check becomes a success.
