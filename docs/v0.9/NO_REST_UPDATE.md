# v0.9 후속 변경 — 좌상단 HUD와 환생 휴식 제거

2026-09-16 승인 변경. 기존 v0.9 기획·검증 기록은 당시 소스에 대한 기록으로 보존한다.
현재 동작·측정 매개변수 기준은 [NO_REST_UPDATE.json](NO_REST_UPDATE.json)이다.

## 구현

- 좌상단 목표 레벨·대기 게이지·예상 영혼 보상을 제거한다.
- 성공한 영웅 환생의 2분 휴식을 제거한다. 다음 필요 레벨에 도달하면 바로 후보를 열 수 있다.
- 영웅 머리 위 LV·XP·준비 표시, 우상단 처치 수·골드, 환생 레벨·보상·상한은 유지한다.
- 후보 보류 후 활성 플레이 30초 대기는 유지한다.
- version 3 구저장의 `restRemainingMs`는 파싱에서 버린다. 새 저장에는 포함하지 않는다.
  유효한 기존 후보·선택 번호·당시 필요 레벨을 보존한다.
- 체크포인트·미완료 작업 저널의 원문 해시 검증을 유지한다. 검증 후 같은 파서를 적용하며
  구백업 원본은 변경하지 않는다. `heroRestMs`는 과거 측정 설정과의 호환을 위해 0으로 등록한다.

## 검증 기록

현재 실행: [별도 세션](../../.agentdoc/v09-no-rest-20260916T095321Z/).
원본 소스 192개, 변경 전 코어 빌드와 macOS·Windows 설치본은 해당 세션 `preservation/`에 보관했다.
Host만 저널을 기록하며 Designer → Critic → Balance → Host/Playtester 순서로 판단을 수집한다.

| 역할 | 실제 agent ID | 소유 범위 / AC |
|---|---|---|
| Designer | `/root/designer` | HUD·필드·관련 테스트 및 `no-rest-ui.mjs`; HUD/expedition/renderer/effects 테스트와 실제 이미지 확인 |
| Critic | `/root/critic` | 독립 제품·테스트·증거 리뷰; 제품 파일 수정 없음 |
| Balance | `/root/balance` | hero/engine/progression 및 관련 테스트; 구세이브·보류·실제 환생 후 무시간 후보 재개 |
| Host / Playtester | `/root` | 메뉴·복구 테스트·문서·통합·패키지·실제 앱 검증; 앞선 코어/HUD에 의존 |

최종 결과는 세션의 `followup-journal.json`과 `reviews/`에 기록한다.
`npm test && npm run lint && npm run typecheck`를 정확히 실행한다.
200개 일반 전투 비교는 변경 직전 v0.9와 후속 소스의 100 seed × 30분 가상 시간 × 2정책이다.
이 비교는 환생 선택을 실행하지 않는다. 시간 경과 없이 실제 환생·레벨 회복·다음 후보를 여는 동작은
별도 코어 테스트로 검증한다. 격리 네이티브 UI의 레벨·백업은 합성 fixture이며 자연 플레이나 성능 실험이 아니다.

## 검증 상태와 한계

**구현 완료 / 이번 변경의 자동 검증 완료.**

- 정확한 게이트 `npm test && npm run lint && npm run typecheck`: 73개 파일·1,071개 테스트, lint 경고 0개, typecheck 통과.
- 역할별 AC: HUD 129개, 코어 91개, 메뉴·복구 22개 테스트 통과. 일반 전투 200개 paired case 일치.
- 새 DMG에서 복사한 앱으로 기존 네이티브 통합 29개와 휴식 제거 집중 13개 검사 통과.
  집중 검사는 3회 부팅, 실제 환생 선택, 구백업 복원·재시작, 30초 보류 카운트다운과 10개 화면 캡처를 포함한다.
  확인창은 실제 IPC의 취소 기본값·요청을 검증하고 OS dialog 응답만 주입한다. OS 모달 자체의 시각 검수는 아니다.
- macOS smoke·DMG 생성·설치 복사(302개 파일 일치)·실행·재시작 통과.
- Windows NSIS 설치본·unpacked 앱 갱신, 109개 제품 파일이 현재 컴파일 출력과 일치.
- 소스·로그·패키지 SHA-256: 세션의 `gates.json`, `acceptance.json`, `artifacts.json`, `followup-journal.json`.

현재 산출물: [`DesMon-0.9.0-arm64.dmg`](../../release/DesMon-0.9.0-arm64.dmg),
[`DesMon Setup 0.9.0.exe`](<../../release/DesMon Setup 0.9.0.exe>).
**외부 환경 검증은 대기이며 공개 출시 가능 판정은 하지 않는다.**
과거 [v0.9 검수](ACCEPTANCE.md)의 장시간 성능·PNG·PostgreSQL 검증을 현재 소스 결과로 재분류하지 않는다.
이번 변경에서 장시간 성능 실험을 다시 수행하지 않는다.
Windows 설치본 생성과 실제 Windows 실행 검증은 구분한다. Windows CI 실행·실기기 입력/DPI/설치 수명주기,
실제 Steam AppID 초기화, 운영 서버 배포·마이그레이션, 사람의 재미 검증은 기존과 같이 별도 대기다.
이번 작업은 커밋·푸시·운영 배포·공개 출시를 수행하지 않는다(`DESMON_SKIP_NET=1`).
