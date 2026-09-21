# DesMon v0.12.0 — 보스 레이드 기획·실행 계획

## 배경 (Context)

v0.11.0(HUD·수동 장착·환생 밸런스)까지 DesMon은 혼자 사냥하고 비동기 PvP만 하는 게임이다. v0.12.0의 핵심은
**여러 플레이어가 같은 시간에 같은 보스를 함께 때리는 라이브 콘텐츠**(보스 레이드)다. 며칠에 한 번 열리고,
달성 조건을 여러 명이 함께 채워야 보스가 드러나며, 12–48시간 카운트다운 뒤 실시간 클릭 연타 전투로 처치하면
큰 경험치·골드와 레이드 전용 아이템을 기여도 순으로 받는다.

이 문서는 기획을 코드베이스의 실제 이음새(seam)에 맞춰 보정한 결과이며, 이후 `.harness/v12` 호스트 하네스가
그대로 실행할 수 있게 태스크 그래프·검증·배포까지 포함한다.

### 사용자와 확정한 결정 (2026-09-21)
| 항목 | 결정 |
|---|---|
| 실시간 통신 | **1초 폴링 + 데미지 배치 POST** (WebSocket/SSE 없음, 새 의존성 없음) |
| 배포 | **운영 서버 배포 + Postgres 회전 모두 루프가 수행** (`DESMON_SKIP_NET` 해제) |
| 레이드 아이템 | **에픽 등급 재사용 + `raidBossId` 출처 + 전용 아트 10종** (새 등급 없음) |
| 보스 구성 | **5종, 속성(물·바람·어둠·땅·불)별 1종 고정 순환** |
| 참여 확인 | **네이티브 알림 사용 안 함.** 인게임 픽셀 `참여` 버튼 또는 '영웅과 모험 기록' 창 안의 픽셀 팝업으로만 참여 |
| 네이티브 팝업 | **되도록 모두 제거**: `dialog.showMessageBox` 3곳(`src/main/ipc.ts:263,376,398`)과 도난 `Notification`(`src/main/index.ts:80`)을 Codex가 디자인한 픽셀 팝업으로 대체. OS 파일 저장 대화상자(`share.ts:24`)만 유지 |
| 진행 방식 | **2단계**: A) 아트 + 인게임 임시 화면 + 레이드 메뉴 화면을 먼저 그려 사용자가 확정 → B) 확정 후 하네스가 릴리스까지 **무중단**으로 개발 |

### 코드베이스 제약 (탐색으로 확인)
- 서버: raw `node:http`, 라우트는 `src/server/app.ts:591-620` if-chain, **모든 요청이 `store.transaction` 안에서 `LOCK TABLE players`** (`src/server/pgStore.ts:116`), 토큰당 60 req/min (`app.ts:56`). 실시간 전송계층 전무. Render 무료 티어: 15분 유휴 후 슬립(콜드스타트 ~60s), 단일 인스턴스. **DB 만료 2026-10-03**.
- 클라이언트 폴링 선례: `src/main/defense.ts`(21줄, 5s 폴러, 주입 타이머), `src/main/thefts.ts`(알림). 코디네이터 `boundary()`(`src/main/coordinator.ts:78-96`)는 엔진을 멈추고 상태를 원자 적용, `RecoveryStore` 2단계 커밋으로 정확히 1회 적용.
- 렌더러: 캔버스 200×130, 창 400×260(CSS 2×), 모든 스프라이트는 정수 `scale`로 그림(`UNIT_SCALE=2`). **"필드 2배 확대 후 1/2 축소" = 스프라이트를 scale 1로 그리기**. 장면 전환은 `scene: BattleScene|null`(`game.ts:583`), `attack()`은 scene≠null이면 무시(`:1073`). 상단 중앙 DOM 토스트 `#field-pvp-status` 선례. 오버레이 창은 클릭을 받는다(드래그 스트립 존재, `setIgnoreMouseEvents` 없음).
- 메뉴: 8탭 560px, 카드 목록 패턴 `renderDirectory`(`src/menu/index.ts:650-710`), 실루엣 `monsterCanvas`(`src/menu/codex.ts:20-32`), 조건 행 `conditionText/bindConditions`(`codex.ts:37-117`), `mountX(doc, root, send) => (save)=>void` 규약.
- 아트: sprites-as-code(`Sprite {w,h,palette,frames}`), `registerSprites`, 무결성 스윕 `tests/sprites.test.ts`. Codex CLI 호출 선례 `.harness/v3/loop/iterate.sh:123-133`, 헌장 `.harness/v3/agents/25-gfx-worker.md`, 프리뷰 선례 `.harness/v5/loop/render-preview.mjs`(esbuild HTML), `.harness/v10/epic-gallery.mjs`(Electron PNG 보드), 승인 기록 `docs/v0.10/ART.md`.
- 하네스: v11 호스트 하네스(`.harness/v11/{run,balance,balance-verify,runtime,ui-cases,final-check,release}.mjs`, `config.json` 태스크 그래프, `docs/v0.11/CONTRACT.md` 28줄 형식). `release.mjs`/`final-check.mjs`에 `'0.11.0'` 하드코딩.
- 미커밋 diff(REBIRTH READY 깜빡임, `.agentdoc/v11-hud-20260919`)가 있고 `v0.11.0` 태그가 없다.

---

## 1. 게임 규칙 (확정 기획)

