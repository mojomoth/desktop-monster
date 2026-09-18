# DesMon v0.5 구현 인계 · 2026-09-10

V4 기반 V5 하네스, 골드 사용처, 환생 레벨/중첩, 조건부 레어 영웅20종·몬스터30종, 두 도감과 프로필/히스토리를 구현했다. 앱 버전은0.5.0, 저장은기존v3의선택필드확장이다. 기존V4의미커밋작업을보존했고커밋/푸시/운영배포는수행하지않았다.

## 사용할 수 있는 기능

- 상점: 영구무기훈련(+5%씩최대50%), 레어미끼(자격있는20회,12%→25%), 환생후보재굴림. 가격/부족액/최대/중복요청방어와정상지출이력.
- 환생레벨: **12,13,13,14,14,15,15,16,16,17,17,18**, 이후18. 수락뒤120초휴식, 보류뒤30초무료재도전. 기존열린Lv12제안은1회보존.
- 반복환생: 낮은단계/보유영웅재등장. 같은영웅을다시수락하면최고기본버프에중첩+1. 다른영웅을거쳐돌아와도증가하며단순장착은증가하지않는다. PvE/자동파티/PvP/미리보기에동일함수.
- 레어영웅h51–h70 20종과몬스터30종. 처치/과거영웅/장착/활성시간/필드시간/PvP/골드소비조건. PvP는오프라인처치대안, 필드시간은20분주기(새벽/낮/황혼/밤각5분). 자격있는12번째생성레어보장.
- 영웅70/몬스터135 도감: 실제등장전단색실루엣·이름숨김, 무료조건진행도. 발견뒤설명/능력치/원색, 보유영웅무료장착.
- 내기록: 이름설정(영문·숫자·_·- 1–16자), 활성플레이시간, 누적처치/영웅환생/총회귀/PvP/골드소비, 최근100회영웅환생과영구영웅별전체횟수. 과거미저장상세기록은추정하지않는다.
- 공식PvP결과만메인에서집계하고재시작복구. 동시중복/봇/실패결과는추가집계하지않는다. 전적저장실패시경고및다음저장재시도, 이름저장실패시기존이름보존.

## 검증 결과

| 검사 | 결과 |
| --- | --- |
| `npm test && npm run lint && npm run typecheck` | **종료0, 744 tests / 49 files**, lint0경고, strict typecheck통과 |
| `node .harness/v5/loop/fun.mjs selftest` | **9 tests 통과** |
| `npm run build` | **통과** |
| 엔진밸런스 | 독립100seed,600경로,1800시점. 전체잔액보존,첫환생중앙값79초,무료active30분1239처치/15환생 |
| 브라우저 | 프로덕션메뉴420×640/780×800,70/135카드,구매/실루엣/이름편집보존,신규50종단색실루엣검사통과 |
| V5리뷰 | designer→critic→balance→playtester 보고서4개,열린finding0,`simulation_complete` |

초기3개독립에이전트가진행/콘텐츠/경험기획을검토했다. progression_design이디자이너,experience_design이독립비평을수행했고각담당영역을병렬구현했다. 후속자식실행은계정사용량한도로종료되어root가통합·보완·실측·브라우저검증을마쳤다. 밸런스/플레이테스터보고서는실제실행자root로기록했으며독립추가인원으로표현하지않았다.

기준: [기획서](../../.harness/v5/reference/GAME_DESIGN_V5.md), [카탈로그](planning/discovery.md), [밸런스](BALANCE.md), [브라우저QA](BROWSER_QA.md), [명령결과](verification.json), [리뷰저널](review-session/session.json).
V4기준900시점은baseline-v4.json, V5원시는balance-v5.json. 기존정확15회/항상Lv12기준을명시적인새계약으로교체했다. 테스트삭제/skip/strictness완화/새의존성추가는없다.

## 체험 및 재현

[메뉴체험](menu-preview.html)과[레어50종갤러리](rare-gallery.html)는오프라인합성데이터를사용하는독립HTML이다. 사용자게임저장을읽거나변경하지않는다.

```sh
node .harness/v5/loop/render-preview.mjs
DESMON_BALANCE_REPORT=docs/v0.5/balance-v5.json npm test -- tests/balance.test.ts
node .harness/v5/loop/fun.mjs status docs/v0.5/review-session
```

실제앱시작명령은기존처럼`npm start`. 서버미연동로컬체험은`DESMON_SERVER_URL='' npm start`로실행할수있다. 이세션에서해당네이티브실행을했다고주장하지않는다.

## 아직 실행하지 않은 출시 검증

- **Native PENDING**: `npm run smoke`, `npm run package`, 실제Electron창/권한/소리/포커스및패키지재실행. AGENTS.md의Codex규칙(`Codex never ... runs npm start|smoke|package, electron`)때문에이호스트에서는실행하지않았다. 기존release파일을v0.5산출물로취급하지않는다.
- **Human PENDING**: 실제사람의5/15/30분재미, 선택인지도,작업방해,레어외형선호. 자동검사는사람의재미평가가아니다.
- **DESMON_SKIP_NET=1**: 로컬개발검증만수행했고운영서비스는변경하지않았다. 신규h51–h70/몬스터30종/stacks를운영PvP에서쓰려면서버도동시에업데이트해야한다. 구v3서버연결의완전호환을주장하지않는다.
- `.harness/CURRENT=v3`와루트SPEC.md/IMPLEMENTATION_PLAN.md는보존했다. V5는명시적인`.harness/v5`경로를사용한다.

[출시체크리스트](RELEASE_CHECKLIST.md)에코드와native/human/deploy상태를분리했다. 이인계는개발·자동검증완료이며패키지배포완료가아니다.
