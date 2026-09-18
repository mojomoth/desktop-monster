# DesMon v0.4 구현 인계

패키지 버전 0.4.0. 최신 결과는 아래 **2026-09-10 「원정 결산 v2」** 절에 있다.
691개 테스트와 빌드·smoke·package를 통과했으며 운영 서버 배포와 사람 플레이는 미실행이다.
그 앞의 2026-09-09 내용은 영웅 제작 직후의 이전 구현·검증 기록이다.

영웅 디자인 최종 상태: 사용자가 승인한 [14×14 기준 3종](HERO_JOB_STUDY.md)을
10직업 × 5단계의 [50종](HERO_REDESIGN.md)으로 확장해 실제 영웅 목록에 적용했다.
후드·투구·의상·무기와 피부·눈 색을 구분하고, 원본의 눈·손·발 위치 및 공격 자세를 유지했다.

## 구현

- 레벨 성장 피해: `L + max(0, L−2)²`. 영혼 배율과 환생당 누적 +25%를 추가 적용한다.
- Lv.12 영웅 환생: 서로 다른 외형·속성의 후보 3명, 실제 도트 미리보기와 버프 수치.
- 10개 직업 × 5단계 = 50종 SD 영웅으로 재디자인. 대기 2·공격 3프레임, 250프레임.
  원본과 같은 14×14 크기·7색 이하. 직업별 의상·무기로 진화하며 색을 지워도 모두 구분된다.
  환생 96px 카드와 PvP 64px 목록 모두 영웅 본체는 56px, 도트 한 칸은 4px로 그린다.
- 외형/속성/버프 종류는 고정. 수치 10–25 추첨, 동일 속성 동료 +20–50% 또는 전체 동료 +10–25%.
- 무료 보류는 활성 엔진 시간 30초, 골드 재굴림은 `50 + 25 × min(100, 환생 횟수)`.
- 수락 때만 레벨/몬스터 초기화, 동료·재화·도감 보존. 성공한 환생에는 120초 휴식을 적용하여 성숙 파티의 연타를 제한한다.
- 추첨 후보/수치/대기는 저장된다. `offerSerial`로 중복 지출·오래된 선택을 거부한다. 보유 외형 무료 장착과 중복 획득의 최대 roll 보존.
- PvP 상대 목록에 영웅, 배치 파티, 승패. 상대 지정 → 기존 파티 선택/결정적 재생. 필드와 PvP에 같은 영웅 버프를 적용한다.
- 서버 승패/동료 이동의 트랜잭션, 중복 전투와 탈취 방어, 이전 DB의 누락된 party 호환.
- Designer → 독립 Critic → Balance → Playtester 하네스와 한국어 desktop-companion-clicker 스킬/장르팩.

## 검증 결과

`npm test && npm run lint && npm run typecheck`를 정확히 실행하여 종료 코드 0.
44개 테스트 파일, **676개 테스트 통과**, ESLint 경고 0, 모든 TypeScript 프로젝트 통과.
`npm run build` 종료 코드 0.
`node .harness/v4/loop/fun.mjs selftest`의 하네스 테스트 8개 통과.

실제 4역할 리뷰 세션은 `simulation_complete` 상태이며 Designer/Critic/Balance/Playtester 보고서 4개를 수집했다. 사람 검증과 출시 승인은 별도다.

실제 엔진 시뮬레이션: seed 1–100, 각 3프로필, 5/15/30분 총 900개 관측.
재현 명령:

```sh
DESMON_BALANCE_REPORT=docs/v0.4/balance.json npm test -- tests/balance.test.ts
node .harness/v4/loop/fun.mjs status docs/v0.4/review-session
```

첫 환생 p10/p50/p90: **76/79/81초**. 모든 프로필은 초기 120초 동안 초당 2회 입력으로 시작하므로 첫 환생 시간은 동일하다.
활동 30분 중앙값: 1,238처치, 15환생, 14종 수집. 성숙 파티는 환생 간격 120초 유지.
방치 프로필에서도 스크립트가 환생 제안을 열고 수락한다. 실제 무인 사용에서 14회 환생한다는 의미가 아니다.
이 결과는 사람이 느끼는 재미나 업무 방해 수준을 입증하지 않는다.

