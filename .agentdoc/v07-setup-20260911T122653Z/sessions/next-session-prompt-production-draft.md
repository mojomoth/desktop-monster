# 다음 세션 프롬프트 초안 — 운영 정상화 후 재개

Host 편집용 초안이다. 아래 `{{...}}`는 운영 작업이 끝난 뒤 실제 원본에서 채운다. 빈 자리를 성공으로 간주하지 않는다. 이 초안 작성자는 운영 배포를 실행하거나 그 결과를 검증하지 않았다.

## Host가 확정할 이번 운영 결과

- 최신 운영 종료 세션: `{{LATEST_PRODUCTION_SESSION_PATH}}`
- 완료 시각·실제 상태·미완료 행동: `{{PRODUCTION_COMPLETED_AT_AND_STATUS}}`
- 실제 커밋/푸시 범위·배포 branch/commit SHA·Render deploy ID: `{{ACTUAL_GIT_AND_DEPLOY_IDENTITIES}}`
- 실제 대상 서비스/URL·배포 후 health 보고 SHA: `{{PRODUCTION_SERVICE_URL_AND_HEALTH_SHA}}`
- 새 운영 소스 대응·고레벨/지정 상대 검증 근거 경로와 SHA: `{{NEW_LIVE_COMPATIBILITY_EVIDENCE_PATHS_AND_SHA256}}`
- 기존 major `C070-LIVE-SERVER-CONTRACT`의 후속 해소/미해소 근거: `{{SERVER_MAJOR_FOLLOWUP_PATH_AND_STATUS}}`
- 새 등록 AC가 있다면 ID/원본 로그/exit/소스·평가 지문, 현재 V07-07·review 상태: `{{NEW_AC_AND_LEDGER_STATUS}}`
- 아직 실행 중인 소유 프로세스가 있다면 PID/PGID·명령·로그·재개 방법, 없으면 확인 시각: `{{CURRENT_OWNED_PROCESS_STATE}}`

아래 문단부터 다음 세션에 전달한다.

---

DesMon v0.7의 운영 정상화 이후 작업을 이어 맡아라. 사용자는 기존 개발 완료 뒤 운영 서버를 정상 처리하고 다음 세션용 인계를 남기라고 추가 요청했다. 운영 정상화 범위의 승인은 이미 제공됐으며, 위 최신 운영 기록을 먼저 읽고 완료된 배포를 반복하지 마라. 이전 인계의 ‘커밋·푸시·배포 미실시/추가 승인 대기’는 2026-09-13T03:21–03:25Z 배포 전 종료 상태다. 이번에 실제 수행한 범위는 위 새 운영 세션으로 구분하며, 새 클라이언트 배포나 제품 변경까지 임의로 확대하지 마라.

저장소는 `/Users/jeongyounglee/work/repo/desktop-monster`, 실행 폴더 R은 `.agentdoc/v07-setup-20260911T122653Z`다. 먼저 아래를 순서대로 읽어 현재 상태와 실제 소유권을 복원하라.

1. `docs/v0.7/HANDOFF.md`, `docs/v0.7/ACCEPTANCE.md`, `docs/v0.7/LOOP.md`, `R/loop.json` 및 위 최신 운영 종료 세션.
2. 배포 전 불변 종료 기록 `R/sessions/V07-07-final-v070-PENDING.md`, `R/evidence/final-v070-closeout-host.json`, `R/sessions/development-working.md`의 마지막 완료 기록.
3. `AGENTS.md`, `.harness/v7/HARNESS.md`, `.harness/v7/config.json`, `docs/v0.7/DEVELOPMENT_PLAN.md`, `docs/v0.7/EVALUATION_PROTOCOL.json`, `docs/v0.7/DESIGN_DECISIONS.md`.
4. 기존 감사 `R/reviews/final/audit.json`·`report.md`와 위 새 운영 근거. 배포 전 실패 원본 `R/evidence/server/compatibility.json` 및 `compatibility-static-mapping.md`를 후속 성공 원본과 혼동하지 마라.

LOOP의 명령 예시는 일반 실행 계약이다. 이 초안이 읽은 LOOP 첫 문단에는 과거 setup/제품0.6.0 설명이 남아 있었다. 그것을 현재 상태로 삼거나 baseline/setup/phase 승급·fun init·audit init·Native run을 다시 실행하지 마라. 현재 기록은 release, package/lock/root package·tray0.7.0이다. v7 Host 실행 계약을 따르고 CURRENT=v3를 바꾸지 마라. v3 Ralph 그래픽 lane의 제한을 이 Host 세션에 잘못 적용하지 마라.

