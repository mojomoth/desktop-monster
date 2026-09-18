# 하네스 실행 검증 · 2026-09-10

대상 소스: `6b1f37f7491ebb6af84d27a6054c41bf036b66a22eb2dd1dd96dff2b6bd210fb`.
소스 지문은 커밋되지 않은 `src/`, `static/`, package/tsconfig 파일 내용도 포함한다.

| 실행 | 관측 결과 |
| --- | --- |
| `node .harness/v5/loop/fun.mjs selftest` | 3파일, 17개 검사 통과 |
| `npm test && npm run lint && npm run typecheck` | 종료 0; 49파일·744개 테스트 통과, lint/typecheck 통과 |
| `npm run smoke` | 프로덕션 진입점으로 빌드·실행, `SMOKE_OK`, 종료 0 |
| `node .harness/v5/loop/e2e.mjs .agentdoc/fun-e2e-20260910/e2e.json 5 active` | 실제 300,035ms 플레이 후 22검사 중 21통과·1실패. 실패를 기록하며 종료 1 |
| `node .harness/v5/loop/measure.mjs .agentdoc/fun-harness-20260910/balance-measurement.json --policies` | 종료 0; 100 seed, 18분포, 1,800체크포인트 관측, 실제 실행 67.96초 |
| `node .harness/v5/loop/audit.mjs report .agentdoc/fun-e2e-20260910/review` | 종료 0; 독립 역할 4개, 발견 8개, 업데이트 우선순위 5개. `audit_complete`, 기능 E2E는 `failed`, 사람 재미는 `PENDING`으로 구분 |

실제 호스트 에이전트 ID: Designer `/root/designer`, Critic `/root/critic`, Balance `/root/balance`,
Playtester `/root`. 역할별 응답, 발급 프롬프트, 근거 해시는 [review/audit.json](review/audit.json)에 보관했다.
[최종 분석과 다음 업데이트](review/report.md)는 같은 증거에서 생성했다.

E2E 실패는 실제 게임 HUD에서 재현됐다: 첫 환생 후 Lv.12 상태에서 필요 레벨은13,
`heroReady=false`인데 진행 막대는38/38픽셀로 찬다. [스크린샷](e2e.json.screenshots/level-gate.png),
[원시 체크](e2e.json)의 `checks[21]`. 분석 요청 범위에서 게임을 수정하지 않았으며 실패 검사를 남겼다.

자연 시작 5분은 합성 입력583회, Lv.14,47처치,560골드,동료1,환생0이다.
자동 메뉴 선택이 없는 정책이다. [종료 화면](e2e.json.screenshots/5m-active.png)에
`REBIRTH READY`가 보인다. 그 문구를 실제 사람이 알아보지 못했다고 주장하지 않는다.
120/150초 관측에서 동료0,180초 관측에서1이므로 첫 포획을 정확히180초라고 보고하지 않는다.
마지막240~300초 관측에서 처치·골드가 증가하지 않았다.

Electron 실행은 실제 프로덕션 창/preload/renderer/IPC/저장 경로를 사용한다.
테스트 전용 부트스트랩이 전역 입력 훅과 네트워크를 제외하며 사용자 세이브는 임시 디렉터리로 분리했다.
자연 시작 이후의 상점·환생·진행 막대 검사는 명시적 fixture에서 수행했다.
smoke는 별도로 프로덕션 앱 진입점을 확인했다.

미실행: 실제15/30분과 실제idle/intermittent, 사람의 재미·업무 방해 관찰,
운영 PvP/훔치기/알림, OS 접근성·전역 훅, 패키지·배포. 이 감사는 출시 완료 선언이 아니다.

초기 실행기 문제와 수정도 보존했다. `e2e-quick.json`은 테스트 진입점 때문에 상대 static 경로가
다르게 해석된 실패다. 하네스에서 `app.setAppPath(ROOT)`를 지정한 후 `e2e-quick-2.json`은
실제18통과·HUD1실패를 재현했다. 최종5분 실행에는 환생 선택/토큰 재전송 검사도 포함했다.
