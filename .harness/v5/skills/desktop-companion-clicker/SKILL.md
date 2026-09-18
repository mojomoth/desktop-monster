---
name: desktop-companion-clicker
description: DesMon의 성장·발견·수집·환생·PvP를 4 에이전트로 검토하고 수치/행동 근거로 반복 개선한다.
version: "5.0"
---

# desktop-companion-clicker

현재 구현의 오류·논리·재미와 다음 업데이트를 분석하는 요청이면
[`../../AUDIT.md`](../../AUDIT.md)의 `e2e/measure/audit` 흐름을 우선 사용한다.
네 호스트 에이전트의 독립 검토, 실제 Electron 플레이, 소스와 연결된 근거가 필수다.
아래 `fun.mjs` 절차는 기능 구현까지 요청된 기존 v0.5 리뷰에만 적용한다.

기존 데스크탑 방치/클리커의 재미 개선 요청, 밸런스 조절, 환생/수집/경제 재검토에 사용한다.
이번 사용 사실을 사용자에게 짧게 알리고 아래 작업을 수행한다.

`next`로 발급된 특정 역할 요청을 받은 하위 에이전트는 자신의 charter와 장르 참조만 적용하고
해당 보고서만 반환한다. 아래 세션 생성/수집 단계는 호스트 오케스트레이터의 역할이다.

1. 저장소 `AGENTS.md`, `.harness/v5/HARNESS.md`,
   `.harness/v5/reference/GAME_DESIGN_V5.md`를 읽는다.
2. `.harness/v5/genre-packs/desktop-companion-clicker/PATTERNS.md`,
   `balance-template.md`, `brainstorm-variant.md`를 역할별 기준으로 사용한다.
3. `node .harness/v5/loop/fun.mjs selftest`로 하네스를 확인한다.
4. 새 `.agentdoc/<session>`에 `init`, `next`를 실행한다. `.harness/CURRENT=v3`는 유지한다. 발급된 프롬프트/템플릿을
   호스트 에이전트 도구로 해당 역할에 전달한다. 모델은 호스트의 기본값을 사용한다.
5. 디자이너 → 독립 비평가 → 밸런스 → 플레이테스터 순서를 `submit`으로 수집한다.
   비평가 승인 후 구현하고, 밸런스/플레이테스트 실패는 디자이너 수정부터 다시 검토한다.
6. 구현/시뮬레이션은 기존 순수 엔진, 주입 RNG/시계/입력과 Vitest를 재사용한다.
   기능과 테스트를 함께 바꾸며 기존 테스트를 약화하지 않는다. 파일 소유권을 나누어 병렬 구현할 수 있다.
7. 완료 후 정확한 게이트 `npm test && npm run lint && npm run typecheck`를 실행하고
   `reference/RELEASE_CHECKLIST.md`의 실제 미검증 항목을 보고한다.

기본 판단 기준은 spawn/reward pacing, level curve, idle/active reward, rare encounter,
collection, evolution/prestige, daily event, surprise, session length, desktop interruption budget이다.
모든 축을 관찰하되 신규 시스템은 관측 문제를 해결하는 데 필요할 때만 만든다.
현재 사용자 요구가 스킬의 예시 수치보다 우선한다. 이미 허가된 구현을 중간 승인 요청으로 멈추지 않는다.
