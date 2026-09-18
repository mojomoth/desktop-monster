**30분 신규 idle 관측 이상 — Critic 읽기 전용 조사 (2026-09-10)**

현재 `30-idle-1789030534754.json`은 순수 신규 idle의 유효 근거로 보류해야 한다. `inputs: 0`은 실행기의 합성 송신 횟수이며 실제 창에서 받은 입력까지 포함하지 않는다. 동료 없는 엔진의 시간 진행에서 공격이 발생하는 경로는 찾지 못했다. 창 내부 fallback 입력이 별도로 들어올 수 있는 경로는 확인했다. 원본에는 개별 입력과 포커스 이력이 없어 이번 처치의 실제 원인을 외부 입력으로 확정할 수 없다.

이 문서는 최종 4역 audit이 아니다. 원본 JSON·로그·스크린샷, 소스, 실행기, 프로토콜은 변경하지 않았다. Electron을 실행하지 않았다. 마지막 `30-intermittent`가 실행 중인 상태에서 읽기 전용으로 조사했다.

고정 지문:

- source: `c1b3603ed446d75fdd4830e59aac930d5fad73d17c6bef7de6c888b062914aef`
- evaluation: `53fc0326a4ad1a742b775f3bdf887a072de0927e1d811af3431e116663d9e080`
- 이상 원본: `../evidence/final-matrix-03/30-idle-1789030534754.json`
- 이상 원본 SHA-256: `5a9061829fe39d4fb79685494d7f63b1816317c9d9a2ccbfa55e4d9d099d205b`

**확인한 관측**

| 값 | 관측 시작 | 관측 종료 |
|---|---:|---:|
| 합성 inputs | 0 | 0 |
| level | 1 | 1 |
| kills | 0 | 1 |
| coins | 0 | 1 |
| companions | 0 | 0 |
| reincarnations | 0 | 0 |
| seenMonsters | 1 | 2 |
| playTimeMs | 73.30000001192093 | 1800093.300000012 |

실제 관측 `elapsedMs`는 `1800033.697792`이다. `timeline[11]`의 `330178.56425ms`까지 kills/coins는 0이고 `timeline[12]`의 `360202.509167ms`에는 1이다. 이후 종료까지 1을 유지한다. 이는 약 5분 30초와 6분 사이에 저장 표본의 변화가 나타났다는 뜻이다. 표본은 저장 파일을 읽으므로 최초 입력이나 정확한 처치 시각을 제공하지 않는다. raw의 `startedAt=2026-09-10T08:55:37.413Z`는 bootstrap 시작 시각이며 자연 관측 시작 시각과 같다고 가정하면 안 된다.

동일 지문의 `5-idle-1789025243819.json` 및 `15-idle-1789026838268.json`은 전 구간 kills/coins/companions 0, level 1, seenMonsters 1을 유지했다. 해당 SHA-256은 각각 `88f4c8fe497b324f3c4e67082acd06837104640b9c189c3438af3c1bb05d1922`, `c5232aedc65afae8495a7f7c8fe919830906de3e04287991092297074323dd78`이다.

38개 check의 `passed`는 이 불일치를 검출하지 않는다. `electron-e2e.cjs:159`의 관측 check는 실제 시간과 playTime 증가만 확인한다. `e2e-matrix.mjs:33`은 idle의 합성 입력 0을 검증하지만 kills/coins 불변까지 확인하지 않는다. 따라서 이번 건은 측정 무결성의 중대 공백이며, 현재 체크 성공을 곧바로 순수 idle 증명으로 해석할 수 없다.

**엔진과 입력 경로 분리**

1. `src/core/engine.ts:84`의 신규 상태는 companions가 비어 있고 HP가 가득 찬 몬스터로 시작한다. `tick():292`은 playTime과 휴식·보류·피버 시간을 갱신한다. 자동 damage 경로는 `activeCompanions(state.companions, ...)`에서 예약한 공격뿐이다(`322–346`). 빈 동료 목록에서는 예약도 0이다. 처치 카운터·보상은 `applyDamage():201`에서 HP가 0이 되었을 때만 올라간다. `src/renderer/game.ts:884`의 update는 애니메이션을 갱신한 뒤 engine.tick을 호출하며 hero 공격을 생성하지 않는다.
2. `src/renderer/index.ts:40`의 IPC input과 `:47`의 fallback input은 모두 game.attack에 연결되지만 서로 별개다. `src/renderer/input.ts:80`은 반복 키를 제외한 keydown, `:84`는 drag strip을 제외한 mousedown을 받는다. 이 창 이벤트들은 실행기의 observation.inputs를 증가시키지 않는다.
3. `src/main/globalInput.ts:54–65`의 기본 모드는 fallback이다. E2E bootstrap은 production main/index를 불러오지 않으며 startGlobalInput도 호출하지 않는다. `src/main/ipc.ts:188`의 GET_INPUT_MODE는 그 fallback 값을 전달한다. 따라서 OS 전역 훅을 사용하지 않는다는 제한이 창 내부 입력까지 차단한다는 뜻은 아니다.
4. `src/main/window.ts:57`의 acceptFirstMouse와 `:84`의 show는 실제 데스크탑 입력이 들어올 수 있는 창을 만든다. 실제 사용자의 키·마우스, 다른 자동화의 창 입력 등이 가능한 유입원이다. 이 중 어떤 것이 있었는지 raw로 확인할 수 없다. 단순 blur flush, readState, capturePage는 코드상 attack을 부르지 않는다.
5. 자연 관측의 SimulatedInputDriver는 `electron-e2e.cjs:143`에서 active/intermittent에만 emit한다. idle에는 송신하지 않는다. fallback keyboard/mouse 진단과 24회 공격은 `:164` 이후 관측을 종료·저장한 다음 별도 fixture에서 실행된다. 따라서 알려진 진단 입력은 6분 시점의 처치를 설명하지 않는다. `e2e.mjs`는 매 실행 전에 build하고 전후 지문도 비교한다. 현재 코드와 다른 오래된 dist를 의도적으로 사용하는 경로도 찾지 못했다.

