# Host / Playtester — 좌상단 HUD·환생 휴식 제거

실제 agent ID `/root`. 기존 변경과 개인 저장을 보존하고 별도 실행에서 확인했다.

## 현재 소스 검증

- 정확한 `npm test && npm run lint && npm run typecheck` 실행: 73개 파일 1,071개 테스트·lint·typecheck PASS.
- 게이트·역할별 AC의 시작/종료 소스 digest: `8500daa5a09e299fdf67763e720cb2c2b931049385deb81ae194fb5bd06738d1`. 추가 소스 변경 없음.
- 일반 전투 100 seed × 가상 30분 × 2정책, 200쌍의 이벤트·상태·RNG·캡처 결과 일치.
  실제 기준선은 이 세션의 변경 전 v0.9 컴파일 보존본이다. 재사용 runner의 v0.8/v0.9 설명 문자열을 새로운 입력 라벨로 오인하지 않는다.
- 실제 환생 선택 후 공격으로 레벨을 회복하면 tick 없이 다음 후보가 열린다. 레벨 미달·옛 serial은 거부한다.
- 구세이브·원문 해시를 검증한 구백업·미완료 journal 재생에서 휴식만 제거된다. 후보·serial·보류 30초·보상·상한은 보존된다.

## 실제 설치 앱

macOS DMG를 read-only mount하여 소유 디렉터리에 설치 복사했다. 302개 일반 파일이 원본 앱과 일치했고 mount를 해제했다.
설치 ASAR SHA-256: `c4dafbd5bcbbccb1f60ac0fed69e1664e5b945bbab7d6570a93b481799aa9875`.

- 기존 실제 통합 검사 29개(2회 부팅)와 집중 검사 13개(3회 부팅) PASS.
- Host가 `native-integration/first/field-hud.png`, `hero.png`,
  `native-no-rest/first/hero-after-choice.png`, `native-no-rest/deferred/hero-deferred-start.png`를 직접 열어 확인했다.
- 좌상단은 비어 있고 머리 위 LV·XP·READY와 우상단 처치 수·골드가 유지된다.
- 선택 직후 Lv.1의 다음 레벨 조건만 표시하며 휴식은 없다. 보류 중에는 별도 30초 안내가 남는다.
- 복원된 유효 후보 3명과 serial이 재시작 후에도 유지되고, 원본 체크포인트는 바뀌지 않는다.
- 격리 네트워크는 두 합성 계정의 in-process 서버이며 실서비스 PvP·개인 파일·글로벌 입력 후크를 사용하지 않았다.
- OS 확인창 응답만 주입했다. 실제 production 메뉴/IPC/확인 옵션 검증이며 OS 모달 자체의 시각 검수는 아니다.

## 패키지와 검증 한계

macOS smoke·DMG 및 Windows NSIS/unpacked 패키지를 갱신했다. Windows의 109개 제품 파일은 현재 컴파일 출력과 일치한다.
로그와 최종 패키지 해시는 `artifacts.json` 및 Host 저널에 보존한다.
장시간 성능 실험을 재실행하지 않았으며 과거 결과는 과거 소스의 기록으로 유지한다.
Windows 11 실제 실행·CI, 실제 Steam AppID 초기화, 운영 배포·마이그레이션 및 사람 검증은 기존 PENDING이다.
공개 출시 가능 판정은 이번 기능 수정 검증과 별도다. 커밋·푸시·배포하지 않았다(`DESMON_SKIP_NET=1`).

## 최종 Host / Playtester 판단

Designer → Critic → Balance의 최종 PASS를 수집했다. 새 증거와 설치본·현재 소스 해시를 다시 대조했고 불일치가 없다. 승인된 후속 변경은 구현·자동 검증 완료로 판정한다. 위 외부 환경 대기와 공개 출시 판정은 분리한다.
