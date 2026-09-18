# v0.9 — PvP 버튼 응답 표시 수정

전투 실패·결과 안내가 긴 상대 목록 아래의 공통 결과 영역에만 나타나 버튼이 무반응처럼 보이는 문제를 재현했다. 목록 갱신·다른 전투 처리 중에는 카드가 클릭을 차단하면서도 `전투`라는 문구를 유지했다.

## 변경

- 클릭한 상대 카드에 준비 중·오류·승패 결과를 표시한다. 자동 저장·목록 재정렬 후에도 상대 ID에 맞춰 유지한다.
- 목록 갱신·다른 전투 진행·쿨다운을 버튼 문구와 접근성 이름에 표시한다.
- 해당 버튼에 포커스가 남아 있으면 새 안내가 보일 만큼만 스크롤한다. 화면 끝에서 8px 여유를 두고 포커스는 유지한다. 다른 탭으로 이동했거나 같은 안내를 다시 그릴 때는 스크롤하지 않는다.
- 전투 요청·전적·보상·중복 방지 처리와 서버 코드는 변경하지 않았다.

## 검증

실행 기록: [.agentdoc/v09-pvp-feedback-20260916T131757Z](../../.agentdoc/v09-pvp-feedback-20260916T131757Z/).

- `npm test && npm run lint && npm run typecheck`: 73개 파일, 1,080개 테스트 및 lint·typecheck 통과 (`gates-release.log`).
- 실제 macOS 패키지: 진행/실패/승패의 가시성, 포커스 유지, 실패 시 전투 미전송, 재시도 후 1회 영속 저장, 중복 클릭 방지, 갱신 중 문구 등 8개 검사 통과 (`native-release/pvp-feedback.json`).
- `npm run smoke`, `npm run package`, `npm run package:win`으로 실행 검사 및 설치본 갱신. Windows 실제 실행은 별도 대기다.
- Balance가 직전 검증본과 core/main/server/shared/preload 47개 파일의 해시 일치를 확인했다. 이번 UI 수정으로 별도 코어 측정은 반복하지 않았다.

격리된 합성 계정 2개와 표시 전용 목록 항목 5개를 사용했다. 실패는 격리 HTTP 경계에서 주입하고, 재시도는 실제 생산 코드의 서버·IPC·저장 경로로 처리했다. 개인 저장·인증·운영 PvP는 사용하지 않았다. 사용자 계정에서 발생한 서버 오류의 종류를 특정한 검증은 아니다. `DESMON_SKIP_NET=1`이며 서버 배포·Windows 실기기·Steam 검증은 기존 대기 상태다.

[수정 전](../../.agentdoc/v09-pvp-feedback-20260916T131757Z/before-long-list/failure.png) ·
[하단 버튼 실패 안내](../../.agentdoc/v09-pvp-feedback-20260916T131757Z/native-release/failure.png) ·
[재시도 성공](../../.agentdoc/v09-pvp-feedback-20260916T131757Z/native-release/success.png)

초기 실패와 중간 검증 기록은 보존했다. `edge-before`의 준비 문구 검사 오류는 하네스의 잘못된 문자열 기대값을 바로잡았고, `edge-bottom` 및 `native-final`에서 발견된 가시성 실패는 실제 스크롤과 화면 끝 여백을 보강해 해결했다. 최종 근거는 `*-release.log`와 `native-release/`다.
