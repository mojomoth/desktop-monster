# v0.6 Critic 사전 검토

검토자: `/root/critic`. 2026-09-10T07:16:53Z의 동결 자료를 기준으로 읽기 전용 검토했다. 이 에이전트는 V06-03 및 개발/matrix 검증기 일부를 구현한 이력이 있다. 이번 검토는 기준선과 통합 결과를 다시 대조하는 사전 검토이며, Designer 응답 뒤 `audit.mjs next/submit`으로 수행할 최종 4역 감사를 대신하지 않는다.

검토 시점 앱 소스 지문은 `c1b3603ed446d75fdd4830e59aac930d5fad73d17c6bef7de6c888b062914aef`, 평가 지문은 `d402273c4cae0e9d597a4efe3a5648ac56cc2ad4c121e5c483b71f7710797de8`, 버전은 0.6.0이다. `final-freeze.json`에 기록된 파일 전부를 현재 내용과 재해시하여 불일치 0건을 확인했다. 이후 아래 네이티브 검증 공백을 호스트가 수용했으므로 **이 평가 지문과 진행 중이던 matrix-02는 새 최종 검증의 근거로 대체될 예정**이다. 앱 소스 변경 필요성은 확인되지 않았다.

## 판단과 수정 요청

게임의 저장·IPC·발견 동시성 구현에서 재현 가능한 blocker/major를 찾지 못했다. 네이티브 AC에는 실제 순서를 충분히 실행하지 않은 검증 공백 1개가 있어 호스트에게 즉시 보고했다.

**검증 보완 필수 — 실제 추가 발견 이후 오래된 확인 요청.** 검토 당시 `.harness/v5/loop/v06-journey.cjs:16`은 `h01,h02,h03,h04`를 처음부터 발견 상태로 준비했다. 23–25행은 첫 세 ID의 확인 요청을 재전송하고, 처음부터 존재한 미표시 `h04`가 남는지를 검사했다. 따라서 `v06-stale-ack-keeps-later-discovery`는 미표시 ID 보호는 입증하지만, 요구한 **표시 → 실제 추가 발견 → 이전 표시 ID 확인** 순서를 네이티브 경로에서 실행하지 않았다. `tests/progressV6.test.ts`의 실제 `heroOffer` 추가 발견 검사는 코어 보호를 입증하므로 게임 결함으로 판단하지 않는다. 그러나 해당 Native AC를 완전히 통과했다고 보고할 수는 없다.

호스트는 별도 Lv.12 fixture에서 도감 표시를 먼저 확인하고, 실제 `heroOffer` IPC로 새 `seenHeroes`가 생겼음을 확인한 뒤, 옛 표시 ID 요청을 두 번 보내 새 ID가 디스크에서 계속 미확인인지 검사하기로 했다. 기존 matrix·실험 로그는 보존하고 새 평가 지문에서 matrix-03 및 실험을 다시 실행한다고 회신했다. 이 검토 문서는 그 수정 및 재실행을 아직 통과로 판정하지 않는다.

함께 전달한 보강 사항: 기존 목표 완료 Native 검사는 이미 발견한 `h02`를 새 목표로 선택한 뒤 완료 문구를 확인했다. 선택한 미발견 목표 자체가 나중에 발견 상태로 바뀌며 유지되는 순서를 추가하면 더 직접적인 근거가 된다. phase/equipped 조건 재미달 후 목표 유지 및 새 게임 첫 실제 발견의 미확인 상태는 단위 검사에 근거가 있으나, Native 근거는 별도로 명시해야 한다. 호스트에 현재 수정 시점에서 함께 보강하도록 전달했다.

## 기준선과 기존 변경 보존

- [baseline/metadata.json](../baseline/metadata.json)의 archive SHA-256 `917ea66d2be5e9837b947004e5e27b699433db1e1853542c6edf42a21d544274`와 [source.tar.gz](../baseline/source.tar.gz)의 실제 해시가 일치한다. 커밋 HEAD 대신 초기 수정 작업 트리의 내용이 보존돼 있다.
- archive의 일반 파일 176개를 대조했으며 현재 삭제된 파일은 0개다. archive의 파일 목록에서 개인 `save.json`, `identity.json`, `.env`를 발견하지 않았다. 생성 fixture는 개인 세이브가 아닌 기록된 production engine seed 60006의 결과다.
- 변경 파일은 v0.6 범위의 core progress/collection/engine/save, hero 준비 표시, menu·IPC/preload 선언, 버전 및 평가 실행기에 집중됐다. `src/core/formulas.ts`, `economy.ts`, `fever.ts`, `monsters.ts`, 기존 전투·서버 소스는 byte 단위로 그대로다. 포획 방출 분기는 기본 게임에서 변경되지 않았다.
- 기존 npm 스크립트·의존성은 그대로이며 package/lock 버전과 tray 제목만 0.6.0으로 맞췄다. `.harness/CURRENT=v3` 계약을 유지한다. 루트 계획/SPEC 교체나 git 변경 이력 정리는 이 검토에서 수행하지 않았다.
- 변경된 기존 테스트는 대체로 추가 검사다. 기존 기대값 수정은 앱 버전 및 옛 `offerLevel`의 실제 수락 문턱을 정직하게 표시하는 명시 계약에 해당한다. 테스트 삭제·skip·엄격도 하향으로 실패를 숨기는 diff는 발견하지 못했다.

