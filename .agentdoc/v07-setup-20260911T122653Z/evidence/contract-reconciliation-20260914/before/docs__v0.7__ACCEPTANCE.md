# DesMon v0.7 검수 기록

갱신: 2026-09-13T10:37:13.176114+00:00. 실행 폴더: `.agentdoc/v07-setup-20260911T122653Z`. **구현·최종 로컬 실행·분석 및 이번 운영 서버 정상화는 완료했다. 정식 제품 출시 검증은 PENDING이다.** 새 운영 성공과 기존 등록 server/review 종료1을 분리하며, V07-07은 running/unverified, `humanChecks=PENDING`을 유지한다.

| 상태 | 현재 근거와 판정 |
| --- | --- |
| 하네스 준비 | H07-01 historical verified. 최초 setup 근거를 확인하고 기존 실행을 candidate, 이후 release로 승급했다. 변경 전 하네스 결과를 현재 평가기의 성공으로 재인증하지 않았다. |
| 설계 검토 | `fun.mjs`의 실제 전체 prompt/template으로 최종 4역할 순서를 완료했다. 실제 Critic 반려·제품 수정·refresh 이력도 보존했다. |
| 구현 V07-01–06 | 최종 0.7.0 대상의 작업별 등록 AC 및 각 canonical gates 성공 뒤 verified. [불변 작업 세션](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-06-final-v070.md)과 loop.json에 연결돼 있다. |
| 수치 분석 | 최종 candidate 100개와 별도 release 900개를 새로 실행했다. 기준 active의 등록 목표 PASS. 정책별 실패·미도달은 별도다. |
| 결과 감사 | 별도 `audit.mjs` 실제 4역할 `audit_complete`. 등록 review AC FAIL; 발견 0 blocker / 1 major / 2 minor. [전체 감사](../../.agentdoc/v07-setup-20260911T122653Z/reviews/final/report.md). |
| 운영 서버 | 추가 요청에 따른8f89f1a 배포 live, 새 호환 capture와 실제47검사 PASS. 아래 신규 근거를 참조한다. |
| 출시 검증 V07-07 | release / running / **unverified**. 기존 server/review AC는 과거 실패 경로에 고정돼 있다. 새 운영 근거의 등록 계약 연결과 클라이언트 출시·사람 확인은 별도다. |

Package/lock/root package 버전은 **0.7.0**이다. 버전을 먼저 고정한 뒤 트레이 불일치를 수정하고 아래 최종 실행을 새로 만들었다. 최종 제품 지문은 `84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`, 평가 지문은 `c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d`다. 이후 제품·평가기·프로토콜을 바꾸지 않았다. 본 상태 문서의 바이트는 이전 AC 당시와 다르며, 이전 소유 파일 지문을 현재 문서의 성공으로 재인증하지 않는다.

**구현과 기능 검증 범위**

| 작업 | 구현·확인된 동작 |
| --- | --- |
| V07-01 사전등록 | Lv16–20 대조 및 라운드별 최대 3개 XP/HP/초기 포획 후보를 정확한 수치·ID로 실행 전에 등록했다. 탐색 10001–10020과 채택 후 검증 1–100을 구분했다. 선택안은 `candidate-r8-tail10450`이다. |
| V07-02 동료 | 양의 안전 정수 레벨을 저장/업로드/서버/목록·match·PvP 파티·탈취·회수 응답까지 허용·검증한다. Lv11·250·MAX_SAFE_INTEGER 왕복, 잘못된 응답 거절, 성장/별 증가 overflow의 재료·상태 무손실을 확인했다. JSONB 구조를 유지한다. |
| 동료 환생 | Lv9 이하 거절, Lv10 이상 Lv1·별+1. 정확한 전후 힘과 감소를 먼저 표시하고 확인 후 전송한다. Lv11 힘11→2를 실제 UI로 확인했고 대상 변경/삭제/중복 확인을 무효화했다. Lv250 진단은 변경 취소 사례이며 실제 환생 확정으로 표현하지 않는다. |
| V07-03 도감 | 영웅 실제 선택 이력/영구 컬렉션, 몬스터 종별 처치로 카드·공개 수·이름·설명·aria·알림·ACK·목표를 통일했다. 레거시 ACK는 공개 집합과 교집합만 남기고 반복 부팅/첫 획득 단일 알림을 확인했다. 보유 동료·전체 처치로 종별 과거 처치를 추정하지 않는다. |
| V07-04 PvP | 50개 행의 영웅·동료 파티·순위·승패, 행 재사용·선택 강조·접근성 이름, 실제 Tab/ShiftTab/Enter/Space, 요청·응답 상대 ID 일치, 만료/삭제/오류 차단을 확인했다. 삭제 행 포커스는 새로고침으로 이동한다. 운영 PvP 시험을 뜻하지 않는다. |
| V07-05 진행 | 실제 제안/출현과 공유하는 `eligibleHeroIds`·`eligibleMonsterIds`, UI/엔진 준비 판정, 하드코딩된 18 상한 제거와 기존 열린 제안 문턱 보존을 확인했다. 필드 HP와 동료 힘의 HP 기준을 분리하고 정확 BigInt 계산을 사용한다. 새 강제 시간 제한은 없다. |
| V07-06 통합 | 최종 버전의 실제 Electron 0분 integration 42검사 PASS. 별도 0분 preflight도 42검사 PASS. 자연 관측 시간이 아니며, 희귀 h70 세 번째 실제 선택·도감/ACK/목표 연결 등 fixture 진단으로 기록했다. |

