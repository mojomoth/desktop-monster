# v0.9 — 캐릭터 위 글자 외곽선

2026-09-16 사용자 피드백에 따라 캐릭터 위 `LV`와 `REBIRTH READY`에도 우상단과 같은 1 게임 픽셀 외곽선을 적용했다.
문구·색·글자 크기·중심 위치·환생 준비 조건·경험치 바는 유지한다. 배경판을 추가하지 않는다.
기존 `drawOutlinedText` 호출 2개로 구현했다. 코어 20개 파일은 직전 검증본과 동일하다.

실행 기록: [새 세션](../../.agentdoc/v09-hero-outline-20260916T104525Z/).
기존 하네스의 실제 LV/READY 검사에 원본 글리프·외곽선의 픽셀 대조와 주변 투명도·XP 간격 확인을 추가했다.
이전 세션의 로그·이미지는 당시 소스에 대한 기록으로 보존한다.

- `npm test && npm run lint && npm run typecheck`: 73개 파일, 1,071개 테스트·lint·typecheck 통과.
- 타깃 HUD·렌더러 검사 107개 통과.
- macOS smoke 및 macOS·Windows 패키지 갱신.
- 실제 LV/READY 원본 잉크·외곽선의 불일치 0, 주변 투명도·XP 간격 검사 통과. 기존 카운터 10사례와 필수 5개 검사도 통과.
- Mac/Windows 각각 109개 제품 파일이 현재 컴파일 출력과 일치한다.
- 실제 화면·산출물·소스 해시는 세션의 `native/counter-ui.json`, `artifacts.json`, `journal.json`에 기록했다.

[밝은 배경](../../.agentdoc/v09-hero-outline-20260916T104525Z/native/field-light.png) ·
[어두운 배경](../../.agentdoc/v09-hero-outline-20260916T104525Z/native/field-dark.png)

개인 저장·실서비스·글로벌 후크를 사용하지 않는 격리 합성 세이브로 실제 Electron 화면을 검사한다.
Windows 실기기·Steam 및 공개 출시 검증은 이전과 같이 별도 대기다. 커밋·푸시·배포 없음(`DESMON_SKIP_NET=1`).
