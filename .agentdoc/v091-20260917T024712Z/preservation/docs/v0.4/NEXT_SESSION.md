# v0.4 새 세션 인계 — 확정 영웅 적용 확인과 재미 개선

## Task
사용자의 최신 요청: “이제 이 영웅들 적용과 v0.4하네스를 진행해거 게임을 개선해줘. 새로운 세션으로 진행하여 컨텍스트를 깨끗하게 시작해.”
새 컨텍스트에서 즉시 실행하라. 50종 영웅의 실제 적용 상태를 확인하고, 기존 v4 재미 하네스를 새 세션으로 실행하여 발견한 문제를 코드로 개선하고 검증까지 완료하라. 분석 보고서나 제안만 작성하고 멈추지 말 것. 일반적인 구현·수정은 이미 승인되었으므로 다시 진행 승인을 묻지 않는다. 사용자에게 한국어로 진행 상황과 결과를 알린다.

## Context
작업 경로: /Users/jeongyounglee/work/repo/desktop-monster.
Electron + TypeScript + Vitest의 DesMon 데스크탑 컴패니언/방치·클리커 게임.
이전 대화 전체를 이어받을 필요 없이 이 인계와 관련 파일을 읽고 시작한다. 이전 세션은 인계 후 코드를 수정하지 않는다.
현재 작업 디렉터리에 완료된 v0.4 및 영웅 작업이 있으므로 별도 checkout/reset/clean/stash로 버리지 않는다. 기존 변경과 사용자의 저장 파일을 보존한다.

## 반드시 먼저 읽을 파일
- AGENTS.md — 빌드·테스트·실행·역할 분담·저장소 계약.
- docs/v0.4/HANDOFF.md — v0.4 구현, 이전 측정치, 한계, 출시 미검증 상태.
- docs/v0.4/HERO_REDESIGN.md — 사용자가 최종 확정한 50종의 규격과 검증 결과.
- .harness/v4/HARNESS.md — 실제 init/next/submit/status 워크플로우.
- .harness/v4/skills/desktop-companion-clicker/SKILL.md — 적용할 로컬 스킬. 첫 사용을 사용자에게 알린다.
- .harness/v4/reference/GAME_DESIGN_V4.md — 기능 사양. **아트 크기 문단은 오래된 32×32/20~24도트 설명이 남아 있다. 최신 사용자 승인인 14×14 및 HERO_REDESIGN.md가 우선한다. 참조 사양을 최신 규격과 일치시켜라.**
- .harness/v4/reference/RELEASE_CHECKLIST.md — 실제 수행/미수행을 구분하여 기록.
- .harness/v4/genre-packs/desktop-companion-clicker/{PATTERNS.md,balance-template.md,brainstorm-variant.md} — 역할별 평가 기준.

## Current state — 이미 구현한 것을 다시 만들지 말 것
### 확정 영웅 50종은 실제 코드에 적용 완료
- 10직업 × 5단계, h01~h50. 직업 순서: 검사/창술사/거너/성직자/도적/광전사/마법사/격투가/수호기사/소환사.
- 원래 기본 영웅과 같은 14×14 프레임과 SD 비율. 대기 2장 + 공격 3장 = 250프레임.
- 기본 영웅의 눈 위치·손 궤적·발 위치와 공격 자세를 유지한다. 등급 상승으로 신체/픽셀 크기가 커지면 안 된다.
- 후드 자객, 얼굴이 보이는 투구 성기사, 직업별 머리 장비·의상·무기, 피부와 눈 색이 서로 다르다. 모습당 고유 색 7개 이하.
- 최종 데이터 검사: 50개 고유 무채색 실루엣, 피부색 50개, 눈 색 50개, 눈/피부 최소 명암비 3.025:1.
- 승인한 시안 3종은 h01/h05/h09에 대기·공격 데이터가 정확히 보존되어 있다.
- 모든 화면에서 같은 heroFormSprite를 사용한다. 400×260 필드, 96px 환생 카드, 64px PvP 목록에서 영웅은 56px, 도트 하나는 4px로 표시된다.
- h01~h50 ID·등급·속성·버프 종류/수치 규칙, 저장 형식, 장착·수집·환생 후보와 roll, 공개 API는 보존했다.
- src/renderer/sprites/heroForms.ts: 50종 등록 및 기존 API.
- heroLook.ts: 공통 14px 대기 호흡 조립.
- heroKnightLooks.ts: 검사/도적/수호기사 15종.
- heroAgileLooks.ts: 창술사/거너/격투가 15종.
- heroArcaneLooks.ts: 성직자/광전사/마법사/소환사 20종.
- heroJobStudies.ts: 승인 3종의 원본 데이터.
- src/renderer/game.ts, src/menu/hero.ts, src/menu/index.ts: 실제 필드/HUD/검격/96·64px 카드 연결.
- tests/heroForms.test.ts, heroRendering.test.ts, heroJobStudies.test.ts, heroArtCompatibility.test.ts, menu.test.ts: 크기/팔레트/실루엣/접지/저장/API/UI 회귀 검사.

