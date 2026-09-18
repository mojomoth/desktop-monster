# v0.4 독립 비평 근거

역할: DESIGN CRITIC, agent `/root/pvp_directory`. 발급 요청
`2bb6cac22bed21a54ccf6a8480942e17ce867f19b8f51c079ec784a777bb094a`.
설계자는 `/root/fun_harness`이다. 발급 charter, 전용 SKILL.md, PATTERNS,
balance-template, brainstorm-variant, GAME_DESIGN_V4.md와 디자이너 보고서를 읽었다.
이 보고서는 현재 설계의 반례 검사다. 전체 릴리스나 사람의 재미 검증 통과를 뜻하지 않는다.

## 발견하고 수정 결과를 다시 확인한 문제

### C1 — 성숙 파티의 수초 환생 반복 (major, 현재 해결)

성공 환생이 동료를 유지하면서 레벨과 적만 초기화하고 성공 후 대기가 없던 구현에서는,
강한 5인 파티가 초반 적을 연속 처치하여 즉시 다음 환생을 얻었다. 레벨 12까지 누적
요구 XP는 1,970, index 0부터 보스 XP 5배를 포함하면 30회 처치로 도달한다.
가장 빨리 환생을 반복하는 행동이 외형과 영혼을 단시간에 쌓는 정답이 되어 작업 옆 게임의
기대 간격을 무너뜨린다.

최소 수정은 **수락한 뒤 활성 엔진 120초 휴식**이다. 거절/보류의 무료 재기회는 30초로
유지한다. `src/core/hero.ts`의 `HERO_REST_MS`, 저장되는 `restRemainingMs`,
`heroReady` 조건과 `src/core/engine.ts`의 tick 감소를 확인했다.

독립 실행 fixture: seed 12345, 초기 레벨 12, 기본 세이브의 돈/영혼 0,
slime/bat/ghost/golem/dragon 각 1마리, 각 bossIndex 80 / level 10 / stars 3,
100 ms tick, 30분 가상 시간, 가능할 때 첫 제안을 수락한다. 입력은 0 또는 초당 2회다.
전체 100 seed 밸런스 실험이 아니라, 성숙 파티의 악용 반례를 겨냥한 단일 seed 비교다.

| 실험 | 30분 성공 횟수(시작 시 1회 포함) | 환생 간격 | 마지막 영혼 |
|---|---:|---|---:|
| 휴식 0 반사실적 실행, 입력 0 | 300 | 5.8–6.9초 | 898 |
| 실제 휴식 120초, 입력 0 | 16 | 모두 120초 | 223 |
| 실제 휴식 120초, 입력 초당 2회 | 16 | 모두 120초 | 211 |

실제 idle 첫 8회는 0,120,240,360,480,600,720,840초였다.
5/10/15/20/25/30분 누적 횟수는 3/6/8/11/13/16이다. 항상 최고 단계인 첫 제안만
고른 정책에서 고유 외형은 14종이었다. 이 값은 모든 선택 정책의 수집 완료 시간을
뜻하지 않는다. 제안 나머지 칸의 낮은 단계 미수집 외형도 선택할 수 있다.
2분 간격에 급격한 단축은 관측되지 않았다. 첫 환생의 초반 속도는 별도 밸런스 단계 대상이다.

반사실적 비교는 TypeScript를 메모리에서 CommonJS로 변환할 때
`export const HERO_REST_MS = 120_000;`만 `= 0;`으로 치환했다.
소스 파일이나 실제 저장 파일을 바꾸지 않았다. 재현 가능한 실행:

```sh
node <<'JS'
const fs=require('fs'),path=require('path'),ts=require('typescript');
function simulation(restMs) {
 const cache=new Map();
 function load(file) {
  file=path.resolve(file); if(cache.has(file))return cache.get(file).exports;
  const m={exports:{}};cache.set(file,m);let src=fs.readFileSync(file,'utf8');
  if(file.endsWith('/hero.ts'))src=src.replace('export const HERO_REST_MS = 120_000;',`export const HERO_REST_MS = ${restMs};`);
  const code=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  new Function('require','module','exports',code)((n)=>n.startsWith('.')?load(path.resolve(path.dirname(file),n.replace(/\.js$/,'.ts'))):require(n),m,m.exports);
  return m.exports;
 }
 const {createEngine}=load('src/core/engine.ts'),{mulberry32}=load('src/core/rng.ts');
 const {DEFAULT_SAVE}=load('src/core/save.ts'),{heroReady}=load('src/core/hero.ts');
 const companions=['slime','bat','ghost','golem','dragon'].map((speciesId,i)=>({id:`c${i+1}`,speciesId,bossIndex:80,level:10,stars:3}));
 const e=createEngine({...structuredClone(DEFAULT_SAVE),level:12,companions,nextCompanionId:6},mulberry32(12345));
 const cycles=[];
 for(let n=0;n<=18000;n++) {
  if(n)e.tick(100);
  let s=e.getState();
  if(heroReady(s.level,s.hero)) {
   e.apply({type:'heroOffer'});s=e.getState();
   if(s.hero?.choices.length===3) {
    e.apply({type:'heroChoose',formId:s.hero.choices[0].formId,offerSerial:s.hero.offerSerial});
    cycles.push(n/10);
   }
  }
 }
 const gaps=cycles.slice(1).map((t,i)=>t-cycles[i]);
 console.log({restMs,count:cycles.length,firstEight:cycles.slice(0,8),minGapSec:Math.min(...gaps),maxGapSec:Math.max(...gaps),forms:e.getState().hero?.collection.length,souls:e.getState().souls});
}
simulation(0);simulation(120000);
JS
```

