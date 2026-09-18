--- a/README.md
+++ b/README.md
@@ -11,7 +11,35 @@
 animated **replay** on the overlay. Electron + TypeScript; all art and sound
 are generated in code (no binary assets).
 
-## v0.5 — 골드, 반복 환생과 새로운 발견
+## v0.7 — 동료 성장, 실제 획득 도감과 지정 대전
+
+v0.7은 개발·검증 중이며 **최종 출시 검증은 PENDING**입니다.
+[검증 상태](docs/v0.7/ACCEPTANCE.md), [현재 인계](docs/v0.7/HANDOFF.md),
+[개발 계획](docs/v0.7/DEVELOPMENT_PLAN.md)을 확인하세요.
+
+- 동료의 게임상 Lv10 상한을 없앴습니다. 레벨은 1–9,007,199,254,740,991의 안전 정수로
+  저장·서버·응답에서 같은 범위를 사용하며, 증가 결과가 범위를 넘으면 재료와 상태를 보존합니다.
+  **동료 환생은 Lv10 이상 → Lv1·별+1**입니다. 확인 화면에 전후 힘을 보여주며,
+  기본 힘은 이전의 `2 / 현재 레벨`로 줄어듭니다(Lv10은 1/5). 별도 확인 또는 취소가 필요하고,
+  확인 중 대상이 바뀌거나 사라지면 다시 확인해야 합니다.
+- 도감은 **영웅을 실제 선택하거나 몬스터를 처치했을 때** 공개합니다. 기존 영구 영웅 보유 기록도 인정합니다.
+  후보 제시·필드 등장만으로 공개하지 않으며 이름·설명·미확인 알림·표시한 발견 확인(ACK)·목표 완료에
+  같은 판정을 사용합니다. 레거시에서 획득 증거가 없는 카드는 실루엣으로 돌아가고 첫 실제 획득을 다시 알립니다.
+- PvP 목록의 각 행에서 영웅·동료 파티·순위·승패를 보고 상대를 지정합니다. 미리보기와 실제 대전 상대를
+  일치시키고, 목록 갱신 중 선택·키보드 포커스를 유지합니다. 삭제·만료·오류는 새 선택이나 재시도로 안내합니다.
+- 환생 준비·후보·휴식·보류 안내는 실제 진행 판정을 공유합니다. 콘텐츠의 **자격 충족·제시/등장·선택/처치**는
+  구분하며, 기존 콘텐츠를 성과 조건으로 연결하고 새 강제 시간 제한은 추가하지 않습니다.
+  첫 환생 p50 45–60분·100개 중90개가90분 이내 성공, 마지막 named 자격 p50 8–12시간은
+  검증 목표입니다. 탐색 후보나 과거 결과를 최종0.7 통과로 표시하지 않습니다.
+
+최종0.7 소스의 실제5/15/30분×3프로필9개와 별도연속180분(합계330분) 자연 관측,
+정책별100seed×12시간 측정, 네 역할 독립 감사, smoke와 실제 패키지는 아직 최종 검증되지 않았습니다.
+운영 서버의 고레벨 호환도 출시 전에 확인해야 하며 운영 검증은 PENDING입니다.
+사람의 재미·업무 방해 관찰은 `humanChecks=PENDING`입니다. 커밋·푸시·운영 배포는 자동 수행하지 않습니다.
+
+## v0.5 — 골드, 반복 환생과 새로운 발견 (이전 기록)
+
+아래는 당시 업데이트 기록입니다. 현재 변경은 위 v0.7 설명을 함께 확인하세요.
 
 V4의 영웅 환생에 골드 상점, 반복 중첩과 조건부 발견을 더했습니다.
 [기획서](.harness/v5/reference/GAME_DESIGN_V5.md), [검증 결과](docs/v0.5/HANDOFF.md),
@@ -74,7 +102,7 @@
 sprite pixel a chunky 2×2 block — the hero starts as a small RPG adventurer and evolves into one of 50 forms, the five monsters original Pokémon/Digimon-style creatures, all drawn as
 code by the Codex CLI graphics worker): drag it by the invisible
 24-pixel strip along its top edge. A slime icon in the menu
