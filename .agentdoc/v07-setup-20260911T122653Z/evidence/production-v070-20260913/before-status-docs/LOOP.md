# v7 실행 및 재개

현재 setup 실행 폴더는 `.agentdoc/v07-setup-20260911T122653Z/`다. 제품 소스는 0.6.0, 기존 포인터는 v3, 새 하네스는 v7이다. 정확한 결과는 HANDOFF.md와 실행 저널에 기록한다.

```sh
node .harness/v7/loop/develop.mjs status .agentdoc/v07-setup-20260911T122653Z
node .harness/v7/loop/develop.mjs next .agentdoc/v07-setup-20260911T122653Z
node .harness/v7/loop/fun.mjs selftest
node .harness/v7/loop/config.mjs validate
```

setup 완료 후 소스/프로토콜을 수정하기 전에 `develop.mjs phase <runDir> candidate`로 승급한다. 모든 candidate 작업의 최신 검증을 마친 뒤 `phase <runDir> release`로 승급한다. 각 단계는 pending 게임 작업을 자동으로 완료하지 않는다.

작업 실행은 `start <runDir> <taskId>`, `check <runDir> <taskId> <등록AC ID|gates>`, `verify <runDir> <taskId> <review.md>` 순서다. config.json의 파일 소유권과 AC 명령을 따른다. 같은 파일의 구현은 직렬화하고 변경 영향이 있는 작업만 invalidate한다. 원본 실패와 이전 검증 이력은 유지한다.

## 수치 기준선

```sh
node .harness/v7/loop/measure.mjs run .agentdoc/v07-setup-20260911T122653Z/evidence/baseline.json --phase baseline --seeds 100 --seed 1 --protocol docs/v0.7/EVALUATION_PROTOCOL.json
node .harness/v7/loop/measure.mjs verify .agentdoc/v07-setup-20260911T122653Z/evidence/baseline.json --phase baseline
node .harness/v7/loop/setup-check.mjs .agentdoc/v07-setup-20260911T122653Z
```

후속 빠른 선별은 `--phase candidate --seed-set exploration --screening`, 최종 전체 정책 측정은 `--phase release --suite`를 사용한다. 측정기의 재개와 정책 옵션은 `measure.mjs --help`를 먼저 확인한다. 소스/프로토콜/도구가 바뀌면 이전 실행 결과에 이어 쓰지 않고 별도 경로를 사용한다. 출력 JSON이 이미 존재하면 성공 원본을 덮어쓰지 않는다. 빠른 탐색과 100 seed 최종 측정을 구분한다. 작업 완료 AC의 `verify --phase candidate`는 검증 seed 1–100의 12시간 측정, 기준 정책 포함, 목표 통과를 모두 요구한다. `--phase release`는 전체 9개 정책도 요구한다. 일반 `verify`의 구조 검증만으로 작업을 완료하지 않는다.

## 설계와 후속 결과 감사

```sh
node .harness/v7/loop/fun.mjs init <runDir>/reviews/design
node .harness/v7/loop/fun.mjs next <runDir>/reviews/design
node .harness/v7/loop/fun.mjs submit <runDir>/reviews/design <response.json>
node .harness/v7/loop/audit.mjs init <runDir>/reviews/final <runDir>/evidence/native/matrix.json <runDir>/evidence/release.json
node .harness/v7/loop/audit.mjs next <runDir>/reviews/final
node .harness/v7/loop/audit.mjs submit <runDir>/reviews/final <response.json>
node .harness/v7/loop/audit.mjs report <runDir>/reviews/final
```

각 next의 전체 prompt/template을 별도 역할에 전달한다. 설계 완료는 아직 측정하지 않은 미래 결과의 성공 선언이 아니다. 감사 verify는 실제 결과를 출하 AC로 확인하며 분석 완료와 분리한다.

후보 수치와 콘텐츠 ID를 프로토콜에 먼저 작성하고 fun init을 실행한다. Critic 등 검토자의 실제 revise 후 프로토콜을 수정하면 `fun.mjs refresh <design-dir>`로 새 지문에 연결하고 전체 역할 검토를 다시 진행한다. `fun.mjs verify <design-dir>`도 V07-01의 필수 AC다. 최초 프로토콜 변경을 setup 종료 근거에 섞지 않는다.

## 후속 Native와 패키지

```sh
node .harness/v7/loop/e2e.mjs <runDir>/evidence/integration/journey.json 0 active
node .harness/v7/loop/e2e-matrix.mjs run <runDir>/evidence/native
node .harness/v7/loop/e2e-matrix.mjs status <runDir>/evidence/native
node .harness/v7/loop/e2e-matrix.mjs verify <runDir>/evidence/native
npm run smoke
npm run package
node .harness/v7/loop/package-check.mjs <runDir>/evidence/package/package.json release/mac-arm64/DesMon.app
```

matrix의 실행 중 process group이 살아 있으면 중복 시작하지 않는다. 180분 여정은 10분마다 실제 메뉴를 방문하며 9개의 짧은 조합은 서로 독립 세션이다. 실패한 원본/스크린샷을 보존하고 앱 또는 도구 수정 뒤 새 지문에서 재실행한다. setup에서 이 후속 기능 검증을 통과한 것으로 기록하지 않는다.
