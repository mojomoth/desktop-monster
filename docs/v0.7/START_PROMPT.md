# v0.7 후속 개발 시작 프롬프트

아래 프롬프트는 하네스 준비 이후 게임 개발을 새 세션에서 시작/재개할 때 사용한다. 이 문서가 존재한다고 제품 v0.7이 구현된 것은 아니다.

```text
DesMon v0.7 개발을 맡아라. docs/v0.7/HANDOFF.md, LOOP.md와 연결된 실행 폴더의 loop.json 및 마지막 sessions 기록부터 읽어라. AGENTS.md와 .harness/v7/HARNESS.md, config.json, docs/v0.7/DEVELOPMENT_PLAN.md, EVALUATION_PROTOCOL.json을 따른다.

기존 미커밋 사용자 변경, v5 기록과 CURRENT=v3를 보존한다. 이 세션은 v3 Ralph 그래픽 lane이 아닌 v7 호스트 실행 계약이며 파일 소유권을 나누어 구현한다. 커밋/푸시/운영 배포는 자동으로 수행하지 않는다.

이미 완료한 하네스 구성을 다시 만들지 마라. 실행 중 측정/Native 프로세스를 확인하고 중복 시작하지 않는다. setup 완료의 근거를 검증한 다음 develop.mjs phase <runDir> candidate로 승급하고 설계 후보·콘텐츠 ID·프로토콜을 변경한다. 변경으로 낡은 근거는 보존하고 필요한 새 검증을 수행한다.

Host가 Playtester를 겸임하고 Designer/Critic/Balance를 각각 실제 별도 agent ID로 실행한다. 기본 모델과 동시 4슬롯을 지킨다. 독립 조사/충돌 없는 구현은 병렬화하되 판단은 Designer→Critic→Balance→Playtester 순서다. Critic은 구현하지 않는다. fun.mjs의 실제 prompt/template을 사용해 설계를 검토하고 결과 감사는 audit.mjs로 따로 수행한다.

V07-01부터 의존성 순서로 작업한다. 첫 환생은 기준 active 정책의 성공 p50 45–60분 및 전체 100개 중 90개가 90분 이내 성공해야 한다. 기존 콘텐츠의 성과 기반 해금은 마지막 named 단계 p50 8–12시간을 목표로 한다. 새 강제 시간 제한은 추가하지 않는다. Lv16–20 대조와 XP/HP/초기 포획 후보 최대 3개를 비교하고 정확한 수치와 콘텐츠 ID를 실행 전에 등록한다. 탐색 10001–10020과 검증 1–100 seed를 섞지 않는다.

동료 레벨 상한을 저장/서버/응답 검증까지 제거하고 안전 정수/overflow 무손실을 지킨다. 동료 환생은Lv10이상에서Lv1/별+1이며 전후 힘을 확인한다. 영웅 선택/몬스터 처치 기준으로 도감과 알림/ACK/목표를 일치시키고 레거시에도 적용한다. PvP 각 행에는 영웅과 동료 파티까지 표시하고 실제 지정 상대 선택과 포커스를 검증한다.

작업별 등록 AC와 npm test && npm run lint && npm run typecheck가 같은 대상 소스에서 성공한 뒤만 verified로 기록한다. 테스트 삭제/skip/약화나 과거 결과 재인증은 금지한다. 구현 완료 후 package/lock 버전 0.7.0을 먼저 고정하고 최종 근거를 만든다.

release 단계에서 실제 5/15/30분 × 3프로필 9개와 별도 연속 180분 active(10분마다 실제 메뉴 환생 선택), 100 seed × 12시간 정책별 측정, 네 역할 독립 감사, smoke, 실제 패키지를 확인한다. 자연 관측 중 fixture와 시간 가속을 사용하지 않고 격리 save와 합성 입력으로 실행한다. 새 클라이언트 출시 전에 고레벨 서버 호환을 확인한다. 사람 관찰이 없으면 humanChecks=PENDING을 유지한다.

docs/v0.7/ACCEPTANCE.md와 HANDOFF.md에 실행한 범위, 실패, 미확인, 다음 행동을 정확히 기록하라. 하네스 준비·설계 검토·분석 완료·제품 출시 검증은 각각 다른 상태다.
```