-bar tray hosts the menu (`DesMon v0.5.0`, input-mode status,
+bar tray hosts the menu (`DesMon v0.7.0`, input-mode status,
 Collection & Battle…, Reset Progress, Quit).
 
 ## Gameplay
@@ -101,7 +129,9 @@
   scale) and a shockwave on spawn.
 - **Capture & companions.** Killing a boss captures it as a **companion**
   with a 35 % chance (sparkle effect). Companions live in a roster of up to
-  30. Companion power is `max(1, ⌊bossMaxHp/20⌋) × level × 2^stars`.
+  30. Companion power is `max(1, ⌊legacyBaseHp/20⌋) × level × 2^stars`.
+  `legacyBaseHp` is the original normal-monster HP curve at the capture depth;
+  field progression tuning does not change the power of owned companions.
 - **Party of 5.** The **party** is the 5 companions with the highest power
   *after* the type chart is applied against the monster currently on screen —
   so it is re-picked automatically on every volley and visibly changes when a
@@ -114,10 +144,15 @@
   ×3 damage for both hero and companions for 5 seconds, followed by a
   10-second cooldown before it can trigger again.
 - **Companion lifecycle.** In the Collection window a companion can be
-  **consumed** (feed another companion to raise its level, max 10),
+  **consumed** (feed another companion to raise its level; no gameplay level cap),
   **fused** (two of the same species and star count → one with +1 star),
-  **reincarnated** (a level-10 companion → level 1 with +1 star) or
-  **sacrificed** (deleted for `1 + stars` souls).
+  **reincarnated** (level 10 or higher → level 1 with +1 star) or
+  **sacrificed** (deleted for `1 + stars` souls). Levels must remain positive
+  safe integers, at most 9,007,199,254,740,991; an overflowing operation
+  changes neither the companions nor its materials. Reincarnation shows the
+  before/after power and requires a separate confirmation. Its base power
+  becomes `2 / previous level` of the original (one fifth at level 10), so
+  gaining a star does not mean an immediate power increase.
 - **Rebirth.** From monster index 40 you may **rebirth**: the run resets to
   level 1 / monster 0 but you gain `⌊index/8⌋` **souls**, and companions,
   coins, trinkets, kills and your deepest index are kept. Souls multiply all
@@ -132,16 +167,18 @@
 ## Collection & Battle window
 
 The tray item **`Collection & Battle…`** opens a small framed window
-(420×640) with four tabs:
-
-- **영웅** — hero damage, three reincarnation previews, defer/gold reroll, and the 50-form collection.
+(420×640) with seven tabs:
+
+- **영웅** — hero damage, three reincarnation previews, and defer/gold reroll.
+- **상점** — weapon training, rare lures, and their current costs.
+- **도감** — hero/monster acquisition records, unread discoveries, a free goal, and owned hero equipment.
+- **내 기록** — editable nickname, play time, kills, and reincarnation history.
 - **Roster** — one card per companion with its species art, type badge,
   level, stars and power in A–Z notation, a `★ PvP` mark when it is in your
   PvP party, the Consume / Fuse / Reincarnate / Sacrifice buttons, and
   Rebirth (enabled from monster index 40). Changes apply to the running game
   and are saved immediately.
-- **Ranking** — the global leaderboard (see below), with your row
-  highlighted, plus the editable nickname field.
+- **Ranking** — the global leaderboard (see below), with your row highlighted.
 - **Battle** — asynchronous PvP against another player (see below).
 
 The tray item is the only way to open it, and it is never opened during
@@ -154,9 +191,12 @@
 
 1. **Opponent list** loads up to 50 other players, showing each hero, deployed
    party, rank and server-recorded wins/losses. Select a row to request a
-   fresh match preview and arrange your party. An empty list asks you to
-   refresh later. Previews expire after 2 minutes; select again when expired.
-   The old random-match API remains available for older clients.
+   fresh match preview and arrange your party. The response must identify the
+   exact selected player. Selection and keyboard focus survive list updates;
+   Tab, Enter and Space work on the selection buttons. A deleted focused row
+   returns focus to refresh. An empty list asks you to refresh later. Previews
+   expire after 2 minutes; select again when expired or after an error clears
+   the preview. The old random-match API remains available for older clients.
 2. **Party editor.** Five slots hold the party you will attack with. Click
    roster cards to pick or drop members (max 5), press **Auto** to fill them
    with your 5 strongest, and **Save party** to store the choice in
