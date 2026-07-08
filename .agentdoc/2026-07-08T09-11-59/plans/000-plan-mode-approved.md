# Desktop Monster (DesMon) — 원샷 하네스 구축 + 랄프 루프 개발

## Context

빈 저장소 `/Users/jeongyounglee/work/repo/desktop-monster`에서 두 단계로 진행한다:

1. **하네스 먼저**: `.harness/v1/`(에이전트 프롬프트 4종, plan/dev/eval 스킬 3종, 루프 러너, 템플릿) + `.agentdoc/{datetime}/`(프롬프트 관측 로그) 구조를 구현하고 커밋.
2. **그 위에서 개발**: 랄프 루프(fresh context, 1 iteration = 1 task = 구현+테스트+커밋)로 BongoCat 스타일 데스크탑 게임 **Desktop Monster**를 원샷 완성 — 전역 키/마우스 입력마다 도트 기사가 몬스터를 공격, HP바/처치/아이템 드랍/자동수집/XP/레벨업, 투명·최상위 오버레이 창.

## 확정된 결정 (사용자 승인)

| 항목 | 결정 |
|---|---|
| 스택 | Electron + TypeScript |
| 루프 러너 | 인세션 fresh 서브에이전트(Workflow 오케스트레이션) + 독립 실행용 `ralph.sh` 동봉 |
| 전역 입력 | uiohook-napi 전역 후킹 + Accessibility 미허용 시 창 포커스 입력 폴백 |
| 패키징 | electron-builder 무서명 mac .dmg 실빌드 + Windows nsis 설정(빌드 안 함) |

## 검증된 사실 (설계 에이전트가 npm registry/문서로 확인, 2026-07-08)

