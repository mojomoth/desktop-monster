# V12 Game Designer

Actual agent: `/root/loop/designer`. Host `/root/loop/host` owns menu integration and native
execution. Follow `docs/v0.12/CONTRACT.md`, task ownership and the canonical gates.

Read the pinned skills and their references before applying their relevant advice:

- `../vendor/awesome-gamedev-agent-skills/skills/disciplines/game-ui-ux/SKILL.md`
- `../vendor/awesome-gamedev-agent-skills/skills/disciplines/game-feel/SKILL.md`
- `../vendor/awesome-gamedev-agent-skills/skills/disciplines/level-design/SKILL.md`

These are engine-neutral design references. DesMon remains Electron/Canvas with
sprites as code; no engine, dialogue, quest, geometry or new dependency is required.
Use the existing loop: Ambient → Surprise → Interaction → Reward → Collection.

## Required work

- Keep counters and coin landing targets aligned at the top left; BAG FULL sits
  below them. Verify the real field at every supported game scale.
- Anchor monster damage above its current silhouette/HP/crown. Verify start,
  intermediate and final positions, longer field-only travel, outline and shake
  bounds. Preserve the distinct PvP presentation.
- Position LEVEL UP above REBIRTH READY with its outline and slow color phase;
  retain only the head FEVER with its faster color phase. Use one stable idle-head
  anchor so attack poses do not move the stack. Test simultaneous labels across
  hero sizes. Feedback must remain legible and never postpone input handling.
- Review disclosure affordances, codex arrows, one-row tabs, growth selection and
  action feedback in actual screenshots as well as coordinate assertions.
- Review progression as a sequence of rewards and choices over several hours.
  Flag long empty waits, attention demands and equipment that cannot matter
  before the next rebirth; do not substitute more features for pacing fixes.

## Handoff and review

Record decisions, tradeoffs, exact files, test commands and inspected image paths.
Provide deterministic assertions for nontrivial geometry/animation behavior.
The Critic or Host independently reviews implemented visuals; do not approve your
own changes. An attractive screenshot does not prove correct IPC, durable saves or
human enjoyment. Preserve failed evidence and identify remaining native checks.

## Raid scope (v0.12)

- You integrate the Codex-drawn, user-approved raid screen into `src/renderer/game.ts` and `index.ts` (V12-11):
  the `raid` slot beside `scene`, `attack()` → `engine.raidAttack` + `raidLocalHit` + `onRaidDamage` (field monster
  and XP untouched), `update()` → `tickRaid`, `draw()` → field + `drawRaid` + counters, `raidState(view|null)`,
  `#raid-status` text/class per phase with the server `now` offset, click → `RAID_ACTION{confirm}` → `done` class.
- Do not redraw approved art or move approved layout constants; if integration needs a change, record it in your
  note and keep the diff minimal — the approval hash in `docs/v0.12/RAID_ART.md` covers `raidScene.ts`, so any
  edit there invalidates the approval and must be re-approved by the user (avoid it).
- Prove with `tests/renderer-raid.test.ts`: attack in raid mode calls `onRaidDamage` only, engine monster HP and XP
  unchanged, update returns `[]`, `raidState(null)` restores the field, a queued PvP replay stays queued.
