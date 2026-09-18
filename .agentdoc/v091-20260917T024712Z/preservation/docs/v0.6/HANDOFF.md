# v0.6 인계

**구현 완료 · 기술 검증을 마친 출시 후보 · 사람 재미 가설 PENDING.** 앱 버전은 `0.6.0`이며 검증 후 버전을 바꾸지 않았다. 필수 기능과 개발 루프, 최종 수치 측정, 실제 Native 9개 관측, 새 UI journey, 실제 네 역할 감사, main smoke, macOS 패키징과 패키지 저장·재시작 검증을 수행했다.

완료된 기능은 정확한 환생 준비 안내, 도감의 명시적인 발견 확인과 무료 목표1개, 실제 정수 훈련 피해 예고, 저장 실패 안내다. 조건부 포획 보류와 그 UI는 사전 실험 기준 미달로 제외했다. 목표 선택은 출현 확률·보상·가격을 바꾸지 않는다.

실행 폴더는 `.agentdoc/v06-20260910T063253Z/`다. [작업 상태와 실제 검사 로그](../../.agentdoc/v06-20260910T063253Z/loop.json), [최종 세션](../../.agentdoc/v06-20260910T063253Z/sessions/iter-04.md), [재개 명령](LOOP.md), [요구사항별 근거](ACCEPTANCE.md)를 연결했다. `.harness/CURRENT=v3`, 평가 도구v5, 기존 npm 명령 이름과 의존성은 유지했다.

| 확인 항목 | 실제 결과와 근거 |
| --- | --- |
| 정확한 저장소 게이트 | `npm test && npm run lint && npm run typecheck`: 776 tests와 lint/typecheck 성공. 최종 문서의 검사 기록도 loop.json의 V06-10에 연결한다. |
| 하네스 자체 검사 | 52개 성공. `evidence/final-harness-04-record.json`에 원본 로그와 해시. |
| 필수 기능 AC | 관련8파일157검사와 각 Native의38개 진단. [AC 로그](../../.agentdoc/v06-20260910T063253Z/evidence/final-ac-04.log). |
| 실제 Native 관측 | 5/15/30분×active/idle/intermittent의9개 독립 순차 실행, 관측150.003분·342진단·스크린샷162개. [최종 matrix](../../.agentdoc/v06-20260910T063253Z/evidence/final-matrix-03/matrix.json). |
| 수치 측정 | canonical100 seeds·1800행·558분포, 포획10800행·3600궤적, 피버200행, 신규idle300행. [실험 결과](EXPERIMENT_RESULTS.md). 실제 시간 관측과 구별한다. |
| 네 역할 감사 | 실제 Designer→Critic→Balance→호스트 Playtester. 필수 범위의 새 blocker/major 미발견, 후속 minor8건. [감사와 다음 우선순위](../../.agentdoc/v06-20260910T063253Z/reviews/final/report.md). `audit_complete`만으로 출시를 판정하지 않았다. |
| main smoke | `npm run smoke`: `SMOKE_OK`, exit0. [원본 로그](../../.agentdoc/v06-20260910T063253Z/evidence/V06-09-1789036850685.log). |
| 실제 패키지 | `npm run package` exit0, ARM64 `.app`/`.dmg` 생성. 실제 패키지 검증10개 성공. [생성 기록](../../.agentdoc/v06-20260910T063253Z/evidence/package-build-record.json), [실행·저장·재시작 결과](../../.agentdoc/v06-20260910T063253Z/evidence/package.json). |

산출물은 서명하지 않은 macOS ARM64용 [DesMon.app](../../release/mac-arm64/DesMon.app)과 [DesMon-0.6.0-arm64.dmg](../../release/DesMon-0.6.0-arm64.dmg)이다. DMG는110,336,219바이트이며 SHA-256은 `e65b1914bed6457be9287f2fc8cfcb8bb8d5f97742148040f9a0a3626a86a127`이다. 앱 내부 `app.asar`의 SHA-256은 `1659e05ad019048c3d1b003ea1d3d60ce2cd1732ab7c04a35d003c0471c85185`이다. 실행 파일·Info.plist 해시는 생성 기록에 있다.

패키지 검사는 `--probe`가 없는 실제 검증이다. 패키지 자체 main smoke, runtime0.6.0, 현재 dist/static과 패키지 내부 바이트 일치, 구세이브 재산·동료·영웅·기록·공식 전적, 읽음 이관, 실제 메뉴→preload→IPC→목표 저장, 앱 프로세스 종료·재시작 보존을 확인했다. 네 프로세스가 모두 exit0으로 끝났고 격리 임시 userData는 제거했다. 개인 저장·인증 파일은 사용하지 않았다. [실제 패키지 메뉴 화면](../../.agentdoc/v06-20260910T063253Z/evidence/package.json.menu.png)도 직접 확인했다.

