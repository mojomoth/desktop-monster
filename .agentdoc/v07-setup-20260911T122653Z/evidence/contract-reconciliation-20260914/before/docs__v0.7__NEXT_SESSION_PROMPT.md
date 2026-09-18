DesMon v0.7의 운영 배포 후 남은 검증 계약과 인계를 마무리하라. 새 기능·밸런스 개발을 시작하지 마라.

저장소는 `/Users/jeongyounglee/work/repo/desktop-monster`, R은 `.agentdoc/v07-setup-20260911T122653Z`다. 먼저 `docs/v0.7/HANDOFF.md`, `ACCEPTANCE.md`, `LOOP.md`, `R/loop.json`과 HANDOFF가 가리키는 마지막 운영 세션을 읽어라. `AGENTS.md`, `.harness/v7/HARNESS.md`, `.harness/v7/config.json`, `docs/v0.7/DEVELOPMENT_PLAN.md`, `EVALUATION_PROTOCOL.json`을 따른다. LOOP의 일반 실행 예시와 DEVELOPMENT_PLAN의 과거 setup 설명을 재실행 지시로 해석하지 마라. 현재는 v7 Host 계약/release/제품0.7.0이며 CURRENT=v3는 보존한다.

사용자의 추가 요청으로 운영 정상화가 승인됐고 실제 배포를 완료했다. 원격 v3 commit은 `8f89f1ab1922cf5adb7171aa04d64b4eaa7a2803`, Render deploy는 `dep-daj7kjp5efls739fsiug`, live 완료는 2026-09-13T10:27:22.907611Z다. 로컬 HEAD/v3는 기존 `28270992518dc5bfc9c1f89f700c0491eaf8d1ed`에 있고 사용자 index/미커밋 변경을 보존한 채 origin/v3만 전진했다. 이 차이를 오류로 보고 pull/reset/checkout/rebase/merge/clean하거나 사용자 변경을 새 커밋에 쓸어 담지 마라. 재배포·재푸시도 하지 마라.

최신 capture/probe와 major 후속 기록(Host가 확정한 원본 경로·SHA·실행 범위):
- 최신 운영 세션: `R/sessions/V07-07-production-v070-HANDOFF.md`.
- 운영 근거 폴더 O: `R/evidence/production-v070-20260913`.
- `O/compatibility-after-deploy.json`: SHA256 `5e7eae8ac5544c419e5278ead20791f338c7b4f43f93643724683e7af82343b7`, 실제capture종료0/local121·35소스일치/livePASS.
- `O/live-probe/report.json`: SHA256 `d51451fea61eac6c3c1fadc9d6d2b9a953ff1c53ac2c4dc28a22401a3fcfdee4`, Host실행47검사·28HTTP PASS. Lv11/250/MAX_SAFE_INTEGER 지정상대 DB경유왕복, invalid7종 HTTP400후무손실. 양쪽 빈로스터 정리/재조회PASS, 계정행2개잔류. 두directory각50행 검증이나 합성행은 미노출. 전투/탈취/회수/서버재시작내구성은 이번실행범위밖이다.
- `O/supplemental-review.json`: SHA256 `7d2b9d19c20911062b12ac5611bcfa405903d1f5d0db34506376c188013e703f`, 실제Designer→Critic→Balance→Host가 C070운영원인을 확인범위해소로 판단. 새정식audit나옛major삭제가아니다.
- 현재 V07-07은 확정적으로 `running/unverified`. 등록server/review경로·과거exit1·정식audit major는 그대로이며, config/E와 제품S를 변경하지 않았다.

위 근거를 읽고 완료·실패·미확인을 구분하라. 배포 후 capture는 local121테스트,35파일 소스 대응,live 판정 성공으로 보고됐다. 실제 인증 API/DB probe가 무엇을 확인했는지는 위 최신 원본으로 판단하며 health200 또는 정적 대응만으로 확대하지 마라. 배포 전 compatibility 실패와 새 성공은 서로 다른 시점의 근거다.

제품 S=`84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`, 평가 E=`c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d`는 동결이다. Git 배포 SHA와 S는 다른 식별자다. 소스/static/21개 수치·6콘텐츠 조건을 유지하고, 하네스·프로토콜은 아래 등록 계약 연결에 꼭 필요한 변경만 영향 분석 후 다뤄라. 상태 문서 갱신으로 이전 AC의 owned-file hashes가 달라진 사실도 보존하고 과거 검증 레코드를 현재 문서 해시로 고치지 마라.

