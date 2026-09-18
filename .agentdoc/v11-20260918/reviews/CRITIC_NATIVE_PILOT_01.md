# Independent native pilot and baseline review

Reviewer: `/root/skills_harness` (non-author of game/UI/native observer changes). Source: `8e1e8a65ef7d691d8b2e2ef41dcc16ef1480107b5b60f701098b8161014af1bf`. Exact source/artifact hashes and recomputation results are in `CRITIC_NATIVE_PILOT_01.json`.

The menu and manual-equipment implementation and pilot scenarios are accepted for this source. HUD native acceptance needs a corrected end-frame capture. **This is not overall release approval**: balance/heldout evaluation, final candidate performance comparison and release gates remain separate.

## Required correction

**C11-NATIVE-01 — unsupported boss damage visibility assertion.** `.harness/v11/ui-cases.mjs:312` labels its age-only assertion `boss-damage-end-still-visible`. The actual `hud-boss-damage-end.png` is entirely transparent across the damage region (native pixels x244–399, y0–151: zero opaque pixels), although recorded inferred damage age is 512.3–529.4 ms. The starting capture visibly contains the damage number. Passing the timestamp check does not establish a visible near-end frame.

The Designer identified first-frame scheduling as the likely cause: the queued first attack is followed by a clamped update in the same frame, so the float can already be older than the state observer's inferred origin. Warm up scheduling and bind the capture to actual presentation age or an explicitly justified offset; assert visible damage pixels and upward displacement. Preserve this pilot and its failing visual evidence. This is a harness acceptance gap, not yet evidence of a newly introduced game-rendering defect.

## Accepted observations

- All 20 native PNGs were opened for inspection. Counters and BAG FULL are on the left. LEVEL UP sits above REBIRTH READY, with an outline and yellow/white phases; the expiry frame removes it. Only one FEVER label remains above the hero. Normal monster damage visibly rises on the monster side, away from the hero stack; multiple recent hits overlap within that reserved area.
- FEVER white-phase pixels were independently decoded: 848 exact palette-white pixels and zero yellow in its label region. The start/middle captures use yellow. An initial subjective concern about the white screenshot was retracted after inspecting pixel values.
- Eight menu tabs fit on one 560 px row. Equipment/shop details retain their nodes, open state, focus, scroll and page through actual save updates. Growth selection/cancellation appears beside the roster and survives save updates. Both codex arrows occupy the lower-right summary corner.
- Manual equipment source checks and production clicks cover weaker selection, full-bag accessory replacement, stale revision rejection without equipment/wallet mutation, unrelated sale and weak purchase preserving a choice, stronger new acquisition upgrading it, hero compatibility handling, and persistence after process restart. Production ACTION_RESULT correlates the applied action before success feedback; dispatch acknowledgment alone is not used as success.
- The hidden-battle completion change updates only the completed opponent row while its panel is hidden; source review found no new blocking issue in that fix or the version/menu-width changes.

Raw native timestamps, trusted click flags, selectors and production equipment results were validated. Recomputed p95 in milliseconds:

| Family | Samples | Visual | Local result |
|---|---:|---:|---:|
| Tabs | 100 | 25.1 | 25.1 |
| Disclosures | 100 | 24.0 | 24.0 |
| Growth selection | 100 | 22.7 | 22.7 |
| Equipment actions | 108 | 24.2 | 36.4 |

These pass the registered 100/250 ms budgets. They measure this packaged build's synthetic local interactions, not every network or confirmation path.

## Baseline integrity

Both preserved v0.10.0 observations use ASAR `b6596a49bac90aed7165a1ec833fa51514d892d27af2140e3dd4a8530dc7a3ac` and unchanged observer `bcfea7692cc9b8ea1e75530805256781c8d8a55f8cb4eb9e330a451f6fa5e345`. Report/raw/PNG hashes, process totals and identities, save-clock progress, cadence, separate user-data directories and serial launch-to-cleanup lifetimes were checked. Quantiles were additionally recomputed directly from individual process metrics, independently of the report summaries.

| Baseline | Elapsed ms | Samples / after warmup | Inputs | CPU p95 | Working-set p95 |
|---|---:|---:|---:|---:|---:|
| Active | 1,800,061.8 | 360 / 301 | 3,570 of 3,600 scheduled | 2.0380% | 216.7656 MiB |
| Idle | 1,800,057.2 | 360 / 301 | 0 | 1.3919% | 200.3281 MiB |

Maximum raw gaps were 5,454.4 and 5,065.0 ms. Final persisted kills were 70 and 33; saved play times satisfy the observer's 10 s lag limit. Both had zero observer errors and completed owned-process cleanup. These are valid baseline observations; they do not yet establish candidate performance or long-soak stability.

No Electron process, native replay, source change, or additional test invocation was made during this review. Prior targeted tests support the source review but are not represented as newly executed checks. Host review remains responsible for independent approval of Critic-authored validators.