### 1.1 주기와 단계 (서버 권위, 타이머 없음 — 요청 시 `now`로 지연 전이)
```
cycle = floor((now − RAID_EPOCH) / periodMs)      boss = RAID_BOSSES[cycle % 5]
gathering ─(조건 전부 충족)─▶ countdown ─(battleAt)─▶ confirming ─(grace 종료)─▶ battle ─(처치 or 타임아웃)─▶ settled
    └─(마감까지 미충족)─▶ skipped        └─(참여 0명)─▶ skipped          └─(확정 < minConfirmed)─▶ skipped
```
- **gathering**: 메뉴에 실루엣 보스 + 달성 조건 2개(레벨 ≥ L 인원 N명, 최고 단계 ≥ I 인원 N명). 개인 자격이 되면 `참여`를 눌러 집계에 들어간다(멱등). 모두 채워지면 `unlockedAt`, `battleAt = unlockedAt + countdownMs`(12–48h 범위 튜너블) 확정, 보스 공개.
- **countdown**: `레이드 참여` 버튼. 조건 기여자(unlocker)는 즉시, 나머지는 `priorityMs` 경과 후 정원(`capacity`) 남으면 참여. 인게임 상단 중앙에 `레이드 hh:mm:ss` 상시 표시.
- **confirming**: `battleAt`에 인게임 상단 표시가 **경고 스타일 픽셀 `참여` 버튼**으로 바뀐다(네이티브 알림 없음). 메뉴 창이 열려 있으면 같은 내용의 픽셀 팝업도 뜬다. `confirmGraceMs` 안에 둘 중 하나를 **클릭**해야 참전 확정(서버가 그 시점 영웅 공격력을 동결). 미클릭 = 불참.
- **battle**: `battleMs` 동안 클릭 연타. 보스 HP는 전투 시작 시 **확정 인원 기준으로 고정**:
  `bossHp = Σ_confirmed attack_i × cadencePerSec × battleMs/1000 × clearRatioBps/10000` → 인원이 많든 적든 "평범한 연타로 clearRatio 만큼 채우면 잡힌다". 영웅만 참여(동료 없음).
- **settled**: 처치 시 기여도(누적 데미지) 내림차순 순위. 동률은 먼저 도달한 쪽. 보상은 클라이언트가 자동 수령(§3.4). 타임아웃 시 소액 참가 보상만.

### 1.2 튜너블 (밸런스 에이전트가 확정; 한 곳의 동결 리터럴 `RAID_PARAMETERS` in `src/core/raid.ts`)
| 키 | 기본 | 등록 범위 | 비고 |
|---|---|---|---|
| periodMs | 72h | 48–168h | 주기 |
| gatherMs | 24h | 12–48h | 조건 모집 마감 |
| countdownMs | 24h | **12–48h(사용자 고정)** | |
| priorityMs | 6h | 1–12h | 기여자 우선 창 |
| capacity | 20 | 10–50 | 정원 |
| conditionNeed | 3 | 2–5 | 조건당 필요 인원 (`2×need ≤ capacity` 테스트 고정) |
| conditionLevelMin/Step, conditionBestIndexMin/Step | 30/10, 60/20 | — | 보스 i번째 = min + i×step |
| confirmGraceMs | 90s | 60–120s | ≥ 콜드스타트 60s |
| battleMs | 120s | 60–300s | 후보 90/120/180 |
| minConfirmed | 2 | 1–5 | 미만이면 skipped |
| cadencePerSec | 2 | 1.5–3 | ordinary 프로필 |
| clearRatioBps | 6500 | 5500–9500 | |
| maxClicksPerSec | 8 | 6–10 | 서버 클램프 상한(high 프로필) |
| batchCapSec, damageSlackBps | 3, 12500 | — | 배치 검증 |
| xpLevels | 3 | 1–10 | 보상 XP = xpLevels × xpToNext(level) |
| goldKills | 500 | 100–5000 | 보상 골드 = goldKills × coinsForIndex(bestIndex) |
| failRewardBps | 1500 | 0–3000 | 타임아웃 시 위 보상의 비율, 아이템 없음 |
| contributionFloorBps | 200 | 0–500 | 기여 비율 미만은 fail 티어(AFK 방지) |
| itemOddsTopBps / DecayBps / FloorBps | 8000 / 7000 / 500 | — | k위 아이템 확률 = max(floor, top×decay^(k−1)) |
| claimWindowMs | 7d | 3–14d | 미수령 만료 |
서버 전용 상수(튜너블 아님, `src/server/raid.ts`): `RAID_EPOCH=2026-09-21T00:00Z`, `RAID_RATE_LIMIT=150/min`, `flushMs=5000`, `TOP_CONTRIBUTORS=10`.

---

## 2. 서버 (`src/server`, `src/shared/api.ts`)

### 2.1 새 파일 `src/server/raid.ts` (순수, 시계 주입)
`RaidDocument`(cycle, bossId, seed, gatherDeadline, conditions: id→playerId[], unlockedAt, battleAt, joins, confirmed{name, attack(string bigint), at}, bossHp, damage{total, seq, clicks, lastAt}, killedAt, rewards{rank, itemTemplateId, claimedAt}), `cycleOf`, `newRaid`, `phaseAt`, `advance`(전투 진입 시 bossHp 1회 계산, settled 진입 시 `settle` 1회 — 멱등 catch-up), `settle`(순위·아이템 롤 `mulberry32(seed ^ rank)`), `damageCap`, `viewOf(doc, playerId, now)`.
영웅 공격력 파생: `src/core/battle.ts:42` 두 줄을 `export function heroicAttack(combat)`로 추출(엔진 `displayedHeroAttack`와 동치 테스트로 고정).