**최종 측정 결과**

[최종 candidate 100](../../.agentdoc/v07-setup-20260911T122653Z/evidence/candidate-final-v070.json)과 [별도 release 900](../../.agentdoc/v07-setup-20260911T122653Z/evidence/release.json)은 같은 최종 소스에서 실제 새 실행이다. release는 2026-09-12T19:00:33.515843Z–20:10:10.684924Z에 등록 9정책 각각 100 seed × 12시간을 완료했다. 가속 엔진 시뮬레이션이며 실제 사용자 플레이 시간이 아니다. 원본 900개와 소스/평가기/빌드 압축은 [실행 기록](../../.agentdoc/v07-setup-20260911T122653Z/evidence/measurement-release-v070/execution.json)에 연결된다. 별도 [Balance 분석](../../.agentdoc/v07-setup-20260911T122653Z/evidence/release-v070-analysis/README.md), Host 독립 재집계 및 상호 검산을 보존했다.

기준 active/free/uniform/관리 없음/menuVisitSeconds=0의 첫 성공 p10/p50/p90/최악은 **1698.4 / 2736.6 / 3539.5 / 3723.3초**다. p50 **45.61분**, 전체 **100/100이 90분 내 성공**, 미도달 0이다. 첫 준비·제안·실제 선택 성공을 분리해 기록했다.

마지막 named 단계는 `h70` 별밤 계승자다. 자격 전체 p10/p50/p90/최악은 **17441.5 / 40596 / null / null초**이며 p50 **11시간 16분 36초**로 등록 8–12시간 범위다. **자격 50/100, 미도달 50/100, 제시 50/100, 실제 선택 0/100**이다. 도달자 조건부 p10/p50/p90/최악은 14841.7 / **20933.6** / 34739.3 / 40596초다. 미도달을 뒤에 정렬한 전체 lower median index49를 조건부 중앙값으로 바꾸지 않는다. 자격 30개는 8시간 전, 20개는 8–12시간이다.

| 등록 정책 (각 100개) | 첫 성공 전체 p50초 | 90분 내 성공 | h70 자격 전체 p50초 | 자격/제시/선택 |
| --- | ---: | ---: | ---: | --- |
| active/free/uniform/관리 없음/즉시 선택 — 기준 | 2736.6 | 100 | 40596 | 50/50/0 |
| active/free/uniform/관리 없음/600초 메뉴 | 3000 | 100 | 25894.3 | 89/89/0 |
| intermittent/free/uniform/관리 없음/600초 | 4800 | 64 | 28810.5 | 81/78/0 |
| warm-idle/free/uniform/관리 없음/600초 | 13800 | 13 | null | 44/43/0 |
| pure-idle/free/uniform/관리 없음/600초 | null | 0 | null | 0/0/0 |
| active/free/burst/관리 없음/즉시 | 1822.6 | 100 | 25651.5 | 68/67/0 |
| active/training/uniform/consume-weakest/600초 | 2400 | 100 | 16807 | 100/100/0 |
| active/lure/uniform/fuse-first/600초 | 3000 | 100 | 22227 | 92/92/0 |
| active/reroll/uniform/reincarnate-first/120초 | 2040 | 100 | 9969 | 100/100/0 |

