# v0.12 레이드 앱 연결 구현 기록

2026-09-24. 기존 미추적 프리뷰·테스트를 보존하고 실제 앱 모듈을 공유하도록 확장했다. 이 문서는 직접 개발과 검증 기록이며, 하네스 V12-08 아트 승인이나 v0.12 릴리스 완료 기록이 아니다. `RAID_ART.md`의 승인 줄은 작성하지 않았다. 커밋·푸시·운영 배포는 수행하지 않았다.

## 실제 구현 범위

- 서버: 조건 모집 → 공개·카운트다운 → 명시적 참전 확인 → 전투 → 성공/시간초과 결과. 등록만으로 참전되지 않는다. 확인 시 영웅 공격력·레벨을 동결하고 확정 인원으로 HP를 정한다.
- 전체 참가자 목록을 전달한다. 서버 기본 정원은 기존 계획의 `RAID_PARAMETERS.capacity = 20`이며 프리뷰의 32/50/100을 정책으로 사용하지 않는다. 50명 정원 주입을 실제 서버 테스트로 검증했다. 렌더러는 250명까지 생략 없는 배치도 검증한다.
- 앱: 실제 main/preload/renderer/menu를 연결했다. 전투 중 공격은 레이드로 전달하고 일반 몬스터·동료 공격·XP 진행을 멈춘다. PvP 재생 큐는 유지한다.
- 통신: 단계별 폴링, 전투·확인 중 1초 폴링, 데미지 배치 POST, 고정된 미응답 배치 재전송, 시퀀스 중복 방지, 서버의 클릭·데미지 제한, 별도 레이드 요청 예산.
- 복구: 수령 요청 ID를 HTTP 전에 저장하고, 받은 보상과 적용 영수증을 저장 저널로 처리한다. 서버 수령과 로컬 지급을 구분하며 자동 재시도한다. 재시작·응답 유실·백업 복원·초기화 뒤 중복 지급을 막는다. 수령 버튼은 없다.
- 연결 실패: 마지막 장면과 재연결 안내를 유지하고 새 공격을 중지한다. 서버가 정한 종료 시각 이후 5초가 지나면 필드로 복귀한다. 늦게 도착한 서버 결과는 별도로 처리하며 임의의 승패나 보상을 만들지 않는다.
- 화면: 200×130 캔버스/400×260 창, 노크튀르 64×44 원화×2, 영웅 14×14×1. 전체 필드의 얕은 여러 줄, 중앙 맨 앞 내 영웅, 노란 표식·LV·데미지, 빨간 HP·파란 시간 바. 보스 원화는 이전 프리뷰를 그대로 실제 모듈로 옮겼다.
- 메뉴: 560px, 9탭, 보스 카드 5장, 픽셀 참전/결과 팝업, 포커스 유지·Tab 트랩·Esc·큐 처리. 요청 중 중복 클릭, 실패 재시도, 연결 상태 표시와 최신 한국어 문구를 적용했다. 기존 진행 초기화·영웅 교체·강화 확인 및 도난 알림도 인게임 UI를 사용한다.

## 변경 파일

| 영역 | 실제 소스 |
|---|---|
| 코어·보상 | `src/core/raid.ts`, `battle.ts`, `collection.ts`, `engine.ts`, `equipment.ts`, `save.ts`, `types.ts`, `index.ts` |
| 서버 | `src/server/raid.ts`, `app.ts`, `store.ts`, `pgStore.ts` |
| 프로토콜·IPC | `src/shared/api.ts`, `src/shared/ipc.ts`, `src/preload/index.ts`, `src/renderer/global.d.ts` |
| main·복구 | `src/main/raid.ts`, `net.ts`, `coordinator.ts`, `recovery.ts`, `ipc.ts`, `index.ts` |
| 필드 | `src/renderer/raidScene.ts`, `raidStatus.ts`, `game.ts`, `index.ts`, `hud.ts`, `sprites/raidBosses.ts`, `sprites/equipment.ts`, `sprites/index.ts`, `static/index.html`, `static/style.css` |
| 메뉴 | `src/menu/raid.ts`, `popup.ts`, `index.ts`, `static/menu.html`, `static/menu.css` |
| 검토 화면 | `docs/v0.12/preview-src/*`, `play-screen-preview.html`, `play-preview/*.html`, `play-preview/sources.json`, `play-preview/screenshots/integrated/*` |
| 네이티브 검사 | `.harness/v12/raid-connected-check.mjs`, `.harness/v12/fixtures/raid.mjs` |

