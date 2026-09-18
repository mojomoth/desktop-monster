Designer `/root/designer` — 최종 0.7 짧은 Native 종료 화면 사실 관찰

완료된 `matrix-state.json.runs`의 짧은 실행 9개만 읽고, 각 원본 JSON과 자연 관측 종료 PNG의 SHA를 직접 대조했다. 9개 종료 PNG도 모두 직접 열었다. 원본 9/9 및 종료 PNG 9/9가 등록 해시와 일치하고, 각 실행은 exitCode 0, completed, checks 43/43 통과, errors 없음이다. 43개에는 자연 관측 이후 fixture 진단도 포함되므로 전부 자연 관측 검사라고 부르지 않는다.

이번 문서는 정식 결과 감사·승인·출시 판정이 아니다. 진행 중인 `180-active-1789253244141.json`을 열거나 변경하지 않았고 Native/게임/빌드/테스트를 실행하지 않았다. `matrix-state.json`에서는 완료된 runs 배열만 사용했다. 소스·평가기·계약·원본은 변경하지 않았다.

- source: `84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`
- evaluator: `c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d`
- 자연 관측 합계: `9001630.680792 ms` = 약 150.027분. 전체 프로세스 시간이나 진단 시간을 더한 값이 아니다.
- 전부 새 상태에서 시작했고 자연 메뉴 방문 0회, 실제 환생 0회, 획득 영웅 0종이다. 짧은 실행은 `observe-only`이므로 준비 상태와 실제 선택 성공을 구분한다.

각 종료 PNG의 레벨·처치·골드는 `/sessions/0/end`와 일치했다. 명단 수는 JSON의 전체 companions 수이며, 표시 동료 수는 화면 왼쪽 동료들 아래 속성 배지를 직접 센 값이다. 오른쪽 적의 배지는 포함하지 않았다.

| 실행 | 자연 elapsedMs | 실제 합성 입력 수 | 종료 Lv / 처치 / 골드 | 전체 명단 / 표시 동료 | 종료 화면 준비 문구 |
|---|---:|---:|---|---|---|
| 5-active | 300166.794458 | 578 | 14 / 47 / 560 | 2 / 2 | 표시 없음 |
| 5-idle | 300176.916709 | 0 | 1 / 0 / 0 | 0 / 0 | 표시 없음 |
| 5-intermittent | 300176.58675 | 146 | 11 / 29 / 223 | 2 / 2 | 표시 없음 |
| 15-active | 900183.624583 | 1745 | 15 / 63 / 1001 | 5 / 5 | 표시 없음 |
| 15-idle | 900174.451208 | 0 | 1 / 0 / 0 | 0 / 0 | 표시 없음 |
| 15-intermittent | 900186.749584 | 436 | 14 / 46 / 544 | 2 / 2 | 표시 없음 |
| 30-active | 1800177.2859999998 | 3491 | 17 / 76 / 1493 | 6 / 5 | REBIRTH READY |
| 30-idle | 1800185.004958 | 0 | 1 / 0 / 0 | 0 / 0 | 표시 없음 |
| 30-intermittent | 1800203.266542 | 876 | 15 / 58 / 898 | 3 / 3 | 표시 없음 |

30분 active의 전체 명단 6명/화면 5명은 상한 5명 자동 선택 파티와 일치한다. `electron-e2e.cjs:85–86`의 summary는 전체 저장 명단 길이를 기록하고, `src/renderer/game.ts:296–301`은 현재 적에 대한 activeCompanions를 그린다. `src/core/collection.ts:25,70–87`은 5명만 선택하며 `src/renderer/sprites/party.ts:113–130`은 표시 파티 멤버마다 배지를 그린다. 자연 summary에는 개별 companion ID·깊이·선택 파티 목록이 없으므로, 이 PNG만으로 실제 자동 선택의 각 ID나 파워 순위를 재검증했다고 주장하지 않는다.

세 idle 원본은 입력 0, Lv.1/처치 0/골드 0/동료 0이다. 동료 없는 새 게임의 순수 방치이며, 이미 동료를 획득한 복귀 방치와 같지 않다. active/intermittent의 5·15·30분은 서로 다른 새 실행이고 생산 RNG를 사용하므로 한 플레이의 연속 성장곡선이나 프로필별 모집단 분포로 묶지 않는다.

30분 active의 마지막 주기 표본은 elapsed `1771055.149125 ms`, Lv.16/74처치/1442골드다. 최종 저장 요약은 Lv.17/76처치/1493골드이고 실제 종료 PNG도 Lv.17과 `REBIRTH READY`를 표시한다. `firstReadyElapsedMs`는 원본 그대로 null이며 자연 선택이 없으므로 `firstReincarnationElapsedMs`도 null이다. 이는 “종료까지 준비에 도달하지 못했다”는 뜻이 아니다. 마지막 약 29.122초 표본 공백과, 최종 flush 결과에 readiness helper를 다시 적용하지 않는 경로가 있다. 저장 IPC는 비동기 저장 파일을 읽고 PNG에는 정확한 캡처 시각이 없으므로 첫 준비의 정확한 엔진 발생 시각이나 엄밀한 발생 구간을 복원하지 않는다.