@@ -215,10 +255,14 @@
 npm run package
 ```
 
-This produces, under `release/`:
-
-- `release/DesMon-0.6.0-arm64.dmg`
+With the version fixed at 0.7.0, packaging writes these paths under `release/`
+(final artifact verification is PENDING):
+
+- `release/DesMon-0.7.0-arm64.dmg`
 - `release/mac-arm64/DesMon.app`
+
+The `.app` path is reused by later builds and is not a versioned v0.6 download.
+Use a versioned DMG and its verification record to identify a historical build.
 
 The build is intentionally **unsigned and un-notarized**
 (`mac.identity: null`, `notarize: false`, `hardenedRuntime: false`, and
@@ -305,8 +349,11 @@
 [실행 방법](.harness/v5/AUDIT.md)을 참고하세요. 실제 5/15/30분 플레이와 시간 가속
 시뮬레이션을 구분하며, 사람이 느끼는 재미는 별도 관찰로 남깁니다.
 
-분석에 따른 다음 개발 범위와 완료 조건은 [v0.6 개발 계획](docs/v0.6/DEVELOPMENT_PLAN.md)에 정리했습니다.
-새 세션에서 개발 루프 구성부터 구현·검증·패키징까지 진행하려면 [v0.6 시작 프롬프트](docs/v0.6/START_PROMPT.md)를 사용합니다.
+현재 개발 범위와 완료 조건은 [v0.7 개발 계획](docs/v0.7/DEVELOPMENT_PLAN.md), 재개 순서는
+[v0.7 LOOP](docs/v0.7/LOOP.md)와 [HANDOFF](docs/v0.7/HANDOFF.md)를 따릅니다.
+[V7 호스트 실행 계약](.harness/v7/HARNESS.md)은 기존 `.harness/CURRENT=v3`와 별개입니다.
+하네스 준비·설계 검토·실제 원본 분석·최종 출시 검증을 구분합니다.
+이전 [v0.6 개발 계획](docs/v0.6/DEVELOPMENT_PLAN.md)과 [시작 프롬프트](docs/v0.6/START_PROMPT.md)는 당시 기록으로 보존합니다.
 
 ## Windows
 
@@ -314,7 +361,7 @@
 **config only**, per spec: no Windows build is produced, tested, or
 supported in this run. `npm run package` targets macOS arm64 exclusively.
 
-## v0.6: 발견 기록과 다음 목표
+## v0.6: 발견 기록과 다음 목표 (이전 기록)
 
 초과 포획 보류는 seed별 사전 채택 기준을 충족하지 못해 v0.6에서 제외했습니다. 기존 초과 포획 방출·영혼 정산은 유지합니다.
 
@@ -326,4 +373,4 @@
 
 [v0.6 검증 상태](docs/v0.6/ACCEPTANCE.md), [실험 결과](docs/v0.6/EXPERIMENT_RESULTS.md), [인계](docs/v0.6/HANDOFF.md), [개발 루프와 재개](docs/v0.6/LOOP.md)를 참고하세요. 실제 사람의 재미·업무 방해 관찰 결과는 기술 검증과 구분해 기록합니다.
 
-v0.6은 기술 검증을 마친 macOS ARM64 출시 후보입니다. [0.6.0 DMG](release/DesMon-0.6.0-arm64.dmg)와 [앱](release/mac-arm64/DesMon.app)을 생성하고, 격리된 구세이브의 실제 저장·재시작 보존을 확인했습니다. 사람 재미 가설은 PENDING이며, 최초 idle 관측의 원인 미확정 입력 불일치와 한 번의 재검증 이력은 [인계](docs/v0.6/HANDOFF.md)에 남겼습니다.
+v0.6은 당시 기술 검증을 마친 macOS ARM64 출시 후보였습니다. [0.6.0 DMG](release/DesMon-0.6.0-arm64.dmg)와 앱을 생성하고, 격리된 구세이브의 실제 저장·재시작 보존을 확인했습니다. `release/mac-arm64/DesMon.app`는 이후 패키징에서 바뀌는 공용 출력 경로이므로 과거0.6 앱의 다운로드 링크로 사용하지 않습니다. 사람 재미 가설은 PENDING이며, 최초 idle 관측의 원인 미확정 입력 불일치와 한 번의 재검증 이력은 [인계](docs/v0.6/HANDOFF.md)에 남겼습니다.
