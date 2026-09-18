Designer `/root/designer` 직접 관찰 기록 — final v0.7.0 진단 preflight

완료된 `preflight/final-v070-rare/attempt01/execution.json`과 `journey.json`을 읽고 아래 PNG 7개를 직접 열어 확인했다. 이번 범위에서 희귀 세 번째 카드 선택, 획득 도감 공개, 동료 환생 확인, PvP 행 표시·선택·포커스와 기록 사이의 모순을 발견하지 않았다. 이는 별도의 정식 `audit.mjs` 결과 감사나 자연 관측 판정이 아니다.

실행은 2026-09-12T18:41:41.104432+00:00에 시작하여 18:42:15.406921+00:00에 끝났고, `exitCode=0`, `status=passed`였다. 실제 journey는 `completion=completed`, 42/42 checks 통과, `errors=[]`, `sessions=[]`, `elapsedMs=31202.745667`이다. `naturalMinutes=0`, `fixtureDiagnostics=true`이므로 자연 관측 시간은 0분이다. 이 조사에서 Native·빌드·게임·테스트를 추가 실행하지 않았다.

- 버전: 0.7.0
- source: `84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`
- evaluator: `c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d`
- [실행 원본](preflight/final-v070-rare/attempt01/execution.json)
- [journey 원본](preflight/final-v070-rare/attempt01/journey.json), 실제 SHA-256 `b99bd36b02523fc9d33f136b8375c9553be535488573f65b3b19ef4af8b24443`

아래 경로는 이 문서가 있는 `evidence/` 기준이며, 모두 실제 이번 실행의 파일이다. journey가 등록한 전체 PNG 17개의 실제 SHA도 17/17 일치했다. 직접 시각 관찰한 범위는 아래 7개다.

| 직접 연 PNG | 화면에서 확인한 사실 | PNG SHA-256 |
|---|---|---|
| [희귀 세 번째 제시](preflight/final-v070-rare/attempt01/journey.json.screenshots/v07-rare-third-choice-offer.png) | Lv.22/다음 환생 Lv.22, 일반 두 카드 뒤 세 번째 `별밤 계승자`, `레어 · ★★★★★ · 어둠`, 동료 공격력 +25%가 표시된다. | `c82e7be1efc34f252ca822b8ef84d7ddf2e71dd2d70bf000210ad6e4a39106ed` |
| [희귀 획득 후 도감 목표](preflight/final-v070-rare/attempt01/journey.json.screenshots/v07-rare-third-choice-acquired.png) | `영웅 #070 · 별밤 계승자`, `발견 완료 · 보유`, 서로 다른 영웅 11/10, 누적 처치 30000/30000이 함께 보인다. 목표 해제도 가능하다. | `346d752884f16a09d381f02fcb1d208caff3900ae148585aa82ab2b3290a8c1c` |
| [레거시 미획득 마스킹](preflight/final-v070-rare/attempt01/journey.json.screenshots/v07-legacy-silhouettes.png) | 미획득 영웅 #002 목표는 이름을 숨긴 채 조건 충족과 선택 필요를 설명한다. 처치한 Slime은 공개되고 미처치 #002는 실루엣·미발견으로 남는다. | `aaab0d74011d1f691997c6fcd7aa6622320623bd8ed1a8884dff13b7e43e45e4` |
| [첫 처치 후 공개](preflight/final-v070-rare/attempt01/journey.json.screenshots/v07-first-kill-codex.png) | Bat 그림·이름·설명·누적 1회 처치·선택 목표가 공개된다. 이 별도 fixture에서 미처치 Slime과 다른 카드들은 계속 미발견이다. | `1034ab9ddd116c2cb85b286713ae445a7a6122714490a6ecc888f2f96280cc25` |
| [동료 환생 확인](preflight/final-v070-rare/attempt01/journey.json.screenshots/v07-companion-reincarnation-preview.png) | Slime Lv.11→Lv.1, ★0→★1, 기본 힘 11→2와 힘 감소 설명, `환생 확인`·`취소`가 같은 카드에 보인다. Lv.250과 Lv.9007199254740991도 표시된다. | `4f03b4fa0594034f353aa2d170f15ded8e7ca3cfb95761459ed8d94e71a52668` |
| [PvP 선택한 행](preflight/final-v070-rare/attempt01/journey.json.screenshots/v07-pvp-selected-list.png) | 행마다 영웅 그림/이름, 순위·이름·전적, 동료 5명이 보인다. 선택한 E2E_Foe49 행과 버튼에 노란 테두리가 있고 선택 문구가 바뀐다. | `4bc3885af98c6c65f5c152b49d285a95b6f4186454e809f72cb879c2c4658ed6` |
| [목록에서 빠진 상대 이후 포커스](preflight/final-v070-rare/attempt01/journey.json.screenshots/v07-pvp-removed-row-fallback.png) | `목록 새로고침` 버튼에 포커스 테두리가 보이고 새 상위 상대와 영웅·동료 파티가 표시된다. | `eac473c50ecd565e69effde8a286dc54fba27876ee6b2162bd25eff56adce518` |

