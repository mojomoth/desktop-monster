# DesMon v0.7 인계

갱신: 2026-09-13T03:21:59.913887+00:00. **v0.7.0 구현·최종 로컬 검증·실제 관측·수치 분석·4역할 결과 감사를 마쳤다. 제품 출시 검증은 운영 서버 호환 실패로 PENDING이다.** `humanChecks=PENDING`. 커밋·푸시·운영 배포는 수행하지 않았다.

실행 폴더는 `.agentdoc/v07-setup-20260911T122653Z`이며 [loop.json](../../.agentdoc/v07-setup-20260911T122653Z/loop.json)은 **release / H07-01 historical verified / V07-01–06 final0.7 verified / V07-07 running·unverified**다. V07-07의 필수 server AC가 실제 종료1이다. 미완료 작업을 verified로 바꾸거나, 근거 없는 환경 복구 3회를 만들어 blocked로 기록하지 않았다. 현재 running은 저널 상태다. Native·측정·패키지 실행은 종료했다. 최종 프로세스·지문 확인은 [closeout 기록](../../.agentdoc/v07-setup-20260911T122653Z/evidence/final-v070-closeout-host.json)을 본다. 사용자 Electron PID50718은 마지막 관측까지 유지했다.

재개 시 이 문서, [LOOP](LOOP.md), loop.json과 [마지막 세션](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-07-final-v070-PENDING.md)을 먼저 읽는다. 실제 PID/PGID와 matrix-state.json을 확인하고 완료된 측정·Native를 중복 시작하지 않는다. 기존 하네스를 재생성하지 않는다. 이 세션은 v7 Host 계약이며 v3 Ralph 그래픽 lane이 아니다. AGENTS.md, `.harness/v7/HARNESS.md`, config.json, DEVELOPMENT_PLAN.md, EVALUATION_PROTOCOL.json을 따른다.

최종 제품 지문: `84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`. 평가 지문: `c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d`. Package/lock/root package와 트레이는 **0.7.0**이다. 버전 고정 후 실제 최종100 seed와900 seed·330분 관측·게이트를 새로 실행했다. 현재 상태 문서 갱신을 이전 AC의 동일 소유 파일 지문으로 재인증하지 않는다.

| 완료 범위 | 연결된 실제 근거 |
| --- | --- |
| V07-01–06 구현·등록 AC·각 gates | [V01](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-01-final-v070.md), [V02](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-02-final-v070.md), [V03](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-03-final-v070.md), [V04](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-04-final-v070.md), [V05](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-05-final-v070.md), [V06](../../.agentdoc/v07-setup-20260911T122653Z/sessions/V07-06-final-v070.md) |
| 최종 설계 검토 | [fun 세션](../../.agentdoc/v07-setup-20260911T122653Z/reviews/design-final-v070/session.json). 실제 Designer→Critic 반려→수정/refresh→Designer→Critic→Balance→Host, 최종 4역할 완료 |
| 별도 결과 감사 | [audit 보고서](../../.agentdoc/v07-setup-20260911T122653Z/reviews/final/report.md), `audit_complete`, 등록 review AC FAIL; 0 blocker / 1 major / 2 minor. 출시/사람 재미를 승인하는 상태가 아님 |
| 최종 canonical gates | [955테스트·lint·typecheck 원본](../../.agentdoc/v07-setup-20260911T122653Z/evidence/V07-07-1789265033343.log), 2026-09-13T02:04:05.595Z 종료0 |
| 실제 smoke | [SMOKE_OK 원본](../../.agentdoc/v07-setup-20260911T122653Z/evidence/V07-07-1789264482303.log), 종료0; Chromium audio 경고 보존 |
| 실제 package·배포 파일 검사 | [package10 PASS](../../.agentdoc/v07-setup-20260911T122653Z/evidence/package/package.json), [DMG5 PASS](../../.agentdoc/v07-setup-20260911T122653Z/evidence/distribution/dmg.json), [실제 DMG](../../release/DesMon-0.7.0-arm64.dmg) |

