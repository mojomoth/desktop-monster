# v0.8 검수 기록

현재 상태: **구현·기능 검증·수집 측정 완료, 장시간 성능 검증 미완료**. `technical_verification_complete_human_pending`은 아직 선언하지 않는다. 사람 관측은 0명이며 두 번째 물리 Mac, 실제 권한 승인·전역 훅·청취 검증도 대기 중이다.

모든 경로는 저장소 기준이다. 이번 실행 기록은 `.agentdoc/v08-20260914T050544Z/`에 보존한다. 실패 기록을 성공 결과로 덮어쓰지 않았다.

| 항목 | 상태·근거 |
|---|---|
| 정확한 게이트 | `npm test && npm run lint && npm run typecheck` 최종 실행 2026-09-14T06:43:42Z exit 0, 62파일·987테스트 및 lint/typecheck 통과. `gates-complete.json`, `gates-complete.log`. |
| 결정적 신규 검사 | 설정 교차 보존·실패, 새/기존 설치 기본값, 입력 시작 중복, 저장 상태 유지·성공 후 해제, v1–v3/손상·지원하지 않는 형식, 검증 후 읽기 경합, 새 설정 실패 시 진행 차단. 정책 선택·장부·관측 위변조·운영 요청 범위 검증 포함. |
| 실제 픽셀 메뉴 | 최종 DMG 설치본 `ui/attempt-02/ui-report.json`: 16/16, PNG 10장. 420×640 세 CTA, 긴 수치 줄바꿈, Tab/Shift+Tab/Enter/Space, 실제 재굴림 후 상세·포커스, 도감 순차 ACK, 정원 30, 설정, 저장 실패 후 메뉴 재열기·성공 후 해제. Designer와 Critic이 PNG 직접 확인. |
| 실제 첫 실행·재시작 | `startup/attempt02/startup-report.json`: 37/37. 창 입력의 실제 몬스터 피해, 건너뛰기·닫기 후 재시작, 트레이 안내 재열기, 중복 연결 요청과 권한 대기 상태, v0.7 실제 저장 표본 업그레이드, 트레이 설정 즉시 적용·재시작 보존, 손상 원본 보존·온라인 차단·복원 후 실행, 첫 설정 쓰기 실패. |
| smoke | 최종 소스의 `npm run smoke` exit 0, `SMOKE_OK`. `smoke-final.json`, `smoke-final.log`. 개인 세이브와 분리한 시뮬레이션 입력. |
| 패키지·설치 | `npm run package` exit 0. DMG를 읽기 전용 마운트하고 격리된 위치에 복사하여 실행·재시작. 설치본과 빌드 app.asar SHA 일치. `package-final.json`. Critic이 패키지 내부 dist/static 102개와 현재 파일의 바이트 일치를 별도 확인. |
| 운영 온라인 | `online/attempt01/report.json`: 79검사·42HTTP, 지정 테스트 계정 2개, 실제 전투 1회·탈취·회수 1회. 이동 확인 사이 업로드 없이 양쪽 명단 확인. Node 자식 프로세스 2회에서 실제 NetSession의 저장된 identity·토큰·1승 기록 및 서버 상태 재조회. 토큰 임시 파일 삭제, 양쪽 빈 명단 정리 확인. |
| 수집 정책 | `collection/attempt01/`: 고정된 A–D, screening 4×20 → 검증·동결 → validation 4×100 및 원시 검증 완료. 최종 `resume-workers4/completion.json` PASS. Critic이 480개 원시 해시·seed·동결 결합과 4,800개 시점의 명단을 독립 재구성. [결과·관리 비용·한계](COLLECTION_RESULTS.md). |
| 상주 성능 | **미완료**. `performance/queue-01/`가 종료 명령으로 중단됨. 아래 사유와 새 실행 명령 참고. |
| 변경 범위 | `scope-check.json`: 변경 전과 비교하여 core/server/art 및 서버 HTTP·net 계약 관련 보호 파일 54개 변화 없음. 루트 SPEC/IMPLEMENTATION_PLAN과 `.harness/CURRENT` 유지. |
| 독립 검토 | `reviews/critic.md`: 최종 패키지·UI·저장/설정·온라인·수집 원장과 보고서 검토 완료. 수집 결과 표 96개 수치도 독립 대조. 성능·사람 검증은 미완료로 유지. |
| 사람 검증 | 미수집. [관찰 기록지](EXTERNAL_TEST.md)의 5명×90분·2대·핵심 과제별 4/5·반복 오해 보완·다음 업무일 자발적 재실행을 실제로 수행해야 함. |

