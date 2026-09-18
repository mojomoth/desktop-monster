# iter-02 最종 소스 동결과 검증

개발 실험 experiments-development.json exit0, 실제574.807초. 10800 capture observations/3600 trajectories, fever200, freshIdle300. numericCriteriaPass=false/increasedSoulDelaySeeds300 → 계획의 사전조건에 따라 보류07/08 제외 결정을 내림. 정식 저널 excluded는 최신06 검사 성공 후 기록. 문서출처를 개발/최종측정으로 구분하고 최종0.6소스에서 실험을 반복한다.

통합1 declaration mismatch 원인: 글로벌 타입은 `saveState(s:...)` 메서드 문법이어서 구현자의 `saveState:` 프로퍼티 치환이 매치되지 않았음. global.d.ts에 boolean 반환과 onSaveFailed를 실제 선언. 기존 method-list 테스트 유지. 같은 시점에 package/lock 버전0.6.0 고정, README artifact 경로와 기능/제외 안내 반영.

최종지문: f91969484ea06a3f6526e1faae921d0508e8cad70b9d46bea38317ef4f5fca95.
평가도구/프로토콜: d402273c4cae0e9d597a4efe3a5648ac56cc2ad4c121e5c483b71f7710797de8.
전체대상 manifest: evidence/final-freeze.json. 이 이후 source/static/tests/harness/protocol/package/lock 수정 금지. 문서와 결과만 갱신한다.

실행중 세션: gates62043 (develop check V06-01, 정확한 게이트), final experiments+canonical measure2884 (exp완료시 --policies100seeds 측정 자동이어감), native matrix75134. matrix 상태/프로세스그룹/로그는 evidence/final-matrix/matrix-state.json. 같은 데스크탑에서 순차9조합, 이 실행 중 다른 Electron/패키지검사 실행 금지. 약60초내 갱신을 유지한다. package는09최종검증뒤 같은버전으로 빌드한다.

V06-09의 최종버전 동결·실행 준비를 통합검증과 묶어 선행 수행한다. 초기07/08제외 결정은 실제 개발실험에서 나왔으며, 최신06증거완료 후 정식 작업상태를 순서대로 verified/excluded로 확정한다. 초기0.5측정을 최종0.6검증으로 세지 않는다.

07:07UTC gate2 exit1: 776중774pass, src/main/tray.ts TRAY_TITLE0.5상수와 tests/packaging.test.ts 명시0.5기대가 새버전과 불일치. 고정0.6요구에 맞춰 양쪽0.6으로 갱신(버전/lock일치검사는 그대로 강화 유지). 이전 final-matrix는5active약120초에서 의도적으로 중단하고 실패/중단 로그와 manifest 보존; 최종시간으로 세지 않음. 실험1차최종시도도 종료143, experiments-stale-01.log로 보존. 모든 해당process 종료 확인. optional old unit balance report의 version0.5메타데이터는 기존 v0.5시나리오로 유지하며 최종canonical은 별도CLI를 사용.

새 최종 Native 경로는 evidence/final-matrix-02. 소스/평가file hashes는 새 final-freeze.json. 게이트 성공을 확인한 뒤 같은원본으로측정/9actual을 재개. 두차례 source freeze 전후 문서버전변경을 혼동하지 않음.
