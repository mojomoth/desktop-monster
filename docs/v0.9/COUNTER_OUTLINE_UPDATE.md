# v0.9 후속 수정 — 우상단 숫자와 외곽선

2026-09-16 사용자 화면 피드백 반영. 이전 [환생 휴식 제거 기록](NO_REST_UPDATE.md)은 당시 소스의 검증 기록으로 유지한다.

## 변경

- 우상단 처치 수·골드 글자와 아이콘을 2배에서 기본 픽셀 크기로 줄인다. 기본 400×260 창에서 글자 본체 높이는 20px에서 10px로 줄며, 외곽선 포함 14px이다.
- 두 줄 전체를 덮던 검은 사각 패널을 제거한다. 숫자와 아이콘에만 1 게임 픽셀(화면 2px) 어두운 외곽선을 그린다.
- 상단 위치는 유지하고 행간을 14→10 게임 픽셀로 줄인다. 오른쪽 정렬·큰 수 축약·획득 시 흰색 점멸과 동전 상승은 유지한다.
- 동전 수집 효과의 도착 높이도 줄어든 아이콘 중앙에 맞춘다.
- 기존 피해 숫자·FEVER의 외곽선 함수를 재사용한다. 두 효과의 그리기 순서와 픽셀은 유지한다.

제품 변경은 `src/renderer/hud.ts`, `src/renderer/game.ts` 두 파일이다. 코어 20개 파일은 직전 실제 앱 검증의 SHA-256과 모두 일치한다.
게임 수치·저장·환생/보류 로직에 변경이 없어 200-seed 코어 측정은 다시 실행하지 않는다.

## 검증

별도 세션: [v09-counter-outline](../../.agentdoc/v09-counter-outline-20260916T102446Z/).
변경 전 관련 소스와 macOS·Windows 설치본, 첫 시도의 구 2배 기대값 실패 로그를 보존했다.
기존 HUD 테스트를 새 크기·투명 간격·글리프/외곽선·긴 수·획득 점멸 조건으로 갱신했다. 무관한 테스트는 제거하거나 완화하지 않았다.

- Host `/root`: 제품·테스트·통합·패키지·저널.
- Designer `/root/designer`: 읽기 전용 설계 검토, 신규 `counter-ui.mjs`와 실제 화면 검수.
- Critic `/root/critic`: 보존본 대비 diff 및 증거 독립 검토.
- Balance `/root/balance`: 기존 코어 20개 파일의 해시 일치 확인.

자동 검증 완료:

- 정확한 `npm test && npm run lint && npm run typecheck`: 73개 파일, 1,071개 테스트·lint·typecheck 통과.
- HUD·기존 렌더러 타깃 107개 테스트 통과.
- 실제 패키지의 필드·밝은/어두운 배경·크기/투명도·표본 10개·상태 보존을 검사한 필수 5개 검사 통과.
- macOS smoke·패키지와 Windows NSIS/unpacked 갱신. 두 패키지 각각 109개 제품 파일이 현재 컴파일 출력과 일치.

자동 검사·화면·설치본 해시는 세션의 `journal.json`, `gates.json`, `artifacts.json`, `native/counter-ui.json`에 기록한다.
[밝은 배경의 실제 필드](../../.agentdoc/v09-counter-outline-20260916T102446Z/native/field-light.png),
[어두운 배경의 실제 필드](../../.agentdoc/v09-counter-outline-20260916T102446Z/native/field-dark.png)를 확인할 수 있다.
밝고 어두운 배경은 격리 앱의 검사용 배경이다. 별도 숫자 표본은 실제 Electron에서 제품 `drawCounters`를 호출한 합성 표본으로, 실제 전투 프레임과 구분한다.

macOS·Windows 설치본을 갱신했다. 실제 Windows·Steam 및 공개 출시 검증은 기존 대기 상태다.
개인 저장·운영 네트워크·글로벌 입력 후크·커밋·푸시·배포는 사용하지 않는다(`DESMON_SKIP_NET=1`).
