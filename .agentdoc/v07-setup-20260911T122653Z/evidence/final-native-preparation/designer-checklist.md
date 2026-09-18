# 최종 0.7 Native 관찰 체크리스트 — 실행 전 준비

실제 Designer `/root/designer`의 읽기 전용 준비다. 현재 `e2e.mjs`, `e2e-matrix.mjs`, `electron-e2e.cjs`, `journey.cjs`와 메뉴 UI, 기존 테스트·README 준비 노트를 대조했다. 이 문서만 새로 작성했으며 빌드·테스트·게임·측정·검증1–100 결과 열람은 하지 않았다. 아래 항목은 **모두 최종 실행 전 PENDING**이다. 기존 preflight 성공이나 탐색 성과를 최종0.7 증거로 옮기지 않는다. 최종 지문 동결 후 발급될 실제 prompt/template에 대한 역할 응답은 별도다.

## 실행 입력과 보존

- [ ] Host가 채택한 값과 생산/컴파일 export가 공식 프로토콜의21키에 일치한다. README·package/lock의0.7.0 고정 및 작업 AC와 `npm test && npm run lint && npm run typecheck`는 동일 최종 소스에서 확인한다. 이 준비 문서는 채택·버전 변경 완료를 주장하지 않는다.
- [ ] 실행 전 현재 측정/Native PID·PGID와 사용자 DesMon 프로세스를 구분한다. 과거 PID를 현재 신원으로 가정하거나 사용자 앱을 종료하지 않는다. 기존 사용자 저장과 `.harness/CURRENT=v3`, v5 기록, 기존 release 산출물 보존 근거는 Host가 유지한다.
- [ ] 출력/로그/스크린샷 원본은 새 경로에 만든다. 기존 `journey.json`은 e2e 실행기가 덮어쓰지 않는다. 기존 matrix 지문이 다르면 새 디렉터리를 사용하고 등록 AC 경로의 원본·계약 변경은 Host가 관리한다.
- [ ] 도구는 실행마다 빌드하고 전후 S/E 지문을 확인한다. 관측 중 제품·프로토콜·평가기·디자인 입력을 바꾸지 않는다. 긴 관측과 다른 Native/패키지 앱 실행을 겹치지 않는다.

실행기는 `main/index`를 가져오지 않고 생산 BrowserWindow/preload/renderer/IPC/save만 사용한다. 매 프로세스가 `desmon-e2e-*` 임시 userData를 만들고 자기 임시 디렉터리만 정리한다. `SMOKE=1`, 서버 URL 비활성, 전역 입력 훅 없이 합성 입력을 사용하며 예상하지 않은 HTTP(S) 요청은 취소하고 오류로 남긴다. 이 경로는 실제 앱의 tray/startup/smoke 종료 경로와 별개다.

## Host가 사용할 기존 명령

저장소 루트에서 실행한다. 아래 명령은 이 준비 중 실행하지 않았다. 경로가 이미 존재하면 원본을 보존한 Host의 등록 경로 결정을 먼저 따른다.

```sh
node .harness/v7/loop/develop.mjs check .agentdoc/v07-setup-20260911T122653Z V07-06 integration
node .harness/v7/loop/e2e-matrix.mjs run .agentdoc/v07-setup-20260911T122653Z/evidence/native
node .harness/v7/loop/e2e-matrix.mjs status .agentdoc/v07-setup-20260911T122653Z/evidence/native
node .harness/v7/loop/e2e-matrix.mjs verify .agentdoc/v07-setup-20260911T122653Z/evidence/native
node .harness/v7/loop/develop.mjs check .agentdoc/v07-setup-20260911T122653Z V07-07 matrix
```

V07-06 integration의 실제 등록 하위 명령은 `node .harness/v7/loop/e2e.mjs .agentdoc/v07-setup-20260911T122653Z/evidence/integration/journey.json 0 active`다. **0분은 fixture 진단만** 수행하므로 자연 관측이나330분의 일부가 아니다. release 단계의 V07-07에는 실제 승급·선행 작업 확인이 필요하다. `status`는 `matrix-state.json`이 생긴 후 읽는다.

재개 명령도 동일한 `e2e-matrix.mjs run <같은 directory>`다. `matrix-state.json.running`의 PID=PGID 전체가 살아 있으면 실행기는 중복 시작을 거부한다. wrapper가 끝나도 Electron 후손이 살아 있는 그룹은 종료로 간주하지 않는다. 종료된 중단 원본은 attempts에 보존하며 같은 지문에서 **실패 조합 전체를 새 파일로** 다시 실행한다. 부분180분에 남은 시간만 붙이지 않는다. 완료 조합만 hash/S/E/exit0/completion/status를 확인해 재사용한다.