완료 근거는 HANDOFF에서 확인하고 중복 실행하지 마라: 최종 candidate100,9정책×100seed×12시간 release900,실제 Native330분3.023초(10원본/430검사/198PNG),955테스트+lint+typecheck,smoke,실제0.7 package/DMG,fun 설계검토와 별도4역할 결과 감사. 자연 관측과 이후 fixture 진단은 별개다. 기존 `R/reviews/final`은 audit_complete지만 서버 major를 담은 불변 감사이며 옛 review AC는 실패했다. 단순 재개·운영 배포 때문에 네 역할 감사나 장시간 측정/Native/패키지를 다시 시작하지 마라. 현재 프로세스와 endedAt/exit,`R/evidence/native/matrix-state.json`부터 확인하라. loop의 running은 저널 상태다. 과거 사용자 PID50718을 현재 PID라고 가정하거나 임의 종료하지 마라.

다음 작업은 새 운영 성공을 등록 AC/저널에 올바르게 연결하는 것이다. 현재 V07-07은 예전 server/review AC 경로와 불변 major 때문에 running/unverified다. 먼저 최신 loop와 운영 세션에서 실제 남은 계약을 확인하라. 기존 `R/evidence/server/compatibility.json`,실패 로그,`R/reviews/final`의 `C070-LIVE-SERVER-CONTRACT`를 덮어쓰거나 삭제해 PASS로 만들지 마라. 새 capture/probe·major 후속 해소 기록을 별도로 보존하고, 기존 도구가 어떤 경로를 요구하는지 읽어 새 등록 경로를 연결하는 최소안을 구체화하라.

Host가 config/loop/상태 문서의 단독 소유자다. 먼저 S/E 동결을 유지하며 연결 가능한지 확인하라. 평가 계약 변경이 불가피하면 원본 보존·소유권·변경 지문·영향받는 AC 및 새 검증 비용을 명시한 뒤 처리하라. 변경이 필요한 새 검증은 실행 전 정확히 등록하고 새 경로에 수행하며, 과거 성공을 새 E의 성공으로 재인증하지 마라. 같은 대상 소스에서 필요한 등록 AC와 canonical gates가 실제 성공하기 전에는 verified로 기록하지 마라. 이전 전체 검증을 관성적으로 반복하거나 불변 major를 우회하도록 검사기를 약화하지 마라. 남은 계약이 해결되지 않았다면 서버 운영 정상화와 V07-07 미완료를 함께 정확히 기록하라.

사람 관찰이 없으므로 humanChecks/humanFun은 PENDING이다. 서버 정상화는 클라이언트 출시·사람 재미 승인이 아니다. 후기 새 획득 공백과30-active endpoint READY/firstReady=null의 표본 한계도 그대로 남긴다. 수치의 전체/조건부 분모와 h70 자격·제시·실제선택 구분은 HANDOFF를 따른다. 검증seed1–100으로 튜닝하거나 탐색10001–10020과 섞지 마라.

사용자 save/auth·기존앱·DMG·v5 기록을 보존하라. 최초179경로 존재/36v5·CURRENT동일/시작 전체173개 연결은 기록 시점의 결과다. expedition/hero/heroMenuReadiness/ipc/menu/progressV6 여섯 테스트의 시작 전체 원본 위치는 미확인이다. 현재 파일 누락·사용자 변경 손실로 단정하지도,179개 모두 복구 가능으로 인증하지도 마라. 보존 근거는 HANDOFF에 연결돼 있다.

추가 역할이 필요하면 기본 모델·동시4슬롯,Host=Playtester와 실제 별도 Designer/Critic/Balance ID를 유지한다. 파일 소유권을 나누고 판단 순서는 Designer→Critic→Balance→Playtester이며 Critic은 구현하지 않는다. 완료된 감사 대신 아직 필요한 구체 작업만 배정하라. 실제 수행한 새 범위·시간·SHA·실패·미확인·다음 행동을 HANDOFF/ACCEPTANCE와 새 세션에 기록하고, 이전 성공은 원래 시점의 근거로 연결하라.
