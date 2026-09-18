# v0.6 실행 및 재개

실행 폴더: `.agentdoc/v06-20260910T063253Z/`. 앱은 v0.6.0을 목표로 개발하며 평가 도구는 v5, `.harness/CURRENT`는 v3다. 호스트 `/root`는 이 작업 트리를 통합한다. 기존 Ralph 그래픽 lane/자동 git 루프는 사용하지 않는다.

시작 상태는 `baseline/metadata.json`, `files.json`, `source.tar.gz`, `git-status.txt`에 보존했다. 최초 게이트는 744개 테스트와 lint/typecheck, 하네스 17개 테스트가 성공했다. 이는 최종 통과 근거가 아니다. 개인 세이브나 인증 파일을 복사하지 않았다. 구버전 재현이 필요하면 archive를 별도 임시 폴더로 풀고 그 경로에서 실행하며 변경 중인 src와 혼합하지 않는다.

프로토콜 v2와 실제 엔진 생성 fresh/full-roster fixture bytes 및 해시를 게임 수정 전에 `baseline/fixtures/`에 고정했다. 방문 선택·공간 확보·클릭 계산은 `EVALUATION_PROTOCOL.json`을 따른다. 결과 이후 기준을 완화하지 않는다.

호스트만 `loop.json`을 수정한다. 각 역할은 자기 소유 파일과 응답만 수정한다. 작업별 경계는 저널의 `files`에 있다. Designer는 V06-02 hero/HUD/menu hero 및 V06-05 shop/전용 테스트, Critic은 V06-03 core/save/IPC/preload/전용 테스트, Balance는 V06-01/06 measure/experiments/전용 테스트, 호스트는 개발 실행기/matrix/audit/Electron journey와 V06-04 codex/menu index/menu.test/CSS 및 문서·통합·패키징을 맡는다. engine/save/IPC와 menu.index/menu.test는 소유자 하나만 수정한다. core/index export는 Critic에게 요청한다.

실행 순서는 의존성 충족 → 소유 배정 → 구현 → 관련 AC 검사 → 수정 동결과 통합 게이트 → 역할 검토 → verified 기록이다. pending/running/verified/excluded/blocked를 구별하며 검증 이력은 삭제하지 않는다. 실패 시 retry로 새 시도를 만들고 원인을 기록한다. excluded는 실제 V06-06 실험 검증 뒤 조건부 V06-07/08에만 가능하다.

```sh
node .harness/v5/loop/develop.mjs status .agentdoc/v06-20260910T063253Z
node .harness/v5/loop/develop.mjs next .agentdoc/v06-20260910T063253Z
node .harness/v5/loop/develop.mjs start .agentdoc/v06-20260910T063253Z V06-04
node .harness/v5/loop/develop.mjs check .agentdoc/v06-20260910T063253Z V06-04 'npx vitest run tests/menu.test.ts'
node .harness/v5/loop/develop.mjs check .agentdoc/v06-20260910T063253Z V06-04 'npm test && npm run lint && npm run typecheck'
node .harness/v5/loop/develop.mjs verify .agentdoc/v06-20260910T063253Z V06-04 .agentdoc/v06-20260910T063253Z/sessions/iter-02.md
```

`check`는 실행한 명령·종료 코드·원본 로그·로그 해시·시작/종료 소스 지문을 기록한다. `verify`는 관련 AC와 정확한 게이트가 같은 최신 소스에서 성공했는지 검사한다. `retry <run> <ID> '<이유>'`는 중단/실패 시도를 보존한 채 pending으로 바꾼다. `invalidate`는 변경 영향을 받은 검증 작업과 그 후속 작업만 pending으로 바꾸며 모든 작업을 초기화하지 않는다. 기능 영향은 호스트가 import/호출 관계와 소유 manifest로 판단해 명시적으로 invalidate한다. 과거 verified는 당시 검증 이력으로 보존한다. 최종 V06-09는 package/lock 버전을 먼저 고정한 최종 전체 지문에서 새로 검증한다.

재개 시 이 문서 → loop.json → 마지막 sessions/iter-NN.md 순으로 읽는다. 프로세스 pid/실행 세션과 로그를 먼저 확인하며 장시간 E2E를 중복 시작하지 않는다. 복구 불가능한 실행 결과를 보존하고 해당 조합만 다시 시작한다. pending을 임의로 완료로 바꾸지 않는다. 파일 교체는 임시 파일+rename으로 원자적 저장한다. 체크 중에는 모든 소유자의 수정이 멈춰 있어야 한다.

단일 E2E 기존 CLI는 유지한다. 추가한 matrix CLI와 패키지 검증 명령은 아래와 같다. 네 역할의 최종 판단은 실제 협업 에이전트 Designer → Critic → Balance → 호스트 Playtester 순으로 audit.mjs의 init/next/submit/report를 사용한다. 사람 관찰은 PENDING이며 자동 결과로 대체하지 않는다.

추가된 실제 CLI:

```sh
node .harness/v5/loop/e2e-matrix.mjs run .agentdoc/v06-20260910T063253Z/evidence/final-matrix-03
node .harness/v5/loop/e2e-matrix.mjs status .agentdoc/v06-20260910T063253Z/evidence/final-matrix-03
node .harness/v5/loop/e2e-matrix.mjs verify .agentdoc/v06-20260910T063253Z/evidence/final-matrix-03
node .harness/v5/loop/experiments.mjs .agentdoc/v06-20260910T063253Z/evidence/experiments.json --protocol docs/v0.6/EVALUATION_PROTOCOL.json
node .harness/v5/loop/measure.mjs .agentdoc/v06-20260910T063253Z/evidence/measure.json --seeds 100 --seed 1 --policies --experiments .agentdoc/v06-20260910T063253Z/evidence/experiments.json
node .harness/v5/loop/audit.mjs init .agentdoc/v06-20260910T063253Z/reviews/final .agentdoc/v06-20260910T063253Z/evidence/final-matrix-03/matrix.json .agentdoc/v06-20260910T063253Z/evidence/measure.json
node .harness/v5/loop/audit.mjs next .agentdoc/v06-20260910T063253Z/reviews/final
```

matrix는 5/15/30분×active/idle/intermittent를 순차 실행하고 `matrix-state.json`에 조합·pid·로그·재시도 이력을 원자적으로 기록한다. 같은 명령으로 재개하며 살아 있는 실행은 중복하지 않는다. 소스/실행기/프로토콜 변경 때는 새 matrix 폴더를 사용한다. 성공한 9개 원본, 실제 시간, 스크린샷 해시, 누락/중복/중첩을 검사한 `matrix.json`을 audit에 넘긴다. 기존 e2e.mjs 단일 실행 감사도 유지된다. 실제 장시간 실행에 이어 나오는 v06 journey는 진단 fixture이며 자연 획득으로 집계하지 않는다.

측정은 canonical과 실험을 별도 파일로 보존한다. measure는 실험 원본 경로/해시를 연결하고 audit은 원시 분포를 다시 계산한다. game sourceDigest와 별개로 evaluationDigest가 실행기·프로토콜·하네스 검사 파일을 묶는다. 최종 동결 이후 양쪽 지문이 바뀌면 이전 근거는 보존하고 stale 처리한다.

패키지 실제 실행 검사 CLI(0.6.0 패키지 생성 뒤):

```sh
node .harness/v5/loop/package-check.mjs .agentdoc/v06-20260910T063253Z/evidence/package.json release/mac-arm64/DesMon.app
```

패키지 executable의 main inspector를 최초 실행 전에 연결해 격리 userData를 주입하고 SMOKE 안전 경로로 전역 입력과 운영 네트워크를 제외한다. `.app` 자체 smoke, 패키지 내부 bytes와 현재 dist/static 동등성, 구세이브 재산/수집/전적/기록 이관, 실제 메뉴 목표 선택의 IPC 저장, 앱 프로세스 종료·재시작 보존을 검사하고 이미지/해시를 기록한다. 실패 시 원본 로그를 남기고 소유 임시 세이브만 제거한다. 실제 전역 입력 검사를 대신하지 않는다.

여러 독립 구현을 하나의 동일 소스로 통합할 때 호스트가 한 번 실행한 정확한 통합 게이트 로그를 해당 작업들에 공유할 수 있다. 각 작업의 검사 시작/종료 소유 manifest가 같은지 따로 대조하고 같은 원본 로그 해시·종료 코드·소스/평가 지문을 기록한다. 관련 AC는 각 작업별로 실행한다. 공유 게이트는 검사 생략이나 이전 소스의 결과 재사용이 아니다.

최종 관측 품질 검토 이력: `final-matrix-03`의 첫30-idle은 합성입력0/1처치 불일치로 원본·이전집계·이전state를 보존했다. parent와 전체 process group 종료를 확인한 뒤 호스트가 `qualityRejections`에 경로·SHA·독립리뷰·사전 재검증 정책을 연결하고 `runs`에서 그 조합만 제외했다. 같은 run CLI가 나머지8개 원본을 확인·재사용하고30-idle 하나를 실제30분 재실행했다. 새 결과와5/15idle의106개 상태표본을 추가 대조한 `evidence/native-quality-review.json`이 있다. 이는 동결 실행기 밖의 추가 호스트 검토이며, 첫 원인이나 모든 창 입력 부재를 확정하지 않는다. 원래1처치 기록과10개시도는 유지한다. 같은 이상이 재발하면 통과할 때까지 재시도하지 않는 기준을 먼저 고정했다.

V06-10은 실제 package 생성 명령의 로그·종료 코드·전후 지문·산출물 해시를 `package-build-record.json`에, 실제 패키지 실행은 `package.json`에 기록했다. 이 결과로 인계 문서를 완성한 뒤 `node .agentdoc/v06-20260910T063253Z/evidence/validate-final-package.mjs`로 현재 산출물·원본·내부 빌드 바이트를 대조하고 정확한 게이트를 실행한다. 문서의 최종 소유 manifest는 이 AC와 게이트에 결박된다. 생성·실행 원본을 문서 변경 때문에 소급 수정하지 않는다.

완료 상태: V06-01~06·09·10은 verified, V06-07/08은 실험 기준 미달 excluded다. 최종 세션은 `sessions/iter-04.md`, 최종 문서 소유 지문을 포함한 정확한 게이트는 `evidence/final-gates-10-record.json`이다. 장시간 Native·smoke·package·package-check 실행은 모두 종료했다. 기존 완료 근거를 변경하지 않고 후속 변경은 새 시도로 기록한다. 사람 관찰은 PENDING이다.
