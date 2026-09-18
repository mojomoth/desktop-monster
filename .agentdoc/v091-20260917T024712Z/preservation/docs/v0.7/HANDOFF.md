# DesMon v0.7 인계

갱신: 2026-09-14. **운영 서버의 새 capture를 현재 검사기로 재확인했다(종료0). 등록 계약 분석은 완료했으나, S/E 동결 상태에서 정식 V07-07 완료 경로가 없어 running/unverified를 유지한다.** `humanChecks/humanFun=PENDING`. 9월13일의 승인된 운영 배포는 완료됐으며 이번 세션에서 재배포·푸시·클라이언트 출시는 하지 않았다.

최신 세션은 [계약 연결 검토 인계](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-07-contract-reconciliation-HANDOFF.md)다. [구체 연결안·변경 영향·비용](../../.agentdoc/v07-setup-20260911T122653Z/evidence/contract-reconciliation-20260914/CONTRACT_ANALYSIS.md)과 [실행 결과](../../.agentdoc/v07-setup-20260911T122653Z/evidence/contract-reconciliation-20260914/execution-summary.json)를 먼저 읽는다. 단순 경로 교체 조사나 완료된 전체 검증을 반복하지 않는다.

이번에는 기존7개 AC 로그와 등록 manifest의1,040개 항목, 운영3원본 SHA 및35개 배포 소스 대응을 확인했다. 04:09:18.840444–04:09:19.915044Z의 기존 server verifier는 새 capture의 소스/빌드/기존121테스트 로그와 **새 health GET 1회**의 `8f89f1a` 유지를 확인해 종료0이었다. 인증 API/DB의47검사·28HTTP는 아래 **9월13일 원본**이며 이번에 재실행하지 않았다. 실제 별도 Designer→Critic→Balance→Host는 계약 연결안만 검토했다.

등록 경로만 바꾸어도 전체 하네스 E가 달라져 기존 측정·Native·설계가 stale가 된다. 원감사 major의 후속 해소를 받는 규격도 없다. 또한 과거7개 AC의 HANDOFF/ACCEPTANCE owned hashes가 전부 현재와 다르므로 server/review만 새로 성공해도 verified가 되지 않는다. 기존 함수를 사용한 진단은 다섯 거절 조건을 실제 확인했다. [미적용 경로 변경안](../../.agentdoc/v07-setup-20260911T122653Z/evidence/contract-reconciliation-20260914/server-path-only.config.proposed.json)의 가상 E는 `451a3d56f4ea1971c2129014de4f49e50c64d720beb0126b881ca0c13ec26408`이며 활성화하지 않았다. S/E·config·프로토콜·원감사·기존 check는 보존했고 운영 후속 근거는 AC 통과가 아닌 저널 메타데이터로 연결한다.

실행 폴더는 `.agentdoc/v07-setup-20260911T122653Z`이며 [loop.json](../../.agentdoc/v07-setup-20260911T122653Z/loop.json)은 **release / H07-01 historical verified / V07-01–06 final0.7 verified / V07-07 running·unverified**다. 이번 운영 성공은 별도 후속 기록으로 연결하고 기존 server/review 종료1·major·검증 이력을 보존했다. running은 저널 상태이며 측정·Native·패키지 및 이번 운영 실행은 종료했다.

재개 시 이 문서, [LOOP](LOOP.md), loop.json과 [마지막 운영 세션](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-07-production-v070-HANDOFF.md)을 먼저 읽는다. 다음 세션에 전달할 [실행 프롬프트](NEXT_SESSION_PROMPT.md)를 만들었다. 실제 PID/PGID와 matrix-state.json을 확인하고 완료된 실행을 중복 시작하지 않는다. 기존 하네스를 재생성하거나 candidate로 다시 승급하지 않는다. v7 Host 계약을 따르며 AGENTS.md, `.harness/v7/HARNESS.md`, config.json, DEVELOPMENT_PLAN.md, EVALUATION_PROTOCOL.json을 읽는다.

최종 제품 지문: `84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`. 평가 지문: `c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d`. Package/lock/root package와 트레이는 **0.7.0**이다. 버전 고정 후 실제 최종100 seed와900 seed·330분 관측·게이트를 새로 실행했다. 현재 상태 문서 갱신을 이전 AC의 동일 소유 파일 지문으로 재인증하지 않는다.