### 2.2 라우트 (모두 bearer, `/v1/raid/*`) — `app.ts:591-620` 옆에 `raidRoute`
| 라우트 | 본문 | 200 | 오류 |
|---|---|---|---|
| `GET /v1/raid/live` | — | `RaidLiveResponse{now, raid: RaidView, previous?}` | 401 |
| `POST /v1/raid/participate` | `{conditionId}` | RaidLive | 400, 409 `raid_phase` |
| `POST /v1/raid/join` | `{}` | RaidLive | 409 `raid_phase`(우선창), 409 `raid_full` |
| `POST /v1/raid/confirm` | `{}` | RaidLive | 409, 426 `upgrade_required`(combat 스냅샷 없음) |
| `POST /v1/raid/attack` | `{raidId, seq, damage, clicks, crits, feverMs}` | RaidLive + `{accepted, expectedSeq}` | 400, 409, 410 `raid_over` |
| `POST /v1/raid/claim` | `{raidId}` | `{reward}` (멱등) | 409, 410 |
- **락 우회**: `handle()`(`app.ts:623-632`)에서 `/v1/raid/` 접두는 `store.transaction` 밖에서 처리, `overLimit(req, RAID_RATE_LIMIT, 'raid:')`로 별도 예산. 문서는 모듈 메모리 `Map`(기존 `matches` 선례 `app.ts:80-85`) + `flushMs`마다/단계 전이마다 `putRaid` (`ponytail:` 재시작 시 ≤5s 데미지 손실, 다중 인스턴스 업그레이드는 row lock).
- **attack 검증(신뢰 경계)**: 형태(`record/isInt`, 10진 문자열 ≤40자), `seq` 불일치 → `accepted:false, expectedSeq`(오류 아님, 재전송), 중복 seq 무시, `clicks ≤ maxClicksPerSec×batchSec`, `damage ≤ attack_i×(clicks−crits+crits×CRIT_MULT)×FEVER_MULT^(fever)×slack` **클램프**(거절 아님). 처치 판정 후 `killedAt`.
- 타입은 `src/shared/api.ts:117` 옆에 `RAID_PHASES, RaidPhase, RaidCondition, RaidContributor, RaidReward, RaidView, RaidLiveResponse, RaidAttackRequest/Response, RaidClaimResponse, RaidAction`; `NetError`에 `'raid-phase' | 'raid-full'` 추가(`net.ts:314` 일반 409 매핑보다 앞에서 검사).

### 2.3 스토어
`Store`(`store.ts:31-53`)에 `getRaid(id)`, `putRaid(id, doc)`; MemoryStore는 별도 Map(트랜잭션 롤백 대상 아님, 주석), PgStore DDL(`pgStore.ts:14-79`)에
`CREATE TABLE IF NOT EXISTS raids (id text PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())` + upsert.
**갱신할 고정 테스트**: `tests/server/pgStore.test.ts:45-47` CREATE TABLE 1→2; `:62-66`(ALTER 3개, `matches` 없음)은 그대로 통과.

### 2.4 코어
- `src/core/raid.ts`: `RAID_PARAMETERS`(동결 숫자 리터럴), `RAID_BOSSES`(`EPIC_BOSSES` 형식, `src/core/equipment.ts:82-90` 옆) `{id:'raid-<element>', name, element}`×5, `RAID_CATALOG`(보스당 무기1·악세1, `rarity:'epic'`, `raidBossId`; **`EQUIPMENT_CATALOG` 224 고정은 건드리지 않음**), `raidLootForBoss`, `raidReward(state, reward)` 적용 함수.
- `src/core/engine.ts:341-359` 옆에 `raidAttack(source)`: feverInput + 크리 롤 + 데미지 계산만 하고 **필드 몬스터/XP는 건드리지 않음**(레이드 중 필드 무피해). 밸런스 시뮬도 이 함수를 쓴다.
- `src/core/collection.ts:159-177` 액션에 `{type:'raidReward', raidId, xpLevels, goldKills, itemTemplateId}` (main 전용, `MENU_ACTION`에서 거부): XP 레벨업 루프, `creditGold`(PvP 부채 우선 상환 규칙 유지), 아이템은 보스 드롭과 같은 가방 경로.

---

## 3. 클라이언트 (main)

### 3.1 net (`src/main/net.ts`)
`NetClient`(`:42-54`)에 선택적 메서드 `raidLive/raidParticipate/raidJoin/raidConfirm/raidAttack/raidClaim`, 검증기 `isRaidView/isRaidLive/isRaidAttack/isRaidClaim`(`:194` 옆; phase∈RAID_PHASES, boss.id∈RAID_BOSSES, 타임스탬프 정수, 10진 `currency()`, top≤10, itemTemplateId는 카탈로그 id), `NetSession` 래퍼.

### 3.2 새 파일 `src/main/raid.ts` — 레이드 워처 (`defense.ts` 본뜸, ~60줄)
`createRaidWatcher({session, push, notify, readIdentity, writeIdentity, setTimeout, clearTimeout, now})` → `{start, stop, poll, report(batch), last}`.
- `setTimeout` 체인으로 단계별 주기: 유휴/gathering 60s → countdown 마지막 10분 5s(슬립 깨우기) → confirming/battle **1s**.
- `report()`는 렌더러 히트를 `pending`에 합산(bigint), 1s 틱에 `raidAttack({raidId, seq: me.seq+1, ...pending})`; `accepted:false`면 `expectedSeq`로 재전송. 응답(=라이브 스냅샷)을 `push` → `sendToAll(IPC.RAID_STATE)`.
- confirming 진입은 **알림을 보내지 않는다**. `RAID_STATE` 푸시만으로 인게임 `참여` 버튼(§4.3)과 메뉴 팝업(§5.2)이 스스로 나타난다. `notify`/`notifiedRaidIds` 없음.
- settled + `me.reward` + `!me.claimed` → `coordinator.claimRaid(raidId)` **자동 수령**(메뉴 버튼 없음). 결과는 메뉴 픽셀 팝업 1회 + 인게임 배너로 표시.
- 배선 `src/main/index.ts:210-227`(SMOKE=1이면 생성 안 함), `will-quit`에서 stop.

### 3.3 IPC (`src/shared/ipc.ts`, `src/main/ipc.ts`, `src/preload/index.ts`, `src/menu/index.ts:100-127`)
`RAID_STATE`(main→all, push), `GET_RAID_STATE`(invoke), `RAID_ACTION`(invoke, `RaidAction` = participate/join/confirm/claim; 페이로드 좁히기), `RAID_DAMAGE`(field→main send, `{raidId, damage, crit, fever}` 히트 1건씩; 발신자가 field 창인지 확인, `ipc.ts:279` 선례). preload 리터럴 4개 + `tests/ipc.test.ts:99` 핀 갱신. `MenuBridge`에 `onRaidState?/getRaidState?/raidAction?`.
`confirm`은 `coordinator.raidConfirm()`(boundary 안에서 최신 스냅샷 업로드 후 confirm → 서버가 현재 공격력 동결).