### C2 — 이전 DB 행 하나가 상대 목록 전체를 실패시킴 (major, 현재 해결)

v2 서비스와 DB를 공유하므로 기존 JSON snapshot에는 `party`가 없을 수 있다.
`PgStore.toRow`의 타입 단언은 필드를 생성하지 않는다. 이 행을 새 목록의
`pvpParty(companions, undefined)`로 전달하면 배열 순회에서 예외가 나고 목록은 500이 된다.
스킨/전적을 기본값으로 표시하더라도 그 이전에 목록이 실패하므로 이전 플레이어가 접근할 수 없다.

현재 `src/server/pgStore.ts`는 없는 party를 `[]`로 정규화하고
`src/server/app.ts`의 목록/매치/탈취/회수도 없는 party를 안전하게 처리한다.
기존 자동 파티 선택 규칙은 유지한다. 메모리 스토어의 실제 저장 snapshot에서 party 필드를
제거한 fixture로 **목록 → 특정 상대 사전보기 → 전투 → 탈취**가 정상 동작하는지 확인했다.
mock pg가 반환한 예전 행도 party=[], wins/losses=0, thefts=[]로 읽힌다.

## 이번 실행에서 공격한 나머지 조건

- **항상 정답인 외형:** `hero.test.ts`에서 같은 불 동료에 전문 버프 +50%,
  다른 속성에는 +0%, 전체 버프에는 +25%임을 확인했다. 상위 h41과 h01의 예산은 같다.
  `battle.test.ts`에서 수비 물 전문 버프가 slime 전투 판정을 바꾸고 불 전문 버프는
  같은 slime 전투에 영향을 주지 않는 것을 실제 시뮬레이터로 확인했다.
- **새로고침/중복 지출:** 저장과 재로드가 같은 제안/roll을 유지한다. 이전 offerSerial의
  재굴림과 선택을 재전송해도 상태가 바뀌지 않는다. 부족한 골드 재굴림은 전후 상태가 같다.
- **보류 처벌:** 보류가 레벨/돈을 유지하고 저장/재로드를 사이에 둔 30초 뒤 무료 제안을
  다시 만든다. 수락 후 120초 휴식은 이 무료 보류 타이머와 구분된다.
- **보상 유실:** 소유하지 않은 외형 장착은 거절하며, 낮은 중복 roll은 기존 최고 roll을
  낮추지 않는다. 최대 50종 도감의 장기 분포는 별도 밸런스 단계에서 다룬다.
- **PvP 거짓 정보/경쟁 상태:** 목록은 공식 wins/losses만 반환하며 snapshot의 임의
  wins/losses를 무시한다. 사전보기 뒤 상대가 업로드해도 당시 파티와 영웅 버프를 사용한다.
  중복 동시 전투는 한번만 기록된다. 같은 동료를 노리는 동시 공격은 한번만 탈취한다.
  DB/메모리 트랜잭션 실패는 쿨다운/전적/동료 이동을 함께 롤백한다.

마지막 직접 실행 명령과 결과:

```text
npm test -- --run tests/hero.test.ts tests/battle.test.ts tests/server/opponents.test.ts tests/server/pgTransaction.test.ts
4 test files, 27 tests passed (2026-09-09 18:25:49 KST)
```

앞서 서버/네트워크/IPC/기존 전투 묶음 162개도 통과했다. 이후 C2 회귀 테스트 2개를
추가했으므로 이 숫자를 현재 전체 테스트 수라고 주장하지 않는다. 전체 정확한 앱 게이트는
통합 담당자가 실행한다. PostgreSQL 검사는 주입된 mock이며 실제 DB 접속 검증이 아니다.

## 판단과 남은 검증 범위

현재 설계에서 재현한 major 두 건의 수정 결과를 확인했고 열린 blocker/major는 없다.
따라서 비평 단계는 pass로 밸런스 단계에 넘긴다. C1/C2는 세션 생성 전에 발견되어 수정된
역사적 비평 ID다. 이번 발급 요청의 openFindings가 비어 있어 JSON verified는 비워둔다.

50종 도트가 사람 눈에 모두 개성 있고 더 멋져 보이는지, native macOS에서 업무 포커스를
빼앗지 않는지, 실제 사람이 외형/버프를 이해하고 더 즐거워하는지는 PENDING이다.
코드/단위 테스트와 가상 시간 결과로 사람 관찰을 대신하지 않는다.
