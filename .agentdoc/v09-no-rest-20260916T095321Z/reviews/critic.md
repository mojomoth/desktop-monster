# Critic — 좌상단 HUD·환생 후 휴식 제거 독립 검토

- 역할: `/root/critic`
- 1차 검토 시각: 2026-09-16 10:01 UTC
- 비교 기준: 이 세션의 `preservation/source/`와 현재 소스·테스트.
- 최종 판단: **승인된 기능 제거 범위 PASS. 차단 결함(P0/P1) 없음.** 아래 Designer 최종 이미지 판단과 현재 소스에 연결된 테스트·실제 앱 증거를 수락한다. Windows 실기기·Steam·운영 배포 등 기존 외부 PENDING을 완료로 바꾸지 않는다.
- 실행 범위: 읽기·diff 검토. 테스트나 Electron을 재실행하지 않았고 제품·저널·타 역할 파일을 수정하지 않았다.

## 변경 범위와 제품 정확성

보존본 대비 변경된 제품 파일은 `src/core/{hero,engine,progression}.ts`, `src/renderer/{hud,game}.ts`, `src/menu/{hero,index}.ts`의 7개다. 변경된 테스트 10개도 전부 비교했다.

1. `src/core/hero.ts:85`의 준비 상태는 상한 → 보류 → 레벨 순서를 유지하고 휴식 분기만 제거했다. `heroChoose`의 자산·보상·중첩·레벨 초기화 및 serial 검증은 그대로이며 휴식 타이머 생성만 삭제했다. `src/core/engine.ts:314`의 30초 보류 감산과 만료 이벤트는 유지됐다.
2. `src/core/hero.ts:166`의 구세이브 파서는 `restRemainingMs`를 읽거나 반환하지 않는다. 후보의 원래 형식·타입·해금 검증, `offerLevel`, `offerSerial`을 유지하고 유효 후보 판정에서 휴식 조건만 제거했다. 양수 휴식과 보류가 함께 있으면 보류만 적용된다. 엔진 초기화와 save 정규화가 이 파서를 사용하므로 정상 부팅·새 저장에 휴식 값이 살아남지 않는다.
3. `src/main/recovery.ts:86`, `:129`, `:147`은 변경되지 않았다. 체크포인트는 원문 해시를 검증한 뒤 `parseSave`로 복원하고, 구 미완료 operation은 원문 검증·재생 후 `src/main/coordinator.ts:33`에서 다시 파싱한다. 구백업 원문이나 해시를 일괄 변경할 필요가 없다.
4. `src/renderer/hud.ts`의 `drawExpedition`과 전용 상수, `src/renderer/game.ts`의 import·호출만 삭제됐다. 영웅 위 레벨/XP/READY, 몬스터 HP, 재화, 타격 숫자, 전투·이펙트 배치 코드는 바뀌지 않았다.
5. `src/menu/hero.ts:100`은 레벨 충족 또는 남은 무료 보류 시간을 안내하고, 규칙 설명에서 2분 휴식을 제거했다. `src/menu/index.ts:673`의 렌더링 키에서도 삭제된 필드만 제외했다.
6. `PROGRESSION_PARAMETERS.heroRestMs`는 역사적 측정 스키마 호환용 0으로 남겼다. 활성 게임 API·타이머에서는 참조하지 않으며 나머지 20개 수치는 보존본과 같다. 기존 v0.7 protocol을 고쳐 이전 결과를 새 행동의 검증으로 취급하지 않았다.

## 테스트 변경 판단