### 3.4 보상 정확히 1회 (`coordinator.ts` + `recovery.ts`)
`RecoveryMetadata`에 `pendingRaidClaim?: {raidId, reward}`. `claimRaid`: boundary 안에서 (1) 서버 claim(멱등) → `pendingRaidClaim` 기록(내구) → (2) `apply([{type:'raidReward',…}], {pendingRaidClaim: undefined})` 원자 커밋. (1)–(2) 사이 크래시는 `pollIncoming()`(`:190-236`)의 `pendingReclaim` 옆 분기가 네트워크 없이 재적용.

---

## 4. 렌더러 (레이드 화면)

### 4.1 새 파일 `src/renderer/raidScene.ts` (프리뷰 목업이 그대로 쓰는 실제 그리기 코드)
`RaidStateView{raidId, bossId, phase:'battle'|'settled', bossHpRatio, remainingMs, timeoutMs, participants[{playerId,name,formId,level,damageDelta}], me, result?}`, `RaidScene`, `RAID_SCALE=1`, `RAID_HP_BAR={x:20,y:14,w:160,h:5}`(빨강 `drawMeter`), `RAID_TIME_BAR={x:20,y:21,w:160,h:3}`(**파랑 `COLORS.blue`**), `RAID_BOSS_MAX={w:128,h:88}`, `raidSlots(raidId, ids)`(`mulberry32(hash(raidId))`, 정렬된 id 순서로 좌/우 밴드 2..74 / 126..184에 랜덤 x, row 0–2 깊이), `createRaidScene`, `applyRaidState`(1s 푸시 병합, damageDelta>0 → 타인 공격 프레임·보스 플래시), `tickRaid`, `raidLocalHit`(내 데미지 플로트 + 보스 플래시), `drawRaid`.
- 레이아웃: 드래그 스트립(캔버스 12px) 아래 게이지 2줄 → 보스(≤128×88, 발이 GROUND_Y, 중앙, 상단 ≥32 → 게이지와 절대 겹치지 않음) → 영웅들(14×14, scale 1, 뒤 row부터, **나는 마지막**) → 내 머리 위 **노란 화살표 5×3 스프라이트**(bob 애니) + `LV n`(`drawOutlinedText` export, **XP 바 없음**) → 내 데미지 플로트(별도 풀, 내 머리 위). 타인 12명 초과는 `+n` 텍스트. 흔들림 없음. 종료 시 VICTORY/DEFEAT 배너 재사용 후 필드 복귀.
- 보스 피격 = idle 프레임 0을 `tint: COLORS.white` 80ms + x 지터(세 번째 그리드 불필요).

### 4.2 `game.ts` 편집 목록
`GameOptions`(`:215-219`)에 `onRaidDamage?`; `let raid: RaidScene|null`(`:583`); `clearPresentation`에서 초기화; `attack()`(`:1073`) 맨 앞에 `if (raid) { battle이면 engine.raidAttack → raidLocalHit + onRaidDamage; return [] }`; `update()`(`:1083`) 맨 앞에 `if (raid) { tickRaid 실패 시 raid=null; return [] }`(PvP 재생 큐는 유지); `draw()`(`:1145`) 맨 앞에 `drawField → drawRaid → drawCounters → return`; 공개 API `raidState(view|null)`. `monsterScale()`은 손대지 않음(필드는 여전히 2×).

### 4.3 상단 중앙 카운트다운 + 인게임 픽셀 `참여` 버튼 (DOM, Codex 디자인)
`static/index.html:11` 옆 `<button id="raid-status" hidden>`; `style.css`: `top:26px`(드래그 스트립 아래), 중앙, `-webkit-app-region:no-drag`, 기본 `pointer-events:none`; `.alert`는 **픽셀 버튼 디자인**(3×5 폰트 팔레트, 2px 외곽선, 노랑/빨강 600ms 점멸, `image-rendering:pixelated`) + `pointer-events:auto`. `src/renderer/index.ts:70-78` 옆에서 `onRaidState`로 텍스트/클래스 전환(gathering·countdown → `레이드 hh:mm:ss`(서버 `now` 기준 오프셋 보정), confirming → `경고 · 참여` 버튼, battle/settled → 숨김 + `game.raidState(...)`), 클릭 → `stopPropagation` + `RAID_ACTION{confirm}` → 응답 즉시 `참여 완료`로 바뀜. 버튼 시안은 §6 예상 화면 게이트에 포함(Codex가 그림).

---

## 5. 메뉴 레이드 탭

- `static/menu.html:31-40` 9번째 탭 `레이드`, 패널 `#raid`; 560px 유지, `menu.css` 탭 패딩 8→6px(9×52+8×4=500<560). `PANELS`(`src/menu/index.ts:130`)에 `'raid'`, `activateTab`에서 `getRaidState`, `render()`에서 `updateRaid`.
- 새 파일 `src/menu/raid.ts` `mountRaid(doc, root, send) => (view: RaidLiveResponse|null, now) => void`. 카드 5장(현재 보스 + 순환 순서의 나머지 4장은 항상 실루엣·`???`): 실루엣 `raidBossCanvas`(scale 1 캔버스 + CSS 96px 폭 축소), 속성 배지, 조건 행 `○/✓ 레벨 30 이상 · 2/3`, `정원 k/N`, 우선창 안내, 카운트다운, 버튼 상태 `참여`(개인 자격) / `레이드 참여` / `참여 완료`(aria-disabled) / `정원 마감` / `전투 중` / `결과: 순위 k/N · 보상 수령 완료`. 1s 푸시에도 DOM 재생성·포커스 손실 없음(`contentKey` 가드).