## 자연 관측: 먼저, 실제 벽시계로

| 순서 | 조합 | 입력과 메뉴 정책 | 실제 최소 관측 |
| --- | --- | --- | ---: |
| 1–3 | 5분 active / idle / intermittent | 메뉴 선택 없음 | 15분 |
| 4–6 | 15분 active / idle / intermittent | 메뉴 선택 없음 | 45분 |
| 7–9 | 30분 active / idle / intermittent | 메뉴 선택 없음 | 90분 |
| 10 | 별도180분 active | 10분마다 실제 영웅 메뉴 방문 | 180분 |

합계 최소330분은 자연 관측 시간이다. 빌드·창 준비·각 실행 뒤 진단 시간은 추가된다. active는 약500ms 간격에 키보드/마우스를 번갈아 내보내고, intermittent는 매60초의 앞15초에만 같은 입력을 낸다. idle은 **신규 저장에서 입력0개**이며 이전 활동 후 방치가 아니다. 생산 renderer의 실제 RNG/벽시계를 사용하므로20/100 seed 분포를 이10개에서 추정하지 않는다.

- [ ] 각 원본에 독립 `sessions[0]` 하나, `mode=real-time`, 정확한 minutes/profile, `completion=completed`, 실제 elapsedMs 이상이 있다. 시작/끝 level·kills·coins·companions·reincarnations·playTime·공개/획득 수와 약30초 timeline을 보존한다.
- [ ] 짧은9개의 `journeyPolicy=observe-only`, `menuVisits=[]`다. 준비가 되어도 자동 환생시키지 않는다. 자연 진행 중 fixture save, 보상/레벨 주입, 시간 가속 또는 강제 관리 행동이 없다.
- [ ] 긴 실행의 `journeyPolicy=menu-reincarnation-10m`, 예약은10/20/…/180분의 **18회**다. 최종180분 방문은 입력 loop가 끝난 직후에도 수행하며 빠뜨리지 않는다.
- [ ] 매 방문은 실제 `#tab-hero`와 열기/첫 선택 버튼을 native click으로 조작한다. 준비되지 않으면 `not-ready`, 준비되면 `selected`와 실제 formId·전후 환생횟수를 기록한다. 환생 횟수는 선택 때만 정확히+1이며 이전 방문 및 세션 끝과 이어진다.
- [ ] 방문 시작/완료는 예약 시각보다 빠르지 않고 예약+30초 이내다. 이30초는 실행기의 관측 허용 범위이며 제품에 추가하는 대기/시간 제한이 아니다.
- [ ] 긴 실행에 실제 첫 선택이 존재하고 `firstReincarnationElapsedMs`는 첫 선택 완료 시각이다. `firstReadyElapsedMs`는 약30초 표본과 메뉴 직전/선택 직전의 **최초 관측**이며 정확한 엔진 준비 전이 시각으로 쓰지 않는다. 늦은 환생 관측으로 최초값을 덮지 않는다.
- [ ] `real-time-observation`이 통과하고 natural menu 스크린샷 `natural-menu-10m`…`180m`, 마지막 `${minutes}m-${profile}` 필드를 구분한다. UI의 다음 요구 레벨·준비/휴식·선택 가능한 상태를 화면과 당시 상태에 맞춰 읽는다.
- [ ] 실패·중단·렌더러 소멸·로드 오류·예상하지 않은 네트워크·watchdog는 원본 errors와 `.failure.txt`/로그에 남긴다. 이후 진단 성공으로 자연 실패를 가리지 않는다.

## 자연 관측 이후 fixture 진단

`electron-e2e.cjs`는 자연 세션을 완료한 뒤 `loadFixture(DEFAULT_SAVE)`부터 진단을 시작한다. `journey.cjs`의 모든 진행·고레벨·온라인 상대는 합성 상태다. 새 보상을 자연 획득으로 세지 않는다. 아래 표는 `REQUIRED_NATIVE_CHECKS`의28개 ID를 전부 포함한다. 숫자만 확인하지 말고 각 details와 대응 스크린샷을 읽는다.