구현은 동료 레벨 상한을 저장·서버·응답 전 경로에서 제거하고 안전 정수·overflow 무손실을 지킨다. Lv10 이상 동료 환생의 Lv1/별+1·힘 감소를 확인 전 표시하며 대상 변경을 무효화한다. 도감은 실제 영웅 선택/종별 처치를 공유 판정으로 사용하고 레거시·알림/ACK/목표까지 일치시켰다. PvP는 50행의 영웅·동료 파티, 지정 ID 대조, 키보드 선택·안정된 포커스·오래된 미리보기 차단을 확인했다. 진행은 실제 자격 export/준비 판정과 기존 제안 문턱 보존을 적용했다. 세부 AC 범위와 진단 한계는 [ACCEPTANCE](ACCEPTANCE.md)에 있다.

최종 채택안은 `candidate-r8-tail10450`이며 선택은 검증 seed 실행 전에 고정했다. Lv17, XP20×1.42, 필드 HP1153/1000·index79 이후10450/10000, 동료 힘 HP115/100, 기본 포획0.35·index63 이상 보스에서 명단30 미만/영구 초기 할당 구간1–5에 보장이며 정확한 21개 등록값은 프로토콜을 따른다. 초기 할당 구간은 영구 nextCompanionId 기준으로, 전송/레거시 보정으로 소진될 수 있다. RNG 소비량과 기존 120초 휴식·30초 미루기를 유지했고 새 시간 제한은 없다.

공통 콘텐츠는 `crownwyrm`(dragon3), `rootcolossus`(영웅 환생3), `h58`(물100/reefknight2/총1500), `h62`(환생5/seen60/총6000), `starvoid`(환생10/총16000), 마지막 `h70` 별밤 계승자(서로 다른 영웅10종 실제 선택/총30000회 처치)다. 자격·등장·실제 획득을 구분한다.

[최종 candidate100](../../.agentdoc/v07-setup-20260911T122653Z/evidence/candidate-final-v070.json)과 별도 [release900](../../.agentdoc/v07-setup-20260911T122653Z/evidence/release.json)은 완료·동결됐다. release는 등록 9정책 각각 seed1–100×12시간, 새900원본이며 이전0.6 결과나 중간 실행을 재사용하지 않았다. 기준 active 첫 성공 p50 **2736.6초=45.61분**, **전체100/100이90분 내 성공**했다. h70 자격 전체 p50 **40596초=11시간16분36초**이며 **50도달/50미도달·제시50/선택0**이다. 도달자 조건부 p50 **20933.6초** 및 전체p90/최악null을 숨기지 않는다. 첫 슬롯 정책으로 희귀 세 번째 카드를 선택하지 않은 결과다. 정책별 과속·지연·순수 방치 정지와 후기 새 획득 공백은 [독립 분석](../../.agentdoc/v07-setup-20260911T122653Z/evidence/release-v070-analysis/README.md)에 있다. 이를 사람 재미·모든 정책 목표 통과로 표현하지 않는다.

[실제 Native](../../.agentdoc/v07-setup-20260911T122653Z/evidence/native/matrix.json)는 5/15/30분×3프로필9개와 별도 연속180-active **330분3.023초**, 10원본·430검사PASS/오류0·198PNG다. 긴 여정은 10분마다 실제 메뉴18회·환생14회, 종료Lv1/처치13077/동료30/서로 다른 선택영웅14다. 첫 준비 관측2312052.202208ms와 첫 선택 완료2401183.300416ms를 구분한다. Host가 모든 종료10PNG와 메뉴18PNG를 직접 확인했다. 짧은9개는 선택 없는 관측이다. 30-active의 종료Lv17/READY와 주기firstReady=null은 정확 최초시각 미확인으로 남긴다. 자연 관측은 격리 save·합성 입력·모의 네트워크만 사용했고 fixture/시간 가속/동시 빌드 없이 종료했다. 이후 진단은 자연 시간에 합산하지 않았다. h70 세 번째 선택·Lv11 환생·Lv250 대상변경 취소·MAX 왕복·PvP 지정 ID/키보드는 후속 fixture 진단이며 자연 획득이나 운영 API 확인이 아니다.

