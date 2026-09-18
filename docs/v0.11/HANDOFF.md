# v0.11.0 인계

사용자의 범위 확대 승인에 따라 HUD·메뉴·수동 장착과 반복 환생을 구현했다. R19-B 밸런스와 실제 앱 검증, smoke·양 플랫폼 패키징은 통과했다. 활동30분·방치30분 자원 비교와 독립 재계산도 통과했다. 최종 작업 상태는 [저널](../../.agentdoc/v11-20260918-resume/loop.json)을 따른다. `DESMON_SKIP_NET=1`; 원격 push와 운영 배포는 하지 않는다.

## 버전과 산출물

- v0.10.0 기준선: `c2b20bb7573c39515e21c40f7162d50966468be0`, annotated tag `v0.10.0`.
- 이전 미완료 v0.11 체크포인트: `5d3d1d9`. 원본 실패·관측은 `.agentdoc/v11-20260918`에 보존했다.
- 현재 동결 소스: `9397d1abd6ec13db2b253b4bcfdb11febcff15780eab6decc9609ccaa333f30b`.
- 앱: `release/mac-arm64/DesMon.app`.
- macOS: `release/DesMon-0.11.0-arm64.dmg`, SHA-256 `1401152a102382e221ff9a77dc80e73a128b6b1012ebe4dcce694cadbc49c89e`.
- Windows: `release/DesMon Setup 0.11.0.exe`, SHA-256 `6fbc96ec11d9bb00f59e67e735f3e179d6e2f6ec7d7d84b31601ac8844311118`.
- 최종 macOS app.asar: `31c94f63d3c0181d5289bb9655ec38586c02d8a6f4875a5e16cc337e8f623d1d`.

기준선 앱은 `.agentdoc/v11-20260918/preservation/DesMon-0.10.0.app`, 이전 체크포인트 앱은 `.agentdoc/v11-20260918-resume/preservation/DesMon-0.11.0-checkpoint.app`이다. 대용량 앱·설치파일·컴파일 중복물은 로컬에 보존하고 Git에서 제외한다. 소스·테스트·프로토콜·원본 검증 기록은 커밋한다. [실제 설치파일 추출 검증](../../.agentdoc/v11-20260918-resume/evidence/package-payloads-02.json)은 양 설치파일의 내용과 현재 빌드를 연결한다.

## 변경 동작

좌상단 금화/처치 HUD, 몬스터 머리 위 데미지 상승, 레벨업 외곽선·느린 점멸, 영웅 위 FEVER 점멸을 적용했다. 레벨업·환생 준비·FEVER가 동시에 보여도 겹치지 않는다. 도감 오른쪽 아래 화살표, 저장 갱신에도 유지되는 성장 선택과 장비/상점 펼침, 560px 메뉴의 8탭 한 줄 배치를 구현했다. ‘영혼 회귀’는 영웅 탭에, ‘내보내기’는 내 기록에 있다. 처리 중 상태를 즉시 표시하고 실제 반영 후 결과를 보여준다.

수동 무기는 현재 무기를 교체하고 악세사리는 빈자리에 넣으며 네 자리가 차면 교체 대상을 선택한다. 선택은 저장·재시작·금화 갱신과 무관한 거래 후에도 유지된다. 이후 획득한 호환 장비가 현재 조합의 실제 공격력을 높일 때만 자동 교체하고 동률이면 유지한다. 강화 성공·레벨 조건 해제는 해당 후보만 평가한다. 소유권·직업·레벨·중복 ID·revision·가방 위치를 검증하며 실패 이유를 표시한다.

영웅 환생은 시간 잠금 없이 최소Lv26과 고정 필드 곡선으로 조정했다. 전투 시작 시 저장한 총 회귀 횟수에 따른 같은 배율을 HP와 동료 사냥 공격력에 적용한다. 영혼 회귀는 별도 기능이다. 동료의 보유/PvP 능력치·자산·유효 후보와 진행 중인 구버전 전투는 보존한다. 다음 몬스터부터 새 곡선을 쓰며 사냥 파티·공격·메뉴·공유가 같은 전투 스냅샷을 읽는다. 새 필드 동료의 FEVER는2배, 영웅과 기존 전투 동료는3배다. 카운터/영혼이 안전 정수 범위를 넘는 작업은 원래 상태를 보존한다.

## 검증과 한계

