# Critic — 우상단 숫자 축소·외곽선 독립 검토

- 역할: `/root/critic`
- 기준: 이 세션의 `preservation/src/renderer/{hud,game}.ts`와 보존 테스트 대비 현재 파일.
- 최종 판단: **승인된 UI 변경 범위 PASS. 차단 결함(P0/P1) 없음.** Designer 최종 판단 이후 현재 소스·평가기·실제 앱 증거를 수락한다.
- 이 리뷰는 읽기·diff 검토이며 제품·테스트·저널을 수정하지 않았다. 테스트나 앱을 중복 실행하지 않았다.

## 승인 범위와 렌더링 계약

1. `src/renderer/hud.ts:30`: `COUNTER_SCALE` 2 → 1로 glyph와 아이콘의 가로·세로를 절반으로 줄였다. 첫 행 y24 유지, 행간 14 → 10으로 동전 행은 y34다.
2. `src/renderer/hud.ts:125`: 직사각형 배경 패널 그리기를 제거했다. 글자는 기존 타격 숫자·FEVER와 같은 네 방향 1px 외곽선 뒤에 원래 잉크를 그린다. 동전 아이콘은 동일한 네 방향 tint outline, 해골은 원래 실루엣의 네 방향 1px 확장에 해당하는 도형을 사용한다. 음영을 위해 큰 배경을 다시 그리지 않는다.
3. 우측 정렬 잉크 끝은 exclusive x198, 외곽선 끝은 exclusive x199다. 200px 캔버스의 마지막 1px을 남기므로 우측 잘림이 없다. 축소된 아이콘과 글자 사이도 1px 이상 분리된다. 아래쪽은 수집 pop을 포함해 y41 미만으로 제한된다.
4. 동전 수집 pop은 여전히 150ms이고 숫자의 노랑 → 흰색, 아이콘의 1px 위 이동을 유지한다. 외곽선도 이동된 아이콘에 붙어 그려진다. `src/renderer/game.ts:165`의 목적지 Y만 새 동전 행 중심 `COIN_COUNTER_Y + 3`으로 변경했다. 수집 경로·시간·보상·입력 로직은 바뀌지 않았다.
5. `drawOutlinedText` 추출은 `drawFloats` 및 `drawFeverLabel`의 기존 네 번 외곽선 → 잉크 순서를 그대로 옮겼다. 타격 숫자의 색·크기·위치·상승·페이드, FEVER 위치·색·크기는 바뀌지 않았다. 그 밖의 렌더러 코드는 보존본과 동일하다.

## 테스트 검토

- `tests/hud-v09.test.ts:49`는 0, 7, 999, 1000, MAX_SAFE_INTEGER와 정상/pop 양쪽을 검사한다. 새로운 정확한 크기·행 위치·우측 끝·최저/최고 Y, 두 행 사이 투명 영역, 숫자 잉크의 정확한 픽셀, 1px 외곽선을 검증한다.
- 제거된 2× 배경 포함 기대값을 승인된 1× 투명 배경 기대값으로 바꾼 것이다. 무관한 테스트 skip·삭제·완화는 없다. 전체 프레임의 좌상단 HUD 부재, 머리 위 LV/XP/READY, 상태 보존 및 기존 타격 숫자 lane 경계 검사를 유지했다.
- 보존된 `tests/renderer.test.ts`와 현재 파일은 동일하다. 우측 정렬, 동전 pop, 실제 drop 비행 후 pop, 타격 숫자·FEVER 외곽선·위치 등 기존 검증도 남아 있다.

## 이전 관측기와의 관계

`.harness/v9/no-rest-ui.mjs`의 동전 관측 사각형은 y38에서 시작한다. 새 y34 글자의 아래쪽 일부만 관측할 수 있으므로 이 관측기를 그대로 돌려 이번 숫자 크기·행 위치 전체를 검증했다고 주장하면 안 된다. 기존 결과와 평가기는 역사적 증거로 보존하고 새 `counter-ui.mjs`의 새 좌표·크기·alpha/색 픽셀 검사로 이번 변경을 검증하는 계획에 동의한다. 이전 소스 바인딩 PASS를 현재 UI PASS로 재사용하지 않는다.

## 검토 파일 SHA-256