[`balance.json`](balance.json)은 원시 표본과 백분위를 함께 담는다.
[`review-session`](review-session/session.json)은 실제 역할 보고서와 당시 근거를 보존한다.
[`hero-gallery.html`](hero-gallery.html)은 외부 파일 없이 열 수 있는 50종 도감이다.
도감과 실제 필드/PvP를 로컬 캔버스로 렌더하여 시각 점검했다. 실제 macOS UI 조작 검증과는 구분한다.
SD 재디자인의 상세 검증과 변경 전후/환생/PvP 이미지는 [`HERO_REDESIGN.md`](HERO_REDESIGN.md)에 있다.

## 확인된 한계와 다음 관측

- 동료 관리를 하지 않으면 활동 30분의 100%, 간헐 입력의 99%가 30슬롯에 도달했다.
  Roster에 30/30 안내를 추가했다. 기존 Consume/Fuse/Sacrifice를 사용한 행동 관측이 필요하다.
- 초기 활동 후 방치의 최장 무처치 구간 p90은 207초, 최대는 414초(seed 68)였다. 느린 꼬리의 반복 플레이 만족도는 사람이 검증해야 한다.
- 항상 첫 후보만 고르는 정책은 초기 4종 + 최고 단계 10종 이후 14종에서 중복된다.
  두 번째/세 번째 후보에서 이전 단계 외형도 수집할 수 있다. 실제 후보 표본에서는 50종 모두 도달한다.
- 도감과 환생 후보는 숫자만 바뀌는 자동 저장 갱신에서 DOM을 유지하여 열린 도감과 키보드 포커스를 보존한다.
- 기준 시뮬레이션은 골드 재굴림과 동료 관리를 하지 않는다. 실제 재굴림 빈도와 가격 만족도는 미측정이다.
- 온라인 스냅샷의 영웅/동료 성장 수치는 기존 accept-and-rank 계약을 따른다. 서버가 확정하는 것은 PvP 판정과 전적·동료 이동이며 안티치트 서비스로 변경하지 않았다.

## 출시 전 남은 확인

**`npm run smoke`, `npm run package`, 실제 사람의 5/15/30분 플레이, 운영 서버 배포는 실행하지 않았다.**
저장소 AGENTS.md의 Codex 실행 제한을 준수하여 Electron 실행·패키징·git push를 하지 않았다.
기존 release/ 산출물이 있더라도 이번 v0.4 검증 산출물로 간주하지 않는다.

`DESMON_SKIP_NET=1`: 운영 서버를 변경하지 않았다. `src/shared/serverUrl.ts`의 기존 v3 서비스 주소를 유지했다.
서버 코드를 배포해야 실제 서비스에서 `/v1/pvp/opponents`와 공식 승패가 제공된다.
Postgres는 시작 시 wins/losses 열을 idempotent하게 추가한다. 배포 담당자는 실제 DB·구버전 공존과 `/healthz` SHA를 확인해야 한다.

기존 루트 SPEC.md/IMPLEMENTATION_PLAN.md와 v3 Ralph 빌더는 변경하지 않았다.
`.harness/CURRENT=v3`를 유지하며 v4 재미 리뷰는 `.harness/v4/loop/fun.mjs`로 명시적으로 실행한다.
CURRENT만 v4로 바꾸면 기존 lane/템플릿 소비자가 깨지므로 일괄 전환하지 않았다.
새 동작의 사양은 `.harness/v4/reference/GAME_DESIGN_V4.md`에 있다.
저장 스키마는 호환 가능한 version 3의 선택적 hero 필드 확장이며 이전 세이브는 유지된다.

전체 수동 체크리스트: `.harness/v4/reference/RELEASE_CHECKLIST.md`.

---

## v4 재미 리뷰 2차 세션 — 「원정 결산 v2」 (2026-09-10)

세션: [`.agentdoc/v4-fun-post-heroes-20260909`](../../.agentdoc/v4-fun-post-heroes-20260909/) ·
상태 `simulation_complete`, openFindings 0, 보고서 13건, 5라운드.
확정 50종 영웅은 이 세션에서 **변경하지 않았고**, 필드·환생 3선택·도감·PvP 목록/재생에서
같은 `heroFormSprite`를 그대로 쓴다.

### 구현한 것

- **방생 결산** — 로스터가 가득 찬 상태의 포획 draw가 조용히 사라지던 것을 `companionReleased`
  이벤트로 바꿨다. 2회당 영혼 1(`RELEASES_PER_SOUL`), 방생 개체가 로스터 최약체보다 강했는지 표시,
  메뉴 만석 안내에 방생 누계·영혼과 "가장 약한 X 방출" 원클릭(기존 `sacrifice` 재사용).
  저장에 기본 0의 가산 필드 `releasedCount` 추가.
