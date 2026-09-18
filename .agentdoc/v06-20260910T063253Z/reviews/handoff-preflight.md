**Designer 인계 사전점검 — 2026-09-10, 읽기 전용**

`START_PROMPT.md`와 `DEVELOPMENT_PLAN.md`의 완료 조건을 현재 `LOOP.md`, `ACCEPTANCE.md`, `HANDOFF.md`, README 및 `package-check.mjs` 계약에 대조했다. 이미 예정된 승인 Native 9개 확보, 정식 4역 감사, smoke, 최종 0.6 패키징·실행·저장·재개 검사, 최종 문서 갱신 밖에 빠진 필수 실행 증거는 발견하지 못했다. 최종 문서에는 아래 백업 범위 보완이 필요하다. 이 문서는 정식 Designer audit이나 출시 후보 완료 판정이 아니다.

검토 시점 `ACCEPTANCE.md:15`는 Native 7/9 승인, 첫 30-idle 보류, 30-intermittent 진행 상태다. 고정 source는 `c1b3603ed446d75fdd4830e59aac930d5fad73d17c6bef7de6c888b062914aef`, evaluation은 `53fc0326a4ad1a742b775f3bdf887a072de0927e1d811af3431e116663d9e080`이다. 앱·평가 도구·공유 문서를 수정하거나 Electron·테스트를 실행하지 않았다.

| 필수 계약 | 현재 근거 또는 이미 예정된 후속 작업 | 사전점검 판단 |
| --- | --- | --- |
| 각 AC와 정확한 게이트, 하네스 검사 및 지문 (`START_PROMPT.md:136`, `:162`, `:178`) | `ACCEPTANCE.md:22`의 776 tests/lint/typecheck 및 하네스 52검사 원본 기록, `LOOP.md:52`의 동일 소스 공유 게이트 계약 | 새로운 실행 항목 없음. 최종 상태와 링크를 실제 로그에 맞춰 갱신한다. |
| canonical 100 seeds, 채택 근거 실험, 원시 분포 재계산 (`START_PROMPT.md:161`, `:179`) | `ACCEPTANCE.md:13`의 실험 10800행/3600궤적·피버200·신규 idle300, `:14`의 canonical1800행/18그룹/558분포; `EXPERIMENT_RESULTS.md`의 제외 판단과 원본 | 기존 최종 측정과 독립 재계산으로 대응한다. 추가 실험은 필수 누락으로 보지 않는다. |
| 실제 9개 독립 관측·새 UI journey·4역 감사 (`START_PROMPT.md:164`, `:169`, `:180`) | `LOOP.md:31`의 matrix run/status/verify, `:36`의 audit init/next 및 `:26`의 실제 4역 순서 | 완료 전 기존 계획대로 승인 9개와 실제 역할 응답·보고서가 필요하다. quick 실행이나 사전검토로 대체하지 않는다. |
| 같은 0.6 버전 smoke, `.app`/`.dmg`, 패키지 실행·저장·재개 (`START_PROMPT.md:191`) | `LOOP.md:47`의 최종 package-check 명령; 실행기는 실제 `.app` main·메뉴 IPC·재시작을 검사 | 최종 패키지의 non-probe 실행이 필요하다. 개발용 패키지나 `--probe` 결과는 대응 증거가 아니다. |
| 구세이브 재산·동료·영웅·전적·새 UI 상태 보존 (`START_PROMPT.md:193`) | `package-check.mjs:112`의 보존 필드, `:158`의 0.6.0 검사, `:187`의 구세이브 비교, `:188`의 기존 발견 이관, `:196`의 실제 목표 저장, `:203`의 재시작 비교 | 합성 fixture에 대해 필요한 최종 패키지 검사 계약이 있다. 조건부 보류안은 제외됐으므로 pending 후보 보존 검사를 별도 필수로 만들지 않는다. |
| 상태 분리·문서·백업·실행하지 않은 범위 (`START_PROMPT.md:194`, `:196`, `:212`) | 현재 HANDOFF의 진행 중·사람 PENDING·DESMON_SKIP_NET=1 및 최종 문서 갱신 계획 | 아래 백업 범위를 보완하고, 각 완료 상태와 산출물 링크를 마지막 실제 결과로 채운다. |

