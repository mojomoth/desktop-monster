# v0.9.1 검증 상태

이번 변경은 동료 약탈을 금화 전투로 교체하고 방어전 동안 사냥을 중단·재개한다.
정책과 범위는 [CONTRACT](CONTRACT.md), 수치와 분포는 [BALANCE](BALANCE.md)를 따른다.

## 실행과 보존

세션: `.agentdoc/v091-20260917T024712Z`.
기존 dirty source, v0.9 기록, 이전 Mac/Windows app.asar는 `preservation/`과 SHA-256 목록으로 보존했다.
하네스는 `.harness/v91`이며 `.harness/CURRENT=v3`는 유지했다. 개인 저장·인증 데이터,
운영 PvP, 배포·커밋·push는 사용하지 않았다.

| 역할 | 실제 agent ID | 담당 |
| --- | --- | --- |
| Designer | `/root/designer` | 재생 격리·큐·실제 Electron 및 이미지 검수 |
| Critic | `/root/critic` | 독립 악용 사례와 최종 증거 감사 |
| Balance | `/root/balance` | 코어·서버·금화 정책·100 seed 측정 |
| Host / Playtester | `/root` | 저장·IPC·네트워크·메뉴·패키지·최종 통합 |

## 현재 결과

- 코어와 서버 구현 완료. 새 전투에서 동료 이동 없음. 예전 확정 영수증은 복구 전용.
- 금화 양방향 정산, 보호 한도, 오프라인 미정산액, 백업 복원 기준, 수신/재생 확인 분리 구현 완료.
- 100 seed × 2 정책의 30분 가상 사냥 200개 궤적과 금화 정책 1,200행, 총 1,400행 통과.
- 결정적 테스트에서 응답 유실·중복·재시작·동시 요청·지연 영수증·잘못된 수신함·저장 중단을 검증했다.
- macOS DMG 및 Windows x64 NSIS 빌드 생성. DMG 읽기 전용 마운트 후 임시 설치본의 app.asar 동일성 확인.
- 정확히 `npm test && npm run lint && npm run typecheck` 통과: 78개 파일, 1,133개 테스트, lint 0 warnings, 전체 타입 검사.
- 실제 DMG 설치 복사본으로 Electron 4회 부팅·29개 필수 검사·11 PNG 통과. 각 부팅에서 112개 dist/static 파일이 패키지와 일치하고 전부 exit 0으로 종료했다.
- 방어 이벤트는 알림 미지원 상태에서도 4,951ms/4,937ms에 도착했다. 전체 SaveFile/GameState의 동결·종료 전환 시점 보존·입력 재개, 950G로 재시작 후 중복 정산 없음, 실제 공격 메뉴의 +50G와 버튼 잠금을 확인했다.
- 상태줄은 400×260에서 y31.1875–45.578125로 배너 아래·카운터 위에 배치된다. Designer와 Host가 실제 PNG를 열어 확인했다.
- macOS smoke는 `SMOKE_OK` 및 exit 0으로 통과했다. NSIS 빌드 생성과 Windows에서의 실제 실행은 구분한다.

| 구분 | 결과 |
| --- | --- |
| 요청한 클라이언트·서버 구현 | 완료 |
| 단위·결정적 밸런스·격리 macOS Electron 자동 검증 | 완료 |
| 실제 PostgreSQL·운영 배포·Windows 실기기·Steam 검증 | 대기 |
| 공개 출시 가능 | 아직 아님 — 운영/환경 검증 필요 |

최종 task별 AC와 게이트 원본은 세션의 `v91-journal.json`, Designer→Critic→Balance→Playtester의
순차 판단은 `review/report.json`과 각 역할 응답에서 확인한다. 공개 출시 승인을 뜻하지 않는다.

## 실패와 수정 기록

- 첫 전체 단위 검사: 1,122 통과 / 3 실패. 새 wallet wire 필드, IPC 채널, 재생 중 명시적 거절에 맞춰 기존 계약 검사를 갱신했다. 원본 `tests-01.log` 보존.
- 버전 인상 후 검사: 1,131 통과 / 2 실패. 패키지 버전과 트레이·현재 README 산출물 이름 불일치를 수정했다.
- 보존용 과거 소스와 추출된 CommonJS 빌드를 ESLint가 제품 소스로 읽었다. 기존 forensic 제외 규칙에 이번 세션의 보존/컴파일 출력 경로만 추가했다. 제품 규칙의 강도는 유지했다.
- Native 01은 관찰기 문자열 escape, 02는 외부 관찰 왕복 시간을 수신 지연에 포함한 측정 위치 때문에 실패했다. 03은 객체 키 순서, 04/05는 rAF 전환 관찰보다 한 프레임 먼저 읽는 검증기 문제였다. 실제 전체 상태 값 비교는 유지하고 의미상 같은 deep equality 및 전환 관찰 후 판정으로 보강했다. 06의 29개 전체 검사가 통과했다. 각 실패 원본은 보존하고 게임 clock·전투·판정을 바꾸지 않았다.
- README 계약 테스트도 새 금화·방어 동작과 기존 24시간 회수 복구 안내로 갱신했다. 최종 게이트 이전의 실패 로그를 보존했다.
- 실제 화면 검수에서 방어 상태줄과 VS/결과 배너의 겹침을 발견했다. 상태줄을 배너 아래·카운터 위의 한 줄로 이동하고 창 배율에 비례하도록 수정했다.
- 독립 감사가 찾은 미완료 요청의 자동 복구 누락, 불연속 수신 순번, 늦은 영수증의 전적 회귀를 수정하고 통합 회귀를 추가했다.

## 외부 환경 및 출시 대기

- 실제 PostgreSQL 통합 검사는 로컬 서버 실행 환경 부재로 PENDING이다. 예약 로컬 포트는 ECONNREFUSED, 설치된 Docker daemon도 응답하지 않았다. `postgres-01.json`은 실패 원본이며 migration/transaction 성공 근거로 사용하지 않는다. 결정적 PG 저장소 단위 검사는 별도다.
- 운영 서버 migration/deploy와 공유 DB를 쓰는 구버전 서비스의 동시 전환. 구서비스가 계속 쓰면 예전 약탈을 새 코드만으로 막았다고 주장할 수 없다.
- Windows 11 실기기의 입력·DPI·다중 모니터·설치/업데이트/제거 후 저장 보존.
- 실제 Steam AppID·클라이언트 초기화 및 설치. 일반 실행용 선택적 기반은 기존 v0.9 그대로다.
- 기존 v0.8/v0.9 장시간 패키지 성능 행렬 및 실제 사람의 업무 방해·재미 관찰은 미완료 상태를 유지한다.

**구현 완료 / 자동 검증 완료 / 외부 환경 대기 / 출시 가능**을 서로 구분한다.

## 최종 증거 경로

- `.agentdoc/v091-20260917T024712Z/V091-05-gates-1789615495005.log`
- `.agentdoc/v091-20260917T024712Z/native-06/native.json` 및 단계별 `ui.json`, `runtime.json`, PNG
- `.agentdoc/v091-20260917T024712Z/balance-01.json` / `.jsonl`
- `.agentdoc/v091-20260917T024712Z/postgres-01.json` / `postgres-environment-01.json` — 환경 실패
- `.agentdoc/v091-20260917T024712Z/v91-journal.json`, `review/report.json`, `artifacts.json`

네이티브와 밸런스 verifier는 원본 자료·소스·패키지 해시를 다시 검사한다. 이번 검증은
합성 입력/합성 계정이며, 실제 사용자의 저장이나 운영 PvP를 사용하지 않았다.