- **도감 해금** — 오퍼 슬롯 0이 최고등급을 유지하되 그 등급을 다 모으면 전 등급 미수집으로 열린다.
  슬롯당 `rng.next()` 2회를 유지해 RNG 스트림 길이가 변하지 않는다.
- **원정 게이지(표시 전용)** — 휴식/보류 중에는 남은 대기를 비우고, 대기가 없으면 Lv.12까지의 성장을
  채우며, 오퍼가 준비되면 사라진다. 상시 점유는 x[2,60) y[16,21) 안 최대 168 px²(필드의 0.65%)이고
  영웅·몬스터·파티·카운터·배너와 교집합 0을 렌더 테스트로 단언한다.

### 측정된 효과 (동일 seed 1..100, `tests/balance.test.ts`와 동일 입력 모델)

수집 수치는 **항상 첫 후보만 선택하는 정책**의 결과다. 변경 전에도 다른 후보를 선택하면
50종 수집이 가능했으며, 전체 게임에 14종의 수집 상한이 있었던 것은 아니다.

| 지표 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 무음 폐기 draw (active 30분) | p50 **22**건 | **0건 (invariant)** |
| `companionReleased` | 0 | p10 15 / p50 **21** / p90 29 |
| 첫 후보가 미수집인 비율 | 93.3% | **100%** (900표본 전수) |
| 수집 고유 외형 (첫 후보만 선택) | 30분 14 / 60분 **14** | 30분 15 / 60분 **30** |
| 원정 무표시 최장 구간 (idle) | max **1,484초** | **0초** |
| 처치 p50 (active 30분) | 1,238 | 1,240 (**+0.16%**) |
| 첫 환생 p10/p50/p90 | 76/79/81초 | **동일** |
| 환생 횟수 (active 30분) | 15 | **15** |

재현: `DESMON_BALANCE_REPORT=.agentdoc/v4-fun-post-heroes-20260909/balance-final-source.json npx vitest run tests/balance.test.ts`

### 채택하지 않은 설계 (비평가가 반증)

- **각인 재추첨** — 버프 밴드 상한 25 + 무료 재장착 때문에 87/100 seed가 약 10분·3,425골드에서 포화.
  골드 사인이 다시 죽는다.
- **원정 재촉**(골드로 120초 휴식 단축) — 선언된 방해 예산 계약을 상품화한다. 30분 선택 기회 15→21회(+40%),
  지출이 하방 없는 지배 전략(+37.4%, 100:0:0), `restRecalls`가 `offerSerial`을 대체하지 못해
  오래된 클릭으로 400골드 중복 차감이 실증되었다.

### 남은 미해결 (정직한 이월)

- **U1 죽은 골드**: 30분 잔액 p50 25,782 = 선언 상한 10,125의 2.5배. 소비처는 `heroReroll` 하나뿐.
- **U2 가짜 재굴림**: 동일 seed에서 재굴림 정책이 수집 0승 100무.
- **U3 idle 정체**: 최장 무처치 p90 207초 / max 414초. 원인은 표시가 아니라 스폰·성장이다.

다음 라운드 사전 조건 N1~N5(포화 금지 / 방해 예산 불변 / 하방 존재 / `offerSerial` 짝 방어 / 지출 게이트)는
`designer-r5.json`에 있다.

### 검증 상태

`npm test && npm run lint && npm run typecheck` 종료 0 — **45 파일 / 691 테스트**, 경고 0.
`npm run build` 종료 0. **`npm run smoke` → `SMOKE_OK`, 종료 0.**
**`npm run package` 종료 0 — `release/mac-arm64/DesMon.app`, `release/DesMon-0.4.0-arm64.dmg`(무서명).**
하네스 selftest 8개 통과.

**여전히 미실행**: 사람의 5/15/30분 플레이(참가자 0명 — 재미·외형 선호·업무 방해는 PENDING),
패키지 앱의 실제 조작과 Accessibility 승인 상태의 전역 입력 동작, 운영 서버 배포(`DESMON_SKIP_NET=1`).
이번 변경은 서버 API를 건드리지 않는다(`releasedCount`는 `src/shared/api.ts`·`src/main/net.ts`·`src/server/`에 없다).
전체 기록: [`RELEASE_CHECKLIST.md`](../../.agentdoc/v4-fun-post-heroes-20260909/RELEASE_CHECKLIST.md).