목표 판정 분모는 첫 행의 100개다. 다른 정책의 과속·지연·미도달을 합쳐 PASS로 만들지 않았다. 첫 슬롯 선택 정책으로 모든 정책의 희귀 h58/h62/h70 실제 선택은 0이다. 실제 세 번째 카드 선택 기능은 자연 관측 이후 별도 진단에서 확인했다. 8→12시간 기준 전원 추가 처치·환생이 있어도 새 획득 공백은 길다. 수집 공백·순수 방치 정지·유료 정책의 복합 효과와 사람 재미는 구분한다. 9,900개 관측점의 재화 보존과 큰 정수 통계의 정확 문자열을 검산했다.

**실제 Native와 패키지**

[Native matrix](../../.agentdoc/v07-setup-20260911T122653Z/evidence/native/matrix.json): 실제 5/15/30분 × active/idle/intermittent 9개 및 별도 연속 180분 active, **10원본·430검사 PASS·오류0·198 PNG**, 자연 관측 합 **19,803,022.837542ms = 330분 3.023초**. 격리 save·합성 입력·모의 네트워크를 사용했고 자연 관측 중 fixture/시간 가속/동시 빌드는 없었다. 후속 fixture 진단 시간은 자연 시간에 더하지 않았다. Host가 10개 종료 화면과 긴 관측의 메뉴 18개를 직접 봤다.

연속 180분은 실제 10분 간격 메뉴 **18회·선택 성공 14회·서로 다른 영웅 14종**, 종료 Lv1·13,077회 처치·동료30·환생14다. 첫 준비 관측 2,312,052.202208ms와 실제 첫 선택 완료 2,401,183.300416ms를 구분한다. h70의 30,000회 처치 조건에 도달하지 않았으므로 자연 h70 획득으로 주장하지 않는다. 짧은 9개는 선택 없는 관측이며, 30-active 종료 화면은 Lv17/READY지만 주기 기록의 firstReadyElapsedMs=null이다. 정확한 최초 준비 시각은 미확인이다. Native intermittent에는 측정의 120초 onboarding이 없어 두 정책을 동일시하지 않는다.

최종 `npm run smoke`는 SMOKE_OK/종료0이다. Chromium의 MojoAudioOutputIPC 경고를 로그에 보존했고 사람 오디오 확인으로 확대하지 않는다. 실제 `npm run package`와 [패키지 검사](../../.agentdoc/v07-setup-20260911T122653Z/evidence/package/package.json)는 **10검사 PASS/오류0**, 실제 런타임 0.7.0, 격리된 패키지 프로세스 4개 종료0, 레거시·새 UI 상태·재시작 보존을 확인했다.

[DesMon-0.7.0-arm64.dmg](../../release/DesMon-0.7.0-arm64.dmg)는 **110,371,291 bytes**, SHA256 `6b1b14b3f86f507116c99872b8d1538b2cf91ba8376d952cc10498175c167cbe`다. [읽기 전용 DMG 검사](../../.agentdoc/v07-setup-20260911T122653Z/evidence/distribution/dmg.json) **5검사 PASS**: 실제 hdiutil verify/attach/detach, metadata checksum·버전, 포함 앱 295파일·14링크의 검증된 앱과 일치를 확인했다. 사용자 설치·서명/공증·사람 관찰은 수행하지 않았다.

**기존 등록 release AC — 아래 실행 이력은 변경하지 않았다**

| AC | 실제 종료 코드 | UTC 완료 시각 | 원본 실행 로그 |
| --- | ---: | --- | --- |
| measure | 0 | 2026-09-12T20:11:31.277Z | [V07-07-1789243888913.log](../../.agentdoc/v07-setup-20260911T122653Z/evidence/V07-07-1789243888913.log) |
| matrix | 0 | 2026-09-13T01:49:28.066Z | [V07-07-1789264167916.log](../../.agentdoc/v07-setup-20260911T122653Z/evidence/V07-07-1789264167916.log) |
| smoke | 0 | 2026-09-13T01:54:46.718Z | [V07-07-1789264482303.log](../../.agentdoc/v07-setup-20260911T122653Z/evidence/V07-07-1789264482303.log) |
| package | 0 | 2026-09-13T01:56:16.441Z | [V07-07-1789264548185.log](../../.agentdoc/v07-setup-20260911T122653Z/evidence/V07-07-1789264548185.log) |
| server | 1 | 2026-09-13T02:01:17.234Z | [V07-07-1789264877168.log](../../.agentdoc/v07-setup-20260911T122653Z/evidence/V07-07-1789264877168.log) |
| gates | 0 | 2026-09-13T02:04:05.595Z | [V07-07-1789265033343.log](../../.agentdoc/v07-setup-20260911T122653Z/evidence/V07-07-1789265033343.log) |
| review | 1 | 2026-09-13T03:20:32.650Z | [V07-07-1789269628719.log](../../.agentdoc/v07-setup-20260911T122653Z/evidence/V07-07-1789269628719.log) |