### v0.4 시스템
- src/core/hero.ts: 레벨 피해 D(L)=L+max(0,L−2)^2, 영혼 배율, 환생당 누적 +25%.
- Lv12 환생: 서로 다른 외형·속성 3개와 실물 미리보기, 고정 버프 정체성 + 랜덤 roll.
- 보류는 무료, 활성 엔진 시간 30초 뒤 재기회. 골드 재굴림 50+25×min(100,환생 횟수).
- 수락 때만 레벨/몬스터 초기화; 동료·골드·도감 유지. 수락 후 120초 휴식으로 과도한 반복 제어.
- 선택 후보/roll/보류는 저장되고 offerSerial로 중복 지출과 오래된 클릭을 차단한다.
- 무료 외형 재장착, 중복 획득은 좋은 roll 보존.
- PvP는 검색 대신 상대 목록; 영웅+실제 배치된 동료+승패, 상대 선택→파티 편성→결정적 재생.
- 서버 전적/동료 이동 트랜잭션과 구버전 payload 호환성 구현. 실제 v0.4 서버 배포는 미실행.

### 이전 검증
2026-09-09 최종 50종 코드에서 실제 실행:
- npm test && npm run lint && npm run typecheck — 종료 0, 44개 테스트 파일/676개 테스트, 린트 경고 0.
- npm run build — 종료 0.
- 마지막 미리보기 생성기 추가 후 npm run lint 재실행 종료 0.
- 이전 하네스 selftest 8개 통과.
- 브라우저에서 환생 3후보, 50종 도감, 상대 목록 3명과 영웅/동료/승패, 상대 선택/환생, 필드/반전 PvP 검사. 콘솔 오류 없었음.
- npm run smoke / package 및 실서버 배포는 이전 Codex 그래픽 세션에서 실행하지 않았음. 네이티브/사람 플레이 완료로 간주하지 말 것.

## What was tried / 반드시 피할 방향
사용자는 초기 32×32 큰 영웅 50종을 크기·디자인·일관성 모두 부족하다고 거부했다. 원래 14×14 영웅의 단순 색상 변형도 부족하다고 했고, 이후 원본 체격·공격 자세·픽셀 크기를 유지하며 던전앤파이터의 직업별 의상·무기 감성을 섞은 3종을 승인했다. 후드/투구/의상/무기 디테일과 피부·눈 색 변화까지 승인한 뒤 50종 확장을 승인했다.
이제 아트를 다시 설계하거나 확대하지 않는다. 날개·후광·공중 장식, 별도 대형 캐릭터, 색상만 바꾼 신규 50종은 금지. 게임 재미 개선이 다음 작업이다.

## Harness execution
1. 새 세션 디렉터리(예: .agentdoc/v4-fun-post-heroes-20260909)를 사용한다. docs/v0.4/review-session의 과거 결과를 새 검토인 것처럼 재사용/덮어쓰지 않는다.
2. node .harness/v4/loop/fun.mjs selftest
3. node .harness/v4/loop/fun.mjs init <session>
4. next가 발급한 prompt와 template 전체를 해당 역할 에이전트에게 전달한다.
5. Designer → 독립 Critic → Balance → Playtester 순서를 준수하고 실제 응답을 submit한다. 오케스트레이터만 세션 상태를 쓴다. 역할 agent ID를 실제 값으로 기록한다.
6. 디자이너는 현재 루프를 먼저 진단하고 대안 3~5개와 측정 가설을 작성. 비평가는 지배 전략/가짜 선택/의미 없는 반복/업무 방해를 공격. major/blocker가 있으면 revise부터 다시 한다.
7. Critic 통과 개선을 실제 코드로 구현한다. 기존 엔진/주입 RNG·시계·입력과 Vitest를 재사용한다.
8. Balance는 실제 변경 엔진으로 100개 이상 seed, p10/p50/p90·재화 유입/유출·무료 경로를 측정한다.
9. Playtester는 5/15/30분 × active/idle/intermittent 9시나리오를 관찰하며 simulated와 human을 구분한다. 문제면 수정·재검증한다.
10. 최종 구현이 바뀌면 이전 소스 대상 리뷰를 그대로 완료 근거로 쓰지 않는다. 변경 버전이 명시된 새 세션/재검토 근거를 남긴다.
.harness/CURRENT는 v3로 유지한다. v4는 별도 재미 리뷰 CLI이며 v3 Ralph dispatch/collect 자동 머지/배포와 다르다.