- 제거된 기능의 기존 기대값을 승인된 새 동작으로 전환했다. 무관한 테스트 skip·삭제·assertion 완화는 발견하지 못했다.
- `tests/hero.test.ts:76`: 실제 선택 → 레벨 1에서 거부 → 실제 공격으로 필요 레벨 회복 → tick 없이 새 후보 3개, 이전 serial 거부를 검사한다.
- `tests/hero.test.ts:141`: 구 휴식 1/60,000/120,000 ms 무시·저장 미포함과, 양수 휴식+보류에서 29,999 ms 후 재시작 및 마지막 1 ms 만료를 검사한다.
- `tests/heroArtCompatibility.test.ts:51`: 50개 기존 영웅의 구세이브에 양수 휴식을 넣고 외형·능력·기존 후보·serial·네트워크 투영의 기존 비교를 유지했다.
- `tests/recoveryV9.test.ts:60`: 원문 체크포인트 해시 검증, 유효 후보·serial 또는 보류 유지, 새 저장의 휴식 미포함, 원본 체크포인트 바이트 보존, 무시할 필드라도 해시 불일치 시 거부를 검사한다. `:141`은 구 저널 재생 후 정규화를 추가로 검사한다.
- `tests/heroMenuReadiness.test.ts:39`: 보류 마지막 1 ms와 정확한 종료·레벨 경계를 유지한다. 구 휴식 세이브의 바로 가능한 메뉴와 갱신된 설명을 추가했다.
- `tests/hud-v09.test.ts:22`, `tests/expedition.test.ts:197`: 전체 프레임의 기존 좌상단 영역 부재를 검사하며 레벨/XP/READY·재화 픽셀과 위치, 렌더링의 상태·RNG 무변경도 확인한다. 기존 A3 전투·보상 4개 및 A5 추첨 5개 테스트는 내용 그대로 유지됐다.
- 일반 200-case 회귀는 환생 선택을 실행하지 않으므로 전투·입력·일반 성장의 비회귀 근거다. 새 환생 주기 자체는 위 타깃 테스트로 검증하며 기존 장시간 페이싱을 재사용하지 않는다.

## 검토한 제품 파일 SHA-256

| 파일 | SHA-256 |
|---|---|
| `src/core/hero.ts` | `e807a4493f2105743e5777a5f48b8286680626d70b031685a18aa84740037306` |
| `src/core/engine.ts` | `4bf2a500b7fa7453286cd0d8bb3ef1f71df269213e1191837b6d94de601dd26c` |
| `src/core/progression.ts` | `e3586f6ec68e15b49e7bb641ed0e1147ab71dd6c70fb3c957af54fb88093f695` |
| `src/renderer/hud.ts` | `3bb1f39a06016c1d143a0187118663d0dc16e8241c039a0b09fc162c41361d39` |
| `src/renderer/game.ts` | `8e950556bfedf9e2b4b1f36779b7d444b2df2c932ba3ad43d7bd071ce4f90d3d` |
| `src/menu/hero.ts` | `c017db3e1c33b5d6a2352f15aa15d4043e2189487570fea453af0090f0c311d9` |
| `src/menu/index.ts` | `1b136b34293344e496c46085d70e0981985a4c606aabaa0ab6cb6ec8b0a8ff2b` |

## 실제 앱 검증

`.harness/v9/no-rest-ui.mjs` 전체와 기존 `runtime.mjs` 연결을 읽었다. 합성 구세이브로 부팅 → 실제 메뉴 mouse input으로 선택·백업 복원 → 같은 디렉터리 재시작 → 별도 구 휴식+보류 부팅의 3개 단계다. 새 렌더러·시계·RNG를 주입하지 않고 실제 canvas 픽셀과 production main/menu/IPC/복구 저장을 확인한다. 코드상 차단 결함은 발견하지 못했다.

최초 검토에서 필수 체크 누락을 `every()`가 거부하지 못하는 평가기 완결성 문제를 지적했다. Designer가 실행 전 수정했고, 다시 읽어 다음을 확인했다: 필수 13개 phase/name 집합의 정확한 일치, `first → restart → deferred` 순서, version 9, 각 체크의 `passed === true`를 보고서 생성과 verify 모두 요구한다. 빈 배열·체크 누락·중복·잘못된 phase는 통과하지 않는다. 평가기는 source/artifact/app.asar 해시와 3회 실행의 exit 0·무신호 종료도 검증한다.

