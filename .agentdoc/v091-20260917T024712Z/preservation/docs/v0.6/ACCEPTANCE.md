# v0.6 요구사항 검증

필수 구현·수치 실험·최종 Native 9개·네 역할 감사·smoke·실제 패키지 검증을 마쳤다. 기술 검증을 마친 출시 후보이며 사람 재미 가설은 PENDING.

실행 기록: [loop.json](../../.agentdoc/v06-20260910T063253Z/loop.json), [최종 세션](../../.agentdoc/v06-20260910T063253Z/sessions/iter-04.md).

| 요구사항 | 최종 동일 소스 근거 | 판정 |
| --- | --- | --- |
| 환생 12/13·17/18, 옛 offerLevel, 휴식/보류, 상한 | hero/heroMenuReadiness/expedition 회귀 + 각 Native의 reincarnation-progress-honesty | 통과 |
| 구세이브 발견 읽음 이관, 미발견 선확인 방지, 실제 추가 발견 후 옛 snapshot 재확인, 목표 저장 | progressV6/ipc/ipcV5 회귀 + v06-legacy-read-baseline/only-displayed-ack/stale-ack-keeps-later-discovery | 통과 |
| 기존 도감 요약·무료 목표1개, 실루엣/적격/발견/보유 구분, focus/scroll/disclosure | menu.test + v06-goal-*와 focus-scroll-disclosure, 같은 목표의 phase/발견 완료 진단 | 통과 |
| 실제 피해 +0/+1·골드 부족·상한·중복 구매 토큰 | trainingPreview/menu 회귀 + v06-training-zero-preview/repeat-token | 통과 |
| 저장 실패→화면내 aria-live 오류→성공 재시도 | 실제 atomic write 실패 주입과 v06-save-failure-honest/save-retry/restart-ui-state | 통과 |
| 포획3안·5속성·관리 간격·피버·신규 idle | 10800행/3600궤적, 피버200, 신규idle300; 독립 Balance 재계산 | 통과 — 보류안은 기준 미달로 제외 |
| 최종 canonical 100 seeds | 1800행/18그룹/558지표분포 재계산, 원본·프로토콜 해시와 최종 지문 일치 | 통과 |
| 실제 5/15/30분×3프로필9개 | 9개 원본·각38진단·합계342검사, 실제9000193.118167ms 관측, 비중복·이미지 해시 확인 | 통과 |
| 실제 네 역할 audit | 실제4역 발급·접수·보고서, 필수 범위 새 blocker/major 미발견·후속 minor8건 | 분석 완료 |
| smoke, macOS .app/.dmg, 패키지 저장 재개 | main smoke SMOKE_OK/exit0, package exit0, 실제0.6.0 패키지10검사·저장·프로세스 재시작 | 통과 |
| 사람5명×30분 | 참가자 관찰 없음 | PENDING |

관련8파일157검사는 [실제 AC 로그](../../.agentdoc/v06-20260910T063253Z/evidence/final-ac-04.log)에 있다. 이 부분 검사와 전체776 tests/lint/typecheck, 하네스52검사를 구별한다. 정확한 통합 게이트 원본은 `evidence/final-gates-04-record.json`, 후속 재확인은 `final-gates-06-02-record.json`, 하네스는 `final-harness-04-record.json`에 연결돼 있다. quick-05의37진단은0분 개발 검사이므로 아래 실제 관측을 대신하지 않는다.

| 분 | 프로필 | 실제 관측 초 | 합성 송신 | 종료 처치 | 종료 골드 | 종료 동료 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 5 | active | 300.022726 | 583 | 47 | 560 | 2 |
| 5 | idle | 300.024821 | 0 | 0 | 0 | 0 |
| 5 | intermittent | 300.022919 | 146 | 29 | 223 | 1 |
| 15 | active | 900.018884 | 1745 | 62 | 980 | 3 |
| 15 | idle | 900.004449 | 0 | 0 | 0 | 0 |
| 15 | intermittent | 900.022951 | 437 | 44 | 513 | 0 |
| 30 | active | 1800.026163 | 3490 | 71 | 1272 | 2 |
| 30 | idle | 1800.014356 | 0 | 0 | 0 | 0 |
| 30 | intermittent | 1800.035850 | 872 | 53 | 727 | 2 |

[최종 matrix](../../.agentdoc/v06-20260910T063253Z/evidence/final-matrix-03/matrix.json)의 SHA는 `4a9237af0c0ce641569ffda1a5d3225e5706d1ffbe942a53fd88424f8feceecd`이다. Native는 메뉴 무선택이며 canonical의 즉시 환생 정책과 다르다. UI journey의 세이브 fixture·진단 입력을 자연 획득으로 세지 않는다. 15분 intermittent의 동료0도 미도달 표본으로 보존했다.

첫 30-idle은 합성 송신0인데1처치·1G가 관측되어 승인 집계에서 제외했다. 원본·이전 집계·상태와 해시를 보존하고 사전에 정한 한 번의 같은 지문 재실행에서30분 전구간0을 확인했다. 승인된5/15/30 idle의 시작·timeline·종료106개 상태 표본도 별도로 대조했다. [추가 품질 검토](../../.agentdoc/v06-20260910T063253Z/evidence/native-quality-review.json)와 [독립 원인 조사](../../.agentdoc/v06-20260910T063253Z/reviews/idle-anomaly-critic.md)에 근거가 있다. 첫 원인은 미확정이며 합성 송신 횟수는 창 내부 입력 총계가 아니다. 새0 결과도 모든 HP/XP 변화·입력 부재를 증명하지 않는다. 승인 관측150분과 보류 관측30분을 구분한다.

실제 Accessibility/전역 입력/네이티브 theft 알림/운영 PvP/탈취/배포는 이 요청 범위의 검사가 아니다. DESMON_SKIP_NET=1. 증거 helper의 명시 Node import 누락으로 발생했던 lint 실패도 이전 로그에 보존했고, import 수정 후 정확한 게이트를 재실행하여 통과했다. 테스트·strictness를 완화하지 않았다.

[패키지 원본 결과](../../.agentdoc/v06-20260910T063253Z/evidence/package.json)는 `mode=package-verification`,10개 성공,오류0,격리 임시 데이터 정리 완료다. [생성 로그와 산출물 해시](../../.agentdoc/v06-20260910T063253Z/evidence/package-build-record.json), [네 역할 최종 보고서](../../.agentdoc/v06-20260910T063253Z/reviews/final/report.md)를 보존했다. 최종 문서와 현재 산출물의 대조·정확한 게이트 기록은 loop.json의 V06-10에 연결한다.

최종 인계 후 게이트 재확인: `evidence/final-gates-10-record.json`,776 tests/lint/typecheck exit0. V06-10의 실제 패키지 대조 AC와 문서 소유 해시가 일치하며, `reviews/V06-10-validation.md`로 verified 처리했다.
