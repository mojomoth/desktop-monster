# Round07 Designer 사전등록 전 제안

실제 `/root/designer`. **미등록·미측정 가설**이며 아래3개 ID/21키 값을 Host의 독립 검토 대상으로 고정한다. 새 엔진 실행·빌드·테스트·측정·수치 probe 없이 완료된 탐색10001–10020과 기존 소스만 읽었으며, 기존 raw의 집계/표본 대응 외 수치 실험은 하지 않았다. 검증 파일·현재 HANDOFF/ACCEPTANCE·검증 수치/개별 seed는 읽지 않았다. 이 새 문서만 작성했다.

## 실제 결과에서 고른 비교 기준

Round06의8개 execution.endedAt을 확인한 뒤 후보 raw를 읽었다. [독립 Balance 분석](../round06-analysis/README.md)도8보고서/160raw 무결성 PASS·선별8개 모두 FAIL을 확인했다. 새12시간은0개이며 장기 목표는 NOT_EVALUATED다.

| 완료된 Round06 후보 | firstAccepted 전체 p50 | p90 | worst | 90분 성공/20 | 120분 미도달/20 |
| --- | ---: | ---: | ---: | ---: | ---: |
| A: first63-xp141/count1 | 2650.5초 | 4504.4초 | 5453.5초 | 19 | 0 |
| B: first5-63-xp142/count5 | 2320.3초 | 3095.8초 | 3198초 | 20 | 0 |
| C: first5-63-xp143/count5 | 2266.5초 | 3459.7초 | 3732.8초 | 20 | 0 |

세 후보 모두 firstReady=firstOpen=firstAccepted이며20개가 도달해 전체/성공자 조건부 분위수가 같다. 모두 중앙값이2700초보다 짧아 실패다.90분 성공 수만으로 통과시키거나 목표를 낮추지 않는다.

이번 기준은 **R06B의 XP1.42/count5/index63**이다. A는 목표 하한에 가깝지만 p90/worst의 긴 꼬리가 남고, B는 C보다 목표 중심3150초에 가까운 중앙값과 짧은 p90/worst를 함께 보였다. B의 첫 포획 worst는105초였고 C는2469초였다. 현재 source가 C라는 이유로 C를 기준으로 삼지 않는다. 읽기 초기에 C 고정안을 검토했지만 이 전체 중앙값·꼬리 비교 후 B로 정정했으며, 이 과정에서 등록하거나 실행한 안은 없다.

A의 Round05 대비 첫 시각이 달라진 표본은10004 하나였다:6248→2650.5초, 첫 포획은2238.5초로 앞당겨졌다. 나머지19개 첫 성공 시각은 같았다. 한 표본의 성공 개선이 전체 순위 중앙값도 앞당긴 사례이며, A의 실패를 전체 경험이 악화된 것으로 해석하지 않는다. count1은 이미 약한 동료가 있는10018의5453.5초 지연을 그대로 남겼다.

B→C는 XP만1.42→1.43으로 높였으나 중앙값은2320.3→2266.5초로 더 빨라지고 p90/worst는 더 늦어졌다. 같은 seed10001은3095.8→2082.2초,10007은3059.5→3732.8초였다. XP/HP를 높이면 모든 seed의 시간이 일정 비율로 증가한다고 가정할 수 없다.

## 최대3개 고정 제안

B의 XP·초기 할당 보장을 유지하고 **필드 prefix만1.153/1.154/1.155**로 비교한다. 기존115/100보다 조금 높은 세 유리수이며, 새 시스템이나 시간 대기를 추가하지 않는 기존21키 범위다. 이 세 숫자는 측정 시간을 보간해서 산출한 예상 성공값이 아니다. 더 깊은 첫 XP 요구를 새로 만들지 않고 현재 count5의90분 꼬리 개선을 유지하면서 전투 속도의 중앙값을 늦출 수 있는지 시험하는 좁은 가설이다.

