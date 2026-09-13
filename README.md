# DesMon — Desktop Monster

A BongoCat-style desktop companion battle game: a small transparent,
always-on-top pixel-art overlay where every keystroke or mouse click makes a
knight attack a monster. Monsters have HP bars, drop coins and trinkets
on death, and feed the hero's XP/level progression. Bosses can be captured as
companions that fight alongside you, mashing lights up fever mode, and a
global leaderboard and asynchronous PvP let you steal companions from other
players. Every species has an elemental **type** on a five-way chart, your
five best companions form a **party**, and a PvP battle plays back as an
animated **replay** on the overlay. Electron + TypeScript; all art and sound
are generated in code (no binary assets).

## v0.7 — 동료 성장, 실제 획득 도감과 지정 대전

v0.7은 개발·검증 중이며 **최종 출시 검증은 PENDING**입니다.
[검증 상태](docs/v0.7/ACCEPTANCE.md), [현재 인계](docs/v0.7/HANDOFF.md),
[개발 계획](docs/v0.7/DEVELOPMENT_PLAN.md)을 확인하세요.

- 동료의 게임상 Lv10 상한을 없앴습니다. 레벨은 1–9,007,199,254,740,991의 안전 정수로
  저장·서버·응답에서 같은 범위를 사용하며, 증가 결과가 범위를 넘으면 재료와 상태를 보존합니다.
  **동료 환생은 Lv10 이상 → Lv1·별+1**입니다. 확인 화면에 전후 힘을 보여주며,
  기본 힘은 이전의 `2 / 현재 레벨`로 줄어듭니다(Lv10은 1/5). 별도 확인 또는 취소가 필요하고,
  확인 중 대상이 바뀌거나 사라지면 다시 확인해야 합니다.
- 도감은 **영웅을 실제 선택하거나 몬스터를 처치했을 때** 공개합니다. 기존 영구 영웅 보유 기록도 인정합니다.
  후보 제시·필드 등장만으로 공개하지 않으며 이름·설명·미확인 알림·표시한 발견 확인(ACK)·목표 완료에
  같은 판정을 사용합니다. 레거시에서 획득 증거가 없는 카드는 실루엣으로 돌아가고 첫 실제 획득을 다시 알립니다.
- PvP 목록의 각 행에서 영웅·동료 파티·순위·승패를 보고 상대를 지정합니다. 미리보기와 실제 대전 상대를
  일치시키고, 목록 갱신 중 선택·키보드 포커스를 유지합니다. 삭제·만료·오류는 새 선택이나 재시도로 안내합니다.
- 환생 준비·후보·휴식·보류 안내는 실제 진행 판정을 공유합니다. 콘텐츠의 **자격 충족·제시/등장·선택/처치**는
  구분하며, 기존 콘텐츠를 성과 조건으로 연결하고 새 강제 시간 제한은 추가하지 않습니다.
  첫 환생 p50 45–60분·100개 중90개가90분 이내 성공, 마지막 named 자격 p50 8–12시간은
  검증 목표입니다. 탐색 후보나 과거 결과를 최종0.7 통과로 표시하지 않습니다.

최종0.7 소스의 실제5/15/30분×3프로필9개와 별도연속180분(합계330분) 자연 관측,
정책별100seed×12시간 측정, 네 역할 독립 감사, smoke와 실제 패키지는 아직 최종 검증되지 않았습니다.
운영 서버의 고레벨 호환도 출시 전에 확인해야 하며 운영 검증은 PENDING입니다.
사람의 재미·업무 방해 관찰은 `humanChecks=PENDING`입니다. 커밋·푸시·운영 배포는 자동 수행하지 않습니다.

## v0.5 — 골드, 반복 환생과 새로운 발견 (이전 기록)

아래는 당시 업데이트 기록입니다. 현재 변경은 위 v0.7 설명을 함께 확인하세요.

V4의 영웅 환생에 골드 상점, 반복 중첩과 조건부 발견을 더했습니다.
[기획서](.harness/v5/reference/GAME_DESIGN_V5.md), [검증 결과](docs/v0.5/HANDOFF.md),
[메뉴 체험](docs/v0.5/menu-preview.html), [신규 레어 50종](docs/v0.5/rare-gallery.html)을 확인하세요.
두 HTML 미리보기는 코드에서 생성한 오프라인 합성 세이브이며 실제 저장을 변경하지 않습니다.

