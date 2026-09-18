# v7 측정기 독립 교차검토

검토자: /root/harness_review · 2026-09-11. 대상은 measure.mjs, measure-worker.mjs, measure.test.ts와 관련 설정/검증 호출 경로다. 소스는 읽기만 했고 실행 중 평가 지문을 변경하지 않았다. 실제 baseline 100개 실행은 호스트가 담당한다.

## 현재 baseline 판정

등록된 active/free/uniform/no-management/immediate-menu, seed 1..100, 12시간 baseline 실행을 중단할 블로커는 발견하지 않았다. 첫 환생 준비/선택 시간, 실제 선택 영웅·처치 몬스터, 골드와 피해 기록은 아래 eligibility 표본화 한계와 분리하여 사용할 수 있다. baseline에는 최종 신규 해금 milestone을 등록하지 않았으므로 v0.7 목표 미달과 미등록 상태를 정직하게 보존해야 한다.

확인한 계약:

- worker마다 동시에 한 seed만 처리하고, 부모는 반환한 policy/seed를 배정 job과 대조한다. worker 종료/오류는 실패로 전파되며 남은 작업을 성공으로 계산하지 않는다.
- 부모만 seed 결과를 원자적으로 저장한다. 재개 identity에는 phase, seed-set, 정책, 관측점, 소스/평가/fixture/protocol/build 지문이 있다. 이미 완료한 seed의 원본 해시와 신원을 재검증하고 누락한 seed만 새로 계산한다.
- 완료 보고서는 모든 예상 seed/policy 쌍이 정확히 한 번 나타나야 한다. 원시 checkpoint/행동/첫 사건에서 요약과 목표를 재계산하며 누락·중복·골드 불일치·bigint 손상을 거부한다.
- 측정 전 production build를 실행하고 소스 안정성을 확인한다. 저장 전후 소스/평가 지문, 마지막 compiled build 바이트를 확인한다. 작업 수를 바꿔도 RNG/clock은 seed별 엔진에 격리된다.
- 첫 환생의 조건부 백분위와 전체 seed deadline 분모를 분리한다. 미도달 표본은 전체 모집단 중앙값에서 뒤에 남는다. exploration screening은 120분이며 늦은 해금을 NOT_EVALUATED로 명시한다.
- candidate/release 실행에는 실제 offer/spawn과 공유하는 production eligibility selector가 있어야 한다. release report는 validation seed와 설정된 전체 9개 정책을 요구한다. 감사의 release AC도 phase=release를 요구하도록 보강되어 작은 candidate suite를 출하 근거로 쓰지 못한다.

## M1 · 후속 candidate에는 major, 현재 baseline에는 제한사항 · 일시적 eligibility를 누락할 수 있음

`simulate()`는 tick/입력 이후 ready를 검사한 다음 즉시 heroOffer/heroChoose를 적용하고, 그 뒤의 상태를 content()로 관찰한다. 따라서 새로운 eligibility가 환생 직전에만 참이었다가 레벨 초기화로 거짓이 되면 최초 해금 관측을 잃는다. 일반 관측도 1초 간격이므로 짧은 phase 조건 창을 놓칠 수 있다. `eligibilityMaximumDelayMs:1000`은 이런 일시적 조건에는 성립하지 않는다.

코드 변경 없는 합성 1분 모형으로 재현했다. production-selector 자리를 모사한 `eligibleHeroIds(state) = state.level >= 2 ? ['h01'] : []`, 1000ms에 Lv2 달성, Lv2에서 환생 가능, heroChoose 후 Lv1 초기화라는 조건이다. 결과:

```json
{"syntheticOnly":true,"firstAcceptedSec":1,"chosen":[{"kind":"chosenHero","id":"h01","sec":1}],"eligible":[],"lastUnlockSec":null}
```

이는 실제 v0.6 결과가 아니라 측정 순서 반례다. 실제 수락한 영웅의 eligible 이력이 없는 결과를 만들 수 있으므로, 후속 v0.7에서 레벨처럼 되돌아가는 성과값으로 해금한다면 첫 eligible/8~12시간 최종 해금 판정에 사용하기 전에 보강해야 한다. 최소한 후보 생성/선택 및 관리처럼 상태를 바꾸는 정책 행동 직전의 eligibility도 관찰하고, 1초 표본화의 한계를 metadata에서 정직하게 구분할 필요가 있다.