**출시를 막고 있는 실제 실패**: [최종 서버 capture](../../.agentdoc/v07-setup-20260911T122653Z/evidence/server/compatibility.json)는 로컬 빌드/121테스트PASS지만 운영PENDING/종료1이고 등록server AC도1이다. health SHA `28270992518dc5bfc9c1f89f700c0491eaf8d1ed`는 현재 테스트한 35파일과 13일치/17불일치/5경로누락이다. [독립 정적 보고서](../../.agentdoc/v07-setup-20260911T122653Z/evidence/server/compatibility-static-mapping.md)에 해당 커밋의 Lv10 상한, 상대 목록 route 부재, 지정 ID 무시를 기록했다. 전체35 대조는 별도 Critic 조사이며 helper의 short-circuit reason 문구로 전체 비교를 주장하지 않는다. 인증 운영 API/DB·실행 코드 attestation은 미수행이다. `/healthz` SHA만으로 고레벨 호환을 승인하지 않는다.

다음 행동은 운영의 검증된 호환 빌드 대응 근거를 확보하는 것이다. 커밋·푸시·운영 배포는 이번 지시에 따라 자동 수행하지 않는다. 후속 배포가 별도로 승인되면 새 고레벨 호환 capture와 필요한 등록 AC를 실행해야 한다. 기존 `compatibility.json`/로그와 모든 실패 원본을 덮어쓰지 말고 새 경로를 사용한다. 등록 AC 경로를 바꾸면 config와 loop를 Host 단독으로 원본 보존 후 동기화하고, 평가 지문 변경으로 낡은 근거를 현재 성공으로 재인증하지 않는다. 소스·평가기 변경은 영향받은 검증·실제 측정·관측·감사를 새로 요구한다. 기능이 같은 동결 소스의 기존 실행도 새 실행으로 날짜를 바꾸지 않는다. 실제 참가자 관찰 전 사람 확인은 계속 PENDING이다.

보존 점검은 [Balance 원본](../../.agentdoc/v07-setup-20260911T122653Z/evidence/final-v070-preservation-balance.md)과 [보완](../../.agentdoc/v07-setup-20260911T122653Z/evidence/final-v070-preservation-balance-amendment.md), [Designer Git 조사](../../.agentdoc/v07-setup-20260911T122653Z/evidence/final-v070-preservation-git-designer.md)를 따른다. 최초179개가 모두 현재 존재하고 v5/CURRENT36개가 동일하다. 개발 중 변경된42개를 원래와 바이트 불변이라고 주장하지 않는다. 최초 전체 바이트173개는 보관물에 연결했지만 테스트6개(expedition/hero/heroMenuReadiness/ipc/menu/progressV6)의 시작 전체 원본 위치는 미확인이다. 현재 파일 누락·사용자 변경 손실로 단정하지 않고 이 한계를 유지한다. 이전 앱/metadata는 `preservation/pre-v07-package` 압축에, 기존 DMG5개/blockmap5개는 release에 보존됐다. 사용자 save/auth를 읽거나 초기화하지 않았다.

이전 탐색/검증 실패, 트레이954PASS/1FAIL와 실제 반려/수정/refresh, Native 초기 Enter 실패/수정, Host 보조 분위수 교정, audit init-next 순서 오류는 [작업 저널](../../.agentdoc/v07-setup-20260911T122653Z/sessions/development-working.md)과 원본에 남아 있다. 이전 누적 HANDOFF는 [원본 보관본](../../.agentdoc/v07-setup-20260911T122653Z/sessions/before-final-summary/HANDOFF.md)에서 읽을 수 있다. 하네스 준비·설계 검토·분석 완료·제품 출시 검증은 위의 서로 다른 상태를 유지한다.
