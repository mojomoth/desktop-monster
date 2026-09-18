# 실제 게임의 재미와 다음 업데이트 분석

이 흐름은 이미 구현된 게임을 평가한다. 기능을 추가하는 기존 `fun.mjs` 리뷰와 달리,
오류를 발견해도 근거와 우선순위를 남기고 분석을 마친다. 게임 코드를 자동으로 변경하지 않는다.
기본 게임 루프는 **Ambient → Surprise → Interaction → Reward → Collection**으로 평가한다.

## 실행

저장소 루트, 설치된 Node/Electron/Vitest와 로그인된 macOS 데스크탑을 사용한다. 새 의존성은 없다.

```sh
node .harness/v5/loop/fun.mjs selftest
node .harness/v5/loop/e2e.mjs .agentdoc/fun-001/e2e.json 5 active
node .harness/v5/loop/measure.mjs .agentdoc/fun-001/measure.json --seeds 100 --seed 1 --policies
node .harness/v5/loop/audit.mjs init .agentdoc/fun-001/review .agentdoc/fun-001/e2e.json .agentdoc/fun-001/measure.json
node .harness/v5/loop/audit.mjs next .agentdoc/fun-001/review
```

E2E는 먼저 `npm run build`를 실행한다. 기능 실패는 JSON/스크린샷을 보존하고 **종료 코드 1**을 반환한다.
이 경우 실패 근거를 읽고 `measure`, `audit init`을 별도 명령으로 계속 실행한다. 앱이 부팅되지 않아
플레이 근거를 만들지 못했다면 먼저 부팅 원인을 해결한다. 빈 근거로 분석 완료를 만들 수 없다.

`e2e.mjs <output> [0|5|15|30] [active|idle|intermittent]`:

- `0`: 기능 검사만 수행하는 짧은 실행. 장시간 플레이 증거가 없어 단독으로 audit 시작은 불가하다.
- `5/15/30`: **해당 시간만큼 실제 Electron을 실행**한다. 시간 가속이나 엔진 tick 주입을 하지 않는다.
- `active`: 초당 약 2회 합성 입력. `idle`: 새 게임부터 입력 0회.
- `intermittent`: 매분 첫 15초만 초당 약 2회. 세 프로필 모두 자동 메뉴 선택은 하지 않는다.
- 실제 입력 수, 실제 경과 시간, 30초마다 저장 상태를 기록한다. 자연 플레이 후 진단용 fixture 검사를 실행한다.
- 사용자 세이브와 분리한 임시 디렉터리, 프로덕션 창/preload/renderer/IPC/저장을 사용한다.
  네이티브 전역 입력 훅과 운영 서버는 연결하지 않는다. 키·마우스 대체 입력은 Electron 창에만 전달한다.

필요한 길이/프로필은 출력 파일을 달리해 실행한다. 기본 첫 감사는 실제 5분 active 1회와
가상 9시나리오로 시작한다. 최종 보고서에는 나머지 실제 15/30분·idle/intermittent가 **PENDING**으로 남는다.
모든 실제 조합을 검토하려면 각 실행의 별도 audit을 생성하고 결과를 비교한다. 실행하지 않은 시간을 합쳐 쓰지 않는다.

`measure.mjs`는 실제 코어 엔진에 RNG와 시간을 주입한다. 100 seed × 9체크포인트,
`--policies` 사용 시 무료/훈련/미끼/재굴림 총 18개 분포와 1,800개 원시 관측치를 남긴다.
5/15/30분 체크포인트는 같은 궤적이므로 독립 세션 1,800회라고 표현하지 않는다.
초기 120초 활동 후 방치하며, 환생 후보를 즉시 선택하는 낙관적인 봇 정책이다.
E2E의 무선택·순수 방치 정책과 직접 같은 조건으로 비교하면 안 된다. 순수 방치 대조군은 별도다.

## 네 에이전트 실행 계약

하네스는 호스트의 협업 도구를 사용한다. 외부 유료 CLI를 몰래 띄우거나 한 에이전트가 네 이름으로
응답하지 않는다. 독립 측정/코드 읽기는 병렬로 수행하되, 판단은 아래 의존 순서를 따른다.

1. 호스트가 `next`의 전체 prompt와 template을 **Designer**에게 전달한다.
   현재 재미 루프를 진단하고 숫자만 다른 변형이 아닌 대안 3–5개, 선택과 측정 가설을 작성한다.
2. 응답 파일을 `submit`으로 수집한다. 다음 prompt를 별도 **Critic**에게 전달한다.
   dominant strategy, 가짜 선택, 단순 반복, 필드와 메뉴의 모순, 업무 방해를 구체적 반례로 공격한다.
3. **Balance**가 실제 공식/원시 표본과 그 비판을 대조한다. p10/p50/p90뿐 아니라 미도달,
   최댓값, 꼬리 대기, 재화 보존과 정책 가정을 설명한다. 임계값을 결과에 맞춰 바꾸지 않는다.
