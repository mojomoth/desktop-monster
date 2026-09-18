# DesMon 0.11 execution contract

User-approved full implementation, local commits and annotated v0.10.0 baseline tag; DESMON_SKIP_NET=1. Preserve v10 artifacts and .harness/CURRENT=v3. No remote push/deploy.

## Behavior
- Top-left kills/coins and matching coin flight destination; BAG FULL below. Monster-centered head/HP/crown damage anchor, field-only rise28/42 pixels clipped inside field.
- Head LEVEL UP above REBIRTH READY, dark1px glyph outline, yellow/white600ms phase,2400ms duration. FEVER head only yellow/white200ms phase; stacked labels cannot overlap. PvP result banner unchanged.
- Bottom-right hero/monster codex chevrons with keyboard disclosure. Growth selection survives saves, nearby instructions and cancellation. Equipment/shop disclosure, focus, pagination survive updates. Eight tabs one row at560px content width. Soul recovery in hero, export in profile.
- Manual equipmentEquip {itemId,replaceId?,revision}; persistent loadout, no modes. New stronger acquisition upgrades only current+new candidates; equal raw attack retains. Enhanced/newly eligible items considered alone; unrelated actions preserve; equipped sale/destruction fills vacancy; hero changes reconcile compatibility. Swap displaced item into incoming storage location.
- Curve-only rebirth pacing, no time gate or power-reactive scaling; fixed PvE level/HP/rebirth-count curves. Preserve companion/PvP stats, assets and pending offers. Current monster uses saved curve version; subsequent spawn adopts v11.

## Registered targets
Ordinary2/s and intermittent first15s/min at2/s: first3 intervals p50 180–300min, p10>=120min, p90<=360min; cycles4–10 p50 180–300min. High8/s first3 p10>=120min. Legacy-rich/idle/soul-farming are separately reported adversarial profiles. Exploration20 seeds; heldout100 each ordinary/intermittent, registered20 each continued through10. Missing arrivals remain in denominators. Candidate selection minimizes max deviation from240min then p90 then changed-parameter count then ID. No lowering gates to pass.

## Verification
Exact gates: `npm test && npm run lint && npm run typecheck`. Per-task AC, real native Electron click and restart coverage, at least100 samples/action family with p95 visual<=100ms and local applied IPC<=250ms, final smoke/macOS/Windows packages, independent reviews. Frozen0.10/0.11 active/idle30min each using existing CPU/RAM budgets. Simulations, native elapsed observation, and human fun checks are separate.
