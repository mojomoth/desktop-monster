# v0.9 실행 인계

실행 폴더: `.agentdoc/v09-20260915T084032Z`.
제품 소스는 최종 설치본 ASAR `3692e162a73de3df7e596ee0756277dfe3496b26edd1591f6e1ce994ad00f044`로 고정됐다.
개인 설치 앱을 교체하지 않고 DMG를 별도 디렉터리에 설치했다. git 커밋·푸시·운영 배포는 하지 않았다.

## 기록

- Designer `/root/designer`: HUD·효과·PNG, 실제 이미지 검수.
- Critic `/root/critic`: 독립 실패 검토와 메뉴 회귀, `reviews/critic-implementation-01..05.md`, 최종 증거·성능 검증기 감사.
- Balance `/root/balance`: 서버·코어, 200개 결정적 비교, 실제 설치 앱 E2E.
- Host `/root`: 하네스·IPC·원자적 복구·플랫폼·격리 PostgreSQL·최종 Playtester.

`preservation/manifest.json`과 초기 git 상태가 시작 원본을 보존한다.
원본의 v0.8 미완료 성능·사람 검증을 완료로 바꾸지 않는다.
실패 시도 로그와 native-01/02/03은 최종 native-05와 함께 보존했다.

## 성능 결과

`performance-01`은 A→B 응답 일치 오류를 발견해 30분 이전에 중단했다. 원본을 보존했으며 통과로 계산하지 않는다.
`performance-02`의 실제 시간 5시간 순차 관측과 비교가 통과했다.
기준 active/idle 각30분, 후보 active/idle 각30분, 후보 mixed180분.
30분/180분 창·예산은 `EVALUATION_PROTOCOL.json`에 고정했고 짧은 진단은 대체하지 않는다.
관측 중 제품 소스·패키지를 고정하고 부하가 큰 빌드·테스트를 실행하지 않았다.
`caffeinate -i`는 관측 프로세스 수명 동안만 시스템 잠자기를 방지했다.
활성/대기 CPU·메모리는 모두 기존 한도 이내이며, 혼합 메모리 중앙값은
초기 229.016 → 최종 208.672 MiB (한도 279.016 MiB)다.
초기 저장과 최종 메뉴 캡처 중 입력 집계에 대한 검증기 교정 기록을 ACCEPTANCE에 연결했다.
원래 큐의 비교 실패와 원시 기록은 보존했고, 교정 후 `comparison.json`을 재검증했다.

```sh
node .harness/v9/performance-report.mjs verify .agentdoc/v09-20260915T084032Z/performance-02/comparison.json
node .harness/v9/runtime.mjs verify .agentdoc/v09-20260915T084032Z/native-05/native.json
node .harness/v9/visual.mjs verify .agentdoc/v09-20260915T084032Z/visual-02/visual.json
node .harness/v9/regression.mjs verify .agentdoc/v09-20260915T084032Z/core-regression-2.json
```

## 완료 기록과 남은 검증

`v9-journal.json`은 최종 소스의 등록 AC·정확한 게이트·의존 순서 검증을 기록한다.
`final-evidence.json`은 native/visual/core/PostgreSQL/performance와 최종 배포 해시를 추가로 연결한다.
`artifacts-verified.json`에는 최종 DMG·Windows 설치본/실행 파일/게임 ASAR·검증 설치본 해시가 있다.
저널 verified만으로 개별 실험이 실행됐다고 해석하지 않는다. 기존 실패 기록은 삭제하지 않는다.
Windows 실기기/CI, 실제 Steam AppID·설치, 운영 DB 배포와 사람 관찰은 외부 PENDING이다.
구현과 자동 검증은 완료하되 외부 검증 전까지 공개 출시는 보류한다.
