# DesMon 0.10.0 검증 기록

**최신 외형 후속 변경:** 에픽 무기 32종·악세사리 24종을 전용 도형으로 다시 제작했다. 현재 소스와 설치파일의 검증은 [에픽 외형 기록](EPIC_ART.md), `.agentdoc/v10-epic-art-20260918/journal.json`을 기준으로 한다. 아래는 변경 전 동결 소스의 전체 업데이트 검증 이력이며, 장시간 성능 결과를 새 빌드에 재사용하지 않는다. 이전 앱·설치파일은 후속 실행의 `preservation/release/`에 해시 일치 상태로 보존했다.

실행 디렉터리: `.agentdoc/v10-20260917T070144Z`. 원본 미커밋 변경과 실패한 시도는 이 디렉터리에 보존했다. 커밋·PR·운영 배포는 수행하지 않는다(`DESMON_SKIP_NET=1`).

**구현·자동 검증 완료 — 2026-09-18 09:35 KST.** 관측기 정리 결함을 수정하고 사전등록한 전체 matched04 관측, 독립 결과 검토, 현재 소스의 최종 통합 AC를 통과했다. 실행 저널의 V10-01~10은 모두 `verified`다. 최종 소스 digest는 `184854c67ae31ae5dea668165656e6b4a32f7b70ffc723464f231996e3c5e3ad`다.

| 검증 | 현재 결과 | 근거 |
|---|---|---|
| 전체 테스트·린트·타입 검사 | 통과: 1,200개 테스트, 경고 0, 모든 strict 프로젝트 | 실행 저널의 최신 canonical gates |
| 장비 카탈로그 | 통과: 무기 128종·악세사리 96종 | [카탈로그](CATALOG.md), [원본 데이터](EQUIPMENT_CATALOG.json) |
| 밸런스 | 통과: 탐색과 다른 시드, 8개 정책별 100개, 2,400개 체크포인트 | [도출 보고서](BALANCE_REPORT.md), `balance/final.json` |
| 스프라이트 | 150장·7,148개 샘플·4개 전체보기 생성, 독립 검토 승인. 메모리 최적화 전후 154개 PNG 모두 동일 | [시각 검토](REVIEWS/VISUAL_REVIEW.md), `native/gallery-final.json` |
| 실제 Electron 기능 | 통과: 최종 검증기 기준 16개 시나리오 | `native/final.json` |
| 설치파일 | 통과: 등록된 smoke·macOS·Windows 빌드, DMG 마운트·Windows 설치파일 추출 후 전체 앱 동일성 확인 | V10-09 AC, `evidence/installer-payload-04.json`, 최종 AC |
| 실제 장시간 성능 | 통과: 기준선 활동·방치 각 30분, 후보 활동·방치 각 30분·혼합 180분. 원시 메트릭 3,592개·프로세스 기록 3,609개 독립 검증 | [관측 기록과 조건](PERFORMANCE_REPORT.md), `performance/comparison.json`, `performance/isolation.json` |
| 독립 검토 | 승인: 코어·Host, 서버, 시각, 밸런스, 하네스, 최종 관측 결과. 구현자와 검토자 분리 | [검토 기록](REVIEWS/), `reviews/performance-result-final.json`, `reviews/release-critic-04.json` |
| 최종 통합 AC | 통과: 현재 소스·최신 명령 영수증·패키지·아트·밸런스·관측·독립 승인 연결 재검사 | `evidence/V10-10-ac-1789691725829.log`, `loop.json` |

밸런스의 8개 정책 이름 중 두 개는 같은 대조 행동을 사용하므로 800개의 서로 다른 행동 실험으로 해석하지 않는다. 기존 훈련·미끼를 포함한 최적 소비 전략이나 사람이 느끼는 재미를 입증한 결과도 아니다. 파괴·임시품 삭제·미획득 분포와 비용 비교의 한계는 도출 보고서에 기록했다.

Electron 관측은 실제 패키지·UI·IPC·코어를 사용하고, 개인 세이브와 운영 서버에 영향을 주지 않도록 입력과 서버 저장소를 주입한다. 실제 접근성 권한·전역 입력 훅을 자동으로 조작하지 않는다. Windows 실기기 실행, 실제 PostgreSQL 통합, 사람의 재미 평가는 미수행이다.

앞선 활동 RAM 실패 두 건과 matched03의 잔존 앱으로 인한 승인 거절은 유지한다. matched04의 기준선은 더 높았으며 활동 RAM 317.59375MiB는 최초 고정 숫자 한도 290.375MiB를 초과한다. 이번 승인은 변경하지 않은 비교 산식을 사전등록한 전체 블록에 적용한 결과이며, 절대 RAM 상한이나 최적화의 인과 효과를 입증하지 않는다.

최종 AC는 Host `/root`가 실행했으며, Critic의 독립 근거 검토와 구분해 저널에 기록했다. 로그 SHA256은 `ac6e8d4aeefd192ca9ed39102e2c0032646cdb91bb99fa5284f53972fd813e2b`다. [인계 기록](HANDOFF.md)에 산출물과 후속 절차를 정리했다. 후속 작업은 `.agentdoc/v10-current`가 가리키는 실행의 `loop.json`, `sessions/host-01.md`부터 확인하며, 완료된 관측을 중복 실행하지 않는다. 소스나 평가 계약을 바꾸면 관련 증거를 다시 검증한다.