| 완료 범위 | 연결된 실제 근거 |
| --- | --- |
| V07-01–06 구현·등록 AC·각 gates | [V01](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-01-final-v070.md), [V02](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-02-final-v070.md), [V03](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-03-final-v070.md), [V04](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-04-final-v070.md), [V05](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-05-final-v070.md), [V06](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-06-final-v070.md) |
| 최종 설계 검토 | [fun 세션](../../.agentdoc/v07-setup-20260911T122653Z/reviews/design-final-v070/session.json). 실제 Designer→Critic 반려→수정/refresh→Designer→Critic→Balance→Host, 최종 4역할 완료 |
| 별도 결과 감사 | [audit 보고서](../../.agentdoc/v07-setup-20260911T122653Z/reviews/final/report.md), `audit_complete`, 등록 review AC FAIL; 0 blocker / 1 major / 2 minor. 출시/사람 재미를 승인하는 상태가 아님 |
| 제품 최종 검증 당시 canonical gates | [955테스트·lint·typecheck 원본](../../.agentdoc/v07-setup-20260911T122653Z/evidence/V07-07-1789265033343.log), 2026-09-13T02:04:05.595Z 종료0 |
| 실제 smoke | [SMOKE_OK 원본](../../.agentdoc/v07-setup-20260911T122653Z/evidence/V07-07-1789264482303.log), 종료0; Chromium audio 경고 보존 |
| 실제 package·배포 파일 검사 | [package10 PASS](../../.agentdoc/v07-setup-20260911T122653Z/evidence/package/package.json), [DMG5 PASS](../../.agentdoc/v07-setup-20260911T122653Z/evidence/distribution/dmg.json), [실제 DMG](../../release/DesMon-0.7.0-arm64.dmg) |

구현은 동료 레벨 상한을 저장·서버·응답 전 경로에서 제거하고 안전 정수·overflow 무손실을 지킨다. Lv10 이상 동료 환생의 Lv1/별+1·힘 감소를 확인 전 표시하며 대상 변경을 무효화한다. 도감은 실제 영웅 선택/종별 처치를 공유 판정으로 사용하고 레거시·알림/ACK/목표까지 일치시켰다. PvP는 50행의 영웅·동료 파티, 지정 ID 대조, 키보드 선택·안정된 포커스·오래된 미리보기 차단을 확인했다. 진행은 실제 자격 export/준비 판정과 기존 제안 문턱 보존을 적용했다. 세부 AC 범위와 진단 한계는 [ACCEPTANCE](ACCEPTANCE.md)에 있다.

최종 채택안은 `candidate-r8-tail10450`이며 선택은 검증 seed 실행 전에 고정했다. Lv17, XP20×1.42, 필드 HP1153/1000·index79 이후10450/10000, 동료 힘 HP115/100, 기본 포획0.35·index63 이상 보스에서 명단30 미만/영구 초기 할당 구간1–5에 보장이며 정확한 21개 등록값은 프로토콜을 따른다. 초기 할당 구간은 영구 nextCompanionId 기준으로, 전송/레거시 보정으로 소진될 수 있다. RNG 소비량과 기존 120초 휴식·30초 미루기를 유지했고 새 시간 제한은 없다.

공통 콘텐츠는 `crownwyrm`(dragon3), `rootcolossus`(영웅 환생3), `h58`(물100/reefknight2/총1500), `h62`(환생5/seen60/총6000), `starvoid`(환생10/총16000), 마지막 `h70` 별밤 계승자(서로 다른 영웅10종 실제 선택/총30000회 처치)다. 자격·등장·실제 획득을 구분한다.

[최종 candidate100](../../.agentdoc/v07-setup-20260911T122653Z/evidence/candidate-final-v070.json)과 별도 [release900](../../.agentdoc/v07-setup-20260911T122653Z/evidence/release.json)은 완료·동결됐다. release는 등록 9정책 각각 seed1–100×12시간, 새900원본이며 이전0.6 결과나 중간 실행을 재사용하지 않았다. 기준 active 첫 성공 p50 **2736.6초=45.61분**, **전체100/100이90분 내 성공**했다. h70 자격 전체 p50 **40596초=11시간16분36초**이며 **50도달/50미도달·제시50/선택0**이다. 도달자 조건부 p50 **20933.6초** 및 전체p90/최악null을 숨기지 않는다. 첫 슬롯 정책으로 희귀 세 번째 카드를 선택하지 않은 결과다. 정책별 과속·지연·순수 방치 정지와 후기 새 획득 공백은 [독립 분석](../../.agentdoc/v07-setup-20260911T122653Z/evidence/release-v070-analysis/README.md)에 있다. 이를 사람 재미·모든 정책 목표 통과로 표현하지 않는다.

