# v7 최종 인계 계약 독립 검토

검토자: /root/harness_review. 범위: docs/v0.7/{DEVELOPMENT_PLAN,LOOP,START_PROMPT,ACCEPTANCE}.md, .harness/v7/{HARNESS.md,config.json}와 관련 검증 호출 경로. 평가 파일과 프로토콜은 읽기만 했으며 추가 광범위 테스트를 실행하지 않았다. HANDOFF의 최종 baseline 결과는 호스트가 갱신한다.

## 판정

이번 완료가 하네스 준비와 v0.6 기준선뿐이라는 범위, 앱 0.6.0/CURRENT=v3 보존, 후속 게임 작업 pending, 제품 0.7.0 최종 소스에 대한 실제 release 검증은 문서와 설정에서 일치한다. Host가 Playtester를 겸임하고 Designer/Critic/Balance를 별도 ID로 운영하는 4슬롯 구성도 일치한다. 영웅 실제 선택·몬스터 실제 처치에 따른 도감 공개와 레거시 ACK 정리, PvP 각 행의 영웅·동료 파티 표시도 일관된다. 다음 1건은 후속 candidate 중간 완료 판정의 빈틈이며 현재 baseline 원본의 유효성이나 최종 release의 성공 조건을 무효화하지 않는다.

## C1 · Medium · V07-05의 100 seed 장기 측정 요구가 등록 AC에서 강제되지 않음

DEVELOPMENT_PLAN.md:17은 V07-05에 100 seed 장기 분포와 정책 비교를 요구한다. 그러나 config.json의 V07-05 measurement AC는 `measure.mjs verify <runDir>/evidence/candidate.json`만 실행한다. measure.mjs:598–602의 일반 verify는 파일명을 판정에 사용하지 않으며 다음 보고서도 종료 코드 0이 될 수 있다.

- 현재 소스/평가 지문에 맞는 baseline 보고서: baseline 목표 미달도 유효한 측정으로서 성공한다.
- candidate/exploration/screening 보고서: 20 seed × 120분의 첫 환생 선별만 통과하면 성공한다.
- 기준 정책이 없는 candidate 측정: targets.passed=null(NOT_EVALUATED)을 실패로 처리하지 않는다.

이는 적절한 일반 측정기 동작이지만 V07-05의 완료 AC로 그대로 사용하면 장기 목표 확인 전에 verified로 올릴 수 있다. 실제 최종 release에서는 audit.mjs:191–199가 phase=release, validation seed, 목표 성공을 요구하고 validateMeasurement가 전체 9개 정책을 강제하므로 이 사례들이 출하 승인까지 통과하지는 않는다.

권고: 후속 candidate를 시작하기 전에 작업 전용 acceptance에서 phase=candidate, screening=false, seedSet=validation, 기준 정책 포함, targets.passed=true를 명시적으로 검사하고 등록 AC에 연결한다. baseline/탐색/NOT_EVALUATED의 유효성 검증은 계속 허용한다. 현재 동결된 평가기는 본 검토에서 변경하지 않았다. 단기 인계에는 이 차이를 명시하고 Host가 위 필드를 확인한 뒤 V07-05를 verified로 올리도록 해야 한다.

## 확인한 실제 release 범위

Native는 5/15/30분 × active/idle/intermittent 9개와 별도 180분 active 1개(총 330분), 긴 세션의 10분마다 실제 메뉴 방문/준비된 환생 선택이다. 측정은 release suite의 9개 정책 × 100 seed × 12시간이며, 4역 결과 감사·정확한 저장소 게이트·smoke·실제 패키지가 별도 필수다. 사람의 재미·업무 방해 관찰은 근거가 없으면 PENDING이며 setup 자체 검사로 제품 기능을 통과 처리하지 않는다.


## 후속 완료 경계 추가 검토

호스트가 C1을 승인하여 부분 baseline을 보존한 뒤 등록 측정 AC를 단계별로 강화하고 있다. 다음 두 건을 최종 재시작 전에 추가 보고했다. 본 검토자는 v7 파일을 변경하지 않았다.

### C2 · Major · package AC가 현재 소스의 패키지 생성을 포함하지 않음

