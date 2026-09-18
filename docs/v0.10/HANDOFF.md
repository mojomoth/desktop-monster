# DesMon 0.10.0 인계

**최신 작업은 에픽 외형 후속 변경이다.** 에픽 56종의 전용 형상과 머리 가림 수정을 적용한 현재 앱·설치파일은 [에픽 외형 기록](EPIC_ART.md)에 설명한다. 먼저 `.agentdoc/v10-epic-art-20260918/journal.json`과 같은 디렉터리의 `handoff.json`을 확인한다. 아래 전체 업데이트 검증은 외형 변경 전 동결 소스에 대한 이력이다. 기존 패키지는 후속 실행의 `preservation/release/`에 보존했다.

**구현·자동 검증 완료 — 2026-09-18 09:35 KST.** V10-01~10이 모두 현재 소스에서 검증됐다. matched03의 잔존 앱 문제를 수정한 후 새 사전등록 블록 matched04와 독립 결과 검토, 최종 통합 AC를 통과했다. 커밋·PR·운영 배포는 하지 않았다. 기존 미커밋 변경과 실패한 관측도 보존했다.

## 산출물

- macOS 앱: `release/mac-arm64/DesMon.app`
- macOS DMG: `release/DesMon-0.10.0-arm64.dmg`
- Windows x64 설치파일: `release/DesMon Setup 0.10.0.exe`
- [224종 장비 카탈로그](CATALOG.md), [기계 판독 카탈로그](EQUIPMENT_CATALOG.json)
- [밸런스 도출](BALANCE_REPORT.md), [실제 성능 관측](PERFORMANCE_REPORT.md), [아트·모션 근거](ART.md)
- [전체 검증 상태](ACCEPTANCE.md), [자율 실행 하네스](../../.harness/v10/HARNESS.md)

실행 디렉터리는 `.agentdoc/v10-20260917T070144Z`이며 `.agentdoc/v10-current`에도 기록되어 있다. 현재 작업 상태는 `loop.json`을 기준으로 하며, `sessions/host-01.md`는 진행·실패·수정·재검증 기록을 담는다.

초기 통합 검증 소스 digest는 `184854c67ae31ae5dea668165656e6b4a32f7b70ffc723464f231996e3c5e3ad`, 당시 macOS app.asar는 `28214fe34acea915f69af280e6f09e098001678d472f62893aa2aba69c222cc7`다. 당시 `reviews/final.json`은 전체 앱·DMG·Windows 설치파일 해시와 기능별 독립 검토를 연결한다. 최종 자동 AC의 실제 실행자는 Host `/root`이며, 역할 등록상 Critic의 과거 검토와 구분해 저널에 기록했다.

## 확인한 범위

정확한 canonical gates `npm test && npm run lint && npm run typecheck`에서 테스트 1,200개, 경고 0, 모든 strict 프로젝트가 통과했다. `npm run smoke`, `npm run package`, `npm run package:win`도 통과했다. DMG를 실제로 읽기 전용 마운트하고 Windows 설치파일을 추출해 검증한 앱 내용과 비교했다.

실제 패키지 Electron 16개 기능 시나리오와 150개 갤러리 페이지·7,148개 샘플·4개 전체보기를 검증했다. 밸런스는 탐색과 다른 정책별 100개 시드의 2,400개 체크포인트를 사용했다. 정책 두 이름은 같은 대조 행동을 사용하며, 사람이 느끼는 재미의 입증은 아니다.

최종 matched04는 기준선 활동·방치 각 30분과 후보 활동·방치 각 30분·혼합 180분을 실제 시간으로 관측했다. 원시 메트릭 3,592개와 프로세스 기록 3,609개를 독립 검사했으며, 열 번의 시작·종료 경계에 잔존 DesMon이 없었다. `reviews/performance-result-final.json`은 관측 결과를 승인하고, `reviews/release-critic-04.json`은 최종 AC 직전 근거를 독립 감사했다. 이후 Host가 최종 AC를 실행했다.

최종 AC 로그는 `evidence/V10-10-ac-1789691725829.log`(SHA256 `ac6e8d4aeefd192ca9ed39102e2c0032646cdb91bb99fa5284f53972fd813e2b`)다. `handoff.json`은 비교·격리·검토·명령 영수증·설치파일의 최종 해시를 연결한다. 앞선 활동 RAM 실패 두 건과 matched03의 격리 조건 거절은 유지한다. 이번 기준선이 높아져 계산된 한도도 높아졌고, 후보 활동 RAM은 최초 고정 숫자 한도를 여전히 초과한다. 같은 비교 산식으로 사전등록한 전체 블록을 판정했으며, 코드 개선의 인과 효과나 절대 RAM 상한을 주장하지 않는다.

## 후속 작업 시

먼저 현재 저널과 마지막 명령 영수증을 읽고, 진행 중인 프로세스가 있는지 확인한다. 이번 실행에 남은 작업은 없으며 관측 프로세스도 모두 종료됐다. 완료된 matched03·matched04 관측이나 과거 finalizer를 다시 실행하지 않는다. 소스·계약이 바뀌면 관련 AC와 근거를 다시 검증하며, 과거 실패를 지우지 않는다. 기존 `.harness/CURRENT=v3`와 루트 SPEC·계획 파일은 승인 범위에 따라 보존되어 있다.

Windows 실기기 실행, 실제 PostgreSQL 통합, 전역 입력 권한의 수동 검증, 사람의 재미 평가는 이번 자동 검증으로 대체하지 않았다. 운영 서버 배포는 제외했으므로 새 금화·영웅 장비 PvP 프로토콜을 사용하려면 호환 서버 업데이트가 필요하다.

현재 역할은 Host `/root`, Balance `/root/equipment_economy`, Designer `/root/sprite_qa`, Critic `/root/equipment_economy/cleanup_counterexamples`다. 이전 `/root/backend_v10`의 구현·독립 검토는 당시 검토한 소스 해시가 같은 범위에 한해 유지한다. 취소 5건과 정상 종료 2건은 하네스 정리 검증 자료이며 장시간 성능 표본에 포함하지 않았다.
