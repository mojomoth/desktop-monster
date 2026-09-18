# V07-07 운영 근거와 등록 계약 연결 검토

2026-09-14. Host `/root` 소유. **분석 완료 / 등록 AC 미해결 / V07-07 running·unverified**.
제품 S=`84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`,
평가 E=`c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d`를 유지한다.
본 문서·진단은 새로운 release AC나 audit.mjs 감사가 아니다.

## 이번 확인

실행 전 [사전등록](preregistration.json)을 만들었다. [진단](inspection.json)은
2026-09-14T04:09:00.916Z–04:09:03.460Z 종료0이다. 별도 진단 스크립트의 SHA256은
`84dde736fe97513337f0130b8a384efaf255030994c482dae68d63e9d2fa0acc`다.
진단 스크립트는 동결 평가기 E의 일부가 아니며 자체 지문으로 구분한다.

- 과거 V07-07의 7개 로그와 등록 manifest의 1,040개 파일 항목을 재해시해 원래 값과 일치를 확인했다. 이 검사는 등록된 항목의 바이트 무결성 범위이며 Native/측정/패키지 기능을 새로 실행한 것이 아니다.
- 운영 capture/probe/supplemental 3원본 SHA, probe 사건 로그와 실행 전후 49개 binding을 확인했다. 새 배포의 35개 소스는 현재 파일 및 Git 배포 커밋과 일치했다.
- 기존 47검사·28HTTP·예상400 7개·두 계정 빈 로스터 재조회는 **2026-09-13 원본**이다. 새 인증 API/DB probe는 실행하지 않았다. 양쪽 목록 50행의 합성 대상 미노출, 계정행2개 잔류, 전투/탈취/회수/재시작 내구성 미검증은 유지한다.
- 기존 검사기 그대로 새 capture 경로에 실행한 [읽기 전용 재확인](current-compatibility.execution.json)은 2026-09-14T04:09:18.840444Z–04:09:19.915044Z, 1.074초·종료0이다. 현재 빌드/소스/테스트/원래 로그 대응과 새 health GET 1회의 SHA `8f89f1ab1922cf5adb7171aa04d64b4eaa7a2803` 유지를 확인했다. **등록 server AC는 아니다.** 이 결과의 local PASSED는 기존121테스트의 유효성 확인이며 새121테스트 실행이 아니다.
- 메모리 복제본에서 실제 기존 함수를 호출해 inspection.json에 열거한 다섯 거절(journal 변경/current verify/새 E의 native/measure/design)을 확인했다. 기대한 거절을 진단 PASS로 기록했으며 제품 출시 PASS로 해석하지 않는다. 감사 major는 코드와 불변 과거 실패에서 확인했으며 이번 audit verifier를 재실행하지 않았다.

## 연결을 막는 정확한 조건

| 조건 | 실제 코드/거절 근거 | 영향 |
| --- | --- | --- |
| config와 저널 task 정의가 정확히 같아야 함 | `develop.mjs:24`, journal-only 변경은 `Task contract changed` | loop의 AC만 바꿀 수 없다. runDir 변경도 원래 경로 검사를 우회할 수 없다. |
| `.harness/v7` 전체가 E에 포함됨 | `evidence.mjs:27` | 경로만 바꿔도 E가 달라진다. |
| Native/측정/설계가 현재 E를 요구함 | `e2e-matrix.mjs:109`, `measure.mjs:426`, `fun.mjs:146`; 각각 실제 stale 거절 | 과거 결과를 새 E의 실행 성공으로 인증할 수 없다. |
| 감사에 major가 있으면 거절함 | `audit.mjs:191–200`; 원감사 `C070-LIVE-SERVER-CONTRACT` 보존 | supplemental은 입력 규격이 아니다. 원감사 복제·major 삭제/하향·필터링으로 PASS를 만들 수 없다. |
| 모든 AC의 시작·종료 owned hashes가 현재와 같아야 함 | `develop.mjs:112–118`; 현재 verify 전이의 실제 `Failed or stale checks` 거절 | 기존7개 모두 HANDOFF/ACCEPTANCE가 달라졌다. README는 같다. server/review 두 항목만 새로 성공해도 완료되지 않는다. |

