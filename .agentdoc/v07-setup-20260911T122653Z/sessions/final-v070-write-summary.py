from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,subprocess
r=Path('.agentdoc/v07-setup-20260911T122653Z')
closing=r/'sessions/V07-07-final-v070-PENDING.md'
assert not closing.exists(), 'Preserve existing closing session; choose a new document capture path'
audit=json.loads((r/'reviews/final/audit.json').read_text())
assert audit['status']=='audit_complete' and len(audit['history'])==4
loop=json.loads((r/'loop.json').read_text()); task=loop['tasks'][-1]
checks={c['commandId']:c for c in task['attempts'][-1]['checks']}
assert 'review' in checks and checks['server']['exitCode']==1 and task['status']=='running'
assert checks['gates']['command']=='npm test && npm run lint && npm run typecheck' and checks['gates']['exitCode']==0
S='84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131'
E='c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d'
for c in checks.values():assert c['sourceDigest']==c['endedDigest']==S and c['evaluationDigest']==c['endedEvaluationDigest']==E
for key in ['measure','matrix','smoke','package','gates']:
 assert checks[key]['exitCode']==0, f'{key} did not pass; do not print fixed success prose'
for c in checks.values():assert hashlib.sha256(Path(c['log']).read_bytes()).hexdigest()==c['sha256']
current=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {sourceDigest,evaluationDigest} from './.harness/v7/loop/evidence.mjs'; console.log(JSON.stringify({source:sourceDigest(),evaluation:evaluationDigest()}))"],text=True))
assert current=={'source':S,'evaluation':E}
expectedArtifacts={
 'evidence/native/matrix.json':'45af28ccfa167f889b415ca187c5d9cf2d8179ef4d1cea5a5bf1c91785263c5c',
 'evidence/release.json':'46271facabdeb917748b50b46b2136246c0fd65281b5e76b350a7dcd1e6b1079',
 'evidence/package/package.json':'59bd5bbdac94dbbe2f672f6e5d9b1d7f4225be0bfb6341928ff4f15fca9347ae',
 'evidence/distribution/dmg.json':'549de02072228f86b50c09ff8d8b107e2c6aab6845aff5457c852c28ac1132b0',
 'evidence/server/compatibility.json':'9eeb9ad2554c1aea54100a354557ced0d91d9b2596476bedbdfa4ab3433241c4'}
artifacts={}
for name,expected in expectedArtifacts.items():
 raw=(r/name).read_bytes();assert hashlib.sha256(raw).hexdigest()==expected;artifacts[name]=json.loads(raw)
for name,count in [('evidence/native/matrix.json',430),('evidence/package/package.json',10),('evidence/distribution/dmg.json',5)]:
 d=artifacts[name];assert d['status']=='passed' and not d['errors'] and len(d['checks'])==count and all(c['passed'] for c in d['checks'])