## 테스트 빌드

- `release/DesMon-0.8.0-arm64.dmg` — 110,364,222 bytes.
- DMG SHA-256: `b84b53cc8d159b99fc7849b49d5ede60ec302cfe5933a36b6caf6fcc0cc08da7`.
- 설치본 app.asar SHA-256: `7f4a217d0bc49255003721841ccc965a01daf4fcd5100e94a4f464ef72455472`.
- 로컬 설치본: `.agentdoc/v08-20260914T050544Z/install/attempt02/DesMon.app`.

이미 실행 중이던 개인 개발 앱은 종료하거나 다시 불러오지 않았다. 새 버전을 직접 사용할 때는 기존 앱을 종료하고 새 패키지의 앱을 실행한다. 개발 중인 Electron과 패키지 DesMon의 macOS 권한 대상도 각각 확인해야 한다.

서명·공증, Steam/Windows 출시, 서버 배포는 이번 실행에 포함하지 않았다. 첫 설치 복사에서 `cp -cR`가 서로 다른 파일시스템 간 clone 오류로 실패하여, 새 attempt에서 `ditto`로 복사·실행했다. 원래 실패 경로는 검증 성공 경로로 사용하지 않았다.

## 성능 관측 중단과 재개

초기 디버거 bootstrap context 교체 문제는 stdout 준비 신호를 기다리도록 고쳤다. 이후 baseline05는 약 60초, baseline06은 약 13분 21초에서 종료됐다. macOS 로그에 native 메뉴 액션이 관측됐으며, 추가 진단을 넣은 queue-01에서는 다음 경로가 직접 확인됐다.

`main/index.js의 tray quit callback → MenuItem.click → app.quit → before-quit → window closed → exit 0`

queue-01 관측은 약 100.22초에서 멈췄다. 누가 종료 명령을 보냈는지는 확인하지 않았다. 이 실행을 충돌이나 30분 성능 통과로 표현하지 않는다. 관측기는 원래 종료 동작을 취소하지 않았고, 순차 실행기도 실패 뒤 후속 관측을 시작하지 않았다. raw 표본·종료 스택·실패 JSON은 남아 있다.

5개 관측은 동일 기기·최종 소스와 패키지에서 연속 약 5시간이 필요하다. 수집 시뮬레이션 등 부하 작업과 분리하고, 테스트 앱을 유지할 수 있는 시간에 다음을 실행한다. 기존 queue 출력 경로를 재사용하지 않는다.

```sh
node .harness/v8/run-performance.mjs \
  .agentdoc/v08-20260914T050544Z/preservation/DesMon-v070.app \
  .agentdoc/v08-20260914T050544Z/install/attempt02/DesMon.app \
  .agentdoc/v08-20260914T050544Z/performance/queue-02
```

이 실행기는 baseline active/idle 각 30분, candidate active/idle 각 30분, mixed 180분 및 마지막 비교 보고서를 순서대로 실행한다. 기간·표본·해시·입력·진행·오류를 재검산하고 동결한 CPU/working-set 예산을 그대로 적용한다. 비교가 통과한 뒤 `performance-report.mjs verify <comparison.json>`으로 다시 확인한다. 메모리는 프로세스별 working set 합계이며 중복 없는 실제 RAM이나 배터리 보증이 아니다. [Electron MemoryInfo](https://www.electronjs.org/docs/latest/api/structures/memory-info)

## 해석의 한계

실제 UI 검사는 합성 입력을 Electron의 실제 입력/IPC 경로로 전달했다. 권한 조회는 미승인으로 모의 처리하여 전역 훅이 로드되지 않음을 확인했다. 오디오 검사는 Electron의 실제 mute 상태이며, 실제 청취와 macOS 권한 승인·훅 사용은 사람 검증으로 남는다. [Electron setAudioMuted](https://www.electronjs.org/docs/latest/api/web-contents#contentssetaudiomutedmuted)

온라인의 재시작 검사는 실제 NetSession을 새 Node 프로세스에서 다시 읽은 결과다. 네이티브 앱 재시작은 별도의 오프라인 패키지 검사로 확인했다. 서버를 재시작하거나 배포하지 않았다. 테스트 계정 2행과 합성 전적은 서버에 남으며, 개인 인증 정보와 다른 사용자의 상대 데이터는 검사하지 않았다.