신규 테스트: `tests/raidCore.test.ts`, `server/raid.test.ts`, `raidWatcher.test.ts`, `recoveryRaid.test.ts`, `raidScene.test.ts`, `renderer-raid.test.ts`, `menuRaid.test.ts`, `menuPopup.test.ts`, `helpers/menuDom.ts`. 이전 미추적 `raidPreview.test.ts`도 보존·사용했다.

기존 테스트 갱신: `equipmentSprites.test.ts`, `ipc.test.ts`, `menu.test.ts`, `renderer.test.ts`, `server/app.test.ts`, `server/pgStore.test.ts`, `v10Review.test.ts`, `window.test.ts`. 네이티브 다이얼로그 테스트는 동일한 취소·경합 조건을 픽셀 IPC로 옮겼고 발신자 위조·중복 응답 검증을 추가했다. 테스트 삭제나 건너뛰기는 없다.

## 검증과 캡처

필수 게이트 `npm test && npm run lint && npm run typecheck`: **103개 파일·1,348개 테스트 통과, ESLint 0 warnings, 모든 TypeScript 프로젝트 통과, exit 0**. 마지막 팝업 수정 이후 직접 재실행한 결과다.

- `npm run smoke`: `SMOKE_OK`, exit 0. 임시 프로필과 simulated input 사용.
- `node docs/v0.12/preview-src/build.mjs`: 실제 모듈을 번들한 HTML 재생성.
- [공통 렌더러 인원 비교](play-preview/screenshots/integrated/crowd-board.png), [50명·밝은 바탕](play-preview/screenshots/integrated/battle-50-light.png), [내 공격 표시](play-preview/screenshots/integrated/battle-50-local-hit.png), [메뉴 확인창](play-preview/screenshots/integrated/menu-confirming.png). 25개 PNG와 `verification.json`은 합성 데이터를 사용하는 화면 검토 자료다.
- `.harness/v12/raid-connected-check.mjs`는 실제 Electron main/preload/필드/메뉴와 실제 `node:http` 어댑터·MemoryStore 서버를 연결한다. 임시 프로필, 전역 후킹 없는 창 입력, 주입한 서버 시계·단축 시나리오 파라미터를 사용한다. 운영 서버나 실제 사용자 저장 파일에는 접속하지 않는다.
- 실제 앱 경로: 사냥 → 메뉴 조건 기여·등록 → 카운트다운 → 픽셀 확인창/인게임 버튼 → 배치 공격 → 승리/실패 → 자동 보상 저장·결과창 → 필드 복귀. 연결 실패/복구, 메뉴 560px 경계, Tab/Esc도 검사했다.
- 네이티브 결과·PNG: `.agentdoc/v12-connected-timeout/` 및 `.agentdoc/v12-connected-victory/`. 각 `result.json`은 실제 HTTP 요청 결과와 검증 목록을 기록한다. 주입형 단위 테스트는 네트워크·OS 후킹·실제 시계 없이 실행된다.

재실행:

```sh
npm run build
node .harness/v12/raid-connected-check.mjs .agentdoc/v12-connected-timeout
node .harness/v12/raid-connected-check.mjs .agentdoc/v12-connected-victory --victory
```

네이티브 검사기는 기존 환경의 Playwright를 사용하며 의존성을 추가하지 않았다. 다른 환경에서는 `DESMON_PLAYWRIGHT`로 설치된 Playwright `index.mjs` 경로를 지정할 수 있다.

## 남은 작업

- 운영 Render/Postgres 배포·마이그레이션·실사용 서버 왕복 검증. 이번 결과는 실제 앱과 로컬 실제 HTTP 서버의 연결 검증이며 운영 배포 증거가 아니다.
- 노크튀르 외 보스 4종은 임시 실루엣이다. 레이드 아이템 10종은 동작하는 별도 카탈로그·출처를 갖지만 아이콘은 기존 에픽 아트를 재사용한다. 전용 최종 아트와 사용자 승인 기록이 필요하다.
- 등록된 v12 레이드 밸런스 후보 평가·독립 검증, 정식 아트 승인 게이트, 장시간 성능 비교, macOS/Windows 릴리스 패키징·외부 하드웨어 검증은 완료로 표시하지 않았다.
- 서버는 계획대로 단일 인스턴스의 메모리 캐시를 사용한다. 내구 저장은 단계 전환·보상 수령과 최대 5초 간격의 요청 처리 시점에 수행하므로 비정상 재시작 직전의 최대 5초 공격은 유실될 수 있다. 다중 인스턴스 운영 전에는 레이드 행 잠금이 필요하다.