[실제 Native](../../.agentdoc/v07-setup-20260911T122653Z/evidence/native/matrix.json)는 5/15/30분×3프로필9개와 별도 연속180-active **330분3.023초**, 10원본·430검사PASS/오류0·198PNG다. 긴 여정은 10분마다 실제 메뉴18회·환생14회, 종료Lv1/처치13077/동료30/서로 다른 선택영웅14다. 첫 준비 관측2312052.202208ms와 첫 선택 완료2401183.300416ms를 구분한다. Host가 모든 종료10PNG와 메뉴18PNG를 직접 확인했다. 짧은9개는 선택 없는 관측이다. 30-active의 종료Lv17/READY와 주기firstReady=null은 정확 최초시각 미확인으로 남긴다. 자연 관측은 격리 save·합성 입력·모의 네트워크만 사용했고 fixture/시간 가속/동시 빌드 없이 종료했다. 이후 진단은 자연 시간에 합산하지 않았다. h70 세 번째 선택·Lv11 환생·Lv250 대상변경 취소·MAX 왕복·PvP 지정 ID/키보드는 후속 fixture 진단이며 자연 획득이나 운영 API 확인이 아니다.

**운영 정상화 완료 — 2026-09-13**

사용자의 추가 운영 정상화 요청에 따라 커밋 `8f89f1ab1922cf5adb7171aa04d64b4eaa7a2803`을 원격 `v3`에 반영했다. Render 기존 서비스 `srv-dacmju6k1f9s73csi2v0`의 배포 `dep-daj7kjp5efls739fsiug`가 **2026-09-13T10:27:22.907611Z live**로 완료됐다. [실제 빌드·기동 로그](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/render-deploy-complete.json)는 정확한 커밋 checkout, Node20.12.2, 빌드 성공, `store=pg`, 새 SHA의 기동을 기록한다. 푸시가 기존 자동 배포를 시작해 수동 배포를 중복 실행하지 않았다. 서비스·DB를 재생성하거나 v2를 배포하지 않았다.

[배포 후 호환 capture](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/compatibility-after-deploy.json)는 **local/live PASSED·실제 종료0**, 새 로컬 빌드와 121테스트 및 배포 커밋의 **35/35 소스 일치**를 확인했다. SHA256은 `5e7eae8ac5544c419e5278ead20791f338c7b4f43f93643724683e7af82343b7`다. helper의 “no deployment performed” 문구는 capture 자체가 배포하지 않는다는 뜻이며, 이번 Host 배포 사실을 부정하지 않는다.

Host가 실제 실행한 [운영 API probe](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/live-probe/report.json)는 **47검사 PASS·28 HTTP 요청·종료0**, 10:30:13.698–10:30:19.039Z에 완료됐다. 보고서 SHA256은 `d51451fea61eac6c3c1fadc9d6d2b9a953ff1c53ac2c4dc28a22401a3fcfdee4`다. 새 합성 계정 두 개에서 Lv11·250·9007199254740991 동료와 영웅·이름·점수를 지정 상대 ID의 서버/DB 경유 미리보기로 정확히 재조회했다. 안전 범위 초과·분수·0·음수·문자열·null·JSON 1e400의 **7개 HTTP400**은 의도한 거절이며, 매번 기존 값의 무손실을 확인했다. 두 목록 응답 각각 **50행**의 실제 클라이언트 검증은 통과했지만 점수0 합성 계정은 목록에 없었다. 따라서 운영 목록에서 합성 고레벨 행을 선택한 것으로 확대하지 않는다. 합성 파티는3명이며5명 UI는 기존 Native 근거다.

정리 후 두 합성 계정의 빈 로스터·점수0을 다시 조회했다. 삭제 API가 없어 **계정 행2개는 남고**, 미식별 계정은0개다. 토큰은 메모리에서만 사용했다. 실사용자 상대 전투·탈취·회수 요청은0이며, 이번에는 전투 실행·탈취·회수·서버 재시작 내구성·직접 SQL·사람 관찰을 검증하지 않았다. [Designer→Critic→Balance→Host 보완 판단](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/supplemental-review.md)은 **C070의 운영 원인이 확인한 계약 범위에서 해소**됐다고 판정했다. 새 정식 `audit.mjs` 세션은 아니며 원래 감사의 major를 지우지 않았다.