Gates는 정확히 `npm test && npm run lint && npm run typecheck`를 실행해 **58파일·955테스트, lint 0경고, 전체 typecheck PASS**였다. 같은 최종 소스의 과거 성공을 새 실행으로 인증하지 않았다. 최종 네 역할은 `designer` (`/root/designer`) → `critic` (`/root/critic`) → `balance` (`/root/balance`) → `playtester` (`/root`) 순서의 실제 별도 ID다. 설계 검토와 결과 감사는 다른 세션/도구다.

**배포 전 실패는 불변 이력이다.** [옛 서버 capture](../../.agentdoc/v07-setup-20260911T122653Z/evidence/server/compatibility.json)는 로컬121테스트PASS/livePENDING/종료1, 당시 health SHA2827099의35파일 대조는13일치/17불일치/5누락이었다. Lv10 상한·상대 목록 route 부재·지정 ID 무시는 그 배포의 문제다. [옛 감사](../../.agentdoc/v07-setup-20260911T122653Z/reviews/final/report.md)와 실패 로그도 유지한다. 현재 운영 상태로 이 과거 실패를 반복하지 말고 위 새 배포·probe를 함께 읽는다. [배포 직전 문서 원본](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/before-status-docs/HANDOFF.md)도 보존했다.

**운영 정상화 완료 — 2026-09-13**

사용자의 추가 운영 정상화 요청에 따라 커밋 `8f89f1ab1922cf5adb7171aa04d64b4eaa7a2803`을 원격 `v3`에 반영했다. Render 기존 서비스 `srv-dacmju6k1f9s73csi2v0`의 배포 `dep-daj7kjp5efls739fsiug`가 **2026-09-13T10:27:22.907611Z live**로 완료됐다. [실제 빌드·기동 로그](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/render-deploy-complete.json)는 정확한 커밋 checkout, Node20.12.2, 빌드 성공, `store=pg`, 새 SHA의 기동을 기록한다. 푸시가 기존 자동 배포를 시작해 수동 배포를 중복 실행하지 않았다. 서비스·DB를 재생성하거나 v2를 배포하지 않았다.

[배포 후 호환 capture](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/compatibility-after-deploy.json)는 **local/live PASSED·실제 종료0**, 새 로컬 빌드와 121테스트 및 배포 커밋의 **35/35 소스 일치**를 확인했다. SHA256은 `5e7eae8ac5544c419e5278ead20791f338c7b4f43f93643724683e7af82343b7`다. helper의 “no deployment performed” 문구는 capture 자체가 배포하지 않는다는 뜻이며, 이번 Host 배포 사실을 부정하지 않는다.

Host가 실제 실행한 [운영 API probe](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/live-probe/report.json)는 **47검사 PASS·28 HTTP 요청·종료0**, 10:30:13.698–10:30:19.039Z에 완료됐다. 보고서 SHA256은 `d51451fea61eac6c3c1fadc9d6d2b9a953ff1c53ac2c4dc28a22401a3fcfdee4`다. 새 합성 계정 두 개에서 Lv11·250·9007199254740991 동료와 영웅·이름·점수를 지정 상대 ID의 서버/DB 경유 미리보기로 정확히 재조회했다. 안전 범위 초과·분수·0·음수·문자열·null·JSON 1e400의 **7개 HTTP400**은 의도한 거절이며, 매번 기존 값의 무손실을 확인했다. 두 목록 응답 각각 **50행**의 실제 클라이언트 검증은 통과했지만 점수0 합성 계정은 목록에 없었다. 따라서 운영 목록에서 합성 고레벨 행을 선택한 것으로 확대하지 않는다. 합성 파티는3명이며5명 UI는 기존 Native 근거다.

정리 후 두 합성 계정의 빈 로스터·점수0을 다시 조회했다. 삭제 API가 없어 **계정 행2개는 남고**, 미식별 계정은0개다. 토큰은 메모리에서만 사용했다. 실사용자 상대 전투·탈취·회수 요청은0이며, 이번에는 전투 실행·탈취·회수·서버 재시작 내구성·직접 SQL·사람 관찰을 검증하지 않았다. [Designer→Critic→Balance→Host 보완 판단](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/supplemental-review.md)은 **C070의 운영 원인이 확인한 계약 범위에서 해소**됐다고 판정했다. 새 정식 `audit.mjs` 세션은 아니며 원래 감사의 major를 지우지 않았다.