읽기부터 시작하라. `R/evidence/native/matrix-state.json`, 완료 execution의 endedAt/exit, 최신 운영 PID/PGID와 실제 프로세스를 비교한다. 과거 사용자 Electron PID50718/PGID50646은 그 시점의 관측일 뿐이므로 현재 생존을 추정하거나 해당 번호의 프로세스를 임의 종료하지 마라. `running`이라는 loop 작업 상태만으로 측정·Native가 실행 중이라고 판단하지 마라. 이전 실제 Native와 측정·패키지 실행은 모두 종료했다. 필요하면 읽기 전용 `node .harness/v7/loop/develop.mjs status R`와 `node .harness/v7/loop/e2e-matrix.mjs status R/evidence/native`에서 R을 실제 경로로 바꾸어 확인하라. 새 실행 전에 기존 소유 프로세스와 완료 원본부터 확인하고 중복 시작을 막아라.

제품·평가기는 아래 지문으로 동결돼 있다. 운영 Git commit SHA는 파일 집합 지문 S와 다른 식별자다. 배포 commit의 대응 소스가 무엇인지 새 운영 근거로 연결하되 S/E와 Git SHA가 같은 문자열이어야 한다고 요구하지 마라.

- S = `84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`
- E = `c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d`

소스·static·하네스·프로토콜·등록 수치/콘텐츠를 현 단계에서 수정하지 마라. 동일 S/E의 완료 작업을 재실행하거나 과거 결과의 날짜·해시를 바꾸어 새 성공으로 인증하지 마라. Host가 문서만 갱신하면 일부 과거 V07-07 AC의 owned-file hashes와 현재 상태 문서가 달라진다. 이 차이를 숨기거나 기존 AC 레코드를 고치지 마라. 소스 결함이 새로 발견된 경우에는 정확한 원인·영향·파일 소유권과 필요한 새 검증 범위를 먼저 구체화하고, 그때 승인된 변경에 필요한 검증만 새 원본으로 수행한다.

이미 완료된 아래 작업은 운영 증거 보완을 이유로 반복하지 마라.

- V07-01–06: 최종0.7의 등록 AC 및 같은 대상 소스 canonical gates 후 verified. 세션은 `R/sessions/V07-01-final-v070.md`부터 `V07-06-final-v070.md`까지다. H07-01 setup은 historical verified다.
- 최종 candidate100과 별도 release900: `R/evidence/candidate-final-v070.json`, `R/evidence/release.json`, `R/evidence/measurement-release-v070/execution.json`. release는9정책 각각 seed1–100×12시간이다. 완료900원본과 독립 분석은 `R/evidence/release-v070-analysis/`에 있다. 실제 엔진 시뮬레이션이며 사람의 실제12시간 플레이로 표현하지 마라.
- 실제 Native330분3.023초: `R/evidence/native/matrix.json`, SHA `45af28ccfa167f889b415ca187c5d9cf2d8179ef4d1cea5a5bf1c91785263c5c`. 5/15/30분×active/idle/intermittent9개와 별도연속180-active,10원본·430검사·198 PNG 완료. 자연 관측은 격리save/합성입력·무가속이며 후속 fixture 진단 시간을 포함하지 않는다. 긴 경로는 실제10분 메뉴18회/환생14회, 종료Lv1/13077킬/총동료30/영웅14종이다. 화면 파티5명과 총명단을 구분한다. 30-active의 endpoint Lv17/READY와 주기 firstReady=null은 정확 최초시각 미확인으로 보존한다.
- 정확한 `npm test && npm run lint && npm run typecheck`: 955테스트·lint·typecheck 완료. 최종 원본 `R/evidence/V07-07-1789265033343.log`는 2026-09-13T02:04:05.595Z 종료0이다. 같은 소스의 전체 gates를 재개 첫 단계로 자동 반복하지 마라.
- 실제 smoke, package10검사, DMG5검사 완료: `R/evidence/package/package.json`, `R/evidence/distribution/dmg.json`. DMG SHA `6b1b14b3f86f507116c99872b8d1538b2cf91ba8376d952cc10498175c167cbe`. 현재 mutable `release/mac-arm64/DesMon.app`를 예전0.6 앱으로 오인하거나 기존 아티팩트를 덮어쓰며 다시 패키징하지 마라.
- 최종 설계 fun: `R/reviews/design-final-v070/`. 별도 결과 audit: `R/reviews/final/`, 실제 Designer→Critic→Balance→Host 네 ID로 audit_complete. 완료된 네 역할 감사를 단순 재개·운영 배포 때문에 다시 시작하지 마라. 원래 감사는1 major/2 minor와 등록review exit1을 포함한다.

