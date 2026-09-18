Designer `/root/designer`의 최종 결과 감사 준비 체크리스트. 아직 정식 응답이나 결과 판정이 아니다. 이번 준비에서는 `audit.mjs` 전체, Native runner/matrix의 저장·캡처 경로, 역할 계약과 연결된 v5 장르 양식, 완료된 0분 preflight의 manifest 구조만 읽었다. 실행 중 release raw/report는 열지 않았으며 audit 초기화·제출, 빌드·테스트·게임·Native를 실행하지 않았다.

1. Host가 완료된 최종 원본과 실제 발급 prompt/template을 전달한 뒤 시작한다. `fun.mjs`는 사전등록 설계 검토이며 이번 `audit.mjs`는 실행 결과 감사다. 이전 fun 응답·0분 preflight·과거 버전 측정은 최종 결과를 대신하지 않는다. 실제 prompt 전체와 인접 template 전체를 읽고, 그 requestId/role/sourceDigest를 그대로 사용한다. audit의 첫 파일명은 현재 코드상 `prompts/1-designer.md`와 `prompts/1-designer.json`이다. 임의로 fun의 `001-*.template.json` 형식을 가정하지 않는다.

2. 원본 완료와 결박을 먼저 확인한다. 최종 0.7 버전, source/evaluator, 실행 종료, 원본·로그·PNG SHA를 대조하고 부분 실행·낡은 원본은 성공 근거에서 제외한다. Native matrix의 원본 10개는 서로 다른 5/15/30분×active/idle/intermittent 9개 및 연속 180분 active 1개여야 한다. `/matrix/originals`의 경로와 hash, `/sessions`의 original 연결, 각 실행 completion·check·error·시간을 읽는다. 순차 실행 및 자연 시간 합계 `observationMs>=330분`을 확인하며, fixture와 초기화가 포함된 전체 `elapsedMs`를 자연 시간으로 바꾸지 않는다. release 측정은 등록된 9정책×100 seed×12시간의 완료 원본과 현재 21키/콘텐츠/정책에 연결되어야 한다. 이 준비에서 그 결과는 미확인이다.

3. 실제 Native PNG를 직접 열고 다음 출처별로 기록한다. 각 이미지의 정확한 원본 실행, 절대 경로, SHA와 관련 JSON Pointer를 남긴다. manifest의 `{path,sha256}`만으로 캡처 시간이나 자연/fixture 분류를 추정하지 않는다. 원본 runner의 순서와 파일명을 함께 사용한다.

| PNG 구분 | 나중에 직접 볼 범위와 판단 한계 |
|---|---|
| `fresh-field.png` | 실행별 새 격리 save의 초기 화면. 자연 관측 시작 전 화면이며 지속 시간의 증거가 아니다. 0분 preflight에도 존재한다. |
| `5m-active.png` 등 `<minutes>m-<profile>.png` | 원본 10개의 자연 관측 종료 필드 화면을 각각 확인한다. `/sessions/i/start`, `end`, `timeline`과 레벨·처치·동료·영웅 상태를 대조한다. 180분 화면에는 마지막 메뉴 방문 결과도 반영된다. |
| `natural-menu-10m.png` … `natural-menu-180m.png` | 연속 180분의 실제 방문 18개를 직접 확인한다. 각 캡처는 해당 방문 행동을 마친 뒤이므로 선택 전 카드 전체가 찍혔다고 주장하지 않는다. `/sessions/i/menuVisits/j`의 not-ready/selected, formId, 환생 전후, 완료 시각과 대조한다. |
| `shop.png`, 각 탭, `hero-choices.png`, `level-gate.png`, `v07-*.png` | 자연 관측 종료 후 `loadFixture(DEFAULT_SAVE)`부터 이어지는 별도 진단이다. 희귀 제시/획득, 마스킹/첫 처치, 환생 확인, PvP 선택/행 소실 포커스의 대표 PNG를 직접 보고, 다른 실행에서 check 불일치나 화면 차이가 있으면 그 원본도 확인한다. 자연 획득/자연 진행 시간으로 합산하지 않는다. |

4. 자연 행동과 진단 행동을 분리한다. 짧은 9회는 메뉴 선택이 없고, fresh idle은 입력 0이다. active는 초당 2회 합성 입력, intermittent는 매분 처음 15초 입력이라는 실제 runner 정책을 확인한다. 180분은 10분마다 실제 메뉴를 열어 첫 사용 가능한 선택을 하며 18개 방문이 각각 예정 시각부터 30초 이내 완료되고 환생 이력이 연결되어야 한다. `firstReadyElapsedMs`는 30초 표본/메뉴 직전 관측이고 `firstReincarnationElapsedMs`는 실제 선택 완료 시각이다. 둘을 같은 사건이나 100seed 분포로 표현하지 않는다. v5 참고 양식의 5분 최초 목표·다른 seed·warm-idle 정의를 현재 v7 계약에 덮어쓰지 않는다.