## 유용한 기존 관측 — 독립 재평가할 가설
docs/v0.4/balance.json 및 review-session의 이전 결과:
- 첫 환생 p10/p50/p90 76/79/81초. 모든 프로필은 첫 120초를 초당2회 입력으로 시작하므로 순수 방치 결과가 아니다.
- 활동 30분 중앙값 1238처치/15환생/14종 수집. 성숙 파티는 환생 120초 간격.
- 동료 관리 없는 활동의 100%, 간헐 99%가 30슬롯에 도달. Roster 30/30 안내만으로 실제 관리 선택이 의미 있는지 검토.
- 초기 활동 후 방치 최장 무처치 p90 207초/최대414초(seed68): 긴 정체 구간.
- 항상 첫 후보를 고르는 정책은 14종에서 반복. 다른 후보에서 50종 수집은 가능하나 가짜 선택/목표감/수집 동기를 검토.
- 골드 재굴림과 동료 관리를 쓰는 행동은 미측정. 무료 보류와 비용의 가치 비교가 필요.
기존 수치를 무조건 바꾸지 말고, 기대·발견·수집·짧은 상호작용의 루프를 개선하는 관측 가능한 문제를 선택한다. 클릭/방치 성장, 보상 기대, 선택의 의미, 업무 중단 예산을 함께 평가한다. 새로운 시스템을 모두 추가할 필요는 없다.

## Review artifacts / reproducible UI
- docs/v0.4/hero-gallery.html/png: 확정50종, 대기·공격·정지·반전·확대.
- docs/v0.4/hero-redesign-comparison.html/png: 거부된 큰 디자인과 최신 작은 디자인 비교.
- docs/v0.4/hero-game-preview.html: production 메뉴/CSS/바인더/엔진/필드/PvP 재생을 메모리 데이터로 실행. 서버나 사용자 저장에 쓰지 않는다.
- docs/v0.4/hero-field.png, hero-choices.png, hero-pvp-list.png: 실제 렌더러/UI 로컬 캡처.
- .harness/v4/loop/render-heroes.mjs 및 render-hero-scenes.mjs: 위 HTML 생성기.
- .harness/v4/loop/render-hero-study.mjs --jobs: 승인3종이 실제 목록 h01/h05/h09로 연결된 기준 페이지.

## Acceptance criteria
- [ ] 확정50종이 필드·환생3선택·도감·PvP 목록/재생에서 같은 크기와 디자인으로 유지됨.
- [ ] 새 v4 세션에 4역할의 독립 보고서/근거/실제 ID가 수집되고 주요 발견이 해결됨.
- [ ] 발견한 재미/기능 문제를 코드로 개선하고 변경 전후 관측으로 효과와 남은 한계를 설명함.
- [ ] 성장/무료보류/골드재굴림/고정 속성·버프 정체성/랜덤roll/저장/오래된선택/PvP 회귀 없음.
- [ ] 실제 엔진100+seed와9시나리오, 원시 결과 및 백분위가 기록됨. 사람 재미를 시뮬레이션으로 단정하지 않음.
- [ ] 최종 소스에서 npm test && npm run lint && npm run typecheck 를 그대로 실행하여0, npm run build도0.
- [ ] 통합 담당자로 실행 가능한 네이티브 검증은 저장소 계약에 맞게 진행하고, 실행/미실행·출시 상태를 구분하여 HANDOFF와 세션 체크리스트에 기록함.
- [ ] 사용자에게 실제 개선점, 검증 결과, 리뷰/이미지 경로를 한국어로 보고함.

## Constraints
- 소스·기존 작업 보존. 루트 SPEC.md/IMPLEMENTATION_PLAN.md를 임의 수정하지 말고 v4 참조/세션으로 기록한다.
- 명령 이름/엄격한 TS·lint 설정 유지. 테스트 삭제·skip·무력화 금지. 새 의존성 없이 기존 엔진/도구 우선.
- 실제 글로벌 입력/Accessibility 권한을 프로그램으로 켜지 않는다. smoke는 simulated input을 사용한다.
- 별도 지시 없는 운영 서버 변경/push/실제 PvP·탈취 호출은 하지 않는다. 로컬 구현·검증은 계속 진행하고 미배포는 DESMON_SKIP_NET=1로 기록한다.
- 모델/스킬 자체의 평가를 사용자 선호나 실제 사람의 플레이 증거로 위조하지 않는다.
- 다른 작업자로 파일 쓰기를 나눌 때 소유권을 명시한다. 이 인계 세션 자체를 또 인계하고 끝내지 말고, 이번 세션이 개선 작업의 오케스트레이터가 되어 끝까지 수행한다.

