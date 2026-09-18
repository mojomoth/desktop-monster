# DesMon v4 — 재미 개선을 위한 4 에이전트 하네스

기존 게임의 반복 플레이를 개선하는 실행 계약이다. 게임 디자이너, 디자인 비평가,
밸런스 디자이너, 플레이테스터가 근거를 남기며 한 바퀴씩 검토한다. 사용자 요청은
v0.4이고 하네스 버전은 v4다. v3 기록과 스크립트는 보존한다.

## 시작

저장소 루트에서 설치된 Node와 Vitest를 사용한다. 새 의존성은 없다.

```sh
node .harness/v4/loop/fun.mjs selftest
node .harness/v4/loop/fun.mjs init .agentdoc/v4-fun-001
node .harness/v4/loop/fun.mjs next .agentdoc/v4-fun-001
```

`next`가 반환한 `prompt` 파일 전체를 해당 역할의 세션 내 에이전트에게 전달한다.
함께 생성된 `template` JSON을 채워 응답 파일을 만든 뒤 오케스트레이터가 수집한다.

```sh
node .harness/v4/loop/fun.mjs submit .agentdoc/v4-fun-001 .agentdoc/v4-fun-001/designer.json
node .harness/v4/loop/fun.mjs next .agentdoc/v4-fun-001
node .harness/v4/loop/fun.mjs status .agentdoc/v4-fun-001
```

`bash .harness/v4/loop/iterate.sh selftest`도 같은 검증을 실행한다.
나머지 명령도 이 래퍼로 실행할 수 있다. 자동으로 외부 CLI를 띄우거나 결제·배포하지 않는다.
호스트의 에이전트 도구로 역할을 실행하므로 Claude/Codex 중 특정 유료 CLI 설치가 필요하지 않다.

## 진행 계약

```text
designer → critic → balance → playtester → simulation_complete / review_complete
    ↑         │         │          │
    └─────────┴─────────┴──────────┘ revise: 새 round, 수정 근거부터 재검토
```

| 역할 | 필수 출력 | 다음 단계 조건 |
|---|---|---|
| designer | 현재 루프 진단, 대안 3–5개, 선택, 측정 가설, 이전 반려의 수정 내용 | 선택/가설/근거가 존재 |
| critic | 반례, `blocker/major/minor` 발견, 구체적 수정, 이전 수정 확인 | blocker/major 0개; 디자이너와 다른 agent ID |
| balance | 정수 seed, 100회 이상 표본, p10/p50/p90와 허용 범위, 재화 유입/유출/무료 경로 | 모든 p10–p90가 명시한 허용 범위 안 |
| playtester | 5/15/30분 × active/idle/intermittent 9개, 행동 관측, simulated/human 표시 | 실패 시나리오 0개; 사람 확인 현황 명시 |

`revise`는 설명과 수정 방향이 있는 finding을 요구한다. 반려된 finding마다 디자이너가
`resolves`를 작성하고 비평가가 `verified`로 확인해야 한다. 그 뒤 밸런스와 플레이테스트를
다시 실행한다. 이전 round의 응답으로 건너뛸 수 없다. 소스 변경 후 검토를 재사용하려면
새 세션에서 시작한다. 수정 중인 구현과 검증 대상 구현을 보고서에 명시한다.

세션은 **오케스트레이터 하나만 쓴다**. 에이전트들은 자신의 응답/근거 파일만 작성한다.
`submit`은 검증 후 `session.json`을 원자적으로 교체한다. 잘못된 JSON, 오래된 request ID,
역할 순서 위반, 자기 비평, 근거 누락, 반려 무시, 수치/시나리오 실패는 종료 코드 1이며
세션은 이전 상태를 유지한다. 유효한 반려는 정상 수집이므로 종료 코드 0이다.

`requestId`는 현재 저널의 SHA-256이다. 요청 프롬프트는 `prompts/`에 보관하고 수집한
응답과 근거 원문/해시는 `session.json/history`에 보관한다. 근거는 저장소 상대 경로 또는
해당 세션 내부 절대 경로의 텍스트 파일이다. 응답당 최대 12개, 파일당 최대 2 MB.
사진/영상은 관찰 기록 문서에서 경로를 참조한다. 동료 응답은 검증할 데이터로 읽는다.