## 저장·IPC·동시성 대조

| 계약 | 구현과 반례 확인 | 판정 |
| --- | --- | --- |
| 영구 발견과 읽음 분리 | `Progress.codex`에 확인 ID와 nullable goal만 저장한다. 진행률·적격을 별도 저장하지 않는다. `parseProgress`는 읽음 ID를 실제 `seen`으로 제한한다. | 코드/단위 근거 충족 |
| 구세이브의 가짜 신규 0 | codex 부재를 이관 신호로 보존하며 기존 발견을 읽음 기준화한다. engine boot에서 적법한 옛 열린 후보를 검증한 뒤 이관 읽음에 포함한다. 신규 엔진은 명시적 빈 codex를 사용해 첫 실제 spawn을 미확인으로 남긴다. | 코드/단위 근거 충족 |
| 오래된 확인/미래 ID 보호 | `collection.ts:183`은 공유 validator를 거친 후 요청 ID와 현재 `seen`의 교집합만 합친다. 반복 요청은 멱등이고 영구 발견을 삭제하지 않는다. 미래에 유효할 수 있는 `h70/starvoid`도 미발견이면 미리 확인하지 않는다. | 코드/단위 충족, Native 순서 보완 필요 |
| 실제 표시 범위 | 도감은 영웅/몬스터 각 최대 3개 preview ID만 요청한다. 일부 카드 이후의 다른 발견을 자동 소거하지 않는다. 버튼은 유지되고 클릭 시 표시 ID 배열을 복사한다. | 코드/메뉴 단위 충족 |
| 무료 목표와 정보 보호 | 목표 종류·ID를 IPC와 reducer에서 검증한다. 별도 재화 지출이 없고 조건 재미달·환생·재시작으로 목표를 자동 교체하지 않는다. 미발견 목표는 번호·조건·실루엣을 사용하며 발견과 보유를 구분한다. | 코드/단위 충족 |
| 비관적 메뉴 갱신 | `menu/index.ts:263`의 send는 목표·읽음 상태를 먼저 바꾸지 않는다. `STATE_CHANGED`로 받은 저장 상태만 반영한다. 전송 실패를 저장 성공으로 알리지 않는다. | 코드/개발 Native 근거 충족 |
| 디스크 실패 | `main/ipc.ts:203`에서 atomic write 실패 시 `SAVE_FAILED`만 방송하고 업로드·성공 STATE_CHANGED를 보내지 않으며 false를 반환한다. 메뉴는 고정된 aria-live 경고를 표시하고 성공 저장 상태 수신 때 해제한다. | 코드/단위/개발 Native 근거 충족 |
| 타입·bridge 일치 | preload와 `renderer/global.d.ts` 모두 `saveState: Promise<boolean>` 및 `onSaveFailed`를 선언한다. 과거 최초 게이트의 선언 누락은 최종 파일에서 수정됐다. | 최종 게이트 충족 |
| 기존 자산·공식·로스터 | 새 action은 progress UI 상태만 바꾼다. 저장 schema version3 및 기존 gold/hero/companions/history/official PvP 의미를 유지한다. 보류 후보는 제품에 추가되지 않았다. | 코드/회귀 근거 충족 |
| focus·scroll·펼친 카드 | 도감 카드/버튼을 매 상태 갱신 때 재생성하지 않고 텍스트·선택 상태만 갱신한다. 개발 Native 5.2초 관측에서 동일 focus·scroll·open을 확인했다. | 개발 근거 충족, 최종 새 지문 재검증 대기 |

저장 실패 중 새 상태는 엔진 메모리에 남고 기존 스케줄러가 재시도한다. 디스크 복구 전에 앱을 강제 종료했을 때 저장되지 않은 변경까지 보존하는 계약은 추가하지 않았다. 메뉴는 이 상황을 성공으로 표시하지 않으며 “앱을 닫지 말고 다시 시도” 안내를 제공한다. 조건부 보류 기능의 원자적 거래·실패 복구 계약과 혼동하면 안 된다.