전체1,264테스트·린트·타입 검사,82개 Node 하네스 검사, 작업별 AC, smoke와 macOS/Windows 패키징을 통과했다. [성능 비교](PERFORMANCE_REPORT.md)는 활동 CPU p95 2.1061%·메모리261.5781MiB, 방치 CPU2.1494%·메모리215.7344MiB로 고정 기준을 통과했다. 원래 기준선보다 높아진 항목과 순간 최대치도 그대로 보고한다. 실제 Electron 5시나리오·183검사·28화면을 독립 검토했다. 로컬 클릭4종407회에서 시각 p95 최대31.7ms, 장비 적용 결과 p95 46.6ms였다. 107개 장비 행동은 입력→main IPC→코어 적용→ACK→화면 구간을 각각 추적했다. 온라인 응답이나 모든 버튼의 시간을 보장하는 측정은 아니다.

새280개 경로의23개 기본 시간 기준이 통과했다. 일반·간헐1~10회 중앙값은 모두3~5시간이다. 유한 영혼 회귀80경로에서 준비를 포함한 첫3회240/240도달과12개 p10≥2시간도 통과했다. [밸런스 보고서](BALANCE_REPORT.md)는 모든 분위수, 원본 해시, 실제 행동 재생, 보상 간격과 정책을 제공한다. 강한 기존 자산의 첫 주기 중앙값1:42:30, 즉시 성장118/460미도달, 환생 미선택 진단의 긴 처치 공백을 그대로 공개한다. 모든 전략의3~5시간 또는 개인 최소시간 보장은 아니다.

가속 수치 검증·실제 Electron 관측·사람의 재미는 구분한다. Windows 실기기, 실제 Accessibility 전역 입력, 라이브 PostgreSQL, 사람의 재미, 운영 배포는 미수행이다. 기존 체크포인트의 방치CPU 기준 초과와 미완료 진단, R18의6분20초 단축 경로 및 이전 native 실패는 보존한다. 이후 성공으로 과거 기록을 삭제하거나 재해석하지 않는다.

## 하네스와 재현

[하네스](../../.harness/v11/HARNESS.md)는 Designer→Critic→Balance→Playtester 판단 순서, 최대4개 실제 에이전트, 파일 소유권과 작업 의존성, 소스/원본 해시 검증을 연결한다. 실행기와 Electron 격리 도구는 기존 하네스를 재사용한다. 역사적인 `.harness/CURRENT`는 v3 그대로다. 독립 검토는 코어/UI/시각/실행 절차의 작성자와 분리하며 Critic이 작성한 검증 코드는 Host가 따로 검토한다.

요청한 awesome-gamedev-agent-skills의 고정 커밋 `b105e1cf617adf0b68ed98790a716bbb60993179`에서 rpg, level-design, game-ui-ux, game-feel과 참조 문서·Apache-2.0 LICENSE·NOTICE를 가져왔다. 원본 경로와 파일 해시는 [SOURCES.json](../../.harness/v11/vendor/awesome-gamedev-agent-skills/SOURCES.json)에 있다. 이 자료를 DesMon 네 역할에 연결했으며 upstream에 완성된 전용 밸런싱 에이전트가 있다는 뜻은 아니다.

```sh
npm test && npm run lint && npm run typecheck
node --test .harness/v11/*.test.mjs
node .harness/v11/balance-verify.mjs .agentdoc/v11-20260918-resume/balance/final.json
node .harness/v11/runtime.mjs verify .agentdoc/v11-20260918-resume/native/final.json
node .harness/v11/final-check.mjs final .agentdoc/v11-20260918-resume
```

새 작업은 `run.mjs`로 소유권·의존성을 기록한 뒤 실행한다. 소스나 등록 프로토콜이 바뀌면 관련 결과를 무효화하고 다시 검증한다. 로그·스크린샷·생성 보고서는 별도 해시로 묶어 보고서 작성만으로 소스 검증을 무효화하지 않는다. Electron smoke/native/performance는 서로 겹치지 않게 실행하며 기존 관측 경로를 덮어쓰지 않는다.

위 증거 재검증 명령은 이 작업공간에 보존한 원본 관측·컴파일 캐시·앱·설치파일을 사용한다. 새 checkout에서는 의존성 설치와 빌드 및 새 실행 기록 생성이 필요하다. 앱·설치파일을 Git에서 제외한 것은 검증 원본이 원격 배포됐다는 뜻이 아니다.