### 5.2 픽셀 팝업 컴포넌트 (네이티브 팝업 대체, Codex 디자인)
- 새 파일 `src/menu/popup.ts` `mountPopup(doc, root) => { open({title, body, buttons:[{label, primary?, value}]}) : Promise<value>, close() }` — 메뉴 창(`영웅과 모험 기록`) 안에 오버레이로 뜨는 **픽셀 디자인 모달**(`static/menu.css`: 2px 계단 외곽선, 팔레트 색, 3×5 폰트 느낌의 제목, `role="dialog"`, `aria-modal`, 포커스 트랩, Esc = 취소). 한 번에 하나, 큐잉.
- 대체 대상: `src/main/ipc.ts:263`(진행 초기화/복원 확인), `:376`(임시 장비 소멸 확인), `:398`(장비 강화 확인) → main은 `dialog.showMessageBox` 대신 `IPC.CONFIRM` 요청을 메뉴 창에 보내고 팝업 결과를 받는다(메뉴 창이 없으면 취소로 처리 — 어차피 세 액션은 메뉴에서만 시작됨). 도난 `Notification`(`src/main/index.ts:80`, `thefts.ts` `notify`) → 인게임 상단 토스트(`#field-pvp-status` 재사용, 클릭 불필요) + 메뉴 열릴 때 팝업 1회. `Notification.isSupported()` 게이트와 `makeNotifier` 삭제. `share.ts:24`의 OS 파일 저장 대화상자는 유지.
- 레이드 사용처: confirming 팝업(`레이드 보스 출현 · 참여?` → `참여`/`나중에`), 결과 팝업(`순위 k/N · XP +a · G +b · 아이템`).
- 테스트: `tests/menuPopup.test.ts`(FakeDoc: 열기/닫기/버튼 값/포커스/큐), `tests/ipc.test.ts`(CONFIRM 왕복, 메뉴 창 없을 때 취소), `tests/tray.test.ts`/`tests/thefts.test.ts` 알림 경로 갱신.

---

## 6. 아트 + 예상 화면: Codex CLI 워크플로우 (개발 전 게이트) — **A단계**

A단계 산출물(모두 Codex가 그리고, 실제 코드로 남는다): 보스 5종·아이템 10종 스프라이트, **인게임 임시 화면**(카운트다운 / 경고 `참여` 버튼 / 전투 중 / 승리), **레이드 메뉴 화면**(5 카드 상태별), **픽셀 팝업**(레이드 참여·결과·진행 초기화·장비 확인 4종 시안). 사용자가 PNG를 보고 `docs/v0.12/RAID_ART.md`에 승인 줄을 쓰면 B단계가 시작된다.

### 6.1 스프라이트 규격 (Codex 브리프에 그대로 기재)
- 보스 5종: `src/renderer/sprites/raidBoss/{water,wind,dark,earth,fire}.ts`(레인 충돌 방지로 파일 분리), **96×64 ≤ 크기 ≤ 128×88 아트픽셀, scale 1로 그림**, idle 2프레임(차이 ≤15%), 팔레트 ≤10키(`COLORS.void` 외곽선 포함, 속성별 주 색상대, 하이라이트 1키), 바닥 행에 잉크. `src/renderer/sprites/raidBosses.ts`가 `registerSprites('raidBoss.<el>')` + `drawRaidBoss(ctx, element, frame, x, groundY, {tint?})`.
- 아이템 10종: `src/renderer/sprites/raidEquipment.ts`(`epicEquipment.ts`의 `brush` export 재사용), 16×16, 에픽 색 링 + 속성 악센트, `sprites/equipment.ts:118` 루프에 `RAID_CATALOG` 분기.
- 테스트: `tests/raidBosses.test.ts`(크기 범위·프레임·팔레트·색상대·그리기 rect 범위·tint), `tests/raidEquipment.test.ts`(10개, 팔레트 스왑 아님), 기존 `tests/sprites.test.ts` 스윕.

### 6.2 Codex 레인 루프 (`.harness/v12/codex-lane.mjs prompt|run|board <target> <round>`, 보스 5 + 아이템 1 + 인게임 화면 1 + 메뉴·팝업 화면 1 = 8레인, ≤3라운드)
```
git worktree add .worktrees/v12-art-water -b lane/v12-art-water
codex exec -C .worktrees/v12-art-water -s workspace-write --dangerously-bypass-hook-trust \
  -c 'mcp_servers={}' -c 'model_reasoning_effort="high"' -m "$CODEX_MODEL" --color never --json \
  --output-schema .harness/v12/codex/status.schema.json -o .agentdoc/<run>/codex/water-r1.jsonl - \
  < .agentdoc/<run>/codex/water-r1.prompt.md
```
1) 브리프(`.harness/v12/codex/{BOSS,ITEM,SCENE}_BRIEF.md`, 1라운드는 A/B 두 변형) → codex → 레인 안에서 `npx vitest run tests/raidBosses.test.ts tests/sprites.test.ts && npx tsc -p tsconfig.test.json`
2) `node .harness/v12/raid-preview.mjs board --lane <dir> --out .agentdoc/<run>/codex/<t>-r<n>/` → PNG 보드(1×/2×, 두 프레임, 피격 tint, 실루엣)
3) Claude 비전 크리틱(`.harness/v12/agents/art-critic.md`: A/B 선택 + 구체 수정 ≤5개, 파일 편집 금지) → `critique.md`
4) 2라운드 = 선택안 정제; 3라운드는 차단 지적이 남을 때만
5) Host가 `git merge --squash` → `art(V12-05x): raid boss water [codex]`
**화면 레인(V12-07a 인게임)**: Codex가 `src/renderer/raidScene.ts` + `raidBosses.ts` + `#raid-status` 픽셀 버튼 CSS(`static/style.css`, `static/index.html`)를 픽스처 데이터로 동작하게 작성. **화면 레인(V12-07b 메뉴·팝업)**: Codex가 `src/menu/raid.ts`(카드 5장 상태별) + `src/menu/popup.ts` + `static/menu.{html,css}`를 작성. 두 레인 모두 사용자가 요구한 "codex cli로 생성한 예상 화면"이며 목업이 아니라 실제 모듈이다.