배포 스냅샷에서 정확한 `npm test && npm run lint && npm run typecheck`를 새로 실행해 **58파일·955테스트/lint/typecheck PASS**했고, 별도 깨끗한 `npm ci --include=dev --ignore-scripts && npm run build`도 Node20.12.2에서 성공했다. [스냅샷 검증](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/snapshot-verification.json)과 [원격에 반영한101파일 범위](../../.agentdoc/v07-setup-20260911T122653Z/evidence/production-v070-20260913/deployment-diff.paths.txt)를 보존했다. 기존 Render build가 앱 전체를 컴파일하므로 검증된 전체 src/static·버전/tsconfig와 그 검증에 필요한 tests/README/프로토콜을 포함했다. 사용자 작업 트리를 commit/reset하지 않고 별도 Git index와 commit-tree를 사용했다. **로컬 HEAD/v3는2827099, 원격 origin/v3는8f89f1a**이며 원래 index는 그대로다. 이 차이를 오류로 보고 pull/reset/checkout/merge/rebase/clean하지 마라. S/E 및 제품 소스는 이번 운영 중 바꾸지 않았다. 기존 AGENTS의 DEPLOYED_SHA는 과거 메타데이터이며 현재 운영 SHA는 위 새 근거를 따른다.

**남은 출시 계약**: V07-07은 여전히 **running/unverified**다. 등록 server AC는 옛 `evidence/server/compatibility.json`, review AC는 옛 `reviews/final`을 가리키며 두 과거 종료1은 그대로다. 새 운영 성공을 그 실행의 PASS로 바꾸지 않았다. 다음 세션에서 새 근거 경로와 후속 판단을 등록 계약에 정직하게 연결해야 한다. config/loop를 바꾸면 Host가 원본을 보존하고 동기화해야 하며, E 변경으로 낡은 검증을 새 E의 성공으로 재인증해서는 안 된다. 완료된 측정·Native·패키지를 단순 재개 때문에 반복하지 마라. 클라이언트는 출시하지 않았고 `humanChecks=PENDING`이다.


**보존·실패·미확인**

기존 setup·v5·사용자 앱/save를 초기화하지 않았다. [독립 보존 원본](../../.agentdoc/v07-setup-20260911T122653Z/evidence/final-v070-preservation-balance.md)과 [보완](../../.agentdoc/v07-setup-20260911T122653Z/evidence/final-v070-preservation-balance-amendment.md): 최초179개 경로 모두 존재, 현재137개 동일/42개 개발 변경, v5/CURRENT **36/36 동일**, 실제 `CURRENT=v3`다. 전체 시작 바이트는173/179개 연결했고, expedition/hero/heroMenuReadiness/ipc/menu/progressV6 테스트6개의 시작 전체 원본 위치는 검사한 보관물과 [로컬 Git 조사](../../.agentdoc/v07-setup-20260911T122653Z/evidence/final-v070-preservation-git-designer.md)에서 미확인이다. 현재 파일 누락이나 금지된 테스트 변경의 증거로 단정하지 않으며, 179개 전체 복구 가능으로 인증하지 않는다. 이전 앱·builder metadata는 사전 불변 압축에, 기존 5개 DMG와 5개 blockmap은 원위치에 보존했다.

탐색 실패와 Round05 검증 실패 원본 `evidence/candidate.json`을 유지했다. 첫 버전 동결의 954PASS/1FAIL(트레이 버전), 실제 Critic 반려·제품 한 줄 수정·refresh 뒤 새955PASS, 초기 Native Enter 입력 실패와 수정, Host 보조 조건부 p90 계산 교정, audit init 완료 전 next의 ENOENT 후 순차 재실행도 보존했다. 이 보조 오류 교정으로 제품/등록 수치/완료된 측정을 바꾸지 않았다. 테스트 삭제·skip·약화나 strictness 완화로 통과시키지 않았다.

사람의 재미·선택 이해·업무 방해, 실제 글로벌 입력 권한·OS 알림과 클라이언트 출시는 **PENDING**이다. 운영 고레벨 호환은 위의 실제 검증 범위에서 PASS이며, 과거 정식 AC 경로 연결은 아직 미완료다. 다음 행동과 불변 원본 경로는 [HANDOFF](HANDOFF.md)를 따른다. 이 문서 이전의 누적 상태는 [원본 보관본](../../.agentdoc/v07-setup-20260911T122653Z/sessions/before-final-summary/ACCEPTANCE.md)에 남겨 과거 진행 상태와 현재 완료 범위를 분리했다.
