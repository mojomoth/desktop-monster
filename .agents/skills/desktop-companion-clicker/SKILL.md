---
name: desktop-companion-clicker
description: DesMon을 실제 Electron E2E와 Designer/Critic/Balance/Playtester 네 에이전트로 분석해 기능·논리·재미 문제 및 다음 업데이트를 도출한다.
---

# DesMon 재미 분석

사용자에게 이 스킬 사용을 알린다. 저장소 루트 기준 `AGENTS.md`와
[실행 계약](../../../.harness/v5/AUDIT.md)을 읽고 실제 작업을 수행한다.

1. 기존 사용자 변경을 보존하고 새 `.agentdoc/<session>`에 근거를 모은다.
2. 설치된 도구로 하네스 selftest, 실제 Electron E2E, seed 100개 이상의 코어 측정을 실행한다.
3. `audit.mjs init/next/submit`과 호스트 협업 도구로 네 역할을 서로 다른 실제 agent ID로 실행한다.
   코드 읽기·측정은 병렬화하고 Designer→Critic→Balance→Playtester 판단 의존 순서는 유지한다.
4. 기능 실패는 그대로 남긴다. 사람이 없는 자동 플레이는 실제 시간이어도 사람의 재미 검증이 아니다.
5. `audit.mjs report`로 우선순위와 다음 실험을 작성하고 저장소 게이트를 실행한다.
   실제 실행 범위와 미검증을 보고한다. 분석 요청만으로 게임 기능·운영 서버를 변경하지 않는다.

기존 v0.5 구현 리뷰용 `fun.mjs`의 승인 상태와 새 `audit.mjs`의 분석 완료를 혼동하지 않는다.
모델은 호스트 기본값을 사용한다. 시스템을 추가하기 전에 기존 피드백·목표·수집의 단절부터 확인한다.