matrix=artifacts['evidence/native/matrix.json'];assert len(matrix['sessions'])==10 and len(matrix['screenshots'])==198 and matrix['observationMs']==19803022.837542
measure=artifacts['evidence/release.json'];assert len(measure['runs'])==900 and len(measure['policies'])==9 and measure['phase']=='release' and measure['targets']['passed'] and measure['targets']['samples']==100
assert artifacts['evidence/package/package.json']['runtime']['version']=='0.7.0'
assert artifacts['evidence/server/compatibility.json']['live']['status']=='PENDING'
assert all(Path(x['path']).is_file() and hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256'] for x in audit['artifacts'].values())
assert (r/'reviews/final/report.md').exists()

base='../../'+str(r)
now=datetime.now(timezone.utc).isoformat()
findings=[f for h in audit['history'] for f in h['findings']]
severity={x:sum(f['severity']==x for f in findings) for x in ['blocker','major','minor']}
assert checks['review']['exitCode']==(1 if severity['blocker'] or severity['major'] else 0)
review='PASS' if checks['review']['exitCode']==0 else 'FAIL'
roles=' → '.join(f"`{h['role']}` (`{h['agent']}`)" for h in audit['history'])
rows='\n'.join(f"| {key} | {checks[key]['exitCode']} | {checks[key]['at']} | [{Path(checks[key]['log']).name}]({base}/evidence/{Path(checks[key]['log']).name}) |" for key in ['measure','matrix','smoke','package','server','gates','review'])
acceptance=f'''# DesMon v0.7 검수 기록

갱신: {now}. 실행 폴더: `{r}`. **구현과 최종 로컬 실행·분석은 완료했지만 제품 출시 검증은 PENDING이다.** 필수 운영 서버 호환 AC가 종료 코드 1이므로 V07-07을 verified로 기록하지 않았다. `humanChecks=PENDING`을 유지한다.

| 상태 | 현재 근거와 판정 |
| --- | --- |
| 하네스 준비 | H07-01 historical verified. 최초 setup 근거를 확인하고 기존 실행을 candidate, 이후 release로 승급했다. 변경 전 하네스 결과를 현재 평가기의 성공으로 재인증하지 않았다. |
| 설계 검토 | `fun.mjs`의 실제 전체 prompt/template으로 최종 4역할 순서를 완료했다. 실제 Critic 반려·제품 수정·refresh 이력도 보존했다. |
| 구현 V07-01–06 | 최종 0.7.0 대상의 작업별 등록 AC 및 각 canonical gates 성공 뒤 verified. [불변 작업 세션]({base}/sessions/V07-06-final-v070.md)과 loop.json에 연결돼 있다. |
| 수치 분석 | 최종 candidate 100개와 별도 release 900개를 새로 실행했다. 기준 active의 등록 목표 PASS. 정책별 실패·미도달은 별도다. |
| 결과 감사 | 별도 `audit.mjs` 실제 4역할 `audit_complete`. 등록 review AC {review}; 발견 {severity['blocker']} blocker / {severity['major']} major / {severity['minor']} minor. [전체 감사]({base}/reviews/final/report.md). |
| 출시 검증 V07-07 | release / running / **unverified**. 서버 AC 실패이며, running은 미완료 저널 상태로서 프로세스 실행을 뜻하지 않는다. 사람 확인·운영 출시 PENDING. |

Package/lock/root package 버전은 **0.7.0**이다. 버전을 먼저 고정한 뒤 트레이 불일치를 수정하고 아래 최종 실행을 새로 만들었다. 최종 제품 지문은 `{S}`, 평가 지문은 `{E}`다. 이후 제품·평가기·프로토콜을 바꾸지 않았다. 본 상태 문서의 바이트는 이전 AC 당시와 다르며, 이전 소유 파일 지문을 현재 문서의 성공으로 재인증하지 않는다.

**구현과 기능 검증 범위**

| 작업 | 구현·확인된 동작 |
| --- | --- |
| V07-01 사전등록 | Lv16–20 대조 및 라운드별 최대 3개 XP/HP/초기 포획 후보를 정확한 수치·ID로 실행 전에 등록했다. 탐색 10001–10020과 채택 후 검증 1–100을 구분했다. 선택안은 `candidate-r8-tail10450`이다. |
| V07-02 동료 | 양의 안전 정수 레벨을 저장/업로드/서버/목록·match·PvP 파티·탈취·회수 응답까지 허용·검증한다. Lv11·250·MAX_SAFE_INTEGER 왕복, 잘못된 응답 거절, 성장/별 증가 overflow의 재료·상태 무손실을 확인했다. JSONB 구조를 유지한다. |
| 동료 환생 | Lv9 이하 거절, Lv10 이상 Lv1·별+1. 정확한 전후 힘과 감소를 먼저 표시하고 확인 후 전송한다. Lv11 힘11→2를 실제 UI로 확인했고 대상 변경/삭제/중복 확인을 무효화했다. Lv250 진단은 변경 취소 사례이며 실제 환생 확정으로 표현하지 않는다. |
| V07-03 도감 | 영웅 실제 선택 이력/영구 컬렉션, 몬스터 종별 처치로 카드·공개 수·이름·설명·aria·알림·ACK·목표를 통일했다. 레거시 ACK는 공개 집합과 교집합만 남기고 반복 부팅/첫 획득 단일 알림을 확인했다. 보유 동료·전체 처치로 종별 과거 처치를 추정하지 않는다. |
| V07-04 PvP | 50개 행의 영웅·동료 파티·순위·승패, 행 재사용·선택 강조·접근성 이름, 실제 Tab/ShiftTab/Enter/Space, 요청·응답 상대 ID 일치, 만료/삭제/오류 차단을 확인했다. 삭제 행 포커스는 새로고침으로 이동한다. 운영 PvP 시험을 뜻하지 않는다. |
| V07-05 진행 | 실제 제안/출현과 공유하는 `eligibleHeroIds`·`eligibleMonsterIds`, UI/엔진 준비 판정, 하드코딩된 18 상한 제거와 기존 열린 제안 문턱 보존을 확인했다. 필드 HP와 동료 힘의 HP 기준을 분리하고 정확 BigInt 계산을 사용한다. 새 강제 시간 제한은 없다. |
| V07-06 통합 | 최종 버전의 실제 Electron 0분 integration 42검사 PASS. 별도 0분 preflight도 42검사 PASS. 자연 관측 시간이 아니며, 희귀 h70 세 번째 실제 선택·도감/ACK/목표 연결 등 fixture 진단으로 기록했다. |

**최종 측정 결과**

[최종 candidate 100]({base}/evidence/candidate-final-v070.json)과 [별도 release 900]({base}/evidence/release.json)은 같은 최종 소스에서 실제 새 실행이다. release는 2026-09-12T19:00:33.515843Z–20:10:10.684924Z에 등록 9정책 각각 100 seed × 12시간을 완료했다. 가속 엔진 시뮬레이션이며 실제 사용자 플레이 시간이 아니다. 원본 900개와 소스/평가기/빌드 압축은 [실행 기록]({base}/evidence/measurement-release-v070/execution.json)에 연결된다. 별도 [Balance 분석]({base}/evidence/release-v070-analysis/README.md), Host 독립 재집계 및 상호 검산을 보존했다.

기준 active/free/uniform/관리 없음/menuVisitSeconds=0의 첫 성공 p10/p50/p90/최악은 **1698.4 / 2736.6 / 3539.5 / 3723.3초**다. p50 **45.61분**, 전체 **100/100이 90분 내 성공**, 미도달 0이다. 첫 준비·제안·실제 선택 성공을 분리해 기록했다.

마지막 named 단계는 `h70` 별밤 계승자다. 자격 전체 p10/p50/p90/최악은 **17441.5 / 40596 / null / null초**이며 p50 **11시간 16분 36초**로 등록 8–12시간 범위다. **자격 50/100, 미도달 50/100, 제시 50/100, 실제 선택 0/100**이다. 도달자 조건부 p10/p50/p90/최악은 14841.7 / **20933.6** / 34739.3 / 40596초다. 미도달을 뒤에 정렬한 전체 lower median index49를 조건부 중앙값으로 바꾸지 않는다. 자격 30개는 8시간 전, 20개는 8–12시간이다.

| 등록 정책 (각 100개) | 첫 성공 전체 p50초 | 90분 내 성공 | h70 자격 전체 p50초 | 자격/제시/선택 |
| --- | ---: | ---: | ---: | --- |
| active/free/uniform/관리 없음/즉시 선택 — 기준 | 2736.6 | 100 | 40596 | 50/50/0 |
| active/free/uniform/관리 없음/600초 메뉴 | 3000 | 100 | 25894.3 | 89/89/0 |
| intermittent/free/uniform/관리 없음/600초 | 4800 | 64 | 28810.5 | 81/78/0 |
| warm-idle/free/uniform/관리 없음/600초 | 13800 | 13 | null | 44/43/0 |
| pure-idle/free/uniform/관리 없음/600초 | null | 0 | null | 0/0/0 |
| active/free/burst/관리 없음/즉시 | 1822.6 | 100 | 25651.5 | 68/67/0 |
| active/training/uniform/consume-weakest/600초 | 2400 | 100 | 16807 | 100/100/0 |
| active/lure/uniform/fuse-first/600초 | 3000 | 100 | 22227 | 92/92/0 |
| active/reroll/uniform/reincarnate-first/120초 | 2040 | 100 | 9969 | 100/100/0 |

목표 판정 분모는 첫 행의 100개다. 다른 정책의 과속·지연·미도달을 합쳐 PASS로 만들지 않았다. 첫 슬롯 선택 정책으로 모든 정책의 희귀 h58/h62/h70 실제 선택은 0이다. 실제 세 번째 카드 선택 기능은 자연 관측 이후 별도 진단에서 확인했다. 8→12시간 기준 전원 추가 처치·환생이 있어도 새 획득 공백은 길다. 수집 공백·순수 방치 정지·유료 정책의 복합 효과와 사람 재미는 구분한다. 9,900개 관측점의 재화 보존과 큰 정수 통계의 정확 문자열을 검산했다.

**실제 Native와 패키지**

[Native matrix]({base}/evidence/native/matrix.json): 실제 5/15/30분 × active/idle/intermittent 9개 및 별도 연속 180분 active, **10원본·430검사 PASS·오류0·198 PNG**, 자연 관측 합 **19,803,022.837542ms = 330분 3.023초**. 격리 save·합성 입력·모의 네트워크를 사용했고 자연 관측 중 fixture/시간 가속/동시 빌드는 없었다. 후속 fixture 진단 시간은 자연 시간에 더하지 않았다. Host가 10개 종료 화면과 긴 관측의 메뉴 18개를 직접 봤다.

연속 180분은 실제 10분 간격 메뉴 **18회·선택 성공 14회·서로 다른 영웅 14종**, 종료 Lv1·13,077회 처치·동료30·환생14다. 첫 준비 관측 2,312,052.202208ms와 실제 첫 선택 완료 2,401,183.300416ms를 구분한다. h70의 30,000회 처치 조건에 도달하지 않았으므로 자연 h70 획득으로 주장하지 않는다. 짧은 9개는 선택 없는 관측이며, 30-active 종료 화면은 Lv17/READY지만 주기 기록의 firstReadyElapsedMs=null이다. 정확한 최초 준비 시각은 미확인이다. Native intermittent에는 측정의 120초 onboarding이 없어 두 정책을 동일시하지 않는다.

최종 `npm run smoke`는 SMOKE_OK/종료0이다. Chromium의 MojoAudioOutputIPC 경고를 로그에 보존했고 사람 오디오 확인으로 확대하지 않는다. 실제 `npm run package`와 [패키지 검사]({base}/evidence/package/package.json)는 **10검사 PASS/오류0**, 실제 런타임 0.7.0, 격리된 패키지 프로세스 4개 종료0, 레거시·새 UI 상태·재시작 보존을 확인했다.

[DesMon-0.7.0-arm64.dmg](../../release/DesMon-0.7.0-arm64.dmg)는 **110,371,291 bytes**, SHA256 `6b1b14b3f86f507116c99872b8d1538b2cf91ba8376d952cc10498175c167cbe`다. [읽기 전용 DMG 검사]({base}/evidence/distribution/dmg.json) **5검사 PASS**: 실제 hdiutil verify/attach/detach, metadata checksum·버전, 포함 앱 295파일·14링크의 검증된 앱과 일치를 확인했다. 사용자 설치·서명/공증·사람 관찰은 수행하지 않았다.

**등록 release AC와 남은 실패**

| AC | 실제 종료 코드 | UTC 완료 시각 | 원본 실행 로그 |
| --- | ---: | --- | --- |
{rows}

Gates는 정확히 `npm test && npm run lint && npm run typecheck`를 실행해 **58파일·955테스트, lint 0경고, 전체 typecheck PASS**였다. 같은 최종 소스의 과거 성공을 새 실행으로 인증하지 않았다. 최종 네 역할은 {roles} 순서의 실제 별도 ID다. 설계 검토와 결과 감사는 다른 세션/도구다.

[서버 capture]({base}/evidence/server/compatibility.json)는 로컬 빌드와 **8파일·121테스트 PASS**지만 운영 호환 PENDING으로 종료1이다. health가 보고한 SHA `28270992518dc5bfc9c1f89f700c0491eaf8d1ed`의 [독립 전체 35파일 정적 대조]({base}/evidence/server/compatibility-static-mapping.md)는 **13일치·17불일치·5경로 없음**이다. 그 커밋은 동료 Lv10 상한, 상대 목록 route 부재, 지정 상대 ID 무시를 포함한다. helper의 원본 reason 문구와 달리 `.every`는 첫 불일치에서 중단하므로, 전체35 비교는 별도 Critic 보고서에 의존한다. 인증 운영 API/DB 시험·실행 중 서버 코드 attestation으로 확대하지 않는다. `/healthz`만으로 호환을 인정하지 않았다. 자동 커밋·푸시·운영 배포는 없었다.

**보존·실패·미확인**

기존 setup·v5·사용자 앱/save를 초기화하지 않았다. [독립 보존 원본]({base}/evidence/final-v070-preservation-balance.md)과 [보완]({base}/evidence/final-v070-preservation-balance-amendment.md): 최초179개 경로 모두 존재, 현재137개 동일/42개 개발 변경, v5/CURRENT **36/36 동일**, 실제 `CURRENT=v3`다. 전체 시작 바이트는173/179개 연결했고, expedition/hero/heroMenuReadiness/ipc/menu/progressV6 테스트6개의 시작 전체 원본 위치는 검사한 보관물과 [로컬 Git 조사]({base}/evidence/final-v070-preservation-git-designer.md)에서 미확인이다. 현재 파일 누락이나 금지된 테스트 변경의 증거로 단정하지 않으며, 179개 전체 복구 가능으로 인증하지 않는다. 이전 앱·builder metadata는 사전 불변 압축에, 기존 5개 DMG와 5개 blockmap은 원위치에 보존했다.

탐색 실패와 Round05 검증 실패 원본 `evidence/candidate.json`을 유지했다. 첫 버전 동결의 954PASS/1FAIL(트레이 버전), 실제 Critic 반려·제품 한 줄 수정·refresh 뒤 새955PASS, 초기 Native Enter 입력 실패와 수정, Host 보조 조건부 p90 계산 교정, audit init 완료 전 next의 ENOENT 후 순차 재실행도 보존했다. 이 보조 오류 교정으로 제품/등록 수치/완료된 측정을 바꾸지 않았다. 테스트 삭제·skip·약화나 strictness 완화로 통과시키지 않았다.

사람의 재미·선택 이해·업무 방해, 실제 글로벌 입력 권한·OS 알림, 운영 고레벨 호환과 클라이언트 출시는 **PENDING**이다. 다음 행동과 불변 원본 경로는 [HANDOFF](HANDOFF.md)를 따른다. 이 문서 이전의 누적 상태는 [원본 보관본]({base}/sessions/before-final-summary/ACCEPTANCE.md)에 남겨 과거 진행 상태와 현재 완료 범위를 분리했다.
'''
handoff=f'''# DesMon v0.7 인계

갱신: {now}. **v0.7.0 구현·최종 로컬 검증·실제 관측·수치 분석·4역할 결과 감사를 마쳤다. 제품 출시 검증은 운영 서버 호환 실패로 PENDING이다.** `humanChecks=PENDING`. 커밋·푸시·운영 배포는 수행하지 않았다.

실행 폴더는 `{r}`이며 [loop.json]({base}/loop.json)은 **release / H07-01 historical verified / V07-01–06 final0.7 verified / V07-07 running·unverified**다. V07-07의 필수 server AC가 실제 종료1이다. 미완료 작업을 verified로 바꾸거나, 근거 없는 환경 복구 3회를 만들어 blocked로 기록하지 않았다. 현재 running은 저널 상태다. Native·측정·패키지 실행은 종료했다. 최종 프로세스·지문 확인은 [closeout 기록]({base}/evidence/final-v070-closeout-host.json)을 본다. 사용자 Electron PID50718은 마지막 관측까지 유지했다.

재개 시 이 문서, [LOOP](LOOP.md), loop.json과 [마지막 세션]({base}/sessions/V07-07-final-v070-PENDING.md)을 먼저 읽는다. 실제 PID/PGID와 matrix-state.json을 확인하고 완료된 측정·Native를 중복 시작하지 않는다. 기존 하네스를 재생성하지 않는다. 이 세션은 v7 Host 계약이며 v3 Ralph 그래픽 lane이 아니다. AGENTS.md, `.harness/v7/HARNESS.md`, config.json, DEVELOPMENT_PLAN.md, EVALUATION_PROTOCOL.json을 따른다.

최종 제품 지문: `{S}`. 평가 지문: `{E}`. Package/lock/root package와 트레이는 **0.7.0**이다. 버전 고정 후 실제 최종100 seed와900 seed·330분 관측·게이트를 새로 실행했다. 현재 상태 문서 갱신을 이전 AC의 동일 소유 파일 지문으로 재인증하지 않는다.

| 완료 범위 | 연결된 실제 근거 |
| --- | --- |
| V07-01–06 구현·등록 AC·각 gates | [V01]({base}/sessions/V07-01-final-v070.md), [V02]({base}/sessions/V07-02-final-v070.md), [V03]({base}/sessions/V07-03-final-v070.md), [V04]({base}/sessions/V07-04-final-v070.md), [V05]({base}/sessions/V07-05-final-v070.md), [V06]({base}/sessions/V07-06-final-v070.md) |
| 최종 설계 검토 | [fun 세션]({base}/reviews/design-final-v070/session.json). 실제 Designer→Critic 반려→수정/refresh→Designer→Critic→Balance→Host, 최종 4역할 완료 |
| 별도 결과 감사 | [audit 보고서]({base}/reviews/final/report.md), `audit_complete`, 등록 review AC {review}; {severity['blocker']} blocker / {severity['major']} major / {severity['minor']} minor. 출시/사람 재미를 승인하는 상태가 아님 |
| 최종 canonical gates | [955테스트·lint·typecheck 원본]({base}/evidence/V07-07-1789265033343.log), 2026-09-13T02:04:05.595Z 종료0 |
| 실제 smoke | [SMOKE_OK 원본]({base}/evidence/V07-07-1789264482303.log), 종료0; Chromium audio 경고 보존 |
| 실제 package·배포 파일 검사 | [package10 PASS]({base}/evidence/package/package.json), [DMG5 PASS]({base}/evidence/distribution/dmg.json), [실제 DMG](../../release/DesMon-0.7.0-arm64.dmg) |

구현은 동료 레벨 상한을 저장·서버·응답 전 경로에서 제거하고 안전 정수·overflow 무손실을 지킨다. Lv10 이상 동료 환생의 Lv1/별+1·힘 감소를 확인 전 표시하며 대상 변경을 무효화한다. 도감은 실제 영웅 선택/종별 처치를 공유 판정으로 사용하고 레거시·알림/ACK/목표까지 일치시켰다. PvP는 50행의 영웅·동료 파티, 지정 ID 대조, 키보드 선택·안정된 포커스·오래된 미리보기 차단을 확인했다. 진행은 실제 자격 export/준비 판정과 기존 제안 문턱 보존을 적용했다. 세부 AC 범위와 진단 한계는 [ACCEPTANCE](ACCEPTANCE.md)에 있다.

최종 채택안은 `candidate-r8-tail10450`이며 선택은 검증 seed 실행 전에 고정했다. Lv17, XP20×1.42, 필드 HP1153/1000·index79 이후10450/10000, 동료 힘 HP115/100, 기본 포획0.35·index63 이상 보스에서 명단30 미만/영구 초기 할당 구간1–5에 보장이며 정확한 21개 등록값은 프로토콜을 따른다. 초기 할당 구간은 영구 nextCompanionId 기준으로, 전송/레거시 보정으로 소진될 수 있다. RNG 소비량과 기존 120초 휴식·30초 미루기를 유지했고 새 시간 제한은 없다.

공통 콘텐츠는 `crownwyrm`(dragon3), `rootcolossus`(영웅 환생3), `h58`(물100/reefknight2/총1500), `h62`(환생5/seen60/총6000), `starvoid`(환생10/총16000), 마지막 `h70` 별밤 계승자(서로 다른 영웅10종 실제 선택/총30000회 처치)다. 자격·등장·실제 획득을 구분한다.

[최종 candidate100]({base}/evidence/candidate-final-v070.json)과 별도 [release900]({base}/evidence/release.json)은 완료·동결됐다. release는 등록 9정책 각각 seed1–100×12시간, 새900원본이며 이전0.6 결과나 중간 실행을 재사용하지 않았다. 기준 active 첫 성공 p50 **2736.6초=45.61분**, **전체100/100이90분 내 성공**했다. h70 자격 전체 p50 **40596초=11시간16분36초**이며 **50도달/50미도달·제시50/선택0**이다. 도달자 조건부 p50 **20933.6초** 및 전체p90/최악null을 숨기지 않는다. 첫 슬롯 정책으로 희귀 세 번째 카드를 선택하지 않은 결과다. 정책별 과속·지연·순수 방치 정지와 후기 새 획득 공백은 [독립 분석]({base}/evidence/release-v070-analysis/README.md)에 있다. 이를 사람 재미·모든 정책 목표 통과로 표현하지 않는다.

[실제 Native]({base}/evidence/native/matrix.json)는 5/15/30분×3프로필9개와 별도 연속180-active **330분3.023초**, 10원본·430검사PASS/오류0·198PNG다. 긴 여정은 10분마다 실제 메뉴18회·환생14회, 종료Lv1/처치13077/동료30/서로 다른 선택영웅14다. 첫 준비 관측2312052.202208ms와 첫 선택 완료2401183.300416ms를 구분한다. Host가 모든 종료10PNG와 메뉴18PNG를 직접 확인했다. 짧은9개는 선택 없는 관측이다. 30-active의 종료Lv17/READY와 주기firstReady=null은 정확 최초시각 미확인으로 남긴다. 자연 관측은 격리 save·합성 입력·모의 네트워크만 사용했고 fixture/시간 가속/동시 빌드 없이 종료했다. 이후 진단은 자연 시간에 합산하지 않았다. h70 세 번째 선택·Lv11 환생·Lv250 대상변경 취소·MAX 왕복·PvP 지정 ID/키보드는 후속 fixture 진단이며 자연 획득이나 운영 API 확인이 아니다.

**출시를 막고 있는 실제 실패**: [최종 서버 capture]({base}/evidence/server/compatibility.json)는 로컬 빌드/121테스트PASS지만 운영PENDING/종료1이고 등록server AC도1이다. health SHA `28270992518dc5bfc9c1f89f700c0491eaf8d1ed`는 현재 테스트한 35파일과 13일치/17불일치/5경로누락이다. [독립 정적 보고서]({base}/evidence/server/compatibility-static-mapping.md)에 해당 커밋의 Lv10 상한, 상대 목록 route 부재, 지정 ID 무시를 기록했다. 전체35 대조는 별도 Critic 조사이며 helper의 short-circuit reason 문구로 전체 비교를 주장하지 않는다. 인증 운영 API/DB·실행 코드 attestation은 미수행이다. `/healthz` SHA만으로 고레벨 호환을 승인하지 않는다.

다음 행동은 운영의 검증된 호환 빌드 대응 근거를 확보하는 것이다. 커밋·푸시·운영 배포는 이번 지시에 따라 자동 수행하지 않는다. 후속 배포가 별도로 승인되면 새 고레벨 호환 capture와 필요한 등록 AC를 실행해야 한다. 기존 `compatibility.json`/로그와 모든 실패 원본을 덮어쓰지 말고 새 경로를 사용한다. 등록 AC 경로를 바꾸면 config와 loop를 Host 단독으로 원본 보존 후 동기화하고, 평가 지문 변경으로 낡은 근거를 현재 성공으로 재인증하지 않는다. 소스·평가기 변경은 영향받은 검증·실제 측정·관측·감사를 새로 요구한다. 기능이 같은 동결 소스의 기존 실행도 새 실행으로 날짜를 바꾸지 않는다. 실제 참가자 관찰 전 사람 확인은 계속 PENDING이다.

보존 점검은 [Balance 원본]({base}/evidence/final-v070-preservation-balance.md)과 [보완]({base}/evidence/final-v070-preservation-balance-amendment.md), [Designer Git 조사]({base}/evidence/final-v070-preservation-git-designer.md)를 따른다. 최초179개가 모두 현재 존재하고 v5/CURRENT36개가 동일하다. 개발 중 변경된42개를 원래와 바이트 불변이라고 주장하지 않는다. 최초 전체 바이트173개는 보관물에 연결했지만 테스트6개(expedition/hero/heroMenuReadiness/ipc/menu/progressV6)의 시작 전체 원본 위치는 미확인이다. 현재 파일 누락·사용자 변경 손실로 단정하지 않고 이 한계를 유지한다. 이전 앱/metadata는 `preservation/pre-v07-package` 압축에, 기존 DMG5개/blockmap5개는 release에 보존됐다. 사용자 save/auth를 읽거나 초기화하지 않았다.

이전 탐색/검증 실패, 트레이954PASS/1FAIL와 실제 반려/수정/refresh, Native 초기 Enter 실패/수정, Host 보조 분위수 교정, audit init-next 순서 오류는 [작업 저널]({base}/sessions/development-working.md)과 원본에 남아 있다. 이전 누적 HANDOFF는 [원본 보관본]({base}/sessions/before-final-summary/HANDOFF.md)에서 읽을 수 있다. 하네스 준비·설계 검토·분석 완료·제품 출시 검증은 위의 서로 다른 상태를 유지한다.
'''
for name,text in [('ACCEPTANCE.md',acceptance),('HANDOFF.md',handoff)]:
 archive=r/'sessions/before-final-summary'/name
 assert archive.exists()
 (Path('docs/v0.7')/name).write_text(text)
 print(name,len(text.encode()),hashlib.sha256(text.encode()).hexdigest())
session=f'''# V07-07 최종 실행 기록 — 출시 PENDING

기록: {now}. Host /root = Playtester. 실행 폴더 `{r}`.

최종 소스 `{S}`, 평가 `{E}`, package/lock/root version0.7.0.

최종 Native10개/330분3.023초/430검사PASS·release9정책각100seed×12시간900원본·smoke·실제package/DMG·955테스트/lint/typecheck를 완료했다. 4역할 결과 감사 `audit_complete`, review AC {review}. 등록 서버 AC는 실제1이며 운영 고레벨 대응 근거가 없어 V07-07은 running/unverified, 제품출시PENDING, humanChecksPENDING이다. 커밋·푸시·운영배포하지 않았다.

실제 역할 순서: {roles}.

| AC | exit | at | log |
| --- | ---: | --- | --- |
{rows.replace(base,'..')}

[ACCEPTANCE](../../../docs/v0.7/ACCEPTANCE.md)와 [HANDOFF](../../../docs/v0.7/HANDOFF.md)에 구현 범위·측정 전체/조건부 분위수·원본·실패·미확인·다음 행동을 기록했다. [closeout factual snapshot](../evidence/final-v070-closeout-host.json)은 현재 지문과 실제 기존 로그의 해시만 대조하며 실행 재인증이 아니다. 문서 갱신은 과거 AC 소유 바이트와 다르며 이 세션은 verified 근거로 제출하지 않는다.

179개 현재 존재/36v5CURRENT동일/최초전체173연결, 여섯 테스트의 시작 전체 바이트 위치는 미확인이다. 현재 파일 누락이나 테스트 약화로 단정하지 않으며 모든179원본복구가 가능하다고 인증하지 않는다. 이전 상태 문서 전체는 sessions/before-final-summary에 보존했다. 실제 서버 호환 capture/등록AC 실패 원본을 유지하며 후속 승인된 운영 작업 없이는 출시 완료로 바꾸지 않는다.
'''
with closing.open('x') as f:f.write(session)
print('session',len(session.encode()),hashlib.sha256(session.encode()).hexdigest())