### 6.3 예상 화면 게이트 `.harness/v12/raid-preview.mjs` (Host)
- `html`: esbuild로 `raidScene.ts`+`menu/raid.ts`+`menu/popup.ts`+`.harness/v12/fixtures/raid.mjs`를 `docs/v0.12/raid-preview.html`에 번들(v5 `render-preview.mjs` 방식). 상태 버튼: 메뉴-gathering(잠김/자격/충족·카운트다운/정원마감/전투 중/결과), 인게임 카운트다운, 경고 `참여` 버튼(클릭 대기 → 참여 완료), 전투 중(참여자 8명·나 3번 슬롯·플로트·HP 0.62·시간 0.45), 승리 배너, 픽셀 팝업 4종(레이드 참여·레이드 결과·진행 초기화 확인·장비 강화 확인).
- `capture OUT`: 설치된 `electron` 바이너리로 `.harness/v12/preview-shell.mjs` 실행 → 상태별 `capturePage()` PNG + `index.json`(PNG·소스 sha256).
- `verify RUN/preview/final.json`: `docs/v0.12/RAID_ART.md`의 `approved: <sha> by <user> at <ISO>` 줄이 현재 소스 해시와 일치해야 통과. **Host는 자기 승인 불가, 사용자가 PNG를 열어보고 승인 줄을 쓴다**(거절 시 `rejected:` + 새 라운드).
- 게이트(V12-08) 통과가 B단계 전체(V12-09…18)를 연다. A단계 안에서 코어(V12-04)·프로토콜(V12-02/03)은 아트와 병행.

---

## 7. 밸런스 프로토콜 (`docs/v0.12/EVALUATION_PROTOCOL.json` `raid` 블록, 에이전트 계산)

- **시뮬레이터** `.harness/v12/raid-balance.mjs`: v11 `balance.mjs`처럼 `src/core`를 후보 리터럴 치환 후 격리 컴파일. 로비는 v11 궤적 체크포인트(프로필별 시간대 [1,60h] 균등)에서 표본(ordinary/intermittent/high 0.6/0.3/0.1), 크기 3/8/20, 개인 연타 = 프로필 속도×U(0.7,1.3), 확정 후 노쇼 20%·20s 후 AFK 10%, 크리/피버는 `engine.raidAttack`(주입 RNG), 100ms 틱. 고래 로비(high 1 + intermittent 나머지) 별도. 탐색 시드 130001–130020, 홀드아웃 136001–136100(v11 소비 범위 등재).
- **등록 목표**: 처치 확률 3명 0.50–0.80 / 8명 0.60–0.85 / 20명 0.65–0.90; 처치 시간 p50 ∈ [0.40,0.80]·battleMs, p90 ≤ 0.95; 균일 로비 1위 기여 ≤0.45(8명)/≤0.25(20명); 고래 로비 처치확률 초과 ≤0.15; 처치 보상 = 해당 레벨 ordinary **2시간 수입 ±20%**(xpLevels·goldKills로 환산), 실패 보상 = 0.3시간 ±20%; 음수 지갑·중복 아이템·이중 수령 = 0.
- 후보 ≥3(`raid-1` 기본, `raid-2` clearRatio 5500·battle 180s·capacity 16, `raid-3` clearRatio 7500·battle 90s·xpLevels 4). 선택: 게이트 전부 통과 → max|처치확률−0.7| 최소 → 1위 기여 최소 → 변경 파라미터 수 → id. 홀드아웃은 선택 후 1회.
- **독립 검증** `.harness/v12/raid-balance-verify.mjs`(+`.test.mjs`): `RAID_PARAMETERS`를 AST로 파싱(비리터럴 거부), 자체 공식으로 bossHp·보상 재산출, 홀드아웃 재실행, 시드 범위 중복 거부.
- **크리틱 공격 목록 추가**(`agents/critic.md`): 고래 독식, 노쇼로 HP 부풀림(joined≠confirmed), 빈/최소 미만 로비, 시계 드리프트(서버 `now` 오프셋), 이중 수령, 클릭 홍수(서버 클램프, 로컬 플로트는 표시됨을 공개), settled 이후 늦은 RAID_STATE, 9탭 줄바꿈, 플로트/마커가 게이지 침범, 경고 버튼이 드래그 스트립에 가려짐.

---

## 8. 하네스 v12 (`.harness/v12/`, v11 포크) 와 문서