현재 수치는 유지한다. 채택 ID는 `candidate-r8-tail10450`, 정확21키와6콘텐츠 조건은 동결 프로토콜이 기준이다. 최종 release 기준 active/free/uniform/관리없음/즉시선택100개의 첫 성공 전체p50=2736.6초(45.61분),90분내100/100이다. h70 자격은50/100 도달·50미도달, 전체lower p50=40596초(11시간16분36초), 조건부p50=20933.6초, 제시50/실제선택0이다. 전체p90/최악null을 숨기지 마라. 자연180분은 h70의30000킬에 이르지 않았으며 실제 세 번째 선택은 post-natural fixture에서 확인했다. 탐색10001–10020과 검증1–100을 섞거나 검증값으로 추가 튜닝하지 마라. 기존120초휴식·30초미루기와 무료 정책을 유지하고 강제 시간 제한을 추가하지 마라.

남은 일은 위 최신 운영 결과에 따라 결정한다. 배포 전 major `C070-LIVE-SERVER-CONTRACT`는 health 보고 구SHA `28270992518dc5bfc9c1f89f700c0491eaf8d1ed`의 Lv10 상한·목록route 부재·지정ID 무시와 운영 고레벨 증거 공백이었다. 기존 capture는 local121테스트 성공/livePENDING/exit1이며35파일 정적 대조13일치/17불일치/5경로없음이다. 이를 새 배포의 현재 상태라고 반복하지 마라. 새 실제 배포ID·health SHA·정확한 파일 대응과 완료된 고레벨/지정ID 검증이 무엇을 입증하는지 확인하고, 정적 대응·실제 인증 HTTP/DB 왕복·실행 코드 attestation의 범위를 각각 적어라. health200만으로 모든 호환을 선언하거나 이미 완료한 운영 시험을 다시 수행하지 마라. 새 근거가 불완전하면 남은 해당 확인만 사용자 승인 범위에서 수행한다.

원래 `reviews/final`의 major/판정·`compatibility.json`·실패 로그는 불변이다. 새 운영 성공은 새 경로의 후속 근거로 연결하며 과거 major를 삭제하거나 PASS로 바꾸지 마라. 기존 audit verify가 불변 major 때문에 실패하는 사실과 이후 운영에서 그 논점을 해소한 사실을 병기한다. Host가 남긴 새 등록AC/저널 상태를 그대로 따르며, 기존 검사기를 약화하거나 미충족·stale owned-file 근거로 V07-07을 verified 처리하지 마라. 운영 정상화·감사 완료·등록 release AC 충족·클라이언트 출시·사람 재미는 서로 다른 상태다.

`humanChecks=PENDING`과 `humanFun=PENDING`은 실제 참가자 관찰 전까지 유지한다. 실제 글로벌 입력 권한/OS 알림, 선택 이해, 업무 방해, 후기 새 획득 공백에 관한 사람 관찰은 합성 Native·시뮬레이션·로컬 네트워크로 대신하지 않는다. 두 minor `D070-LATE-COLLECTION-GAP`과 `D070-ENDPOINT-READINESS-SAMPLING`도 새 증거 없이 해소됐다고 쓰지 마라.

사용자 변경·v5·CURRENT=v3·개인save/auth·기존 앱/DMG를 보존한다. 최초179경로 모두 존재,137현재동일/42개발변경, v5/CURRENT36동일, 시작 전체 바이트173/179 연결은 각 기록 시점의 결과다. tests/expedition.test.ts, hero.test.ts, heroMenuReadiness.test.ts, ipc.test.ts, menu.test.ts, progressV6.test.ts 여섯 시작 전체 원본은 검사한 보관물/Git에서 미확인이다. 현재 파일 누락이나 사용자 변경 손실로 단정하지도,179개 모두 복구 가능으로 인증하지도 마라. 근거는 `R/evidence/final-v070-preservation-balance.md`, `final-v070-preservation-balance-amendment.md`, `final-v070-preservation-git-designer.json`·`.md`다. 이 한계를 지우거나 불필요한 복구·전체 디스크 탐색을 시작하지 마라.

후속 역할 작업이 필요하면 기본 모델·동시4슬롯 안에서 Host가 Playtester를 겸하고 Designer/Critic/Balance는 실제 별도 ID를 사용한다. 같은 파일 구현은 소유권을 나누고 판단 순서는 Designer→Critic→Balance→Playtester다. Critic은 구현하지 않는다. 완료된 검토를 다시 만드는 대신 아직 필요한 구체 작업만 배정한다.

이번 재개에서는 최신 운영 근거로 남은 작업을 정확히 판별한 뒤 `HANDOFF.md`·`ACCEPTANCE.md`와 새 종료 세션에 실제 수행 범위/시각/SHA/실패/미확인/다음 행동을 기록하라. 변경하지 않은 이전 성공은 과거 완료 근거로 연결한다. 새 사용자 요청이 없는 경우 게임 밸런스·기능 확장·재측정·새 앱 배포로 작업을 넓히지 마라.
