# Original-scope follow-up and core edge audit

No production source, protocol, registration or heldout work changed. This is
bounded analytic/read-only investigation, not a passing candidate experiment.

## Minimum required level16

Unchanged XP reaches level16 exactly after boss63 dies. The ordinary policy accepts
a ready hero offer at its next5second decision. Thus level16 removes the opportunity
to spend hours with the guaranteed63 companion before the first reincarnation:
its useful deterministic anchor only appears at the interval's end. Delaying the
acceptance to make that interval longer would change the approved policy.

Before63 there are only ordinary35% capture trials at7,15,…55. Even capturing every
one gives at most1611 raw level1/zero-star DPS in the strongest five, before type,
equipment and fever. Near the frontier the level15 hero has184 base damage per hit
(202.4 after baseline crit expectation). The high profile also sustains fever while
ordinary/intermittent do not. This is evidence that min16 does not naturally solve
the first-cycle input-rate constraint. It is not a universal bound after every
possible equipment/type configuration, nor a substitute for engine measurements.

## Min17 and a bounded higher-level extension

Min17 can spend time at64–70 after the nearly deterministic63 capture, but also
crosses boss71 before readiness at75. The early quota is permanent. First-reset
raw retained-party p90/p10 is3.08x at75 rather than1.43x immediately after63.
A single early plateau on the next reset inherits that spread; scalar HP scaling
cannot remove it. This is the counterevidence documented in the first plateau memo.

A small algebra-only extension considered min18 and fixed HP groups after bosses
63,71,79 and87. There were934 exact joint capture outcomes and286 weight mixtures
at0.1 spacing. Intervening stages were treated as instantaneous, with unchanged
hero damage at the corresponding levels, baseline crit expectation, neutral types
and the existing high-input fever duty. There were no engine runs or random seeds.
No mixture met every existing first-cycle limit. The nearest weights were
0.5/0.4/0.1/0.0 and, at the allowed upper scale, produced:

| Profile | p10 / p50 / p90 minutes |
|---|---|
|Ordinary|227.2 /276.7 /332.2|
|Intermittent|241.9 /300.0 /357.0|
|High|110.3 /127.8 /156.0|

Reaching high p10=120 would require8.83% more HP, breaking another bound in this
model. These finite grids do not reject continuous weights, richer fixed shapes,
actual elemental party effects, or every higher level. They do identify why this
remaining family is not already a credible production solution.

## Repeated captures and full1–10 prospects

Repeated passes through a bounded frontier can eventually narrow retained-party
variation. With an unchanged35% roll, missing a particular last boss over six
independent cycles has probability0.65^6≈7.54%; after only three it is27.46%.
Other captures, the quota and the five-member selection affect the actual party,
so those are local probabilities, not session failure rates. This may help later
cycles, but does not fix the strict first1–3 requirements by itself. The30-slot
roster cap also eventually stops new ownership in the approved no-management
ordinary policy, so improvement cannot be assumed to continue indefinitely.

A fixed reset-tier HP shape can move later-cycle work to low-level encounters,
where retained companions dominate the weaker low-level hero. That prevents a
universal impossibility claim based on late-level hero/soul scaling. However,
concentrating time in few encounters adds type/capture sensitivity and long gaps
between rewards. Those are descriptive design concerns, not extra numeric gates.

Assessment: there is no clearly supported next candidate family with credible
full1–10 prospects from the evidence currently available. A bounded preregistered
first3 diagnostic of richer plateaus remains permissible, but should be presented
as another uncertain experiment, not an anticipated solution or justification to
change an approved gate. No original-scope impossibility theorem is claimed.

## Core/equipment/migration audit

Reviewed manual UID swaps, full accessory replacement, temporary revisions,
event-local automatic upgrades, refill-only reconciliation, level eligibility,
error/reset behavior, additive curve metadata and current-encounter restoration.
No new concrete v11 regression was identified. Existing focused coverage was not
repeated solely for this audit.

One extreme allocator edge was reproduced in both the preserved0.10.0 ASAR and the
current0.11 pure core using read-only in-memory module loading, without Electron:

```js
const equipment = core.newEquipment();
equipment.nextId = Number.MAX_SAFE_INTEGER;
const save = core.parseSave({ ...core.DEFAULT_SAVE, equipment });
core.createEngine(save);
// RangeError: Equipment allocator or template is invalid
```

The parser accepts the counter; startup fills the empty shop;
`createEquipmentItem` rejects the exhausted allocator. The same failure occurs in
both versions. Baseline ASAR SHA256:
`b6596a49bac90aed7165a1ec833fa51514d892d27af2140e3dd4a8530dc7a3ac`.
This is a pre-existing representation ceiling, not introduced or newly exposed by
the authorized manual-equipment/migration changes. It does not justify changing
frozen v11 production source during native observation. Report separately for a
future boundary-hardening task if desired.
