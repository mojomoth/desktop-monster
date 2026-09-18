# Early-capture 최소 결정적 테스트 초안

작성: `/root/designer`. 읽기 전용 설계 후 이 새 문서만 작성했다. 소스/테스트 수정·실행·빌드·측정은 하지 않았고 검증 데이터는 읽지 않았다. 숫자는 등록된 Round06(count1/5,index63,35%,정원30)과 안전 경계의 테스트 입력이며 새 후보가 아니다. 모든 save/RNG 주입은 단위 테스트 fixture이며 자연 Native 관측 근거로 쓰지 않는다.

## 기존 테스트를 보존하는 분리

- `tests/engine.test.ts:472–498`은 현재 생산 `firstCaptureBossIndex`를 읽으면서 `nextCompanionId=2`를 항상 실패로 기대한다. count5를 생산에 적용하면 이 주장은 의도적으로 달라진다. 기존 주장을 삭제하거나 next2 실패만 빼지 말고 **명시적 count1의 실제 엔진**에서 기존 capture→sacrifice→serialize/parse→다음 보스 실패·4draw까지 그대로 유지한다.
- 등록 생산 경로도 별도로 유지한다. `tests/progressionV7.test.ts:35–49`의 실제21키/프로토콜/콘텐츠 binding과 기존 나머지 검증은 그대로 두고, 실제 생산 export를 사용하는 엔진 smoke case에 표로 된 현재 계약별 기대값을 추가한다: null/count1은 next1/2 모두 실패,63/count1은 성공/실패,63/count5는 성공/성공(각각 추첨0.5,명단 여유). mock 엔진 결과만으로 생산 binding을 통과시키지 않는다.
- count1/5 단위 격리는 `tests/formulas.test.ts:87–105`의 기존 `vi.resetModules → vi.doMock(progression.js) → 실제 모듈 dynamic import → finally doUnmock/resetModules` 패턴을 재사용한다. 전체 frozen export를 복사하고 해당 테스트의 threshold/count만 바꾼다. 실제 engine와 연결된 collection/save/hero를 같은 격리 모듈 그래프에서 가져오며 수식·엔진·저장 로직 자체는 mock하지 않는다. static production imports는 유지하고 격리 케이스를 concurrent로 실행하지 않는다.

## 공통 fixture와 정확한 RNG 기대

`DEFAULT_SAVE` 기반 명시적 save, `monsterHp:'1'`, 기존 `countingRng`를 사용해 실제 `engine.attack('keyboard')` 한 번으로 처치한다. save로 시작할 때 초기 종 추첨이 추가되지 않는 기존 계약을 사용한다. 보스의 정상 경로는 **crit→loot→capture→next species = 총4draw**, 비보스는 **crit→loot→next species = 총3draw**다. `0.5`는 crit와 trinket을 피하므로 별도 loot pick draw가 없다.

보장 성공에도 총4draw를 확인하고 추첨 성공/실패를 바꿔 보장이 RNG를 생략하거나 두 번 소비하지 않음을 확인한다. event의 포획된 실제 종·bossIndex·cID·Lv1·별0 및 다음 카운터를 함께 단언한다. 통계 확률 테스트(기존10000개 추첨의32–38%)는 유지하되 아래 결정적 `.35` 경계 검증을 대신하지 못한다.

## 최소 사례 묶음