| 필수 ID | 확인할 실제 근거 |
| --- | --- |
| `native-overlay`, `preload-isolation`, `painted-canvas` | 400×260, alwaysOnTop, 생산 preload 기능·renderer require 부재, 실제 칠한 canvas. 이3개는 자연 관측 전 신선한 창에서 검사한다. |
| `save-reload`, `menu-singleton`, `menu-codex`, `menu-battle`, `hero-choice-reset-preserve` | 실제 저장/필드 재로드, 메뉴 singleton·탭 가시성/수평 overflow, 진단 영웅 선택의 Lv1 reset·골드/컬렉션·휴식 보존. |
| `v07-codex-strict-legacy`, `v07-codex-legacy-ack-normalization`, `v07-codex-unacquired-goal` | 레거시 선택h01/처치slime만 공개; 제시h02/등장bat 실루엣과 이름/aria·ACK 제거, 미획득 목표 미완료. 골드와 기존 컬렉션 보존. |
| `v07-codex-offer-stays-silhouette`, `v07-codex-selection-reveals-one`, `v07-codex-acquired-ack-only` | 실제3후보 제시만으로 도감 공개되지 않음; 실제 첫 선택 하나만 공개·목표 완료·알림1, ACK도 그 ID 하나. 후보 화면 원화는 유지. |
| `v07-codex-restart-preservation`, `v07-codex-first-kill-reveals`, `v07-codex-owned-without-kill-masked` | 재로드 뒤 획득/ACK 보존, bat 첫 native 처치 뒤 공개/목표 완료. 합성 보유 동료만으로 처치 도감은 열리지 않음. |
| `v07-level-over-10-save-reload`, `v07-level-over-10-network-roundtrip` | 5명 Lv11/250/MAX_SAFE_INTEGER/10/1의 ID·종·깊이·레벨·별을 저장/재로드 및 실제 net→서버handler→directory/match응답에서 정확히 보존. |
| `v07-companion-reincarnation-cancel`, `v07-companion-reincarnation-confirm`, `v07-companion-reincarnation-target-change-invalidates` | 첫 클릭 무변경·취소 무변경; Lv11→1/★0→1·힘11→2의 감소 안내, 정확 bigint title/aria와 실제 확정. 다른 대상Lv250의 확인 중 fixture로251이 되면 확인 취소·251/별0 유지. |
| `v07-pvp-party-in-every-row` | 서로 다른50 playerId, 각 순위/이름·0승0패·칠한 영웅 원화/aria·동료5명·MAX_SAFE 레벨 문자열·선택 버튼. 도감 실루엣을 PvP 원화에 적용하지 않음. |
| `v07-pvp-keyboard-navigation` | 새로고침 뒤 Tab 첫행→Tab 둘째행→Shift+Tab 첫행, Enter 첫행·Space 둘째행. sendInputEvent의 keyDown/char/keyUp과 `isTrusted` keypress charCode13/32, 해당 ID의 선택과 포커스. DOM `.click()`/`.focus()`나 KeyboardEvent로 이 증거를 대신하지 않음. |
| `v07-pvp-focus-retained` | 실제5.2초 이상/실제 stateChanged 동안 같은 행·버튼·포커스, 서버 순위 변경 응답 뒤에도 같은 playerId/DOM 유지. 응답 hold는 진단 전용이며 자연 진행 지연이 아님. |
| `v07-pvp-removed-row-focus-fallback` | 합성51번째 상위 상대가50행 cap에서 현재 최하위 행을 밀어냄. 선택0/미리보기 파티0/전투비활성/`#find` 포커스와50행 유지. 운영 계정 삭제 검증이라고 표현하지 않음. |
| `v07-pvp-selected-id`, `v07-pvp-preview-id-roundtrip` | Enter/Space/마우스3선택 모두 expectedID=request.opponentId=response.playerId=선택행 ID. HTTP200·bot=false·matchId·aria-pressed=true·aria-disabled=false를 ledger로 연결. |

추가 실제 checks도 모두 통과해야 한다: `fallback-keyboard-to-save`, `fallback-mouse-to-save`, `ipc-input-kill-reward`, `shop-transaction`, `stale-purchase-token`, `menu-hero`, `menu-profile`, `menu-roster`, `menu-ranking`, `offline-pvp`, `profile-name-ipc`, `stale-hero-choice`, `reincarnation-progress-honesty`. 후자는 Lv12/환생1 fixture에서 현재 요구 레벨 미달을 가득 찬 준비 표시로 오인시키지 않는 검사다. 현재 코드의 성공 경로는0분 진단41개, 자연 실행은 `real-time-observation`을 더한42개이나 필수 ID/모든 결과/오류를 함께 판정하며 개수만으로 통과시키지 않는다.

