# Round08 채택·검증 실행 계약 — Critic 읽기 확인

실제 `/root/critic`가 완료된 Round08 탐색의 사전등록·Host 선택 검사·Balance 요약,현재 공식 채택 프로토콜/생산 매개변수,config·measure·develop·fun·evidence의 관련 코드와 미실행 검증 wrapper를 읽었다. 검증1–100 결과/보고서,과거 candidate.json,검증값이 있는 상태 문서는 열람하지 않았다. 아래는 실행 전 계약 검토이며 새 설계 승인·결과 감사·검증 성공·출시 인증이 아니다.

## 채택 연결

등록 tuple의 첫 거리/첫p90은10450과10425가 같고,최종 전체p50의10시간 거리는991.5초 대4231.5초이므로10450 선택이 규칙에 맞는다.10400은 최종 전체p50이24451초로 너무 빨라 제외된다.10450의h70은탐색10/20 도달·10/20 미도달이며 전체p50=36991.5초,조건부p50=28693.9초다. lower-index 전체p50의 한계와 실제 h70선택0/20을 감추지 않는다. 이는 검증100개의 성공 예측이 아니다.

현재 공식 프로토콜은 round8/parameterVersion3,phase=candidate,experimentStage=validation,selectedExperiment={kind:candidate,id:candidate-r8-tail10450}이다. 동결 시각은2026-09-12T17:38:53.294240+00:00이다. 사전등록과 controls/candidates/milestones/selectionRule은 바이트 의미상 동일하며 실제 생산21키는10450에 해당한다. adoption에 원본 사전등록·독립분석·Host검사 SHA와 순위를 연결했다. config의 형식 검사 자체가 순위를 대신 검증하는 것은 아니다.

## 새100 실행의 사전조건과 수정

`measure.mjs`는 공식 protocol path/current hash,선택한ID와validation seed set의 일치,실제 compiled core의21키/6콘텐츠를 검사한다. 후보 AC는 phase=candidate·정확한1–100·기준정책·12시간 전체·모든 목표 통과를 요구한다. 기존 탐색20개나 unphased structural exit0만으로 V05를 verified할 수 없다. 출력 경로는 등록 AC의 `evidence/candidate-round08.json`과 맞는다.

미실행 wrapper에서 발견했던 두 사전조건 누락을 Host가 원본 보존 후 수정했고,변경 diff를 읽어 확인했다.

- 출력 JSON/새 증거 폴더와 함께 `REPORT+'.runs'` 부재도 요구하여 기존 부분 seed의 암묵적 재개를 차단한다.
- progression/harness/gates의 서로 같은 성공 S/E·로그 SHA 확인에 더해,실행 전 현재 sourceDigest/evaluationDigest와 먼저 대조한다. 실행 후 report와의 대조도 유지한다.

wrapper는 고정된공식protocol로 후보100개만 실행하고 목표exit1을 보존한 뒤 structural verify exit0을 요구한다. root-relative 소스·평가·build 아카이브를 보존하고 마지막 build archive 이후에만 endedAt을 기록한다. 수정된 wrapper를 실제 실행하지 않았으며 정적 검토 범위에서 추가 실행 차단 결함을 찾지 못했다. Host가 보고한 새 build/등록AC/게이트 PASS를 Critic의 재실행 결과로 표현하지 않는다.

## 남아 있는 최종 지문 작업

발견한 phase 전환 장애는 현재 실제로 남아 있다. V01의 protocol AC가 기록한 현재경로 artifact SHA는사전등록 `1a0fec2a…`인데 채택 후에는 `52f4206c…`다. `develop.mjs verifyRecordedEvidence()`는 모든 verified task artifact를 검사하므로,V05만 새 검증하고 release로 전환하면 `AC artifact changed or disappeared`로 거부된다. 기존 완료 design-round08의 fun verify도 새 S/E에서는 stale이다.

Host는 현재 V01–04를 역사적 근거로만 취급하고,이번100 검증 후0.7.0 version freeze에서 V01 invalidate→새 fun 경로→영향받은 V01–06 AC/게이트를 최종 동일 S/E로 다시 수행하겠다고 명시했다. **실제로 이 순서를 수행하고 과거 protocol/리뷰/로그를 보존하면 위 장애를 해소하는 최소 조건을 충족한다.** 현재 loop의 verified 표시는 아직 채택 후 최신 인증으로 사용할 수 없다.

`sourceDigest()`에는 package/lock이 포함된다. 따라서 지금0.6.0에서 생성할100 보고서도0.7.0 최종 측정의 대체물이 아니다. 최종 버전·등록 AC 출력 경로/새 review 경로·protocol/config를 먼저 동결한 뒤 새 공식 fun 및 필요한 새 측정/검사를 수행해야 한다. 기존 완료 JSON이나 .runs에 이어 쓰거나 과거 체크의 지문을 갱신하지 않는다. 후보와 release는 서로 다른 acceptance phase이며 release의9정책·Native·audit·smoke·실제package·고레벨운영서버 호환과 humanChecks=PENDING은 별도다.

## 참조 SHA-256

- 탐색 사전등록: `evidence/exploration/round-08/protocol.preregistered.json` — `1a0fec2ab785046134b46b7a77d60e622bd95685339e9c69f3a16eeedeb1f694`
- Balance final-analysis.json — `6f1b022b3bf4bef602f754459c2b1014c052bcd16d1723fb5d51a04daa25c311` (파일 SHA 및 별도 README를 확인; 전체220raw를 이번에 재감사한 것은 아님)
- Host selection check — `25333b89c23ff15aa5ac9dcc2298f8db0d6f79eacd0bc7a56274adc0bf34051a`
- 현재 공식 EVALUATION_PROTOCOL.json — `52f4206ceefec593171a7017db41f4ab7eb8c930a0314c5b018999bd81358192`
- wrapper 수정 전 보존본 — `291ee00c5739a5a7b261ffef51c58a7fe5b91e2cad08e87482e2ee8a4633a71e`
- `sessions/round08-validation.py` 수정 후 — `83b578af2b26e8b82c851c6377c3c58871e889c2e6068cc0c306bbf4b15bc45a`

변경 이력은 `evidence/round08-validation-preflight-repair/{wrapper.before.original.txt,change.json}`에 있다. Critic은 이 문서 외 파일을 수정하지 않았고 코드/하네스/검증 wrapper·테스트·빌드·측정을 실행하지 않았다.
