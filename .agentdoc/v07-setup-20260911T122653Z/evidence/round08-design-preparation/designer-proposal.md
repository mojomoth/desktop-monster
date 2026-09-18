# Round08 Designer 사전등록 전 제안

실제 `/root/designer`. **미등록·미실행 가설**이며 아래3개 ID와 각각21키 값을 독립 검토 대상으로 고정한다. 완료된 Round07 execution/report/raw와 기존 소스만 읽고 기존 원본을 집계했다. 새 측정·엔진 실행·빌드·테스트·수치 probe는 없으며,검증1–100/과거candidate.json/HANDOFF/ACCEPTANCE의 검증 수치는 읽지 않았다. 이 새 문서 외 원본이나 제품/계약/설계 문서를 변경하지 않았다.

## 기준은 실제 첫 목표를 통과한1153

8개 `execution.endedAt`을 확인했다. Round07의 세 후보는 다음과 같으며 단위는 초다.

| 필드 prefix | firstAccepted 전체 p50 | p90 | worst | 90분 성공/20 | 선별 | 새12h |
| --- | ---: | ---: | ---: | ---: | --- | --- |
|1153/1000|2878.7|3516.3|3834.8|20|PASS|실행,최종목표FAIL|
|1154/1000|2280.3|3390.2|3876.5|20|FAIL:너무빠름|NOT_EVALUATED|
|1155/1000|2654|3765.7|4070.8|20|FAIL:너무빠름|NOT_EVALUATED|

현재 생산 설정이1155라는 이유로 이를 기준으로 삼지 않는다. 새 기준은 **실제로 첫 목표를 통과한1153/1000·XP1.42·count5·깊이63**이다. 높은 prefix가 늦은 중앙값을 보장하지 않았으므로1154/1155의 결과를 보간해 다른 첫 경로를 고르지 않는다.

1153의12시간 h70 자격/제시/실제선택은8/20·8/20·0/20이다.6개는8시간 전,2개는8–12시간에 도달했고12개는 미도달이다. **전체 p50은null**이며 성공한8개만의 조건부p50 18852.5초를 목표 판정으로 바꾸지 않는다.12시간의 선택 영웅 수는 최소14종이므로 모든 표본이10종 조건은 충족했고,미도달12개는30000처치에 못 미쳤다. 조건이나 무료 선택 정책을 낮출 근거로 사용하지 않는다.

| 시점 | 총처치 전체 p50 | 영웅 환생 p50 | 실제 선택 영웅 수 p50 |
| --- | ---: | ---: | ---: |
|2h|1687|11|11|
|4h|2925|17|17|
|8h|5689|30|30|
|10h|7455|38|38|
|12h|9889|50|50|

같은 seed의8→12시간 처치 증가는 p504200,최저416이었다.모든20개는8시간 뒤에도 영웅을 다시 선택했지만 느린 표본은2–3번에 그쳤다.예를 들어10012는8h1822→12h2238처치·추가선택2회,10004는2025→2472처치·2회였다.반면10018은77335→128159처치·120회였다.11개는8h와12h의 파티힘이 같았다.지속적인 활동과 실제로 긴 정체에 가까운 진행,빠른 표본의 콘텐츠 소진을 따로 봐야 한다.

독립 Balance 최종 분석의2–12시간 경계 포함 최대 제시 공백은 p509955.6초/worst27928.6초,새 실제 획득 공백은 p5010598.1초/worst32339.5초다.도감 신규 항목 공백을 전투나 환생이 완전히 멈춘 시간으로 해석하지 않는다.전원2h 명단30·동료Lv1인 무관리 경로는 기존 정원 고정 동작과 부합하지만,전체 roster의 포획 깊이와 모든 RNG trace가 없어 개별 seed의 원인을 특정하지 않는다.

## 최대3개 고정 후보

첫 통과 설정을 유지하고 tail 시작79와 분모10000은 그대로 둔 채,현재10475에서25/10000 간격으로 세 단계 완화한다. 숫자의 간격은 등록할 비교 범위일 뿐 h70 시간의 보간이나 성공 예측이 아니다. 기존21키 공간을 사용하며 새 기능·시간·저장 필드는 없다.

