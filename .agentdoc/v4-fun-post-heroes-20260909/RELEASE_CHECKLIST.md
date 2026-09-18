# v0.4 출시 검증 기록 — 세션 `.agentdoc/v4-fun-post-heroes-20260909`

2026-09-10 실행 기록. 대상 구현: 「원정 결산 v2」(A1' 원정 게이지 + A3' 방생 결산 + A5' 도감 해금)
및 P1/P2b/P2c 후속 수정까지 반영한 최종 소스. 미실행 항목은 PENDING으로 남겼다.

이 파일의 기본 상태는 미검증이다. 실행 후 세션 디렉터리에 복사해 결과/명령/로그 경로를
기입한다. 기능 구현, 하네스 통과, 패키지 제작, 배포, 사람의 재미 평가는 다른 증거다.
`simulation_complete`만으로 아래 항목을 체크하지 않는다.

## 재현 가능한 코드 검증

- [x] `node .harness/v4/loop/fun.mjs selftest` 통과 (8 tests). 합성 fixture이며 게임 재미의 증거가 아니다.
- [x] `npm test && npm run lint && npm run typecheck` 그대로 실행 → 종료 0. **45 파일 / 691 테스트**, ESLint 경고 0.
- [x] 영웅 50종, 오퍼 3장 ID/속성 중복 0, roll 정수 10–25, 버프 identity 불변 (`tests/expedition.test.ts`, `heroForms.test.ts`, `hero.test.ts`).
- [x] 수락/보류/재굴림/골드 부족/중복 클릭/세이브 재로드/기존 세이브 보존 확인 (비평가 라운드 5가 stale serial 4종 프로브로 재현, `critic-evidence.md`).
- [x] 영웅 버프 자동 파티와 PvP 판정/재생 일치 — `tests/server/pvp.test.ts` 포함 전체 통과, `releasedCount`는 PvP 경로에 미도달.
- [x] 상대 목록 empty/offline/stale — 기존 v0.4 테스트 유지, 이번 변경이 접촉하지 않음.
- [x] seed 1..100 × 3프로필 × 5/15/30분 = **900 표본** + 60분 별도 계측. 원시: `balance-after.json`, `balance-final-source.json`, `balance-r5-probe.json`, `playtest-raw*.json`.
- [x] 비평가 finding 전원 처리: 라운드 1 C1–C7 → 라운드 2 verified, 라운드 3 C13–C19 / 라운드 4 C20–C26 → 설계 미채택 및 라운드 5 verified. 최종 openFindings 0.

실행자/빌드: 오케스트레이터 세션 `desktop-monster-37`, 로컬 macOS(darwin 25.2.0, arm64), 패키지 버전 0.4.0.
명령 결과/로그: 위 각 항목에 기록. 밸런스 재현 명령 —
`DESMON_BALANCE_REPORT=.agentdoc/v4-fun-post-heroes-20260909/balance-final-source.json npx vitest run tests/balance.test.ts`
알려진 제한과 남은 finding: **U1 죽은 골드**(30분 잔액 p50 25,782 = 선언 상한 10,125의 2.5배, 소비처는 `heroReroll` 하나),
**U2 가짜 재굴림**(동일 seed에서 수집 0승 100무), **U3 idle 정체**(최장 무처치 p90 207초 / max 414초).
셋 다 이번 세션에서 **정직하게 이월**했으며 다음 라운드 사전 조건 N1~N5가 `designer-r5.json`에 있다.

## 실제 macOS — 부분 실행

- [x] `npm run smoke` headful macOS, simulated input으로 **`SMOKE_OK` 출력, 종료 0** (2026-09-10 실행).
- [x] `npm run package`가 **`release/mac-arm64/DesMon.app`과 `release/DesMon-0.4.0-arm64.dmg`** 생성, 종료 0.
      electron-builder 26.15.3 / electron 39.8.10 / darwin arm64, 코드 서명은 `CSC_IDENTITY_AUTO_DISCOVERY=false`로 생략(무서명).
- [ ] 기존 세이브의 패키지 실행/종료/다시 실행 후 동료·골드·영웅 제안/roll/전적 유지.
- [ ] 입력 Accessibility 권한 미승인 상태에서 충돌 없음; 사용자가 승인한 실제 입력 동작 확인.
- [ ] 오버레이 크기/2× 픽셀 스케일, 창 포커스/숨김/메뉴/드래그/소리 동작 확인.
- [ ] 선택 UI가 업무 포커스를 강제로 가져오지 않으며 클릭이 잘못된 지출로 이어지지 않음.

실기기/OS/실행자: 로컬 macOS darwin 25.2.0 arm64, 오케스트레이터 세션이 직접 실행.
실행/실패/미실행 사유: smoke·package는 **실행하여 통과**. 아래 네 항목(기존 세이브로 패키지 실행, Accessibility 미승인
상태 확인, 실제 사용자 입력 동작, 오버레이/포커스/소리/드래그 조작)은 **사람의 조작과 TCC 권한 승인이 필요하여 미실행 → PENDING**.
프로그램으로 Accessibility 권한을 켜지 않는다는 세션 제약을 준수했다.

## 사람의 5/15/30분 플레이 — PENDING

- [ ] 참가자/빌드/시작 세이브/관찰 시간을 기록. 관찰과 해석을 분리.
- [ ] 레벨업 피해 상승을 인지하는지, 첫 환생을 발견하는지 확인.
- [ ] 50종 전체 시트에서 색을 제외한 형태 차이, 상위 진화의 멋짐/가독성을 비교.
- [ ] 3개의 미리보기/속성/버프를 비교하고 원한 외형을 선택할 수 있는지 관찰.
- [ ] 보류 후 재방문, 골드 재굴림 비용 이해, 의도치 않은 소비 여부 관찰.
- [ ] 단일/혼합 파티에서 다른 버프를 고르는 행동이 있는지 관찰.
- [ ] PvP 검색 없이 상대 목록의 영웅/파티/전적을 보고 대상을 선택하는지 관찰.
- [ ] 작업 중단/불필요한 메뉴 재방문/지루해진 시점/다시 보고 싶은 외형을 기록.

실제 참가자 세션 없이 이 절을 통과 처리하지 않는다. AI/스크립트 관측은 simulated로 기록한다.
참가자 수/관찰 파일/핵심 행동: **참가자 0명 → 이 절 전체 PENDING.**
자동 관측은 `playtest-evidence.md`에 `mode: simulated`로만 기록했다. 9시나리오(5/15/30분 × active/idle/intermittent)
실패 0건은 **시뮬레이션 결과**이며 사람이 느끼는 재미·외형 선호·업무 방해의 증거가 아니다.
사람 확인이 필요한 미해결 항목: 상시 원정 게이지가 안심인지 장식인지, 30분 21회 RELEASED 토스트가 정보인지 소음인지,
파랑(대기)/초록(성장) 게이지 구분의 가독성, idle 장시간 저속 진행의 체감, 실제 업무 중단 횟수.

## 서버와 버전 전환 — PENDING

- [x] package 버전 0.4.0. 저장 호환: `releasedCount`는 기본 0의 **가산 선택 필드**이며 v1/v2/v3 마이그레이션과
      `parseSave` 왕복을 통과한다(`tests/save.test.ts`의 전용 테스트 + 기존 회귀 통과).
- [x] `.harness/CURRENT`는 **v3 그대로 유지**했고, 재미 리뷰는 `.harness/v4/loop/fun.mjs`로 새 세션
      `.agentdoc/v4-fun-post-heroes-20260909`에서만 실행했다. `docs/v0.4/review-session`은 건드리지 않았다.
- [ ] 배포 대상/브랜치/서비스 ID를 확인하고 승인된 배포 작업의 결과를 기록.
- [ ] `/healthz`의 배포 SHA와 클라이언트 연결 대상 일치.
- [ ] 기존 v3 클라이언트/세이브를 고려한 영웅 및 전적 없는 payload 호환성 확인.
- [ ] 허가된 probe로 등록→업로드→목록 검증. 실제 PvP/탈취를 probe에서 수행하지 않음.

네트워크 배포를 실행하지 않았다면 `DESMON_SKIP_NET=1`과 사유를 인계 기록에 남긴다.
배포 SHA/URL 또는 DESMON_SKIP_NET 사유: **`DESMON_SKIP_NET=1` — 운영 서버를 변경하지 않았다.**
세션 제약상 별도 지시 없는 운영 서버 변경/push/실제 PvP·탈취 호출을 하지 않았다. 이번 변경은 서버 API를
건드리지 않으며(`releasedCount`는 `src/shared/api.ts`·`src/main/net.ts`·`src/server/`에 존재하지 않음)
기존 v3 서비스 주소를 유지한다. `/healthz` SHA 확인과 probe는 배포 담당자의 몫으로 PENDING.

## 인계

완료한 구현: 「원정 결산 v2」 — (A3') 로스터 만석에서 사라지던 포획 draw를 `companionReleased` 이벤트로 만들고
2회당 영혼 1을 지급(`RELEASES_PER_SOUL`), 방생 개체가 최약체 대비 강한지 표시, 메뉴에 방생 누계와 "가장 약한 X 방출"
원클릭 추가. (A5') 오퍼 슬롯 0이 최고등급을 다 모으면 전 등급 미수집으로 열려 도감이 14종에서 멈추지 않음.
(A1') 표시 전용 원정 게이지 — 휴식/보류 중에는 남은 대기를 비우고, 대기가 없으면 Lv.12까지의 성장을 채운다.
저장에 `releasedCount` 가산 필드 추가. 그리고 라운드 3/4에서 **설계했으나 비평가가 반증하여 구현하지 않은 것**:
「각인 재추첨」(포화), 「원정 재촉」(방해 예산 상품화 + 지출 지배 전략).

실행한 검증과 결과: `npm test && npm run lint && npm run typecheck` 종료 0 (45 파일 / 691 테스트, 경고 0),
`npm run build` 종료 0, `npm run smoke` **SMOKE_OK / 종료 0**, `npm run package` 종료 0(.app + .dmg 생성),
하네스 selftest 8개 통과, v4 세션 `simulation_complete` / openFindings 0 / 보고서 13건.
효과 측정(동일 seed 1..100, 동일 입력 모델): 무음 폐기 draw **p50 22건 → 0건(invariant)**,
`companionReleased` **0 → p10 15 / p50 21 / p90 29**, 첫 후보 미수집 비율 **93.3% → 100%(900표본 전수)**,
수집 **30분 14→15 / 60분 14→30**, 원정 무표시 최장 구간 **idle max 1,484초 → 0초**.
회귀: 처치 p50 1,238 → 1,240(**+0.16%**), 첫 환생 p10/p50/p90 76/79/81 **불변**, 환생 15회 **불변**.

미검증 human/native/deploy: 사람 플레이 세션 0명(재미·외형 선호·업무 방해 전부 PENDING),
패키지 앱의 실제 조작·Accessibility 권한 승인 상태의 동작·오버레이/포커스/소리 확인 미실행,
운영 서버 배포 미실행(`DESMON_SKIP_NET=1`).

다음 반복에서 검증할 가설: U1 골드 사인은 **포화하지 않으면서(N1) 방해 예산을 늘리지 않고(N2) 하방이 있고(N3)
`offerSerial`과 짝을 이루는 중복 방어를 갖춘(N4)** 축에서만 설계한다 — 1순위 후보는 "선택 기회의 빈도가 아니라
한 원정 안의 밀도를 사게 한다". U3 idle 정체는 표시가 아니라 스폰/성장이 원인이므로 처치 곡선 회귀 예산과 함께
설계해야 한다. 상시 게이지의 소음 여부(P2)는 사람 관찰이 필요하다.

이 네 줄을 구체적으로 채운다. 미실행을 실패나 통과로 바꾸지 않는다.