현재 package-check는 `.app`과 현재 `dist`/`static`의 파일 바이트 일치를 검사하며 앱 버전 0.7.0도 확인한다. 하지만 등록 AC에 `npm run package`가 없고 package-check 자신도 빌드하지 않는다. 소스가 수정된 후 이전 0.7.0의 `dist`와 `.app`이 함께 남아 있으면 서로 일치하므로 현재 소스 지문을 붙여 통과할 수 있다. 이후 smoke나 Native가 최신 dist를 빌드해도 develop의 현재 소스/도구/소유 파일 지문은 이 패키지 불일치를 감지하지 않는다.

등록 package AC를 `npm run package && node .harness/v7/loop/package-check.mjs ...`로 묶는 최소 수정이 적절하다. 그러면 동일 AC 실행에서 현재 소스의 .app/.dmg 생성과 실제 packaged runtime 검증을 연결할 수 있다. 현재 setup에서는 이 장시간/Native AC를 실행할 필요가 없다.

### C3 · Medium · 성공 AC 이후 원본 증거 교체/누락을 journal이 재검증하지 않음

`develop.mjs`의 check에는 명령 로그 해시, verify에는 별도 review.md 해시가 저장된다. verify/phase는 이 둘을 다시 읽지만, 명령이 읽거나 생성한 baseline.json/candidate.json/matrix 원본/package.json/설계·감사 세션의 해시를 저널에서 별도로 보존하지 않는다. 따라서 성공 check 이후 원본 artifact가 삭제되거나 교체되어도 로그와 review가 같으면 verified 또는 다음 phase로 진입할 수 있다. 원본이 정상인 현재 baseline의 계산을 무효화하는 문제가 아니라, 재개 가능한 증거 보존 계약의 경계다.

AC별 명시적 증거 경로를 config에 등록하고 check가 성공했을 때 해당 파일/디렉터리 manifest를 저장한 뒤 verify/phase에서 같은 바이트를 재확인하는 보강을 권고한다. Native는 matrix.json만으로 부족하며 그 원본과 스크린샷이 있는 완료된 native 디렉터리를 포함해야 한다. 시간에 따라 바뀌는 출력 전체를 평가 지문에 섞을 필요는 없다.


## C1/C2 재검토와 C3 구현 인계

- C1 해결: 원저자의 `validateMeasurementPhase`와 `verify FILE --phase baseline|candidate|release`를 읽기 전용으로 재검토했다. baseline은 정확한 기준 정책/100 seed/12시간, candidate는 validation 100 seed/12시간/기준 정책 포함/목표 성공, release는 전체 9개 정책/목표 성공을 요구한다. generic verify는 탐색 자료의 구조 검증으로 남는다. 측정기 테스트를 독립 실행하여 **14개 통과**를 확인했다. 등록 측정 AC에도 각 phase 옵션이 연결되었다.
- C2 해결: 호스트가 등록 package AC에 `npm run package &&`를 추가했다. 현재 소스 빌드/패키징 성공 뒤에만 실제 packaged runtime 검증을 실행한다. 이번 setup에서는 해당 제품 출시 AC를 실행하지 않는다.
- C3 구현: 호스트 승인으로 본 검토자가 소유한 develop.mjs/develop.test.ts 두 파일에 구현했다. AC의 artifacts 등록 경로를 shell escaping 없이 절대 경로로 해석하고 실행 후 각 파일/디렉터리 manifest를 저장한다. 실패/미생성 원본은 null로 보존하며 task verify에서는 모든 등록 경로의 nonempty/non-null manifest를 요구한다. task verify와 기록 증거 검증/CLI phase 재개 시 등록 경로 집합, 파일 집합과 SHA를 다시 비교하므로 파일 추가/삭제/교체 및 payload 축소를 거부한다. artifacts=[]인 테스트/gates는 별도 출력 파일을 요구하지 않는다.
- C3 검증: 생성 전 파일 부재와 실행 후 생성, 기존 실패/누락 snapshot 보존과 최신 재검사, 변경/삭제 원본 거부, 실제 CLI phase 거부, 디렉터리 추가 파일 및 일부 파일 manifest 누락 거부를 검사했다. `develop.test.ts` **11개 통과**와 `node --check develop.mjs` 성공을 확인하고 두 파일을 동결했다. 이는 C3 작성자의 검증이며 독립 검토를 대신하지 않는다. /root/ui_pvp_review가 별도 artifact-binding-review.md로 독립 검토한다.
