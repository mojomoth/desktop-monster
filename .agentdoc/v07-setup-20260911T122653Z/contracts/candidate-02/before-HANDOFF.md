# v7 하네스 인계

이번 인계 범위는 v7 하네스 준비와 현재 v0.6 기준선 측정이다. **게임 v0.7 기능은 아직 구현하지 않았다.** 앱은 0.6.0, 기존 `.harness/CURRENT`는 v3이며, 기존 npm 명령과 제품 소스를 유지한다.

실행 폴더는 `.agentdoc/v07-setup-20260911T122653Z/`다. 최종 완료 판정과 검증 수치는 [실행 결과](../../.agentdoc/v07-setup-20260911T122653Z/evidence/setup-result.md), 작업별 상태와 등록 AC 로그는 [loop.json](../../.agentdoc/v07-setup-20260911T122653Z/loop.json)을 기준으로 한다. 기준선의 목표 미달은 하네스 준비 실패나 v0.7 성공으로 해석하지 않는다.

## 측정과 보존 근거

- [기준선 원시 결과·요약 JSON](../../.agentdoc/v07-setup-20260911T122653Z/evidence/baseline.json): seed 1–100, 각 12시간, 실제 엔진에 RNG·시계·입력을 주입한 시뮬레이션이다. 실제 Electron 1,200시간 또는 사람의 플레이 시간이 아니다.
- [측정 조건과 지문](../../.agentdoc/v07-setup-20260911T122653Z/evidence/baseline-execution.json): 명령, 소스·평가 도구·컴파일 결과를 연결한다. seed별 원본은 같은 폴더의 `baseline.json.runs/`에 보관한다.
- [시작 상태](../../.agentdoc/v07-setup-20260911T122653Z/baseline/metadata.json): 제품 소스 지문은 `c1b3603ed446d75fdd4830e59aac930d5fad73d17c6bef7de6c888b062914aef`다. `baseline/files.json`의 기존 파일 179개를 시작/종료에 비교한다.
- 재현용 제품 소스는 `baseline/product-source.tar.gz`, 평가기는 `baseline/harness-inputs.tar.gz`에 있다. 개인 세이브·인증 파일은 포함하지 않는다. 측정기 수정 전에 중단한 attempt01/02도 별도 보관한다.
- 기존 v0.6 데모 스크립트 4개에서 발견한 lint 오류 64개는 Node import와 동작을 유지하는 문법 정리로 수정했다. 원본은 `baseline/preexisting-demo-scripts.tar.gz`, 변경·검증 근거는 [수정 기록](../../.agentdoc/v07-setup-20260911T122653Z/reviews/preexisting-lint-repair.md)에 있다. 제품·v5·ESLint 규칙은 변경하지 않았다.

## 다음 세션

[START_PROMPT.md](START_PROMPT.md)를 사용한다. 실행·재개 명령은 [LOOP.md](LOOP.md), 제품 계약과 작업표는 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md), 후속 검증표는 [ACCEPTANCE.md](ACCEPTANCE.md)에 있다. Host가 Playtester를 겸임하고 Designer·Critic·Balance를 각각 별도 에이전트로 실행한다.

H07-01이 verified인지 확인한 뒤, 소스나 프로토콜을 수정하기 **전에** 아래 명령으로 candidate 단계에 들어간다. 이어 V07-01에서 구체적인 콘텐츠 ID와 후보 수치를 등록하고 네 역할 설계 검토를 실행한다.

```sh
node .harness/v7/loop/develop.mjs status .agentdoc/v07-setup-20260911T122653Z
node .harness/v7/loop/develop.mjs phase .agentdoc/v07-setup-20260911T122653Z candidate
node .harness/v7/loop/develop.mjs next .agentdoc/v07-setup-20260911T122653Z
```

V07-01–07은 모두 후속 작업이다. 이번 구성에서는 실제 Electron 장시간 플레이, smoke, 패키징, 운영 서버 변경을 실행하지 않는다. 관련 검증 도구와 AC를 준비했으며 최종 v0.7 소스에서 실행해야 한다. 사람의 재미·업무 방해 검증은 **PENDING**이다.