```json
[
  {
    "id": "candidate-r8-tail10450",
    "parameters": {
      "heroMinLevel": 17,
      "xpBase": 20,
      "xpGrowth": 1.42,
      "fieldHpNumerator": 1153,
      "fieldHpDenominator": 1000,
      "fieldHpTailStartIndex": 79,
      "fieldHpTailNumerator": 10450,
      "fieldHpTailDenominator": 10000,
      "companionHpNumerator": 115,
      "companionHpDenominator": 100,
      "captureChance": 0.35,
      "firstCaptureBossIndex": 63,
      "earlyCaptureCount": 5,
      "heroLevelStepEvery": 2,
      "heroLevelStepCap": 6,
      "heroRestMs": 120000,
      "heroDeferMs": 30000,
      "xpRewardBase": 5,
      "xpRewardPerIndex": 3,
      "bossXpMultiplier": 5,
      "bossHpMultiplier": 5
    }
  },
  {
    "id": "candidate-r8-tail10425",
    "parameters": {
      "heroMinLevel": 17,
      "xpBase": 20,
      "xpGrowth": 1.42,
      "fieldHpNumerator": 1153,
      "fieldHpDenominator": 1000,
      "fieldHpTailStartIndex": 79,
      "fieldHpTailNumerator": 10425,
      "fieldHpTailDenominator": 10000,
      "companionHpNumerator": 115,
      "companionHpDenominator": 100,
      "captureChance": 0.35,
      "firstCaptureBossIndex": 63,
      "earlyCaptureCount": 5,
      "heroLevelStepEvery": 2,
      "heroLevelStepCap": 6,
      "heroRestMs": 120000,
      "heroDeferMs": 30000,
      "xpRewardBase": 5,
      "xpRewardPerIndex": 3,
      "bossXpMultiplier": 5,
      "bossHpMultiplier": 5
    }
  },
  {
    "id": "candidate-r8-tail10400",
    "parameters": {
      "heroMinLevel": 17,
      "xpBase": 20,
      "xpGrowth": 1.42,
      "fieldHpNumerator": 1153,
      "fieldHpDenominator": 1000,
      "fieldHpTailStartIndex": 79,
      "fieldHpTailNumerator": 10400,
      "fieldHpTailDenominator": 10000,
      "companionHpNumerator": 115,
      "companionHpDenominator": 100,
      "captureChance": 0.35,
      "firstCaptureBossIndex": 63,
      "earlyCaptureCount": 5,
      "heroLevelStepEvery": 2,
      "heroLevelStepCap": 6,
      "heroRestMs": 120000,
      "heroDeferMs": 30000,
      "xpRewardBase": 5,
      "xpRewardPerIndex": 3,
      "bossXpMultiplier": 5,
      "bossHpMultiplier": 5
    }
  }
]
```

후보끼리는 `fieldHpTailNumerator`만 다르다. control-l16–control-l20은 기존XP1.4,필드/동료115/100,tail null,보장 null,count1과 나머지 값을 유지한다. 실패한1153/10475는 비교할 과거 원본이며 숨은 네 번째 성장 후보로 재실행하거나 채택하지 않는다.

- 10450은 세 안 중 기존 tail에 가장 가깝다.느린 절반의 처치가 충분히 늘지 않아 전체 최종p50이 여전히 미도달일 수 있다.
- 10425는 더 완만한 비교점이지만 중간 비율을 중간 도달 시간으로 해석하지 않는다.
- 10400은 세 안 중 가장 큰 완화다.미도달이 줄더라도 이미 빠른6개와 새 도달 표본이 함께 과속하여 전체p50이8시간보다 빨라질 수 있다.

## 기존 구현 적용과 새로 확인할 경계

필드 HP는 이미 구현된 BigInt 단일 나눗셈을 사용한다. `a=min(i,79)`, `b=i-a`이면 일반 HP는 `floor(10 × 1153^a × T^b / (1000^a × 10000^b))`이고 보스는 이 정수의5배다. `T`는10450/10425/10400이다. **index79까지의 필드 HP와79의 기준값은 R07의1153과 같고80부터 바뀐다.** 동료 기반 HP·보유 동료/PvP 힘은 기존115/100이다.