```json
[
  {
    "id": "candidate-r7-prefix1153",
    "parameters": {
      "heroMinLevel": 17,
      "xpBase": 20,
      "xpGrowth": 1.42,
      "fieldHpNumerator": 1153,
      "fieldHpDenominator": 1000,
      "fieldHpTailStartIndex": 79,
      "fieldHpTailNumerator": 10475,
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
    "id": "candidate-r7-prefix1154",
    "parameters": {
      "heroMinLevel": 17,
      "xpBase": 20,
      "xpGrowth": 1.42,
      "fieldHpNumerator": 1154,
      "fieldHpDenominator": 1000,
      "fieldHpTailStartIndex": 79,
      "fieldHpTailNumerator": 10475,
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
    "id": "candidate-r7-prefix1155",
    "parameters": {
      "heroMinLevel": 17,
      "xpBase": 20,
      "xpGrowth": 1.42,
      "fieldHpNumerator": 1155,
      "fieldHpDenominator": 1000,
      "fieldHpTailStartIndex": 79,
      "fieldHpTailNumerator": 10475,
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

후보끼리는 `fieldHpNumerator`만 다르고 분모는1000으로 같다. Lv16–20 대조는 기존 등록값(XP1.4,필드/동료115/100,tail null,보장 null,count1)을 그대로 유지한다. Round06B는 비교할 역사적 탐색 원본이며 이미 실패한 B를 추가 채택 후보로 간주하거나 세 후보 제한 밖의 숨은 네 번째 수치 실험을 실행하지 않는다.

## 기존 구현의 적용 경계와 위험

`src/core/formulas.ts`의 기존 정확식을 그대로 쓴다. `i`를 정수 깊이, `a=min(i,79)`, `b=i-a`로 두고 일반 필드 HP는 `floor(10 × N^a × 10475^b / (1000^a × 10000^b))`, 보스는 그 정수의5배다. `N`만1153/1154/1155로 바뀌며 BigInt 단일 나눗셈을 유지한다. 동료 기반 HP와 기존 보유 동료/PvP 힘은115/100 그대로다.

이번에는 prefix 자체가 바뀌므로 첫 경로의 HP와 RNG 분기가 바뀐다. index79의 HP 기준값도 높아지며, 그 이후10475/10000 tail의 절대 HP도 함께 달라진다. XP 요구식을 고정해도 체력/처치 일정이 달라져 영웅 공격·포획·종 선택의 실제 순서는 달라질 수 있다. 과거 B나 C와 첫 기록이 같다고 기대하거나 HP 변화에서 실제 성공 시각을 비례 계산하지 않는다.

기존 보장식은 boss, index>=63, nextCompanionId<=5, roster<30이고 보스마다 기존capture RNG1회를 먼저 소비한 뒤35%와 OR한다. 영구 할당 카운터는 일반 저장에서 자연 포획 횟수가 아니며 외부 전송/레거시ID 보정으로 구간이 일찍 소진될 수 있다. 정원30은 보장 없이 기존35% 방출/영혼,소비·희생·재시작은 비재무장,안전소진표지·로컬중복/unsafe발급거부·외부s/r ID보존 계약을 유지한다. 새 저장 필드·강제 시간·관리 정책을 추가하지 않는다.

느린 필드와 고정된 동료115/100의 상대적 힘은 달라진다. 더 어려운 초기 보스 자체의 처치에는 그 보스 사후 포획 보장이 도움을 주지 않는다. 따라서 새 HP가 p50을 늦추면서도 꼬리를 다시90분 밖으로 밀 수 있다. 초기 포획 구간 뒤에도30칸 무관리 파티가 고정되므로 후기 운이 남는다.

R06B/C는 이미120분에20/20의 명단이30명이었고 총처치 범위는 각각1408–10297/1279–16488이었다.120분의 이런 차이를8–12시간 결과로 외삽하지 않는다. 새 prefix는 tail 기준값·이후 포획 가능한 깊이·동료 상대 힘·최종h70 시간을 바꾸므로, 첫 선별 통과안은 **같은 후보의 새12시간 전체**를 반드시 측정한다. 과거 Round05의12시간 통과는 대체 근거가 아니다.

## 고정 목표·콘텐츠·다음 순서

첫 성공 p502700–3600초와90분18/20을 동일한 탐색 seed10001–10020의120분 실행에서 함께 만족해야 한다. 통과안만 같은20개 seed의12시간으로 넘기며, h70 자격 전체 p5028800–43200초도 통과해야 채택 대상이다. 선택 규칙은 전체 firstAccepted p50의3150초와 거리→h70 전체p50의36000초와 거리→firstAccepted p90→ID 사전순 그대로다. 전체/조건부 분위수·미도달·분모를 분리하고 별도 검증은 탐색 채택 후 seed1–100에서90/100 조건을 유지한다. 검증으로 수치를 튜닝하지 않는다.

여섯 기존 조건은 crownwyrm=dragon3,rootcolossus=영웅환생3,h58=water100+reefknight2+총1500,h62=환생5+seenMonsters60+총6000,starvoid=환생10+총16000,최종h70=고유영웅10종선택+총30000이다. 무료 choices[0]·골드미사용·동료무관리·균등2입력/초·준비즉시선택을 유지하며,자격/제시/실제선택·처치를 나눠 기록한다. 휴식120초·보류30초 외 새 타이머는 없다.

Host의 독립 검토와 실제 사전등록→정식 Designer/Critic/Balance/Playtester 판단→새 매개변수 적용/등록AC·게이트→탐색 순서다. 새 같은 후보의 screening/full 첫 사건·콘텐츠·실제첫선택 기록은 seed별로 짝지어 검증하고,2/4/8/10/12시간 파티힘·정원·처치·환생과8→12시간 같은 seed의 증가·새획득 공백을 함께 보고한다. 어느 안도 두 목표를 통과하지 못하면 실패를 보존하고 새 사전등록으로 돌아간다. 이 문서는 분석 제안이며 제품 출시·측정 통과가 아니다; humanChecks=PENDING이다.

근거: `evidence/exploration/round-06/*/execution.json`, 후보별 `screening.json` 및 `screening.json.runs/*/10001–10020.json`, 비교용 Round05 tail10475 screening 원본, `evidence/round06-analysis/README.md`/`final-analysis.json`, 현재 `src/core/progression.ts`/`formulas.ts`/`engine.ts`. 기존20개 raw를 읽어 재집계했을 뿐 새 시간을 생성하지 않았다.
