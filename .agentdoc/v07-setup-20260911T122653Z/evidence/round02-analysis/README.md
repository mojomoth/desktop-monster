Round02 독립 원본 분석을 완료했다. 8개 탐색 실험과 9개 보고서(180개 원시 실행)의 무결성 검사는 PASS이며, 두 목표를 모두 통과한 후보는 없다. 이는 제품 출시 검증이 아니다. humanChecks=PENDING을 유지한다.

| 실험 | 전체 p50초 | 성공자 p50초 | 전체 p90초 | 90분 이내 | 120분 미도달 | screening |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| control-l16 | 813.6 | 813.6 | 909.5 | 20/20 | 0/20 | FAIL |
| control-l17 | 1636.5 | 1636.5 | 3268.5 | 20/20 | 0/20 | FAIL |
| control-l18 | 4976.5 | 4537.6 | null | 12/20 | 3/20 | FAIL |
| control-l19 | null | 4505.4 | null | 5/20 | 13/20 | FAIL |
| control-l20 | null | 5621.6 | null | 1/20 | 17/20 | FAIL |
| candidate-r2-xp141 | 2902.6 | 2902.6 | 4527.5 | 18/20 | 0/20 | PASS |
| candidate-r2-xp142 | 3361.5 | 3157.1 | null | 11/20 | 6/20 | FAIL |
| candidate-r2-xp143 | 4935.5 | 3459.7 | null | 12/20 | 6/20 | FAIL |

XP141만 실제12시간으로 승격했다. 첫 환생은 전체p50=2902.6초,18/20이90분 이내로 PASS지만 h70의 eligible/seen/chosen은 모두0/20이라 최종 목표 FAIL이다. 나머지7개는12시간 NOT_EVALUATED이다. 전체분위수는20개 모두를 포함하고 미도달을 뒤에 두며 floor((N−1)q)를 사용한다. 성공자 분위수와 미도달 수는 별도로 보존했다. canonical은 모든 도달 seed에서 firstReady=firstOpen=firstAccepted이며 메뉴 지연은0초다.

반복한 다섯 대조군은 Round01과 원시runs 전체 및 rawSHA가 동일하다. 보고서/원시파일/manifest, 실험·프로토콜·소스·평가기·컴파일·로그 해시를 독립 대조했다. tar의 절대경로 tsconfig4개는 root tsconfig로 경로를 대응시켜 재현하고 bytes는 그대로 보존한다. evaluation tar의 DESIGN_DECISIONS.md는 보존하되 정해진 evaluationDigest 범위 밖이다. 앞선 snapshot-05의15개 불일치는 이 레이아웃을 잘못 가정한 분석 실패로 남겼고, 원본을 고치지 않은 mapped 재계산에서 해소했다.

XP141의 처치 p50은4시간825→8시간968→10시간974→12시간977이다. seed별8→12시간 추가 처치 p50=8이며,20/20이8시간부터 로스터30·동료최대Lv1이다. 해당 구간 partyPower는14/20에서 동일했고16/20은8시간 이후 영웅 선택이 없었다. 12시간 actual distinct chosen은7–9, 총처치는825–1137이다. 따라서 h58 총1500, h62 총6000, starvoid 환생10/총16000, h70 고유10/총30000을 통과하지 못했다. h58의 물100/reefknight2는 first-occurrence 로그만으로 정확한 최종횟수를 재구성할 수 없다.

다음 방향은 L17·XP1.41·index0–79의115/100을 유지하고 이후 field HP만111/108/105로 나누는3안이다. companion115/100과 현재 콘텐츠 요구를 유지한다. XP정적합은 L17=11850XP로72처치에서 넘으며, L21은144처치, L23은203처치다. index143의 boss배수 전 HP는 원래4,783,999,995에서111/108/105별496,363,719 /85,950,763 /14,165,911이다. exact rational을 한 번만 내림해야 하며, 이는 효과 폭을 비교한 정적 계산일 뿐 미측정 시간을 예측하지 않는다. 관측977에 맞춰 콘텐츠를 낮추는 방향은 채택하지 않는다.

두 목표 통과안이 없어 tie-break를 적용할 순위가 없다. 후속 후보의 등록/실행/채택은 Host가 수행하고, 검증seed1–100은 읽거나 재조정에 사용하지 않았다. 자세한 전체/성공자p10·p50·p90·worst·미도달, milestone 및seed별 정체 수치와 해시는 [final-analysis.json](final-analysis.json)에 보존했다.
