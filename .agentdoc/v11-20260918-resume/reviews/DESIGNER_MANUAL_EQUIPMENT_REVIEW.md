# 수동 장비 계약 독립 검토

2026-09-18 Designer. Balance가 작성한 `src/core/equipment.ts`의 수동 장착·자동 후보 제한과 engine 연결을 `docs/v0.11/CONTRACT.md`의 승인 동작에 대조했다. 생산 코드·테스트를 수정하지 않았고 Electron/전체 gates를 실행하지 않았다. 현재 읽기 범위에서 재현 가능한 계약 위반을 발견하지 못했다. 이것은 최종 패키지/native 승인과 별개다.

## 코드와 회귀 근거

- 실제 비교값: `loadoutAttack`은 영웅의 현재 레벨·영혼·수락 환생 횟수·훈련을 포함한 base와 무기/액세서리 배율을 마지막에 정수 나눗셈한다. acquire와 성공 강화는 각각 새 UID/강화 UID만 후보로 전달하고 기존 착용품을 함께 비교한다. 전체 보관함의 더 강한 과거 장비는 후보에 끼지 않는다. 정수 공격력 동률은 기존 착용 수 유지가 우선이다. critical/party 보너스를 최적화하지 않는 것은 승인된 displayed attack 기준과 일치한다.
- 수동 선택 지속: `equipmentEquip`은 loadout을 직접 바꾸고 재최적화하지 않는다. restart와 호환성 복구는 `refillOnly`로 유효한 기존 슬롯을 고정하며 빈 슬롯만 채운다. tick·일반 금화/훈련·가방 확장·무관한 물건 판매도 기존 유효 슬롯을 더 강한 과거 물건으로 되돌리지 않는다.
- 실제 물건 보존: 수동 무기/액세서리 교체는 들어오는 물건의 bag/temporary 인덱스에 기존 착용품을 `splice`한다. 가방이 가득 차도 추가 슬롯이 필요 없고 임시보관 교체는 해당 temporary revision을 증가시킨다. 액세서리4개가 차면 현재 착용 UID의 `replaceId`가 필요하고 선택한 배열 위치를 그대로 교체한다.
- 사건별 자동 장착: level-up은 정확히 그 새 레벨에서 사용 가능해진 UID 집합만 전달한다. 성공 강화는 강화 물건만 비교한다. 착용품 판매/강화 파괴는 vacancy만 채운다. 다른 직업으로 변경하면 호환되지 않는 품목을 정리하지만 계속 호환되는 수동 슬롯은 보존한다.
- 원자성: action revision/소유권/레벨/직업/교체 UID를 검사한 뒤 복사본에 적용한다. 거부된 구매는 차감·임시품 손실·batch 상태를 원본에 반영하지 않는다. hero 변경은 target/offer serial/heroChangeSerial/temporaryRevision/lost IDs를 검사하며 오래된 확인은 무변경 거부다. 임시보관의 기존 v10 overflow 교체 정책은 별개로 유지된다.

실행한 기존 회귀는 `equipmentV11`8개, `equipmentV10`10개, `equipmentMenuV10`5개, `v10Critic`7개, `v10Review`7개로 **37/37 통과**했다. 후자에는36개 결정적 작은 inventory의 exhaustive displayed-attack oracle, 정수 동률·기존 착용 수 유지, 임시품의 레벨/강화 후보, stale confirmation 반례가 포함된다. 로그는 `DESIGNER_MANUAL_EQUIPMENT_TESTS.log`, `DESIGNER_MANUAL_EQUIPMENT_TIES.log`다.

## native 범위와 남은 확인

현재 manual native script는 trusted 수동 클릭100개, ACK 전 중복 클릭1회 적용, 약한 수동 선택 유지,3200ms live update, full bag에서 지정 액세서리 교체, 실제 IPC stale revision 거부, 약한 구매 유지/강한 새 구매 교체, 무관한 판매, 직업 변경/임시품 소실 확인, save/restart의 약한 선택 보존을 포함한다. 하네스 일부는 이 Reviewer가 이전에 작성했으므로 이 목록은 범위 대조이며 독립 native 시각 승인으로 주장하지 않는다.

임시보관에서의 수동 맞교환과 강화 실패 후 슬롯 보충은 현재 core 회귀가 직접 검증하며, 기존 native 클릭 순서가 각각을 별도 단계로 누르지는 않는다. 이것을 발견된 제품 결함이나 새 의무 범위로 취급하지 않는다. 최종 frozen package에서 기존 native 시나리오·픽셀·latency·재시작 결과가 다시 통과해야 하며, 실제 앱 실행은 Host가 담당한다.

## party 장비 최적화의 균형 측정 한계

현 evaluator의 상점은 영웅 displayed attack 증가/가격을 기준으로 구매한다. 파티 중심 수동 장착은 합법적인 다른 선택이므로 이 정책을 모든 장비 전략의 최적 정책으로 부르면 안 된다. 그러나 액세서리당+16% 예는 epic tier4, roll100이며 epic은 상점 판매가 불가능하다. 비epic rare tier4의 party+12%는576000골드다. 초기3회 raw에서 실제 획득한 장비와 경제를 확인하지 않은 채 네 개의 최고 액세서리가 바로 준비된다고 가정하는 것도 잘못이다.

h00는 모든 액세서리를 착용할 수 있지만 영웅 직업10개 중5개는 party 액세서리와 호환되지 않는다. 나머지5개는 party 계열을 착용하며 primary attack/등급/강화와 party 배율 순위가 완전히 같지는 않다. 강화는 primary attack을 늘려도 party bonus를 늘리지 않는다.

작은 도달 가능 예는 R13-C high seed120007의 첫30분이다. 실제 raw wallet5018, party237bps, 첫 구매는261.5분이다. 보존된 compiled core로 시작 seed(`seed^0xe011`)의 첫 상점만 재구성하면 e12 `a-ring-party-common-1`, roll94, 가격4500, party94bps가 나온다. 이 stock은 첫1시간 동안 유지되므로 수동 구매 가능한 선택이다. 다만 raw에는 전체 현재 loadout이 없어 어떤 물건을 빼는지와 영웅/critical 손실까지 포함한 총 DPS 증가를 복원할 수 없다. 이 예를 시간 gate 실패의 증거로 쓰지 않는다.

R13 raw는 전체 소유 장비·매 상점 stock·매 교체를 저장하지 않아 첫3회에서 실제 가능한 최적 party 배율이나 단축 시간을 완전히 복원할 수 없다. 추가 정책 측정 없이 일반/고입력 전체가 장비 전략에 안전하다고 주장하지 않되, 이 읽기 검토만으로 새로운 실패나 추가 의무 실험을 만들어 내지도 않는다.
