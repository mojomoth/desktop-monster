# iter-01 기준선·프로토콜·실행기

2026-09-10T06:32:53Z 시작. START_PROMPT 전체, AGENTS, 개발 계획/프로토콜/skill, v5 AUDIT/HARNESS, 과거 report/VALIDATION을 읽음. v3 lane 제한은 호스트 실행에 적용하지 않는다. commit/push/merge/deploy/실제 PvP 금지.

원본 소스 지문 6b1f37f7491ebb6af84d27a6054c41bf036b66a22eb2dd1dd96dff2b6bd210fb. 0.5.0. macOS 26.2 arm64, Node20.12.2, 설치된 npm/Electron/Vitest 사용. git status 다수 기존 수정/미추적 확인; snapshot archive/files manifest 보관. graphify query로 방향 확인.

실행: `npm test && npm run lint && npm run typecheck` exit0 (49파일/744개, 73.84초 + lint/typecheck), `fun.mjs selftest` exit0 (3파일/17개), 로그 baseline/gates.log,harness.log. source game 변경 전에 실행 완료. Balance가 baseline build exit0 후 실제 엔진으로 fixture를 생성하고 protocol v2 조건/해시를 고정, baseline/fixtures에 보존. 이후 V06-02/03/05 구현 병렬 시작.

실제 역할 ID: Designer /root/designer, Critic /root/critic, Balance /root/balance, Playtester /root. 현재 독립 읽기/구현 검토; 최종 audit 발급 전 판단은 최종 감사로 세지 않음.

발견: HUD 고정 Lv12 분모; SAVE_STATE 디스크 실패를 성공처럼 방송하는 경로. 각각 02/03에서 수정. 호스트는 develop.mjs 저널+상태 회귀, matrix와 v06 codex UI 준비. 완료 상태는 아직 부여하지 않음.

V06-02 관련 44개, V06-03 관련 128개, V06-05 관련 53개 테스트를 각 담당자가 통과하고 core 소유권 동결. host V06-04 UI는 저장 API 확정 후 같은 통합 iteration에서 연결 중(03 verified 전에는 완료 상태 부여하지 않음). GUI saved failure 메시지를 상단 sticky/aria-live로 수정하고 최대 환생 목표 문구를 정직하게 보완.

개발 quick-01 Native 0분은 34개 기능 검사 모두 성공. `e2e.mjs` 전체 종료1: 동시 하네스 구현으로 evaluationDigest 변경을 탐지했으므로 정당하게 stale. 원본/스크린샷/launcher failure.txt 보존. 새 journey는 legacy full roster 보존, 일부ID ack·stale replay, goal eligible/unseen·change/clear, 실제5초 focus/scroll, tmp쓰기 실패와 retry, restart, +0 training/중복token 확인. 실제 장시간 근거로 사용하지 않음.

host 관련 검사 도중 신규 테스트의 engine API명을 잘못 사용(action/collectionAction)해 두 번 실패했다. 실제 engine.apply로 수정 후 menu40개 통과. heroCanvas 허용값64/96에48을 넣은 typecheck 실패는 preview64로 수정. 기존 테스트를 삭제/약화하지 않았음.

Critic 하네스 검토에서 eval 지문/조건부 제외 stale/디렉터리 소유권/프로세스 그룹 재개 누락을 찾아 보완 담당 배정. Designer는 패키지 실제 executable inspector 검증 실행기를 별도 구현 중. Balance는 production engine 단일 branch 계측과 no-op 동등성을 검사하는 실험 실행기 구현 중. 최종소스 동결 전에 하네스도 끝낸다.

15:54 KST 하네스7파일52개 selftest 종료0. 초기 develop/matrix source snapshot이 .agentdoc 아래 .mjs라 ESLint 대상이 된 실패를 보존성 있게 .txt suffix로 옮겨 해결; lint strict/ignore를 변경하지 않음. 이후 lint/typecheck exit0.

최종 소유자 구현 중단 확인 후 통합1 시작: gates session99227, experiments-development session98244, quick03 session41387. 소스/평가/작업별 소유 manifest 시작기록 evidence/integration-01-start.json. 전체 실험은 v0.5 코드버전의 개발 측정이며 최종0.6 지문 측정은 V06-09에서 별도로 반복. Native quick02는35개 검사를 통과했지만 도구 변경을 탐지해 stale; quick03은 동결 후 재실행.

패키지 실행기 개발관측: 기존0.4 app probe와 임시 개발app0.5의 기능9개가 통과. 첫 임시복사의 framework symlink 변환 오류를 수정; macOS /var canonical 경로 비교 수정. package-development03은 의도된 version0.5≠0.6 검사만 실패이며 errors0. quick02와 잠깐 겹친 가능성이 있어 최종 Native 근거로 사용하지 않음. 실제 릴리스 패키지는 앞으로 V06-10에서 검증.

integration gate1 exit1: tests/renderer.test.ts의 preload/renderer 선언 일치 검사에서 onSaveFailed 미선언. 52파일 중51,776검사 중775통과. 런타임은 정상이며 global.d.ts 선언2줄 수정 필요. 실험 지문 보존을 위해 실행 끝난 뒤 수정하기로 결정(실험 진행을 다른 소스와 섞지 않음). quick03은 launcher도 exit0,35개Native검사 전부통과. 현재 실제0분 진단까지 통과했으며 9개 장시간은 미실행.