| 파일 | SHA-256 |
|---|---|
| `src/renderer/hud.ts` | `d3dc03dca911a35491bc99cdbdfd5558ed9eab1515e3399671a47e6aadc1d4b6` |
| `src/renderer/game.ts` | `29c594be619c3187216c17a2ca342aeae05fc1ace756f7080b48aa22061c5d18` |
| `tests/hud-v09.test.ts` | `523883af44ea4b11355fa6367a016f0717b4e4e2e946c82c8fb057fba56aeb69` |
| `tests/renderer.test.ts` | `4a2e83c5c0dfaf26ef897eccc486752119ce8d4b2f82cac4ca3db9ae3d05d5f5` |

## 실제 앱 후속 검토

Designer의 `.harness/v9/counter-ui.mjs` 전체를 읽었으며 실행을 막을 결함은 발견하지 못했다.

- 실제 packaged 필드에서 기존 좌상단 alpha=0, 행 사이 y30/31 alpha=0, x199 alpha=0, y24/y34 글자 높이 5·색 픽셀·외곽선·머리 위 LV/XP를 검사한다.
- 같은 packaged `drawCounters`를 별도의 실제 Electron Canvas에서 실행해 5개 값 × 정상/pop 2개, 총 10개를 검사한다. pop의 글자 흰색과 동전 아이콘 y34 → y33도 검증한다. 이 별도 Canvas 시트를 자연 플레이 수집 장면으로 주장하지 않는다.
- 실제 게임창은 body background만 일시 변경해 밝은/어두운 400×260 이미지를 캡처하고 원복한다. 게임 clock/RNG/렌더러는 대체하지 않는다. 비교하는 gameplay snapshot은 레벨·XP·재화·처치·영웅·적 HP이며, 실시간 playTime 전체가 멈췄다고 주장하지 않는다.
- 5개 필수 체크 이름의 정확한 집합, 10개 value/pop 조합의 정확한 집합, PNG 5개, source/artifact/installed app SHA, runtime 정상 종료가 필요하다. 빈 검사 목록으로 PASS를 만들 수 없다.

## 실제 실행 증거 검토

`native/counter-ui.json`과 `gates.json`, `artifacts.json`을 읽었다.

- 필수 5개 체크, 정확한 10개 value/pop 사례 모두 PASS, runtime exit 0·signal null·오류 0. 모든 사례에서 글자 높이 5, 패널 부재, 외곽선, 우측 여백 alpha=0, 정상 동전 y34·pop y33이 확인된다.
- native 보고서의 소스 208개·산출물 8개를 현재 파일과 독립 재해시해 불일치 0건이었다. 평가기 SHA-256은 `fc9ca966d00a5fbbd61cc764b1383ad5791e6eca3e842a01af6411d75ec4bfda`다.
- 실제 실행 앱 ASAR 독립 재해시 `2032c8dbf086c5cd8d1612651897d45cc20b17078233977fc6213ee40415cc19`는 runtime·artifact 기록과 일치한다. `artifacts.json`은 Mac/Windows 각각 현재 payload 109개 일치를 기록한다. Windows 실기기는 PENDING이며 이 리뷰에서 실행하지 않았다.
- exact gates `npm test && npm run lint && npm run typecheck`: exit 0, 73개 파일/1,071개 테스트 및 lint·typecheck PASS. 원본 로그 SHA를 독립 확인했다. 전후 digest 모두 `df633b4928330528220d26129b775aee27980b21273ef45182283be9e0aa4cce`다.
- `native/field-light.png`와 `native/counters-dark.png`를 독립적으로 직접 열었다. 우상단의 큰 패널이 없어지고 숫자·아이콘이 축소됐으며, 밝은 배경에서 글자 테두리가 보인다. 별도 dark 시트는 5개 값의 정상 노란 숫자와 수집 흰 숫자·위로 이동한 아이콘을 보여 준다. 머리 위 LV/READY의 기존 밝은 배경 대비는 이번 변경 대상 밖이다.

## 최종 판단 — Designer 이후

`reviews/designer.md`의 최종 PASS와 실제 PNG 5장 직접 검수 내용을 읽었다. 밝고 어두운 배경에서 축소된 숫자·개별 외곽선이 판독 가능하고, 패널 부재·10조합의 우측 잘림/행 충돌 없음이라는 판단은 독립 코드 검토·현재 해시와 연결된 실제 픽셀 검사·직접 연 두 이미지와 일치한다. 추가 제품 수정은 필요하지 않다.

승인된 숫자/아이콘 크기·배경 제거·외곽선·행간·수집 목적지 조정과 기존 float/FEVER/pop 계약 보존을 수락한다. 밝은 배경에서 기존 머리 위 LV/READY의 낮은 대비, Windows 실기기·Steam·운영 배포 및 전체 성능은 이번 좁은 UI 검토로 완료 처리하지 않는다.
