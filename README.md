# DesMon — Desktop Monster

A BongoCat-style desktop companion battle game: a small transparent,
always-on-top pixel-art overlay where every keystroke or mouse click makes a
tiny knight attack a monster. Monsters have HP bars, drop coins and trinkets
on death, and feed the hero's XP/level progression. Electron + TypeScript;
all art and sound are generated in code (no binary assets).

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

The overlay is frameless and transparent: drag it by the invisible 24-pixel
strip along its top edge. A slime icon in the menu bar tray hosts the menu
(input-mode status, Reset Progress, Quit).

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

- `release/DesMon-0.1.0-arm64.dmg`
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

## Save file and resetting progress

Progress (level, XP, kills, coins, items, current monster) is saved
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

DesMon talks to a small Node server (`src/server`, deployed on Render) for the
global **Leaderboard** and for asynchronous **PvP** battles with companion
stealing. It is entirely optional: with no server reachable the game plays
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
- **`DESMON_SERVER_URL`** overrides the built-in URL
  (`src/shared/serverUrl.ts`) for any launch; setting it to the empty string
  forces offline mode.

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