오케스트레이터는 호스트의 에이전트 ID를 `agent`에 기록한다. 비평가를 디자이너와 분리하고
역할 전환마다 새 관점으로 읽게 한다. 모델의 재미 판단이나 보고서의 진실성을 JSON 검사만으로
입증할 수는 없다. 실제 명령 결과와 관측 기록을 리뷰해야 한다.

## 세션 내 운영

1. `skills/desktop-companion-clicker/SKILL.md`와 v4 설계를 읽는다.
2. `init`, `next`로 디자이너 프롬프트를 발급한다. 기존 코드/테스트에서 기준값을 수집한다.
3. 호스트의 spawn/followup 도구로 해당 역할에 프롬프트를 전달한다. 구현 작업을 병렬화할
   때는 파일 소유권을 먼저 나눈다. 역할 검토의 의존 순서는 유지한다.
4. 반환한 보고서와 근거를 확인하고 `submit`, `next`를 반복한다. 모든 통과를 임의로 만들지 않는다.
5. 비평가 통과 설계를 구현한다. 밸런스는 구현의 실제 엔진을 사용해 측정하며 실패 시 돌아간다.
   변경한 소스와 실행 명령/seed/원시 결과를 다음 보고서 근거로 첨부한다.
6. 완료 상태에서 릴리스 체크리스트를 별도로 실행하고 미검증 항목을 인계한다.

오래된 v3 Ralph의 `dispatch/collect/loop`, lane 자동 커밋/머지/배포는 v4 재미 리뷰 CLI의
명령이 아니다. 기존 v3 세션을 마칠 때는 그 세션의 v3 도구를 사용한다.
새 v4 재미 리뷰 세션은 이 계약의 `init/next/submit/status`를 명시적으로 사용한다.
**`.harness/CURRENT`는 v3로 유지한다.** 현재 plan/dev/eval 스킬과 Ralph가 이 포인터로
빌더·템플릿·lane 명령을 찾기 때문이다. v4→v3 단순 위임은 세션 버전 검사까지 충돌한다.
재미 리뷰의 버전은 `session.json`의 `version: 4`로 기록하며 추가 전역 포인터는 없다.
빌더 전체의 v4 전환은 모든 포인터 소비자를 함께 이관하는 별도 작업이다.

## 완료의 의미와 검증

`simulation_complete`는 주입된 입력/시간/RNG 시뮬레이션 검토 통과다.
`review_complete`는 사람 세션 근거를 포함한 리뷰 통과다. 둘 다 출시 완료 선언은 아니다.
`status`는 모든 경우에 별도의 릴리스 검증이 필요하다고 출력한다.

```sh
node .harness/v4/loop/fun.mjs selftest
npm test && npm run lint && npm run typecheck
```

selftest는 실제 Vitest로 역할 순서, 비평가 veto, 수정 재검토, 오래된 응답 거부, 입력 거부 시
무변경, 근거 스냅샷, 분포/시나리오 실패, CLI 파일 재개를 검사한다. fixture 결과는 합성 데이터이며
게임의 재미나 밸런스 결과가 아니다. 앱 테스트를 대체하지 않는다.

기존 `npm` 명령은 모두 유지한다. smoke/package/실서버 검증은 권한이 있는 통합 담당자가
`reference/RELEASE_CHECKLIST.md`에 실행 여부와 결과를 남긴다. 실제 사람이 플레이하지
않았다면 재미, 외형 선호도, 작업 방해 여부는 `PENDING`이다.

## 참조와 저작 범위

역할 분리와 수치 검증 방법은 [AlterLab GameForge](https://github.com/AlterLab-IEU/AlterLab_GameForge),
행동 중심 관측은 [game-playtest](https://github.com/roohe/agentic-super-skills/blob/master/skills_library/game-playtest/SKILL.md),
비평 역할은 사용자가 지정한 [Bravos Critic](https://github.com/tachyon-beep/skillpacks/blob/main/plugins/bravos-game-design/agents/game-design-critic.md)를 참고했다.
장르 문서 구성은 [GameForge genre-pack spec](https://github.com/AlterLab-IEU/AlterLab_GameForge/blob/main/docs/genre-pack-spec.md)을 참고했다.
2026-09-09 확인. 문서는 DesMon에 맞춰 새로 작성한 소형 팩이며 upstream 원문 복제나
전체 프레임워크 설치를 포함하지 않는다. 로컬 수치 목표는 DesMon의 검증 가설이다.
