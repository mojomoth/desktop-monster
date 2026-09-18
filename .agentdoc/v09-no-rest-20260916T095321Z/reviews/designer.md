# Designer — 좌상단 HUD 제거

- 역할: `/root/designer`
- 승인된 범위: 좌상단 목표 레벨·대기 게이지·소울 예상치 전체 제거. 영웅 머리 위 레벨/XP/READY, 우상단 처치 수/골드, 전투·효과 위치 유지.
- 상태: 구현 및 타깃 테스트 통과. 실제 Electron 이미지 검수는 Host의 별도 요청/아티팩트 대기.

## 수정 파일

- `src/renderer/hud.ts`: `drawExpedition`과 전용 `EXPEDITION_*` 상수 및 관련 import 제거. 다른 HUD의 위치·크기·색·동작은 그대로 유지.
- `src/renderer/game.ts`: `drawExpedition` import와 그리기 호출 제거.
- `tests/hud-v09.test.ts`: 전체 게임 프레임의 기존 좌상단 영역이 비는지 검사. 레벨·XP·READY와 우상단 처치/골드의 정확한 위치 및 픽셀, 상태 보존 검사. 긴 데미지 접미사/화면 흔들림 위치 경계와 최대 재화 검사를 유지.
- `tests/expedition.test.ts`: 제거된 기능의 7개 게이지 테스트를 실제 프레임의 HUD 부재 테스트로 전환. 레벨 전/후, 보류 마지막 1ms, 옛 rest 값, 열린 후보/환생 한도, 기존 5개 깊이, 렌더링 시 저장·RNG 무변경을 검사. 무관한 A3 전투/보상 4개 및 A5 영웅 추첨 5개 테스트는 그대로 유지.

## 검증

```sh
npx vitest run tests/hud-v09.test.ts tests/expedition.test.ts tests/renderer.test.ts tests/effects-v09.test.ts --reporter=dot
```

4개 파일 / 129개 테스트 PASS (892ms). `rg -n 'drawExpedition|EXPEDITION_' src tests` 결과 0건. 수정한 4개 파일 대상 ESLint PASS.

`npx tsc -p tsconfig.renderer.json --noEmit`은 병렬 수정 중인 Host 소유 메뉴에서 2개 오류로 실패했다: `src/menu/hero.ts:101`의 제거된 `rest` 상태 비교, `src/menu/index.ts:674`의 제거된 `restRemainingMs` 읽기. Host에 전달했으며 이 검사를 통과했다고 보고하지 않는다.

통합 게이트·패키지·실제 앱 이미지는 Host가 진행한다. 테스트의 recording canvas를 실제 앱 스크린샷 증거로 간주하지 않았다. git·새 의존성·개인 세이브 접근 없음.


## 실제 통합 앱 이미지 검수

Host가 최신 DMG에서 설치한 앱으로 생성한 아래 두 이미지를 `view_image`로 직접 확인했다.

- `field-hud.png`: 좌상단 목표/대기 게이지 및 +SOUL 문구가 없다. 머리 위 `REBIRTH READY`와 `LV 27`, XP 바, 우상단 처치 수/골드가 기존 위치에 보인다. 동료·영웅·몬스터·HP·속성 배치가 유지된다.
- `hero.png`: 메뉴의 현재 레벨과 다음 환생 레벨, 후보 보기 버튼이 보인다. 제거 요청은 필드 좌상단 HUD 대상이므로 메뉴의 목표 레벨 안내는 유지되는 것이 맞다. 눈에 보이는 메뉴에 휴식 안내가 없다.

| 실제 이미지 | 크기 | SHA-256 |
| --- | --- | --- |
| [field-hud.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-no-rest-20260916T095321Z/native-integration/first/field-hud.png) | 400×260 | `a803a4df169faae4432cd9fac44b48d596bf71f6d6fa384e91e449ea1d8d883c` |
| [hero.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-no-rest-20260916T095321Z/native-integration/first/hero.png) | 420×640 | `ab8b6608b3142664f9c440c0a3a8ed05707a845365f5b9a929a152bf1d3847e2` |

## 집중 Electron 검증 CLI

`.harness/v9/no-rest-ui.mjs` 신규 파일을 작성했고 `node --check`를 통과했다. 기존 `runtime.mjs`와 `ui-cases.mjs`는 수정하지 않았다. Host가 최신 설치 앱으로 실제 실행한다.

- 실제 렌더러·preload·IPC·메뉴 이벤트·복원 저장소를 사용해 3회 부팅을 검사한다.
- 120,000ms의 옛 휴식 값과 유효한 후보 3명/일련번호 9를 가진 합성 세이브에서 실제 마우스로 영웅을 선택하고 레벨 1 및 새 저장의 휴식 필드 부재를 확인한다.
- 원문 SHA가 유효한 옛 체크포인트(후보 일련번호 29)를 준비하고 실제 메뉴로 복원한다. 후보/일련번호의 보존, 휴식 정규화, 원본 체크포인트 바이트 불변, 같은 사용자 데이터 폴더 재시작을 검사한다.
- 별도 합성 세이브의 30초 보류는 실제 시간으로 감소하고 메뉴에 남는지 검사한다.
- 실제 Canvas의 기존 좌상단 영역 alpha=0, 머리 위 글자와 오른쪽 숫자의 실제 색 픽셀, XP 바를 검사하며 스크린샷을 남긴다. 배경 패널만 남아도 글자 검사에 실패한다.
- 13개 phase/name 체크의 정확한 집합, first/restart/deferred 순서, version 9, 소스와 아티팩트 해시, 각 runtime 결과 및 정상 종료를 요구한다. 빈 체크 목록은 통과하지 못한다.

