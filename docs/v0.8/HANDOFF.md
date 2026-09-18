# v0.8 인계

제품 코드는 구현했고 최종 DMG 설치본의 기능·재시작·원본 보호와 운영 테스트 계정 전투를 검증했다. 수집 정책 480개 궤적의 12시간 측정과 독립 검산도 완료했다. 현재 전체 기술 검증 완료 선언은 보류한다. 성능 관측은 반복된 native 트레이 종료로 미완료이며 사람이 참여한 외부 관측은 0명이다. [검수 기록](ACCEPTANCE.md)에 성공·실패와 근거 경로를 구분했다.

## 유지할 상태

- 세션 `.agentdoc/v08-20260914T050544Z/`. 변경 전 소스 316개와 실제 v0.7 앱은 `preservation/`에 있다. 기존 대규모 사용자 변경을 reset·stash·commit하지 않았다.
- 이번 작업만의 검토용 차이는 `v08-only.patch`, 파일별 변경 전후 SHA는 `v08-changes.json`이다. Git HEAD 대신 작업 시작 시 보존한 소스와 비교하므로 기존 사용자 변경과 구분된다.
- 420×640 픽셀 메뉴, 게임 수치·포획·정원·콘텐츠, core/server/art/HTTP 계약 유지. `.harness/CURRENT`와 루트 SPEC/IMPLEMENTATION_PLAN을 바꾸지 않았다.
- 최종 `release/DesMon-0.8.0-arm64.dmg` 및 설치본 `install/attempt02/DesMon.app`. SHA는 `package-final.json` 및 ACCEPTANCE.md에 있다.
- 제품/source, 등록 프로토콜, `.harness/v8/measure*.mjs`, v7 재사용 측정 코드는 동결됐다. 변경하면 기존 결과의 현재 소스 검증이 실패하므로 새 실행으로 분리해야 한다.

## 완료된 수집 측정

점검 80개와 검증 400개가 모두 완료됐고, 최종 `collection/attempt01/resume-workers4/completion.json`은 2026-09-14T06:43:10.986727Z PASS다. 원래 감독의 `completion.json` FAIL은 동결 후 검증 작업을 workers2에서 workers4로 전환하며 지정 자식 프로세스만 중단한 기록이다. 이때 완료된 검증 원시는 0개였으며 제품·평가기·seed 변경 없이 재개했다. 원래 실패와 전환 기록은 보존했다. 실행 당시 생성한 감독 코드 원본은 `run.cjs.executed.txt`에 보존했으며 `runner-archive.json`에 원래 경로와 해시가 있다. 이는 실행된 증거이며 프로젝트 source 파일로 취급하지 않는다.

측정 순서는 screening A–D 각20개 → 독립verify → evaluator freeze → validation A–D 각100개 → 독립verify였다. 모든 seed는 사전 등록됐으며 새 저장·12시간·초당2회 입력·600초 메뉴·구매 없음이다. Critic이 별도 원장 계산으로 480개 raw와 4,800개 checkpoint의 명단·종·정원 점유·소모 및 대응 seed 차이를 확인했다. 측정기는 동일 binding에서 완결된 raw만 읽어 resume하며 기존 결과를 덮어쓰지 않는다.

재검산 명령은 다음과 같다.

```sh
node .harness/v8/measure.mjs verify .agentdoc/v08-20260914T050544Z/collection/attempt01/exploration.json
node .harness/v8/measure.mjs verify .agentdoc/v08-20260914T050544Z/collection/attempt01/validation.json
```

Balance의 [결과](COLLECTION_RESULTS.md)는 4개 정책과 짝지은 차이를 해석한다. 신규 영웅 우선 선택은 수집을 늘렸고, 동료 관리는 누적 포획을 늘리면서 마지막 개체 소모라는 비용을 남겼다. 사건 수와 서로 다른 종 수, 누적 획득과 현재 보유를 구분한다. 봇의 10분 메뉴 방문 결과를 사람의 보상 빈도·재미·리텐션으로 주장하지 않으며 v0.8 밸런스를 조정하지 않았다.

## 성능과 외부 관찰

`performance/queue-01/queue.json`은 실패 상태다. 마지막 실행은 실제 트레이 Quit callback으로 exit0 종료했으나 30분을 채우지 못했다. 호출한 사람/도구는 확인하지 못했다. 종료 명령을 막거나 무시하는 변경은 하지 않는다. 약5시간 동안 테스트 앱을 유지할 수 있는 시간 확인을 사용자에게 요청했다. 재개 명령과 고정 예산은 ACCEPTANCE.md에 있다. 수집 계산 등 고부하 작업과 분리하고 새 queue 출력에 실행한다.

[외부 관찰 기록지](EXTERNAL_TEST.md)를 사용해 사용자 모집, 5명×90분, Apple Silicon 2대, 실제 권한·전역 입력·음소거, 준비된 과제 이해 및 다음 업무일 자발적 재실행을 기록한다. 기술 검증 완료와 사람 검증 완료를 구분한다.

Steam 출시, Windows, 서명·공증, 서버 배포, 공개 업로드나 참가자에게 메시지 전송은 실행하지 않았다. 온라인 검사는 새 합성 계정 2개의 명단을 비운 뒤 종료했고, 임시 인증 파일을 삭제했다. 두 계정 행과 합성 전적은 서버에 남는다.