4. **Playtester**가 Electron 스크린샷을 직접 열고 UI/IPC/저장 결과를 확인한다.
   앞선 의견에 동의·반박한 이유를 남기고 업데이트 1–5개를 우선순위, 가설, 지표,
   통과 조건, 비용, 근거 finding ID로 종합한다. 호스트가 실제 플레이를 관찰한 경우 이 역할을 맡을 수 있다.

```sh
node .harness/v5/loop/audit.mjs submit .agentdoc/fun-001/review .agentdoc/fun-001/review/designer.json
node .harness/v5/loop/audit.mjs next .agentdoc/fun-001/review
# critic, balance, playtester도 각자 발급된 템플릿으로 같은 submit/next 절차 수행
node .harness/v5/loop/audit.mjs status .agentdoc/fun-001/review
node .harness/v5/loop/audit.mjs report .agentdoc/fun-001/review
```

세션 파일은 호스트 하나만 쓴다. 각 에이전트는 자기 응답 파일만 쓴다. `requestId`, 역할 순서,
고유 agent ID, 필수 분석 축, 실제 JSON Pointer, 소스/증거/스크린샷 해시를 검사한다.
수치 분포는 원시 표본에서 재계산한다. 소스가 바뀌면 새 E2E/측정/세션이 필요하다.
이 검사는 근거의 일관성을 확인한다. 악의적인 사람이 전체 근거를 조작하지 않았다는 인증이나
모델 판단의 진실성을 보증하는 장치는 아니다. 호스트는 실행 로그와 원본을 직접 검토한다.

## 무엇을 판단하는가

| 축 | 관측 근거 | 판단과 제한 |
| --- | --- | --- |
| 기능 오류 | 입력→렌더러→IPC→저장, 구매, 중복 토큰, 환생 선택, 재로드, 메뉴, 오프라인 | 실패를 재현 가능한 오류로 기록 |
| 논리 문제 | 표시 목표/실제 조건 차이, 경제 효용, 상태 보존, 행동 정책별 결과 | 설계 의도와 충돌하는지 코드로 확인 |
| 재미 가설 | 첫 보상·첫 선택, 무처치/무발견 간격, active/idle 차이, 수집·선택 의미 | 수치·행동은 대리지표이며 인간의 재미 점수가 아님 |
| 방해 비용 | 강제 창/포커스, 확인 횟수, 놓쳐도 남는 발견, 안내의 명료함 | 실제 업무 중 주목·피로는 사람 관찰 필요 |

spawn/reward pacing, level curve, idle/active reward, rare encounter, collection,
evolution/prestige, daily event, surprise, session length, desktop interruption budget을 모두 검토한다.
없는 기능은 부재로 기록하고, 기능 수를 늘리는 것 자체에 점수를 주지 않는다.
기준 문서는 `genre-packs/desktop-companion-clicker/` 아래 세 파일이다.

실제 사람은 [관찰 양식](genre-packs/desktop-companion-clicker/playtest-observation.md)으로 5/15/30분을 기록한다.
사람이 없으면 `humanChecks: PENDING`. `audit_complete`는 **분석 완료**이며 버그 수정 완료,
재미 확정, 출시 승인이 아니다. smoke/package/운영 PvP·알림·접근성은 별도 검증 대상이다.

## 반복과 검증

최종 `report.md`의 우선순위 1개부터 작게 바꾼 후 같은 seed·정책으로 재측정하고 새로운
Electron 실행과 4역 감사를 수행한다. 목표를 바꿀 때는 이유를 남긴다. 사람에게 요청할
검증은 “재미있나요?” 대신 스스로 다시 확인한 계기, 예상과 실제 보상 차이,
도움 없이 선택한 이유, 하던 작업으로 돌아간 시간이다.

```sh
node .harness/v5/loop/fun.mjs selftest
npm test && npm run lint && npm run typecheck
```

기존 `npm` 명령, Ralph 버전 포인터, 계획 파일은 이 흐름에서 변경하지 않는다.

## 설계 참조

2026-09-10 확인: [GameForge balance workflow](https://github.com/AlterLab-IEU/AlterLab_GameForge/blob/main/skills/workflows/game-balance-check/SKILL.md)의
수치·분포 검증, [playtest workflow](https://github.com/AlterLab-IEU/AlterLab_GameForge/blob/main/skills/workflows/game-playtest/SKILL.md)의
행동 관측, [Bravos Critic](https://github.com/tachyon-beep/skillpacks/blob/main/plugins/bravos-game-design/agents/game-design-critic.md)의
독립 반례 검토를 참고했다. 이 저장소의 스킬/실행기는 DesMon용으로 작성했으며 upstream 전체 설치나 복제는 하지 않는다.