[경로만 교체한 미적용 config](server-path-only.config.proposed.json)는 정확히 V07-07 server의
command를 새 `production-v070-20260913/compatibility-after-deploy.json`로, artifacts를 그 운영 폴더로 바꾼다.
나머지 활성 config 바이트는 같은 직렬화 규칙을 사용한다. 이 파일을 **적용하지 않았다**.
가상 E는 `451a3d56f4ea1971c2129014de4f49e50c64d720beb0126b881ca0c13ec26408`이다.
이 값은 server 경로만 바꾸는 불충분한 안의 지문이며, 미구현 후속 해소 검사기의 지문이 아니다.
새 artifacts에 원본을 추가하는 것만으로 원감사의 major가 해소되지 않는다.

## 선택과 미적용 후속안

이번에는 **활성 config/평가기/프로토콜을 바꾸지 않는다**. 운영 성공과 별도 진단을 저널의
명시적 메타데이터에 연결하되 `registeredAcSatisfied=false`와 `releaseVerified=false`를 기록한다.
현재 S/E 동결·과거 원본 불변·완료된 장기/패키지 중복 실행 금지 조건에서 정식 완료 경로는 없다.
이는 환경 장애가 아니므로 3회 복구 시도를 꾸며 `blocked`로 바꾸지 않는다.

정식 연결을 구현하려면 다음의 **새 평가 계약**이 필요하다. 단순 경로 변경으로 재시도하지 않는다.

1. Host가 config, loop, 상태 문서와 변경할 평가기 파일의 소유권을 먼저 등록하고, 현재 config/저널/평가기/프로토콜·모든 기존 근거의 경로와 해시를 보존한다. 이번 `before/`와 원본 manifest는 그 시작 근거다.
2. 기존 server verifier를 새 capture 경로로 등록한다. 운영 API/DB 범위를 추가 요구한다면 probe 원본·사건 로그·실행 스크립트·정확한 배포 SHA·소스 binding 검증을 별도 AC로 명시한다. 기존47검사는 원래 날짜의 관측으로 표기한다.
3. 원감사 SHA와 정확한 finding ID, 원래 심각도/판단, 후속 capture/probe SHA와 서로 다른 실제 역할 ID의 해소 판단을 결박하는 새 후속 검증을 설계한다. 해소가 입증되지 않은 모든 major/blocker는 계속 거절하고, 새 근거 누락/변조/다른 SHA/잘못된 ID/역할 중복/순서 위반을 거절하는 회귀 검사를 사전등록한다. 원감사의 findings를 바꾸지 않는다.
4. 관측 당시 E와 새 검증 계약 지문을 별도로 기록하는 규격을 정의한다. 과거 원본을 채택하는 판정은 **역사적 관측의 무결성/적용 가능성 판정**이며 새 E에서 Native/측정/패키지를 실행했다는 성공이 아니다. config를 E에서 제외하거나 verifier에 옛 E를 주입해 현재 PASS를 만드는 방식은 사용하지 않는다.
5. owned 문서 변경과 실제 제품/실행기 변경의 영향을 구분하는 새 계약을 명시한다. 기존 check의 owned hash를 고치지 않는다. 이 구분이 없다면 smoke/package 실제 재실행이 필수다. 현재 계약에 대한 verified를 소급 작성하지 않는다.
6. 구현할 최종 diff가 확정된 뒤에만 실제 새 지문, 영향을 받는 AC·의존 작업, 실행 명령·새 출력 경로·실패 조건·비용을 실행 전에 등록한다. 이번 가상 E를 최종 E로 사용하지 않는다. 모든 필요한 새 AC와 canonical gates 실제 성공 전에는 verified로 기록하지 않는다.

이 후속안은 아직 구현·활성화·검증하지 않았으며, 사람 재미와 클라이언트 출시를 승인하지 않는다.

## 변경 비용과 영향

