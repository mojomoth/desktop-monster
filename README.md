# DesMon — Desktop Monster

A BongoCat-style desktop companion battle game: a small transparent,
always-on-top pixel-art overlay where every keystroke or mouse click makes a
tiny knight attack a monster. Monsters have HP bars, drop coins and trinkets
on death, and feed the hero's XP/level progression. Bosses can be captured as
companions that fight alongside you, mashing lights up fever mode, and a
global leaderboard and asynchronous PvP let you steal companions from other
players. Every species has an elemental **type** on a five-way chart, your
five best companions form a **party**, and a PvP battle plays back as an
animated **replay** on the overlay. Electron + TypeScript; all art and sound
are generated in code (no binary assets).

## Requirements

- macOS on Apple Silicon (arm64). The Windows target exists in the
  electron-builder config only — it is never built or tested in this repo
  (see "Windows" below).
- Node.js 20+ and npm.

## Run from source

```sh
npm ci        # install dependencies (lockfile is committed)
npm start     # build then launch the overlay
```

Useful scripts:

| Command | Purpose |
|---|---|
| `npm test` | unit tests (Vitest, deterministic) |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run typecheck` | strict `tsc --noEmit` over all projects |
| `npm run smoke` | build + headless-free self-check launch (prints `SMOKE_OK`) |
| `npm run package` | unsigned macOS build via electron-builder (see below) |

The overlay is frameless and transparent, **480×300** points in the
bottom-right corner of the work area (a 240×150 canvas drawn at 2×): drag it
by the invisible 24-pixel strip along its top edge. A slime icon in the menu
bar tray hosts the menu (`DesMon v0.3.0`, input-mode status,
Collection & Battle…, Reset Progress, Quit).

## Gameplay

- **Attacks.** Every keystroke or mouse click is one hero hit for
  `level × (crit ? 2 : 1) × (fever ? 3 : 1) × (1 + souls)` damage; crits are
  10 % and show as larger yellow numbers. Kills give XP, coins and a 25 %
  chance of a trinket, then the next (tougher) monster pops in.
- **Types.** Every species has one of five elemental types — fire, wind,
  earth, water, dark (slime = water, bat = wind, ghost = dark, golem = earth,
  dragon = fire) — shown as a small coloured badge next to the HP bar and on
  every roster card. The **type chart** is a 5-cycle: each type beats the next
  two in the order `fire → wind → earth → water → dark →` (back to fire) and
  loses to the previous two. Beating the defender's type doubles a companion's
  power (**×2**, "super", yellow damage float); losing to it halves it
  (**÷2**, never below 1, steel float); anything else — including same vs.
  same — is normal. Species also have a hidden **size** (1–3) that is never
  written out: it only sets how large a monster is drawn and where a party
  member stands in the overlapping group.
- **Bosses.** Every 8th monster (indices 7, 15, 23, …) is a **boss**: 5× HP,
  5× XP and 5× coins, a ` BOSS` name suffix, drawn 3× the normal size with a
  crown and a shockwave on spawn.
- **Capture & companions.** Killing a boss captures it as a **companion**
  with a 35 % chance (sparkle effect). Companions live in a roster of up to
  30. Companion power is `max(1, ⌊bossMaxHp/20⌋) × level × 2^stars`.
- **Party of 5.** The **party** is the 5 companions with the highest power
  *after* the type chart is applied against the monster currently on screen —
  so it is re-picked automatically on every volley and visibly changes when a
  new monster spawns. The party stands left of the hero as an overlapping
  group (bigger members further back) and fires one projectile each per
  second — a **volley** that damages, kills and loots entirely without input,
  so the game keeps progressing while you type in another app.
- **Fever.** Landing 20 inputs within 3 seconds starts **fever mode**: a
  hue-cycling aura around the hero, a `FEVER!` banner, an ascending blip, and
  ×3 damage for both hero and companions for 5 seconds, followed by a
  10-second cooldown before it can trigger again.
- **Companion lifecycle.** In the Collection window a companion can be
  **consumed** (feed another companion to raise its level, max 10),
  **fused** (two of the same species and star count → one with +1 star),
  **reincarnated** (a level-10 companion → level 1 with +1 star) or
  **sacrificed** (deleted for `1 + stars` souls).
- **Rebirth.** From monster index 40 you may **rebirth**: the run resets to
  level 1 / monster 0 but you gain `⌊index/8⌋` **souls**, and companions,
  coins, trinkets, kills and your deepest index are kept. Souls multiply all
  damage by `(1 + souls)` and turn the hero's slash gold. It is the only
  prestige mechanic — progression is otherwise endless, with no win state.
- **A–Z numbers.** Damage and companion power are unbounded integers rendered
  in truncating A–Z notation: values under 1000 print verbatim, above that
  three significant digits plus a letter group (`1.00A` = 10³, `12.3A`,
  `123A`, `1.00B` = 10⁶, … `Z` = 10⁷⁸, then `AA`, `AAA`). Coin and kill
  counters stay plain digits.

## Collection & Battle window

The tray item **`Collection & Battle…`** opens a small framed window
(420×640) with three tabs:

- **Roster** — one card per companion with its species art, type badge,
  level, stars and power in A–Z notation, a `★ PvP` mark when it is in your
  PvP party, the Consume / Fuse / Reincarnate / Sacrifice buttons, and
  Rebirth (enabled from monster index 40). Changes apply to the running game
  and are saved immediately.
- **Ranking** — the global leaderboard (see below), with your row
  highlighted, plus the editable nickname field.
- **Battle** — asynchronous PvP against another player (see below).

The tray item is the only way to open it, and it is never opened during
`npm run smoke`.

## PvP: party, battle, replay, steal & reclaim

The Battle tab is a two-step flow — you see who you are up against *before*
you commit:

1. **Find opponent** asks the server for a match and shows the opponent's
   name, rank and deepest monster plus their party of up to 5 (species art,
   level, stars, type badge). With nobody else on the board you are matched
   against a `Training Dummy (no party)`. A match expires after 2 minutes;
   the panel then says `Opponent expired — find again`.
2. **Party editor.** Five slots hold the party you will attack with. Click
   roster cards to pick or drop members (max 5), press **Auto** to fill them
   with your 5 strongest, and **Save party** to store the choice in
   `save.json`. A live preview line sums your party's power *against the
   opponent's front-line type*, so a type-smart pick is visible before you
   fight. An empty saved party means "auto".
3. **Battle!** sends the match id and your party. The server is authoritative:
   it replays the fight deterministically (front members trade blows,
   attacker first, each with `power × 5` HP and type-adjusted damage) and
   returns the verdict plus the full blow-by-blow.
4. **Replay.** The overlay then plays the battle out: a `VS` banner, your
   party on the left, the opponent's mirrored on the right, one projectile,
   hit effect and damage float per blow, a scatter on each KO, and a
   `VICTORY!` / `DEFEAT` banner at the end. The whole replay is paced to fit
   in about 12 seconds; the game underneath keeps running.

**Stealing.** Only the *attacker* can steal: on a win there is a 15 % chance
you take one random companion out of the opponent's party (never if your
roster is already full at 30). Attacking and losing costs you nothing — the
defender is passive and is never raided while offline.

**Reclaim within 24 hours.** When someone steals from you, DesMon polls for
it in the background and raises a **native macOS notification**
(`<thief> stole your <Species> Lv <n>! Click to reclaim (<h>h left)`).
Clicking it takes the companion back immediately; the Battle tab also lists
every pending theft with its remaining time and a **Reclaim** button. The
window is **24 hours** from the steal — after that the row expires and the
companion is gone for good. Notifications and polling are disabled under
`SMOKE=1` and whenever the app is offline.

## Accessibility permission (global input)

DesMon reacts to keystrokes and clicks system-wide via a global input hook,
which on macOS requires the **Accessibility** permission
(System Settings → Privacy & Security → Accessibility). macOS cannot grant
this programmatically; you approve it once per app identity:

- **Running from source** (`npm start`): the process that needs the grant is
  **"Electron"** — the dev binary at
  `node_modules/electron/dist/Electron.app`. Approve that entry when macOS
  prompts (or add it manually with the “+” button).
- **Packaged app**: the grant target is **"DesMon"** (the installed
  `DesMon.app`). This is a separate entry from the dev "Electron" grant —
  approving one does not cover the other.

Until the permission is granted, DesMon runs in **window-only fallback
mode**: only keystrokes and clicks made while the overlay window is focused
count as attacks. The tray menu shows the current input mode
(`Input: Global` or `Input: Window-only (grant Accessibility…)` — clicking
the latter deep-links to the right System Settings pane). The app polls for
the grant and upgrades to global mode automatically once you approve it.

## Packaging (unsigned macOS build)

```sh
npm run package
```

This produces, under `release/`:

- `release/DesMon-0.3.0-arm64.dmg`
- `release/mac-arm64/DesMon.app`

The build is intentionally **unsigned and un-notarized**
(`mac.identity: null`, `notarize: false`, `hardenedRuntime: false`, and
`CSC_IDENTITY_AUTO_DISCOVERY=false` in the package script), so Gatekeeper
will block the first launch with “DesMon is damaged” or “cannot be opened
because it is from an unidentified developer”. To run it:

1. Open **System Settings → Privacy & Security**, scroll to the Security
   section, and click **"Open Anyway"** next to the DesMon message
   (on older macOS: right-click the app → Open → Open).
2. Launch DesMon again and confirm.

Packaged self-test (no interaction, no Accessibility prompt): `SMOKE=1 release/mac-arm64/DesMon.app/Contents/MacOS/DesMon` prints `SMOKE_OK` and exits.

## Save file and resetting progress

Progress (level, XP, kills, coins, items, current monster, PvP party) is saved
automatically — on every kill and level-up, shortly after damage, and when
the window loses focus — to:

```
~/Library/Application Support/DesMon/save.json
```

To reset progress, use the tray menu's **Reset Progress** item (it resets
the game to a fresh state and saves immediately). Deleting `save.json` while
the app is closed also works; a missing or corrupt save file never prevents
the app from starting — it falls back to a fresh game.

## Server / Leaderboard & PvP

DesMon talks to a small Node server (`src/server`, deployed on Render as
`desmon-server-v3`) for the global **Leaderboard**, for asynchronous **PvP**
battles with companion stealing, and for the theft/reclaim inbox. It is entirely optional: with no server reachable the game plays
exactly as before — every net call fails fast (5 s timeout, never throws) and
the Collection window simply shows the board as unavailable.

- **Identity.** On first launch the app picks an automatic nickname
  `Knight-xxxx` (4 hex characters) and registers lazily, the first time you
  open the Ranking or Battle tab. The nickname is editable; the auth token
  lives only in `~/Library/Application Support/DesMon/identity.json` and never
  enters `save.json`.
- **What the server decides.** The PvP verdict and the roster moves (stolen /
  lost companions) are authoritative. Leaderboard stats are **self-reported**:
  the server accepts the snapshot a client uploads and ranks it
  (accept-and-rank), so the board is for fun, not for scorekeeping.
- **Running it locally.**

  ```sh
  npm run build
  DATABASE_URL=postgres://…  npm run start:server   # omit DATABASE_URL for an in-memory store
  DESMON_SERVER_URL=http://localhost:10000 npm start
  ```

  `npm run start:server` listens on `PORT` (default `10000`) and serves
  `GET /healthz` plus the `/v1` API. Without `DATABASE_URL` it uses an
  in-memory store, so everything is lost on restart.
- **Server URL.** The built-in `SERVER_URL` constant
  (`src/shared/serverUrl.ts`) points at the deployed Render service — for v3
  that is **`desmon-server-v3`** (`https://desmon-server-v3.onrender.com`,
  built from the `v3` branch). The v2 service is kept for reference only as
  `V2_SERVER_URL` in `AGENTS.md` and is not used by this build.
  **`DESMON_SERVER_URL`** overrides the constant for any launch; setting it to
  the empty string forces offline mode, and `SMOKE=1` forces offline in code.

### Free-tier caveats

The deployment runs on Render's free tier, which means:

- The web service **sleeps after 15 minutes idle** and takes roughly a minute
  to cold-start. The first Ranking or Battle click after a long pause will
  usually report a network error; opening the Collection window warms the
  service up, and a retry a few seconds later succeeds.
- The free Postgres instance **expires 30 days after it was created** (see
  `DB_EXPIRES` in `AGENTS.md`), with a 14-day grace period and no backups.
  When it is replaced, all identities and leaderboard entries are gone:
  clients get a 401, re-register automatically under the same nickname and
  carry on. Local progress in `save.json` is never affected.

## Windows

`package.json` contains a `win`/`nsis` electron-builder section as
**config only**, per spec: no Windows build is produced, tested, or
supported in this run. `npm run package` targets macOS arm64 exclusively.