첫30분 idle에서는 합성 송신0인데1처치·1G가 생겼다. 승인 집계에서 보류하고 원본·이전 집계·상태·해시를 보존했다. 사전에 한 번으로 제한한 같은 지문 재검증에서 전구간0을 확인했고, 다른8개 원본은 그대로 사용했다. 승인된5/15/30 idle의106개 시작·timeline·종료 표본도 대조했다. [추가 품질 검토](../../.agentdoc/v06-20260910T063253Z/evidence/native-quality-review.json)와 [독립 조사](../../.agentdoc/v06-20260910T063253Z/reviews/idle-anomaly-critic.md)에 기록했다. 최초 원인은 미확정이며, 합성 송신 횟수는 창 내부 fallback 입력을 포함한 총수신 수가 아니다. 새0 결과도 모든 미량 입력·HP/XP 변화의 부재를 증명하지 않는다. 승인 관측150분과 보류 관측30분을 구분했다.

Native는 메뉴를 자동 선택하지 않는다. canonical은120초 활동과 즉시 첫 후보 수락을 사용하므로 그 수집량을 실제 무관여 방치 성과로 설명하지 않는다. 15분 intermittent의 동료0도 미도달 표본으로 남겼다. 같은 목표의 phase·발견 완료는 명시적인 before/after 세이브 진단이며 자연 획득률 근거가 아니다. 골드 부족의null은 적용 불가, 영혼 지연300은100개 고유seed를 재사용한 설정·seed 쌍이다.

저장 스키마version3의 기존 필드를 유지하고 `progress.codex`에 확인ID와 목표를 추가했다. 구세이브의 기존 발견은 이미 확인한 상태로 이관한다. 업데이트 전 앱을 종료하고 `~/Library/Application Support/DesMon/` userData 전체를 로컬에 백업한다. 최소한 `save.json`과 공식 전적의 기준인 `identity.json`을 같은 시점의 묶음으로 보관·복원해야 한다. identity에는 인증 토큰도 있으므로 공유 폴더·실행 증거에 복사하지 않는다. 실행 중인 앱의 저장 파일을 덮어쓰지 않는다.

다운그레이드는 새 확인·목표 필드 보존을 보장하지 않는다. 이전 앱과 해당 버전에서 만든 백업 묶음을 함께 복원하고, 다시0.6으로 올릴 때는0.6 백업 묶음을 복원한다. 시작 작업 트리176개 파일의 원본·해시와 소스 압축본을 baseline에 보존했다. 기존0.4 앱 번들은 패키징 전에 `baseline/release-before-package/DesMon-0.4.0.app.zip`으로 보관하고 압축 무결성을 검사했다. 이전 버전 DMG와 최신 메타데이터 사본도 남겼다. git reset/clean/commit/push/merge를 수행하지 않았다.

사람 관찰은0명으로 PENDING이다. 다음 탐색은5명×30분, 도움 없는 목표 설명4/5·구체적 자발적 재확인3/5를 기준으로 지지·반증·미확인을 기록한다. 참가자별 업무 방해 허용치를 먼저 정하고 [기존 관찰 양식](../../.harness/v5/genre-packs/desktop-companion-clicker/playtest-observation.md)을 사용한다. AI 의견·클릭·사건 수로 사람 표본을 채우거나 일반 재미·유지율 향상을 주장하지 않는다.

다음 우선순위는 입력 출처·HP/XP 계측 보완, 현행 사람 대조 관찰, 실제 탐색 마찰이 확인됐을 때의 목표 카드 왕복 실험이다. 새 기능·가격·피버 배율 변경은 이번 버전에 추가하지 않았다.

`DESMON_SKIP_NET=1` — 요청 범위인 로컬 구현·검증·패키징을 수행했다. 운영 배포·실제 PvP/탈취/회수·타인 메시지는 실행하지 않았다. 실제 Accessibility 권한·전역 입력 훅·운영 알림·VoiceOver는 별도 미실행 범위다. Native와 패키지는 격리 userData 및 SMOKE 안전 경로를 사용했다.

최종 source는 `c1b3603ed446d75fdd4830e59aac930d5fad73d17c6bef7de6c888b062914aef`, evaluation은 `53fc0326a4ad1a742b775f3bdf887a072de0927e1d811af3431e116663d9e080`이다. 고정 protocol v2 SHA는 `9e7a8d4575098c34d860080fca7a0a57f8c3edc3fadf5816b53348d28727e632`이다. 변경 시 기존 근거를 보존하고 새 지문에서 관련 검증을 다시 확보한다.