- 환생 레벨은 **12 → 13 → 13 → 14 → 14 → 15 → 15 → 16 → 16 → 17 → 17 → 18**, 이후18입니다.
  수락하면 레벨1로 돌아가며 동료·골드·훈련·기록을 유지합니다. 다음 환생까지 활성 플레이2분 휴식이 필요합니다.
- 세 후보에는 하위 단계와 보유 영웅도 등장합니다. 같은 영웅으로 다시 환생하면 최고 기본 버프(10–25)에
  **중첩 +1**이 붙습니다. 속성형은 해당 동료에 두 배, 파티형은 전체 동료에 적용하며 PvP도 같은 계산을 씁니다.
- 골드는 **무기 훈련**(영구 PvE 공격 +5%씩 최대50%), **레어 미끼**(자격 있는20회 생성의 확률12%→25%),
  **후보 재굴림**에 씁니다. 비용은 화면에 표시됩니다. 골드 없이도 보류 후 플레이30초 뒤 새 후보를 봅니다.
- **일반50 + 레어20 = 영웅70종**, **기존105 + 레어30 = 몬스터135종**입니다.
  처치·영웅 환생 이력·장착 속성·필드 시간·PvP·골드 사용 조건을 갖습니다. PvP 조건에는 오프라인 처치 대안이 있습니다.
  자격 있는 일반 몬스터가11회 연속 나온 뒤에는 다음 생성이 레어로 보장됩니다.
- **영웅/몬스터 도감**은 등장 전 실루엣으로 표시하고 조건과 진행도를 무료 공개합니다.
  실제 발견 뒤 이름·설명·능력치를 확인하며 보유 영웅을 무료 장착할 수 있습니다.
- **내 기록**에서 이름(영문·숫자·_·- 1–16자), 활성 플레이 시간, 총 처치, 환생 수,
  최근100회 환생 순서와 영웅별 전체 횟수를 봅니다. 과거 저장에 없던 시간·상세 기록은 v0.5부터 집계합니다.
- PvP는 상대 목록에서 영웅·파티·승패를 보고 대상을 고릅니다. 비봇 서버 결과만 전적에 반영하며 중복 결과는 재집계하지 않습니다.

V4의 Designer → Critic → Balance → Playtester를 계승한 [V5 하네스](.harness/v5/HARNESS.md)는
각 역할에서8개 필수 기능의 검토 누락도 검사합니다. 기존 Ralph 빌더 `.harness/CURRENT=v3`는 유지합니다.

```sh
node .harness/v5/loop/fun.mjs selftest
DESMON_BALANCE_REPORT=docs/v0.5/balance-v5.json npm test -- tests/balance.test.ts
node .harness/v5/loop/render-preview.mjs
```

실제 재미 평가·macOS 패키징·운영 배포는 코드 검증과 별도입니다. 인계 기록의 PENDING 항목을 확인하세요.
기존 v3 운영 서버는 신규 ID와 중첩을 지원하도록 함께 업데이트해야 합니다.

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

The overlay is frameless and transparent, **400×260** points in the
bottom-right corner of the work area (a 200×130 canvas drawn at 2×, every
sprite pixel a chunky 2×2 block — the hero starts as a small RPG adventurer and evolves into one of 50 forms, the five monsters original Pokémon/Digimon-style creatures, all drawn as
code by the Codex CLI graphics worker): drag it by the invisible
24-pixel strip along its top edge. A slime icon in the menu
bar tray hosts the menu (`DesMon v0.7.0`, input-mode status,
Collection & Battle…, Reset Progress, Quit).

## Gameplay

- **Attacks.** Every keystroke or mouse click is one hero hit for
  `(level + max(0, level−2)²) × (1 + souls) × (1 + 0.25 × hero reincarnations)`
  base damage (integer truncated), then ×2 for crit and ×3 for fever; crits are
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
  written out: it only sets where a party member stands in the overlapping
  group (bigger species at the back); on-screen size comes from each species'
  own pixel art.