독립 [Critic의 완료 30분 표본 한계 기록](final-v070-native-readiness-sampling-critic.md)(SHA `abf20e185ae18a5fbc529dd95d7a7f984fbaa6b26701c6167a839fcf817f627f`)도 읽었다. 내 직접 PNG/원본 대조와 일치한다. 원본 null을 수정하거나 임의의 첫 준비 시간을 채우지 않았다. 180분 메뉴 직전 준비 관측과 선택 완료 연결은 해당 실행이 끝난 뒤 별도로 확인해야 한다.

아래 모든 링크는 이 문서가 있는 evidence 디렉터리 기준이다. 각 행의 PNG는 이번에 직접 본 자연 종료 화면이며, 기존 0분 preflight 이미지를 재사용하지 않았다.

| 실행 | 완료 원본 / 자연 종료 PNG | 원본 SHA-256 / PNG SHA-256 |
|---|---|---|
| 5-active | [JSON](native/5-active-1789243942697.json) · [PNG](native/5-active-1789243942697.json.screenshots/5m-active.png) | `583727d5ee2c0a0a7b1ef251c366263f742d10480297f8436815f97e480a27b4` / `6975d04ee207bccc3be78c1102004645a6fafc52ba4bb9caa56308e0c6e35210` |
| 5-idle | [JSON](native/5-idle-1789244275863.json) · [PNG](native/5-idle-1789244275863.json.screenshots/5m-idle.png) | `e105975c1235132af0d510923c94ed92eaaced3d4efae810e5e5f1a304ef6f7e` / `99ca72a6a3803c6173407f179ae620656bd2f5e5968e8d726fce5411d990da58` |
| 5-intermittent | [JSON](native/5-intermittent-1789244608843.json) · [PNG](native/5-intermittent-1789244608843.json.screenshots/5m-intermittent.png) | `981a7faf4b85e489fd1fe43ce50c2fbbc7c0f81e91f4672da5731b2f81b2aab2` / `35c2d143f7e3f226972981f7c50bcf4d2b8df443e57c2239f475fe281a34fe29` |
| 15-active | [JSON](native/15-active-1789244941459.json) · [PNG](native/15-active-1789244941459.json.screenshots/15m-active.png) | `681974110d069eb3275961efecded0ac86befc1bb33b992bf2c1ccd78da33310` / `fc44897da8d107e0b3a18c86bc711a9a02d5b73a38dce90311147ba01b632d24` |
| 15-idle | [JSON](native/15-idle-1789245874386.json) · [PNG](native/15-idle-1789245874386.json.screenshots/15m-idle.png) | `3f5258f11084076d6f421351e93da91370b43993332aa5823594f8b25ed4677a` / `159e851e2419df59940641d530d94a0dc563585d477f2af04c4157b0384d8756` |
| 15-intermittent | [JSON](native/15-intermittent-1789246809497.json) · [PNG](native/15-intermittent-1789246809497.json.screenshots/15m-intermittent.png) | `5aab665b3ec98a2f99f415e3f96edc86096b3f0b62337c82d934dffeb6cafc58` / `92205aacbf35b5aeb296735e188993f394d2e59cffd875be583399b7f9ff56cc` |
| 30-active | [JSON](native/30-active-1789247742628.json) · [PNG](native/30-active-1789247742628.json.screenshots/30m-active.png) | `ed375bb0a67d87818284082267b9071342c6082afd10727cf1a02470b80466ac` / `325ea63002b33c1a71c21c82991c522f001c2fe2325f65724aca83459028f17a` |
| 30-idle | [JSON](native/30-idle-1789249575720.json) · [PNG](native/30-idle-1789249575720.json.screenshots/30m-idle.png) | `3d629e47161c5a977ed859d1cbf8262b23b1df4c7619932e64a7c487c3f6b206` / `fa37da25a86d4ca4044a6bc1892d6f8df8cdde9f78c6a4f4a04dfc98037674bd` |
| 30-intermittent | [JSON](native/30-intermittent-1789251410873.json) · [PNG](native/30-intermittent-1789251410873.json.screenshots/30m-intermittent.png) | `658855dacf926eaa4b52be87885ec30843aa2dd2ec91f536f3aae89cf7270b3a` / `6ff0728097a71ecc66a3a8c56e1fb5e9a5cf973cc97e24f0d75d8311a6e5db28` |

이번 추가 관찰에서는 완료 원본의 진단 checks 통과 상태만 확인했으며, 후속 fixture PNG들을 새로 시각 검사했다고 주장하지 않는다. 각 종료 PNG는 runner가 자연 세션을 completed로 기록한 뒤, `loadFixture(DEFAULT_SAVE)` 전에 캡처한 것이다(`electron-e2e.cjs:229–239`). 자연 종료 화면 관찰은 h70 제시·획득, 도감·환생 확인·PvP의 후속 진단을 대체하지 않는다.

최종 180분 원본·전체 330분 matrix·실제 발급 audit prompt/template은 아직 이번 범위에 없다. 이 9개 화면으로 첫 성공 p50/90분 성공률, 12시간 콘텐츠 분포, 장기 재미, 실제 업무 방해, 전체 출시 AC를 판정하지 않는다. 사람 관찰이 없어 `humanChecks=PENDING`을 유지한다.