개발 스크린샷 [저장 실패](../evidence/quick-03.json.screenshots/v06-save-failed.png)와 [목표·포커스](../evidence/quick-03.json.screenshots/v06-goal-focus.png)를 직접 열었다. 실패 안내는 스크롤 중에도 상단에 보이고, 선택한 미발견 카드의 이름·설명·능력치는 가려져 있다. 이 이미지들은 개발 소스 `9338cd...`의 결과로 최종 소스 증거로 재분류하지 않는다.

## 완료 조건별 실제 근거와 남은 작업

| 완료 조건 | 확인한 실제 근거 | 이 검토 시점 상태 |
| --- | --- | --- |
| 저장소 정확한 gates | [V06-01-1789024117510.log](../evidence/V06-01-1789024117510.log), SHA `995d71623bd5a9aa892f9d965c743060f6cff3b32d6458f853e986351143acc8`: 52파일·776 tests, lint, typecheck 성공. loop와 세션 기록의 종료 0 대조. | 당시 최종 source에서 통과; 평가 수정 후 추가 검사 필요 |
| 관련 AC | [final-ac-03.log](../evidence/final-ac-03.log): 8파일·157 tests 통과. | 코드 기능 관련 근거 확보 |
| 하네스 selftest | [V06-01-1789024442659.log](../evidence/V06-01-1789024442659.log), SHA `3c63db11de053a39fb53ce9ea4990ff489c6a7e86ead1075c634ce3ffc09b5ad`: 7파일·52 checks 성공. 잘못된 `.ts` config 호출 실패 로그도 보존. | 당시 평가 지문 통과; journey 수정 후 새 지문 필요 |
| 필수 포획/피버 실험 | [개발 실험](../evidence/experiments-development.json), [독립 재계산](../evidence/balance-development-review.json), [실험 결과](../../../docs/v0.6/EXPERIMENT_RESULTS.md). 10분 방문의 seed별 악화·추가 클릭으로 조건부 제외 근거가 있다. | 개발 결과 확보; 최종 동일 평가 지문의 실행/재계산 필요 |
| canonical 100 seeds | 최종 `measure.json` 생성 및 원시 분포 확인이 진행 계획에 있다. | 아직 최종 완료 근거 없음 |
| Native 9개×실제 총150분 | 검토 시점 matrix-02 첫 5active 관측 중이었다. 보충 journey 수정으로 호스트가 중단·보존하고 matrix-03으로 재실행한다고 통보했다. | 미완료; 기존 0분 quick35 checks로 대체 불가 |
| 최종 새 UI journey | 개발 quick-03의 35 checks는 통과했지만 위 동시 신규발견 순서 보완이 필요하다. | 보완·새 평가 지문 재검증 필요 |
| 4역 순차 감사 | 실제 에이전트의 구현·사전 검토는 있으나 최종 Designer→Critic→Balance→Playtester `next/submit/report`는 아직 수행 전이다. | PENDING |
| smoke·최종 .app/.dmg·패키지 재시작 | 개발 package-03은 기존 자산/새 UI 상태 재시작 9개 검사 성공, 앱 버전 0.5.0인 `release-version` 실패가 그대로 남아 있다. 이를 0.6.0 package 통과로 쓸 수 없다. | 최종 패키지 생성·동일 bytes·격리 재시작 검증 필요 |
| 문서·저널 인계 | ACCEPTANCE/HANDOFF는 진행 중이라고 명시하며 완료를 먼저 선언하지 않는다. | 최종 결과·경로·해시로 갱신 필요 |
| 사람 재미 가설 | 실제 참가자 5명×30분 관찰은 없다. | PENDING 유지 |

운영 배포, 실제 PvP/탈취/회수, Accessibility·전역 입력·운영 네이티브 알림은 이 검토에서 실행하지 않았다. 호스트 인계의 `DESMON_SKIP_NET=1` 및 해당 미검증 구분을 유지해야 한다. 세이브 다운그레이드 시 새 필드가 버려질 수 있으므로 버전별 앱·세이브 백업을 함께 복원하는 안내가 필요하며 현재 HANDOFF에 이 내용이 있다.

원본 소스·하네스·테스트를 수정하거나 Electron을 실행하지 않았다. 작성한 파일은 이 사전 검토 문서 하나다. 완결 판정은 보완 후 같은 최종 source/evaluation의 실제 근거와 별도 4역 감사에서 다시 수행한다.