모의 PvP는 생산 net client와 서버 handler, 주입 MemoryStore/fetch를 사용한다. 각 register 요청과 인증 player별로 안정된 합성 IP를 나누고 생산 rate limiter를 유지한다. 모의 시계 기본값은 실제 Date.now다. 실제 listener·운영 auth·운영 PvP 호출은 없다. 키보드 실패 시 `v07-pvp-native-input-failure` details의 전후 activeElement/requests/responses/DOM events/inputTrace와 실패 PNG를 보존하고 기존 assertion을 약화하지 않는다.

## 화면 검토와 커버리지 경계

- [ ] `fresh-field`, `shop`, 각6탭, `hero-choices`, `level-gate`, `v07-legacy-silhouettes`, `v07-first-kill-codex`, `v07-companion-reincarnation-preview`, `v07-pvp-selected-list`, `v07-pvp-removed-row-fallback` 실제 PNG를 읽어 텍스트 잘림·전후 힘·선택 강조·파티5명·포커스 표시를 확인한다. 스크린샷 해시 존재는 사람이 읽기 쉽다는 증거와 다르다.
- [ ] 동료 확인 중 ID/종/깊이/별 변경·삭제, 무관한 저장 갱신 유지, IPC expected 누락/형식 거부, overflow 전 재료 무손실은 등록 단위/통합 AC 근거와 연결한다. 현재 Native target-change는 Lv250→251 한 사례이므로 모든 경계의 실제 Native 성공으로 확대하지 않는다.
- [ ] 현재 메뉴 코드는 `Date.now()>expiresAt` 만료를 render/전투 클릭/identity 응답 뒤에 검사하고 ID 오류를 거부한다. Native 현재 시나리오는 정상 preview/목록 제거/오프라인을 검사하며, 만료 경계·잘못된 ID 응답·실제 전투 결과/탈취/회수는 해당 단위·서버 AC의 별도 근거다. 이를 이 journey에서 모두 실행했다고 쓰지 않는다.
- [ ] Native 고레벨 roundtrip은 모의 서버 호환이며 운영 고레벨 서버 호환 확인을 대신하지 않는다. 실제 새 클라이언트 출시 전에 등록 server AC를 별도로 확인한다.
- [ ] bootstrap은 tray 시작·global OS hooks·Accessibility·패키지 앱을 검사하지 않는다. 실제 smoke·package 산출물·기존 release 보존과 정책별100seed×12시간 및 네 역할 `audit.mjs`는 별도 최종 근거다. 이 준비에서 검증1–100 데이터는 읽지 않는다.

## 집계·실패·사람 상태

- [ ] matrix의10원본은 정확한 조합별1개이며 시간상 겹치지 않는다. 각원본/PNG SHA, 현재 S/E, exit0/status/completion, 단조 timeline,18방문과 연결된 환생 이력을 확인한다. `matrix.json`은 원본으로 재집계한 값과 동일하고 실제 자연관측 합계가 최소330분이어야 한다.
- [ ] 끊긴180분을 짧은 세션 합으로 대체하지 않는다. 동일 조합 재시도·원본 실패·오류 로그를 남기며 평가 입력 변경 시 과거 결과를 새 지문에 옮기지 않는다.
- [ ] Host는 최종 실행 범위·실패·미확인·다음 행동을 ACCEPTANCE/HANDOFF에 사실대로 기록한다. 설계 승인, 분석, Native 성공, 제품 출시 검증은 다른 상태다.
- [ ] 자동 화면 검토가 끝나도 실제 사람의 재미·업무 방해·선호·접근성 권한 체감 관찰이 없으면 **humanChecks=PENDING**이다. 봇/합성 입력을 사람 플레이로 기록하지 않는다. 자동 커밋·푸시·운영 배포는 없다.

읽기 근거: `.harness/v7/loop/e2e.mjs:9`, `e2e-matrix.mjs:9` 및37/44/114, `electron-e2e.cjs:1` 및154 이후 자연 loop/진단 경계, `journey.cjs:1` 및104/169/220, `src/menu/index.ts:209` 및389/470/647/704, `tests/pvpDirectoryV7.test.ts`, `tests/companionLevelsV7.test.ts`, `tests/codexV7.test.ts`, 기존 `evidence/final-docs-preparation/notes.md`. 이번 읽기에서 새 제품 수정이나 평가기 확장이 필요한 구체적 차단점은 찾지 못했다. 실제 최종 실행 결과는 아직 읽거나 판정하지 않았다.
