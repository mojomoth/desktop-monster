독립 구현 리뷰 — `/root/critic`

검토 범위는 Round06 V07-05의 초기 포획 보장 변경과 결정적 회귀 테스트다. 현재 범위에서 실제 결함을 발견하지 못했다. 제품·테스트·빌드·측정은 실행하거나 수정하지 않았고, 검증 seed 데이터와 수치는 읽지 않았다. 완료된 fun 응답이나 release audit를 변경·대체하지 않는다.

실제 `engine.ts`, `engine.test.ts`, `progressionV7.test.ts`를 보존 원본과 세 준비 패치에 대조했으며 정확히 일치했다. `progression.ts`의 생산 값은 원본 control-l17과 그대로이고, 새 후보를 적용하거나 성능을 검증한 상태가 아니다.

- `engine.ts:238–258`: 보스당 기존 capture draw를 먼저 한 번 소비한다. 정상 `<0.35` 추첨 또는 등록된 깊이·영구 할당 카운터·빈 정원 조건으로 한 번만 포획하며, V02의 안전/중복 할당 검사를 유지한다. 정원30에서는 보장을 끄고 정상 추첨으로만 기존 방출/영혼을 처리한다. 비보스는 capture draw가 없다.
- 기존 count1 테스트의 모든 expectation 문장을 그대로 유지한 채 실제 엔진을 명시적 count1/깊이63으로 격리했다. 새 count5의 next2 성공 때문에 기존 next2 실패 단언을 삭제하지 않았다. 기존 `progressionV7.test.ts` 전체는 vi import 추가 외 정확한 원본 prefix로 유지됐으며 새 범위를 덧붙였다.
- 격리는 두 포획 매개변수만 덮고 실제 engine/save/collection/hero 모듈 그래프를 동적으로 가져온다. finally의 doUnmock/resetModules가 있고 concurrent 실행을 선언하지 않는다. 정적 production import와 21키/공식 실험/콘텐츠 결합 검사는 별도로 유지된다.
- `progressionV7.test.ts:227–238`은 mock 없이 실제 생산 createEngine과 매개변수를 사용한다. null/1,63/1,63/5의 명시적 기대 표와 counter1/2의 결과·증가·4draw를 확인하므로 격리된 count5 성공으로 현재 생산 적용을 대신하지 않는다. 후보를 실제 적용한 각 trial에서도 이 생산 경로와 전체21키 검사가 통과해야 한다.
- 새 부정 사례는 count1/5 및 counter1/4/5/6, 보스55/63/71·비보스62/64·null, 정상 추첨0.349999/0.35, OR 양쪽 성공 시 중복 포획 없음, 낮은 번호+full30의 무보장/정상 방출을 실제 공격으로 확인한다. full30 fixture를 parse로 먼저 보정해 경계가 사라지는 실수를 피하고 실제 번호1 유지까지 단언한다.
- 실제 소비·희생·동료 환생·영웅 제시/선택 후 저장/재시작에서도 counter6이 유지된다. 숫자 없는 s/r 전송 ID 다섯 개를 실제 addCompanion/PvP로 수신하는 경로와 c5/큰 rID의 레거시 보정 경로를 나눠, 명단 제거 뒤에도 보장이 재무장하지 않음을 검증한다. 깊이와1HP 재설정은 명시된 단위 fixture이며 자연 여정 근거가 아니다.

읽은 `focused.log`는 실제4파일114 PASS다(SHA256 `ddb9c3c83e468484976bc9e38244e675004c7845fc7c94fe2d3d2e8d36a6ec53`). 이것만으로 등록 AC·전체 게이트나 측정 통과를 인증하지 않는다. Host가 같은 최종 소스의 새 progression/harness/gates와 실제 후보별 source/build/protocol 결합을 확보한 뒤 탐색해야 한다. 수치 채택과 두 목표 통과는 새 탐색 결과로 판단한다.

현재 검토한 SHA256:

| 파일 | SHA256 |
| --- | --- |
| src/core/engine.ts | 6004cb3f98c2cb7451d60d156b37f3d367ad3b31f6db9bc14cd8a8a0346dacd3 |
| tests/engine.test.ts | 041f6cb415265695ac4203477d0bef0fd7f5ff7e5ae5f65274f80e606c3850d1 |
| tests/progressionV7.test.ts | 18e06a53aae0c70416d4d0f4032abefc1686ee228e8173bc1f5443c38ab51dbb |
| src/core/progression.ts | 36fe3424080361108e24e42a6ef091e222572e41394d94a779a3aaaa83c2fcee |

이전 V02 발견의 증거 구분도 확인했다. Infinity 수정 전 실패는 직접 Infinity loop에서 발생해 뒤의 literal JSON 단언에는 도달하지 않았고, 수정 후에는 직접 입력 및 literal JSON parse/serialize/reparse 모두 통과했다. 이전 실패나 과거 성공을 현재 측정으로 재인증하지 않는다.