`v07-rare-third-choice-ui`의 실제 기록은 선택 전 h70가 세 번째 카드이고 `offerSerial=41`, 조건이 고유 영웅 10종·30000처치임을 담는다. 실제 Native 클릭으로 관찰된 action은 정확히 `{type:"heroChoose",formId:"h70",offerSerial:41}` 한 개다. 선택 후 equipped·collection·heroCounts·reincarnationHistory에 h70가 반영되고 환생 10→11, Lv.22→1, XP 7→0, monsterIndex 80→0, choices 비움이 기록된다. 골드 321과 누적 처치 30000은 유지된다. h70만 실루엣에서 공개되고 미선택 h11/h12는 계속 숨겨지며, 알림은 영웅 1/몬스터 0과 h70를 가리킨 뒤 ACK에 h70가 추가된다. 이는 `fixture=true`, `naturalAcquisition=false`인 별도 진단이다. 무료 첫 슬롯 정책의 실제 자연 h70 선택 빈도를 바꾸거나 증명하지 않는다.

환생 확인 기록은 실제 확인 후 Slime Lv.1/★1/힘 2를 확인한다. 별도 대상 변경에서는 Bat Lv.250→251 저장 갱신 후 기존 확인이 취소되고 해당 안내가 표시되며 ★0이 유지된다. PvP 원본 50행은 ID 50개가 모두 다르고, 모든 행에서 영웅 그림·이름/버튼/동료 5명/정확한 MAX_SAFE 레벨 문자열이 있다. 좁은 파티 셀의 긴 레벨은 여러 줄로 감기지만 관찰한 화면에서 옆 셀을 침범하지 않는다.

키보드 기록은 실제 `webContents.sendInputEvent`의 Tab/Shift+Tab 이동과 Enter/Space 문자 이벤트, `isTrusted=true`인 click을 담는다. Enter는 e2e-103, Space는 e2e-101, 마우스는 e2e-7을 선택했고 각 요청 `opponentId`·응답 `playerId`·선택 DOM ID가 일치한다. 5594ms 후 저장 갱신과 실제 서버 점수 재정렬에도 동일 행·버튼과 e2e-101 포커스를 유지했다. 새 상위 상대 때문에 e2e-7이 상위 50명 목록에서 빠진 경우 선택/preview가 비워지고 전투가 비활성화되며 포커스가 `#find`로 이동했다. 실제 계정 삭제나 운영 서버 통신을 시험한 것으로 해석하지 않는다.

증거 한계도 남는다. 제시 PNG의 하단 선택 버튼과 획득 PNG의 h70 도감 카드 자체는 캡처 영역 밖이므로 버튼 클릭·카드 공개·ARIA·ACK는 위 journey의 실제 상태/DOM 기록으로 확인했다. PNG는 전체 동작 영상이나 전 카드·모든 창 크기의 시각 검사도 아니다. 알림 확인은 게임 내부 표시와 ACK이며 OS 알림 확인이 아니다. PvP는 격리된 실제 클라이언트/서버 핸들러 진단으로, 실제 전투 결과·운영 호환을 여기서 인증하지 않는다.

사람이 조작·관찰한 기록은 없으므로 `humanChecks=PENDING`이다. 5/15/30분×3프로필, 연속 180분, 최종 0.7 정책별 100seed×12시간, 네 역할 독립 결과 감사, smoke, 실제 패키지 및 새 클라이언트 이전 운영 서버 고레벨 호환은 각각의 별도 근거로 판정해야 한다. 이 0분 preflight를 그 실행 시간·성과·출시 완료 근거에 합산하지 않는다.