- **Bosses.** Every 8th monster (indices 7, 15, 23, …) is a **boss**: 5× HP,
  5× XP and 5× coins, a ` BOSS` name suffix, drawn with a crown (uniform pixel
  scale) and a shockwave on spawn.
- **Capture & companions.** Killing a boss captures it as a **companion**
  with a 35 % chance (sparkle effect). Companions live in a roster of up to
  30. Companion power is `max(1, ⌊legacyBaseHp/20⌋) × level × 2^stars`.
  `legacyBaseHp` is the original normal-monster HP curve at the capture depth;
  field progression tuning does not change the power of owned companions.
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
  **consumed** (feed another companion to raise its level; no gameplay level cap),
  **fused** (two of the same species and star count → one with +1 star),
  **reincarnated** (level 10 or higher → level 1 with +1 star) or
  **sacrificed** (deleted for `1 + stars` souls). Levels must remain positive
  safe integers, at most 9,007,199,254,740,991; an overflowing operation
  changes neither the companions nor its materials. Reincarnation shows the
  before/after power and requires a separate confirmation. Its base power
  becomes `2 / previous level` of the original (one fifth at level 10), so
  gaining a star does not mean an immediate power increase.
- **Rebirth.** From monster index 40 you may **rebirth**: the run resets to
  level 1 / monster 0 but you gain `⌊index/8⌋` **souls**, and companions,
  coins, trinkets, kills and your deepest index are kept. Souls multiply all
  damage by `(1 + souls)` and turn the hero's slash gold. It remains available alongside hero reincarnation; it keeps your equipped
  appearance. Progression is endless, with no win state.
- **A–Z numbers.** Damage and companion power are unbounded integers rendered
  in truncating A–Z notation: values under 1000 print verbatim, above that
  three significant digits plus a letter group (`1.00A` = 10³, `12.3A`,
  `123A`, `1.00B` = 10⁶, … `Z` = 10⁷⁸, then `AA`, `AAA`). Coin and kill
  counters stay plain digits.

## Collection & Battle window

The tray item **`Collection & Battle…`** opens a small framed window
(420×640) with seven tabs:

- **영웅** — hero damage, three reincarnation previews, and defer/gold reroll.
- **상점** — weapon training, rare lures, and their current costs.
- **도감** — hero/monster acquisition records, unread discoveries, a free goal, and owned hero equipment.
- **내 기록** — editable nickname, play time, kills, and reincarnation history.
- **Roster** — one card per companion with its species art, type badge,
  level, stars and power in A–Z notation, a `★ PvP` mark when it is in your
  PvP party, the Consume / Fuse / Reincarnate / Sacrifice buttons, and
  Rebirth (enabled from monster index 40). Changes apply to the running game
  and are saved immediately.
- **Ranking** — the global leaderboard (see below), with your row highlighted.
- **Battle** — asynchronous PvP against another player (see below).

The tray item is the only way to open it, and it is never opened during
`npm run smoke`.

## PvP: party, battle, replay, steal & reclaim

The Battle tab is a two-step flow — you see who you are up against *before*
you commit:

1. **Opponent list** loads up to 50 other players, showing each hero, deployed
   party, rank and server-recorded wins/losses. Select a row to request a
   fresh match preview and arrange your party. The response must identify the
   exact selected player. Selection and keyboard focus survive list updates;
   Tab, Enter and Space work on the selection buttons. A deleted focused row
   returns focus to refresh. An empty list asks you to refresh later. Previews
   expire after 2 minutes; select again when expired or after an error clears
   the preview. The old random-match API remains available for older clients.
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

With the version fixed at 0.7.0, packaging writes these paths under `release/`
(final artifact verification is PENDING):

- `release/DesMon-0.7.0-arm64.dmg`
- `release/mac-arm64/DesMon.app`

The `.app` path is reused by later builds and is not a versioned v0.6 download.
Use a versioned DMG and its verification record to identify a historical build.

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

Progress (level, XP, kills, coins, items, current monster, PvP party, hero collection and offers) is saved
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

## 게임 재미 분석 하네스