- **uiohook-napi 1.5.5**: darwin-arm64 N-API 프리빌드 tarball 동봉 → **@electron/rebuild 불필요**. 단 macOS에서 권한 없이 `uIOhook.start()` 호출 시 **프로세스 크래시**(issue #24) → `systemPreferences.isTrustedAccessibilityClient` 선체크 필수, `will-quit`에서 `stop()` 필수. electron-builder의 불필요한 rebuild는 `"npmRebuild": false`로 차단.
- **호스트 Node 20.12.2이 결정적 제약**: Electron 40+는 host node ≥22.12 요구, eslint 10은 ^20.19, vite 7도 ^20.19 → 확정 버전 매트릭스(정확 핀, `^` 없음): **electron 39.8.10 / eslint 9.39.4 / typescript-eslint 8.63.0 / typescript 5.9.3 / vitest 3.2.7 / vite 6.4.3(명시 핀 — 안 하면 npm이 vite 7 해석해서 깨짐) / electron-builder 26.15.3 / @types/node 22.20.0 / uiohook-napi 1.5.5**.
- **claude CLI 2.1.202**: `-p`, `--output-format text`, `--dangerously-skip-permissions` 존재. **`--max-turns` 없음** → ralph.sh에서 사용 금지.
- SKILL.md frontmatter: `name` + `description` (설치된 스킬에서 확인).
- 투명 오버레이: `transparent+frame:false+hasShadow:false+resizable:false`, `setAlwaysOnTop(true,'screen-saver')`, `app.dock.hide()` 후 `setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true,skipTransformProcessType:true})`, `backgroundThrottling:false`(rAF 스로틀 방지), 드래그 스트립만 `-webkit-app-region: drag`(클릭 삼킴 방지).
- 무서명 빌드: `CSC_IDENTITY_AUTO_DISCOVERY=false` + `mac.identity:null` + `notarize:false` + `hardenedRuntime:false`.

---

## Phase 0 — 하네스 구현 (내가 메인 세션에서 직접 파일 작성)

`git init -b main` 후 아래 트리를 작성하고 `chore: materialize harness v1` 커밋.

```
├── CLAUDE.md                        # 3줄 포인터 → AGENTS.md
├── AGENTS.md                        # 루프의 심장: 명령 계약 + 게이트 + done 정의
├── .gitignore                       # node_modules/ dist/ release/
├── .claude/skills/                  # 설치본 (canonical에서 복사)
│   ├── desmon-1-plan/SKILL.md      #   stage 1: Spec Clarifier + Planner 오케스트레이션
│   ├── desmon-2-dev/SKILL.md       #   stage 2: 랄프 루프 (fresh builder × N)
│   └── desmon-3-eval/SKILL.md      #   stage 3: Validator/Packer + handoff
├── .harness/
│   ├── CURRENT                      # "v1" — 런타임 버전 포인터
│   └── v1/
│       ├── HARNESS.md               # 운영 매뉴얼: 원샷 킥오프 프롬프트, 재개법, 관측 맵, v2 승격 규칙
│       ├── CHANGELOG.md
│       ├── agents/
│       │   ├── 00-spec-clarifier.md #   모호성 제거 → SPEC.md (기능별 "통과=무엇" AC, TBD 금지, 원샷 가정 정책)
│       │   ├── 10-planner.md        #   SPEC → IMPLEMENTATION_PLAN.md (task ≤5파일/≤300LOC, T01=스캐폴드)
│       │   ├── 20-builder.md        #   빌더 헌장: 에러=정보, ≥3가지 다른 접근 전 BLOCKED 금지,
│       │   │                        #   테스트 삭제/스킵/완화 절대 금지, 분할 프로토콜, [~] 크래시 복구
│       │   └── 30-validator-packer.md # 콜드 게이트(rm node_modules+npm ci), AC 스팟체크(무작위 3 + 위험 task),
│       │                            #   SPEC 스윕, smoke, package, 거짓 [x]는 [ ]로 되돌림
│       ├── skills/                  # canonical 스킬 원본 (위 3종과 동일)
│       ├── loop/
│       │   ├── PROMPT.md            # 이터레이션 빌더 프롬프트 템플릿 ({{SESSION_DIR}}, {{ITER}})
│       │   │                        #   → <status> 블록 + <promise>DONE</promise> 센티넬 규칙 포함
│       │   └── ralph.sh             # 독립 러너: claude -p 서브프로세스, 센티넬 grep -qxF,
│       │                            #   독립 게이트 재검증, BLOCKED 3연속 시 exit 2, cap 시 exit 1
│       ├── templates/               # SPEC / IMPLEMENTATION_PLAN / session-record / handoff / meta.json 템플릿
│       └── reference/
│           └── GAME_ARCHITECTURE.md # 설계 에이전트의 게임 아키텍처 문서 전문 (버전 매트릭스,
│                                    #   BrowserWindow 옵션, IPC 설계, 스프라이트-as-code, 12-task 분해, 리스크 10종)
```

**AGENTS.md 명령 계약(동결)**: `npm start`(빌드+실행) / `npm test`(vitest) / `npm run lint`(eslint --max-warnings 0) / `npm run typecheck`(tsc --noEmit ×3 프로젝트) / `npm run smoke`(SMOKE=1로 Electron 부팅→`SMOKE_OK` stdout→자동종료, exit 0/1) / `npm run package`(무서명 mac dmg). **게이트 = `npm test && npm run lint && npm run typecheck`** — 이 줄이 초록불 아니면 task 완료 선언·커밋 완결·센티넬 출력 불가.

**IMPLEMENTATION_PLAN.md 문법(기계 판정)**: `### [<c>] T<NN> — 제목`, `<c>` ∈ `[ ]`TODO `[~]`진행중 `[x]`완료 `[!]`BLOCKED `[s]`분할됨. 각 task에 `- AC:`(실행 가능한 명령), `- Deps:`, `- Files:`, `- Notes:`(막다른 길 기록). 수렴 판정 = `grep -E '^### \[( |~|!)\]' IMPLEMENTATION_PLAN.md` 결과 없음. ID 재번호/삭제 금지, Iteration Log는 append-only.

## Phase 1 — plan 스테이지 (desmon-1-plan 로직 실행)

1. `.agentdoc/{ts}/` 생성(`prompts/`, `sessions/`, `plans/`), `.agentdoc/LATEST` + `meta.json` 기록.
2. 사용자 원본 요구사항(한국어 원문 그대로) → `prompts/000-user-original.md`. **승인된 이 플랜 파일 사본** → `plans/000-plan-mode-approved.md` (plan 모드 산출물 보존 요구사항).
3. **Spec Clarifier** fresh 서브에이전트 스폰(프롬프트를 스폰 **전에** `prompts/010-spec-clarifier.md`에 저장) → `SPEC.md` 작성: 기능별 F01… 테이블 + 실행 가능한 AC, Assumptions, InputDriver 추상화(SimulatedInputDriver로 테스트/smoke, GlobalHookDriver는 수동 검증 부록), Non-Goals.
4. 검증(내가): TBD 없음, 모든 기능에 AC 존재. 미달 시 후속 에이전트 1회.
5. **Planner** fresh 서브에이전트 → `IMPLEMENTATION_PLAN.md` (~12–15 task, reference/GAME_ARCHITECTURE.md의 12-task 분해를 기반으로, T01=스캐폴드+빈-초록 게이트).
6. 스냅샷 → `plans/*.stage1.md`, 커밋.

## Phase 2 — dev 스테이지 (desmon-2-dev 로직 = 랄프 루프, Workflow로 실행)

**MAX_ITER = 25.** Workflow 스크립트로 순차 루프(단일 작성자 원칙이라 병렬 불가):

```
while (!converged && iter <= 25) {
  1. builder = agent(렌더링된 PROMPT.md, schema: {task, result, gates, commit, remaining, sentinel})
     — 완전한 fresh context, 디스크 파일만 봄. 자기 세션 기록을 sessions/iter-NN.md에 직접 작성.
  2. verifier = agent(경량 검증 프롬프트, effort: low)
     — 게이트를 독립 재실행(1회 재시도 허용), 출력→ sessions/iter-NN.gates.log,
       빌더 최종 메시지→ sessions/iter-NN.log 저장, plan 스냅샷 cp,
       수렴 grep 실행, {gatesPass, planConverged} 반환. 렌더링된 프롬프트는 스폰 전에 prompts/에 저장.
  3. 센티넬 인정 조건: builder.sentinel && verifier.gatesPass && verifier.planConverged (거짓 센티넬은 로그 후 계속)
  4. BLOCKED 동일 task 2연속 → Planner 재스코프 에이전트 1회, 3연속 → 루프 중단(에스컬레이션)
}
```

루프 종료 후 내가(메인 세션) 게이트를 한 번 더 직접 실행해 이중 확인. **수렴 실패/cap 도달이어도 Phase 3은 반드시 실행**(INCOMPLETE handoff).

예상 task 흐름(Planner가 확정): T01 스캐폴드(정확 핀 package.json+4 tsconfig+eslint flat+vitest, 빈-초록 게이트) → 코어 로직(formulas/engine/loot/save — 순수 TS, 시드 RNG로 결정적 테스트) → Electron 셸(투명창+트레이+IPC+preload) → 스프라이트 시스템+도트 아트(코드 생성, 무결성 테스트) → 전투 루프+폴백 입력 → 처치→드랍→수집→스폰→레벨업 → uiohook 전역 입력 → 영속화 → 폴리시(사운드/연출) → smoke 스크립트 → 패키징+README.

## Phase 3 — eval 스테이지 (desmon-3-eval 로직 실행)

1. **Validator/Packer** fresh 서브에이전트: 클린 트리 확인 → 콜드 게이트(`rm -rf node_modules && npm ci && 게이트`) → `[x]` task 무작위 3개+위험 task AC 문자 그대로 실행(거짓이면 `[ ]`로 되돌리고 NOT CONVERGED) → SPEC AC 전수 스윕 → `npm run smoke` → `npm run package` → `release/` 산출물 확인 → `handoff.md` 작성.
2. NOT CONVERGED이면 Phase 2 재실행 **최대 1회** 후 재검증.
3. 내가 최종 확인: handoff 존재, dmg 실재, 게이트 최종 1회. `meta.json` 마감, 최종 커밋, 사용자 보고(실행법, Accessibility 수동 허용 안내 — dev는 "Electron", 패키징본은 "DesMon" 별도 허용).

---

## 게임 구현 요점 (reference/GAME_ARCHITECTURE.md에 전문 수록)

- **구조**: `src/core/`(순수 TS: engine/formulas/loot/save — electron·DOM 임포트 0, vitest node 환경) / `src/main/`(window, tray, globalInput, persistence, ipc) / `src/preload/`(contextBridge) / `src/renderer/`(160×110 캔버스→320×220 표시, rAF, 스프라이트-as-code: 팔레트+문자열 행렬 프레임, 애니 상태기계).
- **공식**: dmg=level, HP=⌊10·1.15^i⌋, xpReward=5+3i, xpToNext=⌊20·1.4^(lvl−1)⌋, 크리 10%×2, 코인 매 처치+25% 장신구. RNG 주입(mulberry32)으로 결정적 테스트.
- **모듈 전략**: 번들러 없음. main/preload=CJS(tsconfig module node16), renderer=ESM(es2022), core는 2회 컴파일. 모든 상대 임포트 `.js` 확장자.
- **주요 리스크 완화**: uiohook 크래시(권한 선체크+try/catch+lazy require), vite 7 오해석(명시 핀), 렌더러 ESM file:// 실패 시 protocol.handle 폴백, 스프라이트 무결성 기계 테스트.

## 검증 (전체 완료 판정)

1. `npm test && npm run lint && npm run typecheck` 모두 exit 0 (콜드 인스톨에서도).
2. `npm run smoke` exit 0 (앱 부팅 자동 확인).
3. `npm start` → 투명·최상위 오버레이에 기사/몬스터 도트 씬; 입력→공격→HP바→처치→드랍 수집→XP/레벨업; 재시작 시 상태 유지.
4. `npm run package` → `release/DesMon-0.1.0-arm64.dmg` 생성.
5. `.agentdoc/{ts}/`에 4종 로그 모두 존재: prompts(전 에이전트 원본), sessions(이터레이션 기록+게이트 로그), plans(스냅샷+plan모드 플랜), handoff.md.
6. SPEC.md 모든 AC를 Validator가 실행해 통과.

**주의**: 루프 무중단 진행을 위해 실행 승인 후 권한 프롬프트가 루프를 막지 않도록 auto-accept(acceptEdits) 권장. 전역 입력의 실기기 확인(Accessibility 허용)만 수동 단계로 남음.