검증 경계: native 메뉴 입력과 production 확인 IPC·기본/취소 버튼 설정은 실행하지만, OS 확인창 응답은 기존 runtime의 자동 응답 stub으로 주입한다. OS 모달 자체의 화면·실제 사람 클릭 검증은 아니다. 보류 실시간 감소는 새 native 검사로, 마지막 1 ms 경계는 결정적 단위 테스트로 확인한다.

## 최종 증거 검토 — Designer 이후

`reviews/designer.md`의 최종 PASS와 직접 본 실제 이미지 8개 목록을 읽었다. 독립적으로도 `native-no-rest/first/field-hud.png`와 `native-no-rest/deferred/hero-deferred-later.png`를 열어 좌상단 HUD 부재, 레벨/XP/READY·재화 유지, 메뉴의 25초 무료 보류 및 비활성 버튼을 확인했다. 기존 비활성 버튼 대비 스타일은 변경 대상 밖의 알려진 제한이다.

- `native-no-rest/no-rest-ui.json`: 필수 13개 체크 PASS, 3회 부팅 모두 exit 0·signal null·오류 0. 현재 소스/산출물 208개 및 증거 파일 68개를 독립 재해시해 불일치 0건이었다. 실제 시간 약 4,637 ms 관측 동안 보류가 29,828 → 24,987 ms로 줄었고 버튼은 계속 비활성이다. 단위 테스트의 정확한 30초 경계와 서로 보완한다.
- 현재 평가기 SHA-256: `ca77fd052d9077fd55880fb046707b1bca8a2765cc148a6ada1ad160355efe40`. 추가된 글자 색 픽셀 검사는 배경 패널만으로 레벨/READY/재화 검사가 통과하는 일을 방지한다.
- 실제 설치 앱 ASAR를 독립 재해시한 값은 `c4dafbd5bcbbccb1f60ac0fed69e1664e5b945bbab7d6570a93b481799aa9875`이다. 3회 focused 실행과 `artifacts.json`의 빌드·설치 앱 값이 모두 같다.
- `gates.json` 및 해시 일치한 원본 로그: 정확한 `npm test && npm run lint && npm run typecheck` exit 0, 73개 파일/1,071개 테스트와 lint·typecheck PASS. 실행 전후 source digest는 모두 `8500daa5a09e299fdf67763e720cb2c2b931049385deb81ae194fb5bd06738d1`이다.
- `acceptance.json`: HUD·CORE·MENU_RECOVERY의 등록된 개별 AC 모두 exit 0, 동일한 실행 전후 source digest. 세 로그의 기록된 해시를 독립 확인했다.
- `core-regression.json`: 100 seeds × 2 policies = 200개 원시 행, PASS. 현재 binding 파일과 raw 해시를 독립 확인했다. 비교는 이 세션의 보존된 변경 전 v0.9와 변경 후 코어다. 재사용 runner의 고정 설명 문자열은 v0.8/v0.9라고 남아 있지만 실제 baseline 경로·해시가 명시돼 있고 Host 문서·저널이 그 차이를 설명한다. 원본 결과를 사후 수정할 필요는 없다.
- `native-integration/native.json`: 기존 통합 23+6개 UI 체크 및 양쪽 runtime PASS를 읽었다. `artifacts.json`은 mac 설치 302개 파일·Windows 앱 payload 109개 불일치 0건을 기록하며 Windows 실기기 검증은 명시적으로 PENDING이다. 이 리뷰에서 전체 OS 패키징·외부 배포를 새로 실행하지 않았다.

이 검토의 결론은 요청한 두 기능 제거와 보존 조건의 구현·검증 수락이다. 장시간 자연 플레이의 새 환생 주기, 실제 사람의 재미, OS 확인창 자체 화면, Windows 실기기·Steam·운영 서비스는 새로 검증했다고 주장하지 않는다.