실제 Electron E2E와 100 seed 밸런스 측정 후 Designer·Critic·Balance·Playtester가
기능 오류, 논리 문제, 재미 가설과 다음 업데이트를 분석합니다.
[실행 방법](.harness/v5/AUDIT.md)을 참고하세요. 실제 5/15/30분 플레이와 시간 가속
시뮬레이션을 구분하며, 사람이 느끼는 재미는 별도 관찰로 남깁니다.

현재 개발 범위와 완료 조건은 [v0.7 개발 계획](docs/v0.7/DEVELOPMENT_PLAN.md), 재개 순서는
[v0.7 LOOP](docs/v0.7/LOOP.md)와 [HANDOFF](docs/v0.7/HANDOFF.md)를 따릅니다.
[V7 호스트 실행 계약](.harness/v7/HARNESS.md)은 기존 `.harness/CURRENT=v3`와 별개입니다.
하네스 준비·설계 검토·실제 원본 분석·최종 출시 검증을 구분합니다.
이전 [v0.6 개발 계획](docs/v0.6/DEVELOPMENT_PLAN.md)과 [시작 프롬프트](docs/v0.6/START_PROMPT.md)는 당시 기록으로 보존합니다.

## Windows

`package.json` contains a `win`/`nsis` electron-builder section as
**config only**, per spec: no Windows build is produced, tested, or
supported in this run. `npm run package` targets macOS arm64 exclusively.

## v0.6: 발견 기록과 다음 목표 (이전 기록)

초과 포획 보류는 seed별 사전 채택 기준을 충족하지 못해 v0.6에서 제외했습니다. 기존 초과 포획 방출·영혼 정산은 유지합니다.

v0.6에서는 환생 안내가 현재 후보·레벨·휴식·보류 상태와 일치합니다. 도감의 **지난 확인 이후 발견**에서 놓친 발견을 다시 보고, **표시한 발견 확인**으로 읽은 카드만 정리할 수 있습니다. 확인하지 않아도 발견은 사라지지 않습니다.

도감 카드에서 목표 하나를 무료로 선택·변경·해제할 수 있습니다. 조건을 충족해도 실제 발견 전에는 실루엣으로 남으며, 영웅의 발견과 보유를 구분합니다. 훈련은 현재 상태의 비치명·비피버 영웅 1회 피해를 보여줍니다. 정수 계산으로 효과가 없는 단계도 `14 → 14 (+0)`처럼 표시합니다. 가격과 전투 공식은 유지합니다.

저장 실패 시 화면의 안내를 확인하고 앱을 닫기 전에 재시도하세요. 업데이트 전 앱을 종료하고 `~/Library/Application Support/DesMon/` 폴더를 로컬에 백업하세요. 최소한 `save.json`과 공식 전적을 담은 `identity.json`은 같은 시점의 묶음으로 보관·복원해야 합니다. `identity.json`에는 인증 토큰도 있으므로 공유 폴더나 검증 자료에 넣지 마세요. 구버전으로 내리면 새 발견 확인·목표 필드가 없어질 수 있으므로, 이전 버전으로 돌아갈 때는 해당 버전에서 만든 백업 묶음을 복원합니다.

[v0.6 검증 상태](docs/v0.6/ACCEPTANCE.md), [실험 결과](docs/v0.6/EXPERIMENT_RESULTS.md), [인계](docs/v0.6/HANDOFF.md), [개발 루프와 재개](docs/v0.6/LOOP.md)를 참고하세요. 실제 사람의 재미·업무 방해 관찰 결과는 기술 검증과 구분해 기록합니다.

v0.6은 당시 기술 검증을 마친 macOS ARM64 출시 후보였습니다. [0.6.0 DMG](release/DesMon-0.6.0-arm64.dmg)와 앱을 생성하고, 격리된 구세이브의 실제 저장·재시작 보존을 확인했습니다. `release/mac-arm64/DesMon.app`는 이후 패키징에서 바뀌는 공용 출력 경로이므로 과거0.6 앱의 다운로드 링크로 사용하지 않습니다. 사람 재미 가설은 PENDING이며, 최초 idle 관측의 원인 미확정 입력 불일치와 한 번의 재검증 이력은 [인계](docs/v0.6/HANDOFF.md)에 남겼습니다.
