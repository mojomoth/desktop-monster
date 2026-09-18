# v0.8 검증 도구

Ralph CURRENT와 기존 npm 계약은 유지한다. v7의 inspector 연결, 합성 키 이벤트, clock/reducer simulation과 evidence helper를 재사용하며 과거 v7 실행기·실패 기록은 수정하지 않는다. 등록 조건은 `docs/v0.8/EVALUATION_PROTOCOL.json`이다.

| 실행기 | 사용 |
|---|---|
| `runtime.mjs APP OUTPUT_DIR` | 격리된 실제 Electron UI 16개 진단, PNG 및 해시. `launchRuntime` export로 시작·재시작 검사 재사용. |
| `startup-cases.mjs APP OUTPUT_DIR V07_SAMPLES_JSONL` | 실제 v0.7 첫 저장 표본으로 설치·첫 안내·권한 대기·설정·손상 파일·재시작 검증. 개인 저장 폴더는 사용하지 않는다. |
| `measure.mjs run OUT --seed-set exploration --workers 2` | 정책 A–D ×20, 12시간 점검. |
| `measure.mjs verify OUT` | raw·장부·짝지은 시드·소스·빌드·평가기 해시를 재검산. |
| `measure.mjs freeze EXPLORATION FREEZE` | 성공한 점검 결과와 평가기 동결. |
| `measure.mjs run OUT --seed-set validation --workers 4 --freeze FREEZE` | 같은 정책 A–D ×100. 워커 수는 결과 규칙을 바꾸지 않는다. 동일 binding의 완결 raw만 resume한다. |
| `performance.mjs APP OUTPUT_JSON PROFILE MINUTES` | actual wall time 관측. PROFILE은 active/idle/mixed. 5초 표본과 패키지·관측기 해시 보존. |
| `run-performance.mjs BASELINE_APP CANDIDATE_APP OUTPUT_DIR` | 30+30+30+30+180분을 순서대로 실행하고 비교. 실패·중단 시 후속 관측 중지. |
| `performance-report.mjs verify COMPARISON_JSON` | 관측 원본과 동결 예산을 독립 재검산. 개별 보고서 조합 CLI는 `docs/v0.8/ACCEPTANCE.md` 참조. |
| `online-check.mjs --health` | 운영 health/SHA 조회만. |
| `online-check.mjs --execute --expected-sha SHA --out OUT` | 새 합성 계정 2개를 생성해 해당 계정끼리만 실제 전투·탈취·회수·Node 프로세스 재시작을 검증한다. 서버 쓰기 작업이다. 사용자의 승인된 검증 범위에서만 실행한다. |

UI/성능 실행기는 사용자의 개인 앱·저장을 닫거나 수정하지 않는다. 전역 훅과 운영 네트워크는 차단하고 지정된 테스트 앱의 실제 renderer/IPC를 사용한다. 출력 경로는 새 경로여야 한다. UI 재시작은 런처의 `.v08-isolated` 표식이 있는 저장 폴더만 재사용한다.

성능 관측 중 트레이 종료를 누르면 원래 앱 동작대로 종료하고 관측 실패를 남긴다. 종료 명령을 무시하거나 관측 시간을 줄여 통과시키지 않는다. 메모리는 working set 합계이며 배터리 수명 추정이나 중복 없는 실제 RAM 수치가 아니다. 수집 계산 등의 부하 작업과 성능 관측을 분리한다.

측정 완료는 사람의 재미·이해·실제 권한·배터리·리텐션 결과가 아니다. 최종 증거와 남은 검증은 `docs/v0.8/ACCEPTANCE.md`에 기록한다.