합성 레벨 세이브를 자연 플레이 성과로 표현하지 않는다. 게임 clock/RNG/renderer 코드를 바꾸거나 개인 저장을 읽지 않는다. 재사용 runtime은 확인 대화상자의 응답을 격리 stub으로 제공하므로 확인 옵션·실제 메뉴/IPC 경로의 검증이며 실제 OS 모달 창의 시각 검수라고 주장하지 않는다.


## 최종 Designer 판정 — 집중 실제 실행 완료

**승인 범위 PASS.** Host 실행의 `native-no-rest/no-rest-ui.json`을 읽고 13개 필수 검사의 성공, 세 부팅의 정상 종료(모두 exit 0)를 확인했다. 검증 CLI를 다시 실행해 `V09_NO_REST_UI_OK`를 확인했다. ASAR SHA-256은 `c4dafbd5bcbbccb1f60ac0fed69e1664e5b945bbab7d6570a93b481799aa9875`이며 세 부팅이 같은 설치 앱을 사용했다.

아래 8개 최종 이미지를 `view_image`로 직접 확인했다.

- 선택 직후: 새벽 창술사, Lv.1, 다음 환생 Lv.18이 표시된다. 휴식 문구나 휴식 게이지가 없다. 다음 행동은 레벨 조건으로 안내된다.
- 복원 직후와 재시작 후: Lv.18/골드 34567과 같은 후보 3명(새벽 검사·창술사·거너), 활성화된 환생 버튼이 유지된다. 복원 직후에 다시 휴식 상태로 잠기지 않는다.
- 별도 보류 상태: 메뉴의 `무료 재도전까지 플레이 30초`가 실제 경과 후 `25초`로 바뀌며 버튼은 비활성화 상태다. 보류 기능이 유지된다. 이 비활성 버튼의 낮은 대비는 기존 스타일이며 이번 기능 제거의 범위에 변경을 추가하지 않았다.
- 세 필드 화면: 좌상단은 비어 있고 머리 위 LV/XP, 우상단 처치 수/골드, 적 HP/전투 위치가 유지된다. 준비 상태의 READY 표시는 남으며 보류 상태에서는 READY가 없다.

판정 근거는 실제 메뉴·프레임 이미지와 IPC/저장/원문 체크포인트 해시 검사다. 원문 옛 체크포인트의 휴식 값은 해시 검증 전에 삭제하지 않으며, 복원된 활성 세이브에서만 정규화되는 결과가 확인됐다. 이 합성 데이터 실행을 자연 플레이나 사람의 재미 검증으로 표현하지 않는다. native 대화상자는 격리 응답 stub이라는 한계도 그대로 유지한다.

Host 전달 기준 통합 게이트는 1,071개 테스트·lint·typecheck PASS이며, 앞 절의 병렬 수정 도중 타입 오류는 이 최종 게이트에서 해소됐다. Designer의 검수 이후 제품 소스와 CLI 추가 변경 없음.

| 최종 실제 이미지 | 크기 | SHA-256 |
| --- | --- | --- |
| [first/hero-after-choice.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-no-rest-20260916T095321Z/native-no-rest/first/hero-after-choice.png) | 420×640 | `58b0e9cacebf375eb77d4000c4468614cee8714e361bd5a7f22b2ff8f670bc24` |
| [first/hero-restored.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-no-rest-20260916T095321Z/native-no-rest/first/hero-restored.png) | 420×640 | `673bcad1d4183ea4bf52dda1d307ba28f98c1665d8c2621ccbf6a6bf47474586` |
| [restart/hero-restarted.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-no-rest-20260916T095321Z/native-no-rest/restart/hero-restarted.png) | 420×640 | `b5aa6dae4ab34904b2d70a1178a3eadd0a44f8c03b8fce90bace31707896c532` |
| [deferred/hero-deferred-start.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-no-rest-20260916T095321Z/native-no-rest/deferred/hero-deferred-start.png) | 420×640 | `ee399779013562e159f18043a2fa0d4b9eeee394d2c75b94db6abe07fd1d5e19` |
| [deferred/hero-deferred-later.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-no-rest-20260916T095321Z/native-no-rest/deferred/hero-deferred-later.png) | 420×640 | `e1769b9b83b3f42d1f71c2913ad05e05d055f3eab92c338256023a0e38c6fd88` |
| [first/field-hud.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-no-rest-20260916T095321Z/native-no-rest/first/field-hud.png) | 400×260 | `d29773134143a18684660c785d7ebd0e4c0584d63c16ee856330025ada0d9267` |
| [restart/field-hud.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-no-rest-20260916T095321Z/native-no-rest/restart/field-hud.png) | 400×260 | `1ee1dd4a941aa8e9ef58d5c93108f1ca800c3a4bda3629e35a49c66e5f73c575` |
| [deferred/field-hud.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-no-rest-20260916T095321Z/native-no-rest/deferred/field-hud.png) | 400×260 | `6d0530267696bd53b95870be98dcf6aa998a7b20ada7599abaaa11f7bcfbef08` |