독립 대조로 현재 `dist/electron/core/index.js`의 production createEngine에 seed 1/17/71/100을 주고 각 100ms tick 18,000회를 적용했다. 파일을 쓰거나 Electron을 시작하지 않은 순수 Node 실행이다. 네 경우 모두 `playTimeMs=1800000`, kills/coins/companions/damageEvents=0이었다. 이는 주입한 엔진 시간의 검사이며 실제 30분 관측으로 계산하지 않는다. 기존 같은 지문의 `evidence/experiments.json`도 100 seeds × 5/15/30분의 300개 freshIdle raw 모두 inputs/kills/companions 0, firstRewardSec null이다. 코드 분석과 함께 자동 시간 공격 가설을 반박하지만 실제 native 세션의 입력원을 증명하지는 않는다.

재현 가능한 경로 반례는 다음과 같다: fallback이 붙은 게임 창에 실제 keydown/mousedown을 전달하면 renderer가 game.attack을 호출하지만 관측 실행기의 observation.inputs는 그대로다. 현재 native raw의 관측 후 `fallback-keyboard-to-save`(HP 10→9), `fallback-mouse-to-save`(9→8)가 이 production 경로를 실제로 검증한다. 이를 이번 자연 관측에 입력이 있었다는 직접 증거로 바꾸어 해석하지 않는다.

**동결을 유지하는 한 조합 재검증 권고**

호스트의 `qualityRejections` 보존 후 동일 실행기 재개 안에 동의한다. 소스나 평가 로직을 바꾸지 않고 다음 절차로 처리할 수 있다.

1. 마지막 30-intermittent와 matrix parent가 끝날 때까지 기다린다. 해당 process group 종료를 확인한다. 조사 에이전트가 별도 Electron을 실행하지 않는다.
2. 기존 9개 결과의 aggregate와 matrix-state를 `before-idle-review` 이름으로 복사 보존하고 SHA를 기록한다. 이상 관측의 JSON·로그·스크린샷은 원래 경로와 바이트 그대로 유지한다. 실제 관측한 1 kill을 삭제하거나 warm-idle로 재분류하지 않는다.
3. 호스트가 해당 record를 `qualityRejections`에 원본 path/SHA, 관측 불일치, 원인 미확정, review 경로, 재검증 목적과 함께 기록한다. `attempts`도 유지하고 `runs` 선택에서 해당 30-idle만 제외한다. 거부 기준은 이미 고정된 fresh idle 계약과의 불일치이다. 특정 유리한 수치가 나올 때까지 반복하는 정책이 아니다.
4. 같은 source/evaluation 지문에서 기존 `e2e-matrix.mjs run <directory>`를 재개하면 나머지 8개 hash를 확인한 뒤 없는 30-idle 한 조합만 새 파일로 실행한다. Desktop의 해당 창에 사람이 직접 입력하지 않는 환경을 유지한다. 사용자의 입력 여부에 관한 답변은 별도 기록하고, 응답 없음은 입력 없음의 증거로 사용하지 않는다. 추가 런타임 입력 차단 코드나 허위 global mode 전환은 원래 관측 조건을 바꾸므로 이 재실행에 섞지 않는다.
5. 새 원본의 실제 30분, 동일 지문, 38개 check, 오류 없음, 스크린샷 hash에 더해 fresh start 및 전체 timeline/end의 level=1, kills/coins/companions/reincarnations=0, seenMonsters=1을 읽기 전용으로 확인한다. 실행기 자체가 이 추가 계약을 확인한 것처럼 표현하지 말고 별도 review 결과로 기록한다. raw는 HP/XP를 담지 않으므로 이 검사도 모든 미량 입력의 부재를 완전히 증명하지 않는다.
6. 새 원본에 다시 진행이 발생하면 같은 이유로 버리고 계속 재실행하지 않는다. 원인 미확정으로 release 근거를 보류하고 입력·포커스 관측을 추가한 새 평가 버전이 필요한지 판단한다. 새 결과가 계약과 맞으면 기존 8개와 새 30-idle의 선택 aggregate를 만들고 기존 verifyMatrix로 원본 hash/9조합/시간/비중복을 검증한다. 기존 anomaly와 그 30분도 인계의 관측 이력에는 남긴다.

새로운 0 결과가 나오더라도 이번 원인의 확정이나 앱 버그의 완전한 배제를 주장해서는 안 된다. active/intermittent의 inputs도 동일하게 합성 송신 횟수이며 수신 총계는 아니다. 다른 8개에 독립적인 오염 근거가 발견되면 범위를 다시 판단해야 한다. 현재 발견한 계약 위반은 30-idle 한 조합이며 이 단계에서 자동으로 다른 8개를 무효화할 직접 근거는 없다.
