# 고정 필드 성장 검증 연결

2026-09-18. 부모 요청 범위의 하네스·테스트만 수정했다. 생산 소스, 프로토콜, 실행 저널을 수정하지 않았고 Electron을 실행하지 않았다.

- `.harness/v11/runtime.mjs`: cap79 + G에서 c5(index79, Lv1, star1)의 Q2와 c6(index95, Lv1, star0)의 Q1을 구분한다. c7(star1)을 실제 consume하면 c6는 Q3가 되어 파티에 진입한다. G=null이면 기존 적응형 레벨 데이터를 유지한다.
- `.harness/v11/runtime.test.mjs`: 실제 격리 컴파일한 core를 사용해 p1/p2, scale1/64/256, G25/50/100의 legacy→v11→성장 후 멤버를 확인한다. 무상한 곡선 scale1/8/12/64/256도 유지한다. 격리 모듈 매개변수는 각 사례 후 복구한다.
- `tests/renderer-field-v11.test.ts`, `tests/share-field-v11.test.ts`: 새 HP/index/G 3개 설정은 기존 고정값 사례에서 null로 격리했다. 실제 G25 적용 시 독립 예상 사냥값 237→276과 별 동료266을 비교하고 다음 draw의 파티 픽셀과 raw/PvP 유지도 확인한다.
- `.harness/v11/ui-cases.mjs`: 실제 재료 클릭 전에 `.growth-power`를 읽고 ACK 이후 사냥/PvP 결과와 비교한다. 축약 표시뿐 아니라 title의 정확 정수도 일치해야 하며, raw 자료는 snapshot과 growthPreview에 남긴다. 기존 클릭·ACK·저장 검사를 유지했다.

검증: Node runtime + final-check 36/36 (`DESIGNER_GROWTH_NATIVE_SELFTEST.log`), renderer-field/share-field/hud-v09 Vitest 12/12, 두 변경 TS 테스트의 scoped ESLint 0. 전체 gates와 새 frozen package의 실제 native 실행은 부모가 담당한다. 코드 검증으로 native 통과를 주장하지 않는다.

후속 floor10000 대응: Balance가 확정한 `fieldCompanionBaseFloor:number`의 neutral 값은 0이다. renderer/share-field 및 무상한 runtime mock에 0을 명시했다. cap fixture 회귀는 HPcap159/companionCap79에서 p1/p2 × scale1/64/256 × G25/50/100 × floor0/10000의 36조합을 실제 core로 검사한다. 독립 F79(95/237) 계산으로 floor 적용 전후와 Q1/Q2/Q3의 정확 정수값을 검증한 뒤 legacy→v11→consume 파티 교체 및 raw PvP 보존을 확인한다. production fixture 코드는 기존 Q 분기로 충분해 추가 변경하지 않았다. 후속 결과는 `DESIGNER_FLOOR_NATIVE_SELFTEST.log`의 Node 36/36, 관련 Vitest 9/9, scoped ESLint 0이다. Electron은 실행하지 않았다.