배포 스냅샷에서 정확한 `npm test && npm run lint && npm run typecheck`를 새로 실행해 **58파일·955테스트/lint/typecheck PASS**했고, 별도 깨끗한 `npm ci --include=dev --ignore-scripts && npm run build`도 Node20.12.2에서 성공했다. [스냅샷 검증](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/snapshot-verification.json)과 [원격에 반영한101파일 범위](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/deployment-diff.paths.txt)를 보존했다. 기존 Render build가 앱 전체를 컴파일하므로 검증된 전체 src/static·버전/tsconfig와 그 검증에 필요한 tests/README/프로토콜을 포함했다. 사용자 작업 트리를 commit/reset하지 않고 별도 Git index와 commit-tree를 사용했다. **로컬 HEAD/v3는2827099, 원격 origin/v3는8f89f1a**이며 원래 index는 그대로다. 이 차이를 오류로 보고 pull/reset/checkout/merge/rebase/clean하지 마라. S/E 및 제품 소스는 이번 운영 중 바꾸지 않았다. 기존 AGENTS의 DEPLOYED_SHA는 과거 메타데이터이며 현재 운영 SHA는 위 새 근거를 따른다.

**남은 출시 계약**: V07-07은 여전히 **running/unverified**다. 등록 server AC는 옛 `evidence/server/compatibility.json`, review AC는 옛 `reviews/final`을 가리키며 두 과거 종료1은 그대로다. 새 운영 성공을 그 실행의 PASS로 바꾸지 않았다. 다음 세션에서 새 근거 경로와 후속 판단을 등록 계약에 정직하게 연결해야 한다. config/loop를 바꾸면 Host가 원본을 보존하고 동기화해야 하며, E 변경으로 낡은 검증을 새 E의 성공으로 재인증해서는 안 된다. 완료된 측정·Native·패키지를 단순 재개 때문에 반복하지 마라. 클라이언트는 출시하지 않았고 `humanChecks=PENDING`이다.

**배포 전 실패는 불변 이력이다.** [옛 서버 capture](../../.agentdoc/v07-setup-20260911T122653Z/evidence/server/compatibility.json)는 로컬121테스트PASS/livePENDING/종료1, 당시 health SHA2827099의35파일 대조는13일치/17불일치/5누락이었다. Lv10 상한·상대 목록 route 부재·지정 ID 무시는 그 배포의 문제다. [옛 감사](../../.agentdoc/v07-setup-20260911T122653Z/reviews/final/report.md)와 실패 로그도 유지한다. 현재 운영 상태로 이 과거 실패를 반복하지 말고 위 새 배포·probe를 함께 읽는다. [배포 직전 문서 원본](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/before-status-docs/HANDOFF.md)도 보존했다.

보존 점검은 [Balance 원본](../../.agentdoc/v07-setup-20260911T122653Z/evidence/final-v070-preservation-balance.md)과 [보완](../../.agentdoc/v07-setup-20260911T122653Z/evidence/final-v070-preservation-balance-amendment.md), [Designer Git 조사](../../.agentdoc/v07-setup-20260911T122653Z/evidence/final-v070-preservation-git-designer.md)를 따른다. 최초179개가 모두 현재 존재하고 v5/CURRENT36개가 동일하다. 개발 중 변경된42개를 원래와 바이트 불변이라고 주장하지 않는다. 최초 전체 바이트173개는 보관물에 연결했지만 테스트6개(expedition/hero/heroMenuReadiness/ipc/menu/progressV6)의 시작 전체 원본 위치는 미확인이다. 현재 파일 누락·사용자 변경 손실로 단정하지 않고 이 한계를 유지한다. 이전 앱/metadata는 `preservation/pre-v07-package` 압축에, 기존 DMG5개/blockmap5개는 release에 보존됐다. 사용자 save/auth를 읽거나 초기화하지 않았다.

이전 탐색/검증 실패, 트레이954PASS/1FAIL와 실제 반려/수정/refresh, Native 초기 Enter 실패/수정, Host 보조 분위수 교정, audit init-next 순서 오류는 [작업 저널](../../.agentdoc/v07-setup-20260911T122653Z/sessions/development-working.md)과 원본에 남아 있다. 이전 누적 HANDOFF는 [원본 보관본](../../.agentdoc/v07-setup-20260911T122653Z/sessions/before-final-summary/HANDOFF.md)에서 읽을 수 있다. 하네스 준비·설계 검토·분석 완료·제품 출시 검증은 위의 서로 다른 상태를 유지한다.
