# v7 Native 하네스 독립 교차검토

검토자: /root/harness_review · 2026-09-11. 소유 외 코드는 변경하지 않았다. 실제 Electron/장시간 실행은 하지 않았으며, 아래 재현은 원시 증거 검증기의 합성 메모리 자료만 사용했다.

## 발견

### N1 · major · 환생 방문 원장의 연속성과 실제 첫 환생 시각을 검증하지 않음

`.harness/v7/loop/e2e-matrix.mjs:43–51`은 개별 방문의 `before→after` 증가량만 검사하고, 이전 방문의 after와 다음 before, 마지막 after와 session.end, 첫 선택 시각과 firstReincarnationElapsedMs를 대조하지 않는다.

직접 `aggregateRuns(records,digest,digest,readFromMemory)`를 실행한 합성 재현에서 180분 방문 18개가 모두 `reincarnationsBefore:0,reincarnationsAfter:1,action:selected`이며 최종 상태는 `reincarnations:0`, 첫 환생 시각은 `1ms`인데 `status:passed`가 반환되었다. 실제 첫 방문은 600000ms이므로 내부적으로 불가능한 원장이다. 원본/스크린샷 해시와 요구 체크 ID는 정상적인 합성 fixture였다. 이는 실제 게임 결과가 아니다.

최소 수정: 방문 간 카운터 연결과 초기/최종 카운터 보존을 검사하고, 각 selected 방문에 선택 완료 시각을 기록하여 최초 선택 완료 시각과 session.firstReincarnationElapsedMs를 대조한다. 세 가지 불일치에 대한 검증기 회귀 검사를 추가한다. ui_pvp_review와 호스트에 전달했다.

### N2 · major · 장시간 실패 시 관측 원본이 report에서 사라짐

`.harness/v7/loop/electron-e2e.cjs:146–203`은 observation을 로컬 변수로만 쌓다가 전체 시간과 마지막 메뉴 방문이 성공한 뒤에야 `report.sessions.push(observation)`한다. 179분에서 renderer 오류·메뉴 타임아웃·SIGTERM이 발생하면 `finish(1)`(84–95행)는 sessions가 빈 report를 저장하고 임시 세이브를 제거한다. 로그/스크린샷은 남지만 이미 쌓인 상태 timeline과 환생 방문 원장은 JSON 증거에 남지 않는다.

최소 수정: 관측 시작 때 report.sessions에 같은 observation을 연결하고, 관측 중 elapsedMs/end 또는 lastObserved를 갱신하며 실패 종료에도 부분 관측을 보존한다. 완료 전 실패는 status failed로 유지하고 matrix 통과에는 계속 전체 길이·필수 체크·방문 전체를 요구한다. 세션 종료 시 원본을 미완료 상태로 보존하는 검사로 확인한다.

## 확인한 동작

- 180분 여정은 production 메뉴 DOM을 찾아 native sendInputEvent로 후보/선택 버튼을 클릭한다. 자연 관측 구간 안에는 fixture 로드나 엔진 tick 주입이 없다.
- 고레벨 네트워크 실패 후 목록 진단을 위해 낮은 레벨 fixture를 넣는 fallback은 앞선 실패 check를 그대로 남기므로 성공으로 덮지 않는다.
- 도감은 실제 canvas 색 수·실루엣 aria-label·선택/처치 후 상태를 확인하며, 목록에서 고른 상대 ID를 실제 mock 서버 요청에서 확인한다.
- matrix는 원본/스크린샷 hash, 소스/평가 지문, 시간 길이, 누락/중복/겹치는 native 관측을 검사한다. 살아 있는 process group을 발견하면 중복 재개하지 않는다.
- package 검사는 실제 .app 실행 전 inspector에서 userData를 격리하며, 일반 smoke도 SMOKE 분기의 임시 userData를 사용한다. 운영 PvP/전역 훅을 실행하지 않는다.

판정: 위 N1/N2 보강 후 재검토. 합성 자체검사 통과를 실제 Electron 또는 사람 플레이 완료로 해석하지 않는다.

## 수정 재검토

2026-09-11 후속 읽기 검토에서 N1/N2 수정 경로를 확인했다. N1은 completedAtMs, 방문 간 before/after 연쇄, 최초 0회·최종 횟수, 첫 selected 완료 시각을 대조한다. N2는 관측 시작부터 report.sessions에 등록하고 표본/방문/스크린샷마다 원자적 checkpoint를 저장하며 중단 상태를 보존한다. matrix는 completed 원본만 채택하고 부분 원본은 시도 이력으로 보존한다. 원저자의 해당 반례 회귀 검사도 확인했다. 이번 재검토는 실제 180분 Electron 실행을 대신하지 않는다.