5. 기능 진단은 원본 check의 details까지 읽는다. h70 세 번째 카드의 유효한 조건·offerSerial→실제 Native 클릭 payload→equipped/collection/chosen history→환생/초기화→알림/ACK를 연결하되 `naturalAcquisition=false`를 유지한다. 영웅 선택/몬스터 처치·레거시·미획득 참조 이름·목표의 일치, 동료 Lv.10 이상 환생 전후 힘·별/레벨·확인/취소/대상 변경 무효화, MAX_SAFE 값 저장/왕복, PvP 50행 영웅/5동료와 실제 선택 ID·Enter/Space·포커스·목록 이탈 시 preview 비움을 검토한다. PNG 밖 상태와 ARIA는 JSON/실제 소스 근거라고 명시한다. 운영 서버 호환·OS 알림·실제 PvP 전투까지 검사한 것으로 확대하지 않는다.

6. 완료된 측정의 중앙값만으로 재미를 단정하지 않는다. 전체 분모의 첫 성공 p50/90분 성공 수, h70 자격 전체 p50와 미도달, 성공자 조건부 값, 제시와 실제 선택을 분리한다. 시간별 획득/처치·긴 제시 공백/새 획득 공백·파티 포화·무료 경로와 지출 정책 차이를 원시 표본으로 확인한다. Ambient→Surprise→Interaction→Reward→Collection 중 실제 단절과 그 원인 추정을 구분하고 confidence/unknowns에 한계를 남긴다. 가상 12시간을 실제 macOS 12시간이나 사람의 즐거움으로 설명하지 않는다. 검증 결과를 새 숫자 최적화에 사용하지 않는다.

7. 실제 audit Designer JSON의 필수 형식을 지킨다. `agent=/root/designer`, summary, 정확히 한 번씩 `bug/logic/fun` coverage 3개(assessment/confidence/unknowns), evidence 1–20개, findings 배열, 서로 다른 alternatives 3–5개(name/tradeoff), 그 name과 정확히 같은 choice, metric/target/rationale가 있는 hypotheses 1개 이상이다. fun의 6개 coverage·decision·resolves를 복사하지 않는다. 근거는 `{artifact:"e2e"|"measure",pointer:"/실제/경로",note:"설명"}`이며 파일 경로 자체가 pointer가 아니다. 배열 위치를 실제로 찾고 `/checks/i/details`, `/sessions/i/menuVisits/j`, `/screenshots/k`, `/scenarios/i/...`처럼 존재하는 JSON Pointer만 쓴다. matrix check ID에는 `180-active/` 등의 접두사가 붙지만 pointer는 실제 배열 index를 가리킨다. finding은 감사 전체에서 고유한 id/category/severity(blocker|major|minor)/problem/fix/evidence(`e2e#/...` 또는 `measure#/...`)를 갖는다. 관측하지 않은 성공이나 문제를 채워 넣지 않는다.

8. 판단 상태를 분리한다. Designer→Critic→Balance→Host Playtester의 실제 서로 다른 agent ID 순서이며 Host만 init/next/submit/report/verify한다. 현재 workflow는 아래 명령 형식이고, 여기서는 실행하지 않았다.

```text
node .harness/v7/loop/audit.mjs init <new-audit-dir> <completed-matrix.json> <completed-release.json>
node .harness/v7/loop/audit.mjs next <new-audit-dir>
node .harness/v7/loop/audit.mjs submit <new-audit-dir> <actual-response.json>
node .harness/v7/loop/audit.mjs status <new-audit-dir>
node .harness/v7/loop/audit.mjs report <new-audit-dir>
node .harness/v7/loop/audit.mjs verify <new-audit-dir>
```

`audit_complete`는 오류가 남아 있어도 가능한 분석 완료다. 별도 `verify`는 네 역할, release 측정, 통과한 전체 Native matrix, validation seed/등록 목표, blocker·major 없음까지 요구한다. 그 결과도 `technicalReview=passed`, `humanFun=PENDING`, `release=NOT_EVALUATED`이며 smoke·실제 패키지·운영 호환·출시 승인은 별도다. 사람이 관찰하지 않았으면 `humanChecks=PENDING`을 유지한다. 수정이 필요하면 원본을 보존하고 Host가 등록·구현·새 검증·새 audit를 진행하며, 이번 준비나 감사에서 자동 배포하지 않는다.

읽은 기준 파일: `.harness/v7/loop/audit.mjs`(전체 322행; SHA `f9b0ca51071f5162d09598fa1cb924a92760c8dad5c22d9cb12ce993c0a503e0`), `e2e-matrix.mjs`(18–108행; SHA `02f320e2405b678c53296622d73b08052ca480b7a97732e6399af4594e42768d`), `electron-e2e.cjs`(56–61, 153–239행; SHA `4ebdd9e8f31b73a19c632245234fe5c064c8f9fc13d80258725420003c240cdf`), `e2e.mjs`의 required checks와 메뉴 일정, HARNESS의 설계/결과 감사 구분. 참고한 완료 manifest는 `preflight/final-v070-rare/attempt01/journey.json`이며 자연 sessions가 없는 17-PNG 진단이다. 그 관찰 기록은 [별도 preflight 기록](final-v070-preflight-designer.md)에 보존되어 있다. 최종 결과 감사에는 새 최종 원본을 사용한다.
