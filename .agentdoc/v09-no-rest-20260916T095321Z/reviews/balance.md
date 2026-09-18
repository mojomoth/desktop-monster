# Balance — 환생 후 휴식 제거

## 최종 판단

**승인된 후속 변경 범위 PASS. 추가 제품 수정 불필요.** Designer 최종 이미지 판정 뒤 Critic 최종 PASS를 읽고, 아래 소스·산출물에 연결된 통합 근거를 재검증했다. 레벨을 다시 충족하면 휴식 없이 환생할 수 있다는 변경이 정확히 구현됐고, 보류·보상·상한·후보 약속·저장 복구는 유지된다.

## 구현 범위

- `HeroProgress.restRemainingMs`, `HeroReadiness.status`의 `rest`, `HERO_REST_MS`를 활성 API에서 제거했다.
- 환생 선택 이후 타이머 생성, 엔진 tick의 휴식 감산·완료 이벤트, 후보 파싱의 휴식 조건을 제거했다.
- 구 저장의 양수 `restRemainingMs`는 무시하며 새 엔진 저장과 직렬화에는 출력하지 않는다. 다른 조건이 유효한 기존 후보 3개와 `offerSerial`은 유지한다.
- 30초 보류, 레벨 요구치, 보상·보유 자산, 반복 숙련, 환생 상한, 후보 serial 검증은 유지한다.
- 측정 호환용 `PROGRESSION_PARAMETERS.heroRestMs`만 0으로 유지한다. 21개 현재 생산값은 새 `docs/v0.9/NO_REST_UPDATE.json`에 바인딩하며, 기존 v0.7 문서의 milestone 검증과 원본 protocol은 유지했다.

## 타깃 검증

2026-09-16 18:58–18:59 KST 실행:

```sh
node node_modules/vitest/vitest.mjs run tests/hero.test.ts tests/progressionV5.test.ts tests/progressionV7.test.ts tests/progressV5.test.ts tests/heroArtCompatibility.test.ts --reporter=dot
node node_modules/vitest/vitest.mjs run tests/balance.test.ts --reporter=dot
node node_modules/eslint/bin/eslint.js src/core/hero.ts src/core/engine.ts src/core/progression.ts tests/hero.test.ts tests/progressionV5.test.ts tests/progressionV7.test.ts tests/progressV5.test.ts tests/balance.test.ts tests/heroArtCompatibility.test.ts --max-warnings 0
```

결과: **6개 파일 91개 테스트 통과, ESLint 경고 0개**.

확인한 경계:

- 실제 `heroChoose` 이후 레벨 1에서는 다음 후보를 열 수 없다. 같은 엔진에서 실제 공격으로 다음 레벨 요구치를 충족하면 tick 없이 새 후보 3개를 열 수 있으며 이전 serial 선택은 거부된다.
- 구 휴식 잔여값 1/60,000/120,000 ms는 재시작 직후 무시된다. 레벨을 충족한 경우 시간을 진행하지 않고 후보를 열 수 있다.
- 구 휴식 양수와 30초 보류가 함께 있으면 보류만 유효하다. 29,999 ms 이후 재시작해도 마지막 1 ms가 남으며, 만료 후에만 후보를 열 수 있다.
- 구 휴식 양수가 포함된 저장에서 50개 기존 영웅 외형·능력, 유효한 기존 후보와 serial, 네트워크 외형을 보존한다.
- 20개 탐색 seed의 기존 회계·유료 정책 테스트와 보상·반복 숙련 검사를 유지했다.

## 통합 근거 재검증

코어 소유 파일은 타깃 검증 뒤 동결했다. 최종 검토에서 다음을 확인했다.

- `gates.json`과 실제 로그: 정식 `npm test && npm run lint && npm run typecheck` 종료 0, **73개 파일 1,071개 테스트·lint·typecheck PASS**. 실행 전후 소스 지문 동일.
- `acceptance.json`: CORE 91개, HUD 129개, MENU_RECOVERY 22개 PASS. 게이트와 AC 로그 4개를 SHA-256으로 직접 재검증해 기록과 일치했다.
- 변경 직전 보존 컴파일과 현재 컴파일의 생산 파라미터 21개를 직접 비교했다. 차이는 `heroRestMs: 120000 → 0` 하나뿐이며 나머지 20개는 동일하다.
- `core-regression.json` 및 JSONL: `node .harness/v9/regression.mjs verify .agentdoc/v09-no-rest-20260916T095321Z/core-regression.json`을 다시 실행해 **V09_CORE_REGRESSION_OK**를 확인했다. 변경 직전 컴파일 대비 100 seeds × 2 policies × 30분의 200개 일반 전투 사례가 동일하며 원문·현재 코어 소스·컴파일 바인딩 검증도 통과한다.
- `native-no-rest/no-rest-ui.json`: `node .harness/v9/no-rest-ui.mjs verify .agentdoc/v09-no-rest-20260916T095321Z/native-no-rest/no-rest-ui.json`을 다시 실행해 **V09_NO_REST_UI_OK**를 확인했다. 필수 13개 검사 전체 PASS, first/restart/deferred 세 부팅 모두 exit 0·signal null·오류 0이다.
- 세 네이티브 실행의 설치 앱 ASAR는 모두 `c4dafbd5bcbbccb1f60ac0fed69e1664e5b945bbab7d6570a93b481799aa9875`이다. 실제 선택·복원·재시작 이후 휴식 필드가 사라지고 기존 후보/serial이 유지되며, 구 체크포인트 원문 바이트는 보존된다. 별도 보류 화면은 실제 시간에 따라 30초에서 25초로 감소하고 아직 버튼을 잠근다.
- Designer가 실제 이미지 8개에서 좌상단 HUD 제거와 영웅 위 레벨/XP/READY·우상단 재화·전투 배치 유지를 확인했다. Critic은 그 판정 뒤 제품·테스트 diff, 원문 체크포인트/저널 정규화, 근거 해시를 검토해 차단 결함(P0/P1) 없음으로 판정했다. Balance는 그 독립 검토를 수락한다.

## 해석 범위

기존 200-case 비교의 두 정책은 `heroOffer`/`heroChoose`를 실행하지 않는다. 따라서 일반 전투·입력·성장 경로의 비회귀 근거이며, 성숙한 파티의 반복 환생 속도를 정량 평가하는 실험은 아니다. 이번 변경은 레벨 회복이 2분보다 빠를 때 환생을 앞당기는 의도된 행동 변경이다. 기존 장시간 페이싱 결과를 변경 후 환생 주기의 검증 결과로 재사용하지 않는다.

새 환생 주기의 장시간 자연 플레이나 사람의 재미는 측정하지 않았다. 네이티브 검사는 합성 구 저장과 실제 제품 UI/IPC/저장 경로를 사용하며 확인창 응답은 격리 stub이다. 이번 승인으로 기존 Windows 실기기·Steam·운영 배포의 외부 PENDING을 완료로 바꾸지 않는다.