**최종 문서에 필요한 보완: save.json과 identity.json의 같은 시점 백업**

현재 `docs/v0.6/HANDOFF.md:12`와 `README.md:325`는 `save.json`만 백업하도록 안내한다. 공식 전적까지 복원한다는 호환성 설명에는 범위가 부족하다. `src/main/identity.ts:11`은 저장 파일을 `identity.json`으로 정하고, `:16`에는 인증 토큰, `:20`에는 공식 `pvpHistory`가 있다. `src/main/net.ts:245`의 `pvpHistory()`는 이 identity 값을 읽는다. `src/main/ipc.ts:177`의 `withOfficialRecord`는 save의 wins/losses를 해당 값으로 덮고, `:191`의 로드와 `:197`의 저장 모두 이를 적용한다. 패키지 검사도 이 계약 때문에 `package-check.mjs:175`에서 토큰 없는 합성 identity의 전적을 따로 준비한다.

따라서 최종 인계에는 앱을 종료한 뒤 로컬 userData 전체, 최소한 `save.json`과 `identity.json`을 같은 시점으로 백업하고 해당 버전의 백업 묶음을 함께 복원하도록 안내해야 한다. v0.6 복귀 시에도 v0.6 백업 묶음을 사용한다. identity는 인증 토큰을 포함하므로 개인 로컬 백업으로만 보관하고 공유 폴더·실행 증거에 복사하지 않는다. 이는 예정된 finaldocs의 수정 항목이며 개인 저장 파일 접근이나 새 제품 코드 변경을 요구하지 않는다. 호스트가 이 보완을 수용했으며 후속 문서 갱신 때 반영할 예정이다.

**이미 예정된 후속 작업에서 놓치지 않을 기록 경계**

- `package-check.mjs:140`의 최종 mode는 `package-verification`이어야 한다. 실제 runtime 0.6.0, 현재 dist/static과 packaged bytes 비교, source/evaluation 및 executable/asar 해시, save 전후 원본·이미지·프로세스 종료 결과를 패키지 기록에 연결한다. 실행기는 `.dmg` 자체를 검사하지 않으므로 예정된 `npm run package` 기록에 실제 `.app`·`.dmg` 경로와 산출물 확인을 함께 남긴다. 별도 DMG 마운트 검사를 새 필수 요건으로 추가하는 뜻은 아니다.
- 첫 30-idle 이상 원본과 그 SHA, 원인 미확정, 고정된 한 번 재검증 정책은 최종 인계에 남긴다. `evidence/idle-quality-policy.json` 및 `reviews/idle-anomaly-critic.md`가 추가 판정 계약이다. 기존 matrix 체크 성공만으로 보류 원본을 승인하지 않는다. 새 결과에도 진행이 나타나면 재실행을 반복하지 않고 정책대로 근거를 보류한다. 0 결과를 얻더라도 합성 송신 횟수 0을 모든 창 입력 부재의 증명으로 표현하지 않는다.
- 최종 승인된 9개 manifest/원본/스크린샷과 정식 audit 요청·응답·보고서를 연결한다. `audit_complete`만으로 기술 출시 후보를 완료 처리하지 않는다 (`START_PROMPT.md:202`). 지금 대기 상태인 V06-09/10과 완료 체크리스트는 실제 후속 성공 뒤 갱신한다.
- V06-07/08은 사전 기준 미달에 따른 `excluded`이며 통과나 미완료 필수 기능으로 바꾸지 않는다. `DEVELOPMENT_PLAN.md:240`의 pending 후보 문구는 `START_PROMPT.md:193`의 “채택했다면” 조건과 함께 해석한다. 사람 관찰 PENDING은 명시적으로 남기되 기술 블로커로 바꾸지 않는다. 실제 접근성·전역 입력·운영 PvP·알림·배포 미실행 범위는 유지한다.

추가 코드리뷰나 새 검증 실행을 제안하지 않는다. 현재 후속 계획을 끝내고 위 백업·결과 기록을 반영하면 이 사전점검에서 확인한 인계 요구를 충족한다.