기존XP 보상식에서 첫L17에 필요한 마지막 처치는 index74로 tail 시작 전이다.첫 목표가 유지될 합리적인 설계 근거지만 실제 사건 순서와 성공을 측정 전에 선언하지 않는다.각 후보의 새120분에서 첫 처치/보상/레벨/포획·준비/제시/성공과 첫 선택 기록을 확인한다.보존된 R07 1153 첫 기록과의 대응을 별도 검사하고,통과한 같은 새 후보의 screening/full12h 첫 기록도 같은 seed별로 다시 짝짓는다.원본에 없는 전체 공격/포획 난수 trace까지 같다고 주장하지 않는다.

같은 깊이에서 동료115/100은 유지되므로 더 낮은 필드 HP는 상대적 동료 힘과 추가 포획 가능한 깊이를 바꾼다.정원30 이후에는 무관리 파티를 자동 교체하지 않고 일반35% 방출/영혼만 유지한다.후기 포획 운과 이미 약한 파티의 장기 정체가 완화될지,더 강한 초기 포획으로 빠른 표본만 빨라질지는 미확인이다.기존 시각에서 새 도달 시간을 비례 계산하지 않는다.

보장 조건은 기존 boss/index>=63/영구nextCompanionId<=5/roster<30이며 보스마다 난수1회를 먼저 소비한 뒤35%와 OR한다.할당 구간은 일반 저장의 자연 포획 횟수가 아니고 외부 전송/레거시 보정으로 일찍 소진될 수 있다.제거·희생·환생·재시작으로 재무장하지 않는다.MAX_SAFE_INTEGER 소진표지,unsafe/중복 로컬발급 선행 거부와 외부s/r ID/기존 동료 무손실을 유지한다.이미 구현한 기능을 재구축하지 않는다.

## 판정과 남길 근거

새 공식 사전등록과 실제 네 역할 설계 검토 뒤 각 후보를 탐색10001–10020의120분으로 비교한다.첫 성공p502700–3600초 및5400초 내18/20을 함께 통과한 안만 같은20개 seed의 **새12시간 전체**로 넘긴다.h70 자격 전체p5028800–43200초도 통과해야 채택 대상이다.전체/조건부 분위수·미도달을 분리하고3150초거리→36000초거리→firstAccepted p90→ID 사전순의 기존 선택 규칙을 유지한다.선정 뒤 별도 검증1–100은90/100 기준 그대로이며 검증 수치로 튜닝하지 않는다.

여섯 조건은 crownwyrm=dragon3,rootcolossus=영웅환생3,h58=water100+reefknight2+총1500,h62=환생5+seenMonsters60+총6000,starvoid=환생10+총16000,최종h70=서로다른영웅10종선택+총30000 그대로다.무료 choices[0]·골드 미사용·동료 무관리·균등2입력/초·준비 즉시 선택,기존휴식120초·보류30초를 유지하고 새 강제 시간을 추가하지 않는다.자격/제시/실제선택·처치를 나눠 기록한다.

2/4/8/10/12시간 처치·선택종·환생·명단·파티힘과 같은 seed의8→12시간 증가 및 새획득 공백을 함께 보고한다.기존8개 도달자만으로 성공을 선언하거나 조건을 현재9889처치 중앙값에 맞춰 낮추지 않는다.모두 두 목표를 통과하지 못하면 실패를 보존하고 새 사전등록으로 돌아간다.원본 분석·설계 승인·후속 측정·최종 출시 검증은 다른 상태이고 humanChecks=PENDING이다.

근거: `evidence/exploration/round-07/*/execution.json`,각 candidate의 `screening.json`과연결된20개raw,1153의 `full-12h.json`/연결raw,기존 `src/core/progression.ts`/`formulas.ts`/`engine.ts`.독립 Balance도 동일한8/20 자격·12미도달·조건부18852.5초·paired4200/최저416을 확인했다.현재 제안은 새 측정값을 생성하지 않았다.

독립 최종 근거는 `evidence/round07-analysis/final-analysis.json` SHA256 `4967aaf7908a7005828b88daa0cda36a8f01d158e15f28af4b0608238727e344`,같은 폴더 `README.md` SHA256 `8887d58e9a16bf864f62d91540e9e2a1015bd56c3fa029fa96c0dc0b5940eda3`이다.최종 README의8실험/9보고서/180raw 검산 및 공백 수치를 읽어 위 완료 탐색 사실과 대조했다.