| 묶음 | 결정적 입력/실제 행동 | 반드시 확인할 기대값 |
| --- | --- | --- |
| T1 count1 원계약 | threshold63/count1,보스63,추첨0.5,next1/2 | next1만 c1 한 명 포획·counter2;next2는포획0·counter2;각4draw. 기존 sacrifice/restart 뒤 next2·보스71도포획0/4draw 유지. |
| T2 count5 한도 표 | threshold63/count5,보스63,추첨0.5,next1/4/5/6;명단에 해당 발급ID가 없는 유효 상태 | 각각 c1/c4/c5 포획으로counter2/5/6, next6은무포획·counter6;각4draw. roster길이보다 영구 카운터가 판정한다. |
| T3 깊이와 null/비보스 | count5,next1:보스55,비보스62,보스63,비보스64,보스71;추첨0.5; 별도로 thresholdnull의보스63 |55와62는무포획,63/71은각포획1,64와null은무포획;보스는4draw,비보스3draw.62만으로 아래쪽 보스 경계를 검사했다고 하지 않는다. |
| T4 정상35% 보존 | thresholdnull 또는 count5/next6/보스63/명단여유;captureDraw0.349999와0.35,앞crit/loot0.5 | 전자는정상포획1·후자는0;각4draw. 보장활성 next5에서draw0.0과0.5 모두포획은딱1, counter는딱1증가하고각4draw. |
| T5 full30·낮은 카운터 | threshold63/count5,보스63,next1,30명 fixture,releasedCount1/souls7;draw0.5와0.0 별도 |0.5는무포획/무방출,releasedCount1/souls7/counter1/기존30명그대로;0.0은기존방출1,releasedCount2/souls8/counter1/기존30명그대로;각4draw. count1도같은 full guard로 반복한다. |
| T6 소비/희생/재시작 비재무장 | count5,이미소진counter6와c1–c5로시작;실제consume(c1,c2)→sacrifice(c3)→serialize/parse→다음보스71에서draw0.5 | 유효action의레벨/명단/영혼 변화는정상적으로발생하고 counter6는모든단계에유지;재시작후포획0/4draw. 명단 감소를quota로되돌리지않는다. |
| T7 실제 환생 비재무장 | 소진counter6,환생가능동료로실제reincarnate;별도준비영웅에서heroOffer→실제첫choice/offerSerial로heroChoose→serialize/parse | 동료Lv1/별+1,영웅Lv1/환생+1을각확인하되counter6/동료ID보존;깊은보스복귀fixture에서draw0.5이면포획0/4draw. 엔진의환생action을생략하고save값만덮어쓴것으로대체하지않는다. |
| T8 외부/레거시 조기소진 | 실제addCompanion 또는pvpResult의서버s/r ID획득으로counter가6이되는경로와,parseSave에서c5등큰ID로counter1→6보정되는별도경로 | 실제자연포획이없어도quota는소진하며외부ID는그대로보존;명단제거/재시작후counter를낮추지않고보스63·추첨0.5는무포획. 새자연획득카운터를추론하지않는다. |

T5는 full+낮은counter를 직접 만드는 신뢰 경계 fixture다. 일반 c1–c30 명단을 parseSave에 통과시키면 counter가31로 보정되므로, 그런 fixture로 낮은 카운터의 보장 우회를 확인했다고 주장하지 않는다. 저장 보정은 T8에서 따로 검사한다. 정원30에서의 `bossReleased` 대신 실제 이벤트명 **`companionReleased`**를 사용한다. 기존 `engine.test.ts:513–535`의 정상full 추첨·4draw·명단/카운터 보존 검증도 유지한다.

T8의 실제 외부 할당만 분리하려면 숫자가 없는 서로 다른 유효 s/r ID(예:sa,sb,sc,sd,se)를5번획득해counter6으로 만든 뒤 제거·재시작한다. 레거시 ID 보정 경로는 별도의save로검사하고 둘을하나의테스트로뭉쳐 어느경로가카운터를올렸는지숨기지않는다. 서버ID를cID로바꾸는정규화는금지다.

## V02 안전 수정과 연결할 경계

현재 `save.ts:273–275`의 ID숫자보정과 `collection.ts:297–319`의 외부할당 증가, `engine.ts:246`의직접++는 후속수정대상이다. `r9007199254740992` 보존/안전소진표지, counter=MAX_SAFE_INTEGER에서로컬발급거부,기존cID충돌거부·외부s/r ID보존/포화,소모재료/명단무손실은V02등록테스트에서확인한다. V05에서는그안전카운터가count5보다커서보장을다시켜지않는실제엔진연결사례를하나추가하면된다. 이문서는수정완료를인증하지않는다.

현재 `tests/progressionV7.test.ts`의21키바인딩,정확한HP/동료힘·XP공식,레거시열린offer,여섯콘텐츠조건과6draw영웅선택검증은유지한다. 향후구현담당자가소유권내에서위사례를추가하고등록AC와같은소스의게이트를실행해야하며,이초안자체는테스트PASS나자연관측증거가아니다.