| 파일 | v11 대비 |
|---|---|
| `run.mjs`, `run.test.mjs` | version 12, `INPUT_PATHS` → `.harness/v12`, `docs/v0.12/{CONTRACT.md,EVALUATION_PROTOCOL.json,BALANCE_CANDIDATE.json,PERFORMANCE_PROTOCOL.json,RAID_ART.md}`; owner에 `Codex` 허용 |
| `config.json` | 아래 태스크 그래프 |
| `HARNESS.md` | 역할 + Codex 레인 + 프리뷰 게이트 + 배포/DB 회전 + 명령 목록 |
| `raid-balance.mjs`, `raid-balance-verify(.test).mjs` | 신규(§7); `balance-verify.mjs`는 그대로(필드 곡선 v11 승자 유지) |
| `runtime.mjs`, `ui-cases.mjs` | `raidHudCases`, `raidBattleCases`(DESMON_SKIP_NET 픽스처 서버가 `RAID_STATE` 푸시) |
| `final-check.mjs`, `release.mjs` | `'0.11.0'→'0.12.0'`, `NATIVE_SCENARIOS += raid-hud-states, raid-battle`, `LATENCY_FAMILIES += raid-click, raid-confirm`, `REVIEW_SCOPES += raidBalance, raidArt, raidServer`, `verifyPreviewApproval`, 배포 검증(`/healthz` sha + probe) |
| `codex-lane.mjs`, `raid-preview.mjs`, `preview-shell.mjs`, `codex/*`, `fixtures/raid.mjs` | 신규(§6) |
| `loop.mjs` (**무중단 오케스트레이터**, 신규) | `run.mjs next`가 주는 준비 태스크를 의존성 순으로 워크트리(`.worktrees/<id>`, 브랜치 `lane/<id>`)에 자동 디스패치: owner `Codex` → `codex exec`(§6.2 플래그), 그 외 → `claude -p`(owner별 헌장 `agents/<owner>.md` + 태스크 블록 + AC를 프롬프트로, `--output-format json`). 레인 종료 시 `check ac` → `check gates` → `verify` → squash 머지 → 다음 태스크. 실패는 같은 태스크를 최대 3회 재시도 후 `block`(환경 증거 3건). **사람이 필요한 지점은 V12-08(승인 줄) 하나**: `loop.mjs --stage A`는 V12-08에서 멈추고, `loop.mjs --stage B`는 V12-08이 verified면 V12-18까지 멈추지 않고 돈다(`.agentdoc/<run>/loop.log`, 재개 가능). v3 `iterate.sh`의 spawn/merge 로직을 가져오되 플랜 파일 대신 `config.json`+`loop.json`을 읽는다. |
| `agents/` | balance/critic/designer/playtester 복사 + `gfx-worker.md`(보스 128×88 예외 조항) + `art-critic.md` |
| `vendor/` | v11 서브셋 + 업스트림 `skills/disciplines/create-game-assets/SKILL.md`(+references) 추가, `SOURCES.json` 해시 갱신(`validateVendor` 통과) |
`docs/v0.12/`: `CONTRACT.md`(v11 28줄 형식: 서문 / Behavior / Registered targets / Verification), `EVALUATION_PROTOCOL.json`, `BALANCE_CANDIDATE.json`, `RAID_ART.md`, `raid-preview.html`, `ACCEPTANCE.md`, `HANDOFF.md`, `BALANCE_REPORT.md`, `PERFORMANCE_PROTOCOL.json`, `REVIEWS/`. `README.md` 최상단에 v0.12.0 절(한국어). `SPEC.md` F82+ 행(레이드).

### 태스크 그래프 (`config.json`)
| id | owner | deps | 주요 files | ac |
|---|---|---|---|---|
| V12-00 baseline | Host | – | 미커밋 HUD diff 커밋, `git tag v0.11.0 86b1d97`, `package.json` 0.12.0, `src/main/tray.ts` | `npm test` |
| V12-01 harness | Host | 00 | `.harness/v12/**`, `docs/v0.12/CONTRACT.md`, vendor | `node --test .harness/v12/*.test.mjs` |
| V12-02 raid protocol | Balance | 01 | `docs/v0.12/EVALUATION_PROTOCOL.json`, `BALANCE_CANDIDATE.json` | `node .harness/v12/raid-balance.mjs validate` |
| V12-03 protocol review | Critic | 02 | `docs/v0.12/REVIEWS/PROTOCOL.md` | `final-check.mjs review-protocol {runDir}` |
| V12-04 core rules + shared types | Balance | 01 | `src/core/raid.ts`, `src/core/engine.ts`, `src/core/equipment.ts`, `src/core/battle.ts`, `src/core/collection.ts`, `src/shared/api.ts`, `tests/raidCore.test.ts` | vitest |
| V12-05a–e boss art | Codex | 01 | `src/renderer/sprites/raidBoss/<el>.ts`, `tests/raidBosses.test.ts` | `npx vitest run tests/raidBosses.test.ts tests/sprites.test.ts` |
| V12-06 item art | Codex | 04 | `src/renderer/sprites/raidEquipment.ts`, `sprites/equipment.ts`, `tests/raidEquipment.test.ts` | vitest |
| V12-07a 인게임 임시 화면 | Codex | 04, 05, 06 | `src/renderer/raidScene.ts`, `sprites/raidBosses.ts`, `sprites/index.ts`, `hud.ts`(export), `static/style.css`, `static/index.html`, `tests/raidScene.test.ts` | vitest |
| V12-07b 레이드 메뉴 화면 + 픽셀 팝업 | Codex | 04, 05, 06 | `src/menu/raid.ts`, `src/menu/popup.ts`, `static/menu.html`, `static/menu.css`, `tests/menuRaid.test.ts`, `tests/menuPopup.test.ts` | vitest |
| **V12-08 preview gate (A단계 종료)** | Host + **사용자 승인** | 07a, 07b | `docs/v0.12/RAID_ART.md`, `docs/v0.12/raid-preview.html` | `raid-preview.mjs verify {runDir}/preview/final.json` |
| V12-09 server | Host | 03, 04 | `src/server/{raid,app,store,pgStore,probe}.ts`, `tests/server/raid.test.ts`, `pgStore.test.ts` | `npx vitest run tests/server` |
| V12-10 client net/watcher/IPC/claim + 네이티브 팝업 제거 | Host | 04, 08, 09 | `src/main/{net,raid,coordinator,recovery,ipc,index,thefts}.ts`, `src/preload`, `src/shared/ipc.ts`, `src/renderer/global.d.ts`, `tests/raidWatcher.test.ts`, `tests/ipc.test.ts`, `tests/net.test.ts`, `tests/recoveryRaid.test.ts`, `tests/thefts.test.ts` | vitest + `grep -rn "showMessageBox\|new Notification" src/main` 결과 0 |
| V12-11 renderer integration | Designer | 08, 10 | `src/renderer/game.ts`, `src/renderer/index.ts`, `tests/renderer-raid.test.ts` | vitest |
| V12-12 menu wiring | Host | 08, 10 | `src/menu/index.ts`, `tests/menu.test.ts` | vitest |
| V12-13 balance candidates | Balance | 03, 04, 09 | `.harness/v12/raid-balance.mjs` | `raid-balance.mjs explore→select {runDir}/raid-balance` |
| V12-14 balance verify | Critic | 13 | – | `raid-balance-verify.mjs {runDir}/raid-balance/final.json` |
| V12-15 native scenarios | Host | 11, 12 | – | `runtime.mjs verify {runDir}/native/final.json` |
| V12-16 deploy + DB rotation | Host (`push: yes`) | 09, 14 | `AGENTS.md`(DB_*/DEPLOYED_SHA), `SPEC.md`, `README.md` | `curl $SERVER_URL/healthz` sha 일치 + `node dist/electron/server/probe.js $SERVER_URL`(raid/live 1회 포함) |
| V12-17 reviews | Critic | 14, 15, 16 | `docs/v0.12/REVIEWS/*` | `final-check.mjs reviews {runDir}` |
| V12-18 release | Host | 17 | `docs/v0.12/{ACCEPTANCE,HANDOFF,BALANCE_REPORT}.md` | `final-check.mjs final {runDir}` (smoke + mac + windows collect) |