| 상황 | 필요한 검증 / 비용 |
| --- | --- |
| E 그대로, 문서만 변경 | matrix/measure는 원본 읽기 전용 verifier를 다시 실행할 수 있다. 그러나 server/review 경로·major는 해결되지 않으며 smoke/package는 등록 명령 자체가 실제 실행이다. 따라서 현 제약 아래 V07-07 완료는 불가하다. |
| 새 E에 기존 엄격한 검사기를 그대로 사용 | V07-01 design, V07-05 candidate measurement, V07-06 integration, V07-07 measure/matrix/review 및 E가 결박된 모든 관련 check·gates가 현재 인증에 stale가 된다. H07-01은 역사적 setup 근거로 보존한다. 소유권/의존 invalidate는 새 계약에 따라 명시적으로 해야 한다. |
| 같은 검사기에서 새 E의 관측이 필요할 때 | 최소 Native 실제330분+기동/종료, candidate100·release900 각 모형12시간, 새 설계/감사·통합·smoke·패키지 및 관련 AC/gates가 필요하다. 이번에는 실행하지 않았다. |
| 역사적 근거를 별도 provenance 계약으로 채택 | 새 계약 구현·부정 사례 테스트·독립 검토와 등록 AC/gates가 필요하다. 정확한 총 소요시간은 구현 전 미확정이며, 과거 전체 관측을 현재 실행으로 재인증할 수 없다. |

Balance가 원본에서 확인한 과거 실측은 candidate100 **402.462535458초**, release900
**4169.568582625초**(각4workers wall), Native 자연 관측 **330분3.023초**, 기동/종료를
포함한 실행 합계 약 **335분7.592초**다. 미래 실행 보장시간이 아니다.
최종100/900의 수치·seed·21개 값·6콘텐츠 조건을 바꾸거나 이 검증 seed로 튜닝하지 않는다.

## 독립 판단과 인계

실제 `/root/designer` → `/root/critic` → `/root/balance` → `/root` 순서로
이 **계약 연결안만** 판단했다. Designer/Critic/Balance는 read-only였고 Host만 파일을 작성했다. Critic은 구현하지 않았다.
Designer는 경로 변경만으로 불충분함을, Critic은 기존7개 owned hashes와 실제 smoke/package
명령 제약을, Balance는 E 전파 비용과 과거 수치/관측 분모 보존을 독립 확인했다.
Host는 위 진단과 읽기 전용 운영 재확인으로 판단을 대조했다. 기존 정식 감사를 재실행한 것은 아니다.

이번 변경 후 canonical gates와 보존 점검의 실제 종료·시간·SHA는
[execution-summary.json](execution-summary.json), 세션은
[V07-07-contract-reconciliation-HANDOFF.md](../../sessions/V07-07-contract-reconciliation-HANDOFF.md)에 기록한다.
사람 관찰이 없으므로 humanChecks/humanFun은 PENDING이다. 후기 획득 공백,
30-active endpoint READY/firstReady=null, 최초179개 중 시작 전체 원본6개 미확인 한계를 유지한다.

첫 새 gates는955테스트 통과 후 진단 스크립트의 `structuredClone`/`console` 전역 식별자 lint2건으로 종료1이었다. 제품 실패가 아니며 typecheck는 단락 평가로 미실행이다. [실행 당시 스크립트](inspection-script-r1.executed.txt)와 원래 사전등록/inspection/log 및 실패 gates를 보존했다. Host는 기존 동작 그대로 `globalThis`에서 두 이름을 명시적으로 가져오도록 수정하고 [r2 사전등록](preregistration-r2.json) 후 [r2 진단](inspection-r2.json)을 새 출력에 실행한다. r2는 추가된 실패 gate를 포함한8개 check를 다루며 r1의7개 검사 결과를 덮지 않는다. 최종 실행 결과는 execution-summary.json에 기록한다. 상태 문서 수정 중 첫 apply_patch 문맥 불일치도 있었으나 적용 전 실패였고 이후 정확한 문맥으로 적용했다.