현재 v0.6 적용 여부는 다음과 같이 구분한다.

- v0.6 Requirement에는 hero level 조건이 없다. 위 직접 반례는 현재 baseline의 첫 환생 목표를 무효화하지 않는다.
- equippedType 희귀 몬스터 조건은 단독 조건이고 각 heroChoose 직후 content()가 호출되므로 새 장착 속성 자체는 바로 관찰된다.
- phase+totalKills는 임계 처치가 해당 5분 phase 마지막 1초 안에 일어나면 다음 관측에서 phase가 바뀌어 최초 eligibility를 놓칠 수 있다. 이는 현재 코드에서도 가능한 표본화 제한이지만, 실행 중 100개 seed에서 실제 발생했는지는 확인하지 않았다.
- phase 기반 최초 eligibility는 첫 관측 근사로 해석해야 한다. 실제 seen/chosen/killed와 구분한 원시 자료와 baseline 첫 환생 측정은 보존 가능하며 현재 실행 중단을 권고하지 않는다.

원저자 /root/progression_review와 호스트에 반례를 전달했다. 실행 중 evaluator를 수정하지 않았으며 후속 candidate 설계/측정 전에 해결할 대상으로 남긴다.

## 검토 한계

원시 자료와 해시의 일관성을 확인하는 검토이며, 사람이 실제 플레이한 시간·재미·Steam 이용 시간이나 고의적인 전체 원본 조작에 대한 인증이 아니다. baseline 전체 원시 결과의 독립 재계산은 호스트의 완료 후 검증 대상이다.


## M1 수정 재검토 · 해결

호스트가 기존 부분 baseline을 근거로 보존하고 평가기 수정을 승인했다. 측정 원저자가 수정했고 본 검토자는 측정 소스를 변경하지 않았다. 수정된 평가기로 최종 baseline 전체를 다시 계산해야 한다.

- kill / levelUp / bossCaptured / heroReady 이벤트를 반환한 엔진 호출 직후 실제 반환 상태를 관찰한다. heroOffer / reroll / choose / 구매 / 관리 직전에도 관찰하므로 다음 정책 행동이 일시적 조건을 지우기 전에 기록한다.
- 환생 Lv2→Lv1 반례를 1.0초 관측 경계와 1.1초 경계 사이 두 경우로 검사하는 회귀가 추가되었으며, `node node_modules/vitest/vitest.mjs run --config .harness/v7/vitest.config.mts .harness/v7/loop/measure.test.ts`를 독립 실행하여 **11개 통과**를 확인했다.
- 별도 읽기 전용 합성 엔진에서 phase 종료 3.0초 직전인 2.9초에 30처치 조건을 충족하도록 실행했다. 다음 정기 관측에서 조건이 거짓이 되어도 `eligibleMonster/dawnfinch`는 2.9초로 보존되어 phase+totalKills 누락 경로가 닫혔다. 이는 실제 v0.6 seed 결과가 아니라 측정 순서의 경계 검사다.
- `eligibilityMaximumDelayMs` 보장을 제거하고 주기 관측 해상도, 관련 이벤트 관측 해상도, 첫 관측 근사라는 한계를 구분했다. 한 엔진 호출의 여러 사건은 마지막 반환 상태를 공유하며 관련 사건 없이 생겼다 사라지는 순수 시간 조건은 놓칠 수 있음을 명시한다.

현재 production 엔진의 환생·관리 행동은 별도 호출로 일어나며, phase+처치 조건은 해당 처치 호출 반환 시점에 관측된다. 위 수정에서 baseline 재시작을 막을 새 블로커를 발견하지 않았다. 향후 candidate가 하나의 엔진 호출 내부에서 eligibility를 열었다 닫는 새 동작을 도입하면 그 동작 자체의 event payload 또는 selector 호출 위치까지 다시 검증해야 한다.