---

## 9. 배포와 DB 회전 (V12-16)

1. DB 만료(2026-10-03) 전에 회전: 현재 레이드 phase가 gathering/skipped인 시점에 `render postgres delete dpg-dacd4k2jnfac73c43llg-a --confirm` → `DESMON_SRV_NAME=desmon-server-v3 DESMON_BRANCH=v3 bash .harness/v3/loop/render-bootstrap.sh`(이름 `desmon-db`로 재생성) → 서비스 `DATABASE_URL` 갱신 여부 확인(안 되면 `render services env set`). 플레이어·리더보드·레이드 기록은 초기화됨(README에 공지). v2 서비스(`desmon-server`)는 참고용이라 그대로 둔다.
2. `git push origin HEAD:v3` → `render deploys create srv-dacmju6k1f9s73csi2v0 --wait --confirm` → `/healthz` sha 확인 → probe.
3. `AGENTS.md`의 `RENDER_POSTGRES_ID/DB_CREATED/DB_EXPIRES/DEPLOYED_SHA` 갱신. `RAID_EPOCH` 고정이라 회전 후에도 주기 번호는 이어진다.
4. 구 클라이언트는 새 라우트/테이블에 영향 없음(가산적). 새 클라이언트가 구 서버를 만나면 404 → 레이드 탭 `준비 중`.

---

## 10. 검증

- 게이트(정확히): `npm test && npm run lint && npm run typecheck`
- 서버 vitest(`tests/server/raid.test.ts`, 주입 시계): 전체 라이프사이클(조건→공개→우선창→정원→확정→HP 고정→처치→순위/보상 결정성), skipped 규칙 3종, 정원 초과 409, attack 검증(형태/seq/중복/클램프/전투 후), 타임아웃 무처치, claim 멱등·만료·타인 거부·`previous`, 트랜잭션 우회(transaction이 throw해도 raid 라우트 200), 레이트 예산 분리, flush 주기·재시작 복구, `heroicAttack == displayedHeroAttack`, 튜너블 불변식.
- 클라이언트 vitest: 워처 주기 전환·재전송·실패 유지·재진입(알림 경로 없음); 검증기 거부; claim 크래시 복구 정확히 1회; IPC 핀·발신자 검사; `raidReward` 코어 적용; `IPC.CONFIRM` 왕복과 메뉴 창 부재 시 취소; `src/main`에 `showMessageBox`/`new Notification` 0건(소스 핀 테스트).
- 렌더러/메뉴 vitest: 보스 범위·scale 1·z순서·시드 슬롯 결정성·마커/LV/플로트 위치·게이지 색/좌표·XP 바 없음·배너; 레이드 중 `attack`→`onRaidDamage`만 호출되고 필드 몬스터 HP/XP 불변; `raidState(null)` 복귀; 9탭·카드 상태·실루엣 tint·포커스 유지.
- 네이티브(`runtime.mjs`): `raid-hud-states`(픽스처 gathering→countdown→confirming, `#raid-status` 텍스트/클래스, 실제 `sendInputEvent` 클릭 → main에서 confirm 관측, family `raid-confirm`), `raid-battle`(30클릭/5s → `RAID_DAMAGE` 건수 일치, 캡처 픽셀: HP 행 빨강·시간 행 파랑·내 슬롯 위 노랑 마커·100ms 내 플로트, family `raid-click`; settled → VICTORY → 필드 복귀), v11 5개 시나리오 유지.
- 아트: 비전 크리틱 보드 + **사용자 승인 줄**(`RAID_ART.md`).
- 릴리스: `node .harness/v12/release.mjs RUN smoke|mac|windows|collect`, 배포 `/healthz` + probe.

## 11. 진행 순서 (2단계, 무중단)
```
node .harness/v12/run.mjs init .agentdoc/v12-<ts>
node .harness/v12/loop.mjs .agentdoc/v12-<ts> --stage A   # V12-00…07b 자동, V12-08에서 정지
  → 사용자: .agentdoc/v12-<ts>/preview/*.png 확인 → docs/v0.12/RAID_ART.md 에 approved: 줄 (거절 시 rejected: + 레인 재실행)
node .harness/v12/loop.mjs .agentdoc/v12-<ts> --stage B   # V12-09…18 릴리스·배포까지 무중단
```
- A단계: V12-00/01(베이스라인·하네스) → V12-02/03(프로토콜 등록·리뷰) ∥ V12-04(코어) ∥ V12-05a–e(보스 아트) → V12-06(아이템) → V12-07a/07b(인게임 임시 화면·레이드 메뉴 화면·픽셀 팝업) → **V12-08 사용자 확정**.
- B단계: V12-09/10(서버·클라이언트·네이티브 팝업 제거) ∥ V12-13/14(밸런스) → V12-11/12(통합) → V12-15(네이티브 시나리오) → V12-16(DB 회전·배포) → V12-17/18(리뷰·릴리스). 중간에 사람이 답할 지점 없음; 막히면 `block` 증거를 남기고 다음 준비 태스크로 진행, 마지막에 `handoff.md`에 미완 목록.

의도적으로 뺀 것: WebSocket/SSE(플레이어 수 규모에서 폴링으로 충분), 네이티브 알림·다이얼로그(픽셀 팝업으로 대체, OS 파일 저장창만 예외), 보상 수령 버튼(자동 수령), 레이드 히스토리 UI, 보스 전용 피격 프레임(tint로 대체), 타인 영웅 장비 오버레이(와이어에 로드아웃 없음). 필요해지면 그때 추가.
