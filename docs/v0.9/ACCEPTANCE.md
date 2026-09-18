# v0.9 검수 상태

실행 세션: `.agentdoc/v09-20260915T084032Z`.
원본 450개 파일·기존 v0.8 앱·기존 실패 기록과 `.harness/CURRENT=v3`를 보존했다.

## 구현

- 상대 목록의 전투 버튼 → 저장 편성/자동 편성으로 즉시 전투.
- 레벨·서버 PvP 승수·최고 단계·환생 순위, 공동 순위와 안정된 정렬.
- 초기화·복원 확인, 최근 5개 원자적 백업, 작업 저널·세대별 저장 차단.
- 서버 소유권 제거 이력, 복원되지 않는 동료 ID 상한, 별도 초반 포획 사용량.
- 70종 영웅·135종 몬스터 공격 효과와 읽기 쉬운 HUD.
- 영웅·개별 동료·파티·도감·필드·최근 PvP 결과의 1200×1200 PNG 미리보기·저장·복사.
- Windows NSIS/unpacked·CI·스모크 명령, 선택적 Steam 초기화와 SteamPipe 검사용 구성.

## 자동 검증

| 항목 | 결과 | 근거 |
|---|---|---|
| 테스트·린트·타입 | PASS: 1,063 tests | 정확한 `npm test && npm run lint && npm run typecheck` 실행 |
| 정상 진행 회귀 | PASS: 200/200 동일 | `core-regression-2.json`, 100 seed × 30분 × new-active/returning-idle; 추가 포획 메타데이터만 제외 |
| 저장·온라인 실패 처리 | PASS | recoveryV9, recoveryCaptureV9, onlineV9: 디스크 실패/저널 복구/오래된 저장/중복 클릭/응답 유실/도중 소유권 이동 |
| PostgreSQL 16.15 | PASS | `postgres-03.json`: 구 스키마 이전, 네 지표 MemoryStore 대조, 40건 제거·구서비스 쓰기, ID 상한·롤백, 서버 재시작 후 영수증 재시도 |
| macOS 빌드·스모크 | PASS | `smoke-01.log`, `V09-08-ac-1789464939451.log`; DMG에서 격리 설치한 앱과 원본 ASAR 해시 동일 |
| 실제 앱 UI·재시작 복원 | PASS | 최종 설치본 `native-05`: 최초 23 + 재시작 6 검사, PNG 8개, 패키지 모듈 109개 대조 |
| 효과 시각 검수 | PASS | visual-02: 410 경우·13 PNG, 전체 영웅·몬스터와 밝고 어두운 배경의 실제 Electron 출력 |
| Windows 설치본 생성 | PASS | `package-win-04.log`, `release/windows-manifest.json` |
| Steam 준비 | PASS: 선택적 실패 처리·모듈 로딩·템플릿 | 실제 AppID 초기화와 별도. `steam-stage-fixture-02`의 480/481은 검사용 값 |
| 실제 시간 성능 | PASS | `performance-02/comparison.json`: 기준/후보 active·idle 각 30분 + 후보 mixed 180분, 총 5시간, 기존 v0.8 예산 유지 |

### 성능 수치

| 지표 | 후보 | 한도 |
|---|---:|---:|
| 활성 CPU p95 | 2.745% | 3.642% |
| 활성 working set p95 | 254.734 MiB | 298.219 MiB |
| 대기 CPU p95 | 2.497% | 3.470% |
| 대기 working set p95 | 260.813 MiB | 316.125 MiB |
| 혼합 마지막 30분 메모리 중앙값 | 208.672 MiB | 279.016 MiB |

혼합 초기 중앙값은 229.016 MiB다. 2,152개 원시 표본, 메뉴·공유 반복 18회,
오류 0건과 정상 종료를 확인했다. working set 합은 프로세스 간 공유 페이지를 중복 계산할 수 있다.

검증기의 초기 저장·종료 집계 오류를 교정했다. 최초 주기 저장 전의 정확히 같은 초기
fixture에만 초기 시계 0을 인정하고 기존 10초 저장 지연 한도를 유지한다. 마지막 180분
표본 입력은 10,659회이며, 필수 마지막 메뉴 캡처 중 1.7초에 발생한 입력 3회는 같은
스케줄 기준으로 별도 검증했다. 앱·관측기·프로토콜·원시 기록·성능 예산은 변경하지 않았다.
`performance-verifier-initial-save.json`, `performance-verifier-closeout.json`,
`reviews/critic-performance-verifier-01.md`, `reviews/critic-performance-closeout-01.md`에
원래 거부와 교정 근거를 보존했다. 큐의 원래 비교 실패 기록은 그대로 두고
`performance-report-02.log`와 재검증된 comparison을 최종 판정으로 사용한다.

짧은 `performance-diagnostic-baseline`은 관측기 시작 확인용이며 30분/180분 성능 통과로 계산하지 않는다.
실제 앱 검사는 합성 입력·격리 저장·주입된 서버 처리기를 사용한다. 개인 저장·전역 입력 권한·운영 PvP를 사용하지 않았다.

## 외부 환경 검증 대기

- Windows CI 실제 실행과 Windows 11 실기기 입력·DPI·다중 모니터·설치 수명주기.
- 실제 Steam AppID/DepotID·파트너 SDK·계정 초기화·Steam 설치.
- 운영 서버 선행 배포 및 공유 DB 마이그레이션. 구서비스의 PvP 생성은 함께 업그레이드/중단해야 한다.
- v0.8부터 미완료인 사람 관찰은 그대로 PENDING이다.

**구현 완료 / 자동 검증 통과 / 외부 환경 검증 PENDING / 출시 보류.**
최종 게이트·등록 AC·배포 파일 해시와 개별 증거의 연결은 실행 폴더의
`v9-journal.json`, `final-evidence.json`, `artifacts-verified.json`에서 확인한다.
외부 검증이 남아 있으므로 공개 출시 가능으로 선언하지 않는다.
