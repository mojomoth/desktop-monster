import json, math
from pathlib import Path
base=Path('.agentdoc/v11-20260918-resume/balance')
read=lambda p:json.loads(Path(p).read_text())
manifest=read(base/'final.json')
assert manifest['selected']=='R19-B'
result=read(base/'r19-heldout/report.json')['reports'][0]
assert result['passed'] and len(result['checks'])==23
rows=[json.loads(l) for f in result['raw'] for l in Path(f['path']).read_text().splitlines()]
assert len(rows)==280
names={'ordinary':'일반','intermittent':'간헐','high':'고활동','idle':'입력 중단','wealthy':'강한 기존 자산','soul-farming':'계속 영혼 회귀'}
def clock(minutes):
 if minutes is None or not math.isfinite(minutes):return '미도달'
 sec=round(minutes*60,3); tail=f'{sec%60:06.3f}'.rstrip('0').rstrip('.');return f'{int(sec//3600)}:{int(sec//60%60):02}:{tail}'
def table(profiles):
 head='| 입력 정책 | 회차 | 도달/표본 | p10 | p50 | p90 |\n|---|---:|---:|---:|---:|---:|'
 entries=[s for s in result['summaries'] if s['profile'] in profiles]
 return head+'\n'+'\n'.join(f"| {names[s['profile']]} | {s['cycle']} | {s['arrived']}/{s['n']} | {clock(s['p10'])} | {clock(s['p50'])} | {clock(s['p90'])} |" for s in entries)
def q(values,p=.5):
 values=sorted(math.inf if v is None else v for v in values);return values[math.floor((len(values)-1)*p)]
ordinary=[r for r in rows if r['profile']=='ordinary']
farm=[r for r in rows if r['profile']=='soul-farming']
wealth=next(s for s in result['summaries'] if s['profile']=='wealthy' and s['cycle']==1)
def msmedian(key):return clock(q([r[key] for r in ordinary])/60000)
levels={lv:clock(q([r['firstLevels'][str(lv)] for r in ordinary])/60000) for lv in (20,21,22)}
levelgap=clock(q([r['firstLevels']['26']-r['firstLevels']['25'] for r in ordinary])/60000)
heroShare=q([int(r['cycles'][0]['damage']['heroApplied'])/(int(r['cycles'][0]['damage']['heroApplied'])+int(r['cycles'][0]['damage']['companionApplied']))*100 for r in ordinary])
party=q([int(r['cycles'][0]['field']['partyBonusBps'])/100 for r in ordinary])
finite=read(base/'r19-finite-b/report.json')['reports'][0]
finiteTable='| 준비 회귀 횟수 | 영웅 환생 회차 | 도달/표본 | p10 | p50 | p90 |\n|---:|---:|---:|---:|---:|---:|\n'+'\n'.join(f"| {s['recoveryQuota']} | {s['cycle']} | {s['arrived']}/{s['n']} | {clock(s['p10'])} | {clock(s['p50'])} | {clock(s['p90'])} |" for s in finite['finiteFarmChecks'])
text=f'''# v0.11.0 환생 밸런스 검증 결과

R19-B를 사전 등록된 선택 규칙으로 채택했다. 새 검증 표본 280개에서 기본 시간 기준 23개가 모두 통과했다. 일반·간헐 입력의 첫 3회는 각각 100개 표본, 4~10회는 미리 지정한 각각 20개 연속 표본으로 확인했다. 성장 23개, 예비 동료 유지 성장 10개, 유한 영혼 회귀 12개 기준도 통과했다. 실제 사람의 재미를 검증한 결과는 아니다(`humanFun: false`).

[최종 증거 목록](../../.agentdoc/v11-20260918-resume/balance/final.json), [선택 결과](../../.agentdoc/v11-20260918-resume/balance/r19-explore/report.json), [검증 결과](../../.agentdoc/v11-20260918-resume/balance/r19-heldout/report.json), [등록 조건](EVALUATION_PROTOCOL.json), [채택 수치](BALANCE_CANDIDATE.json).

전체 소스 식별자: `{manifest['source']}`. 선택 후보의 컴파일된 코어 바이트와 실제 채택·검증 코어가 동일하다. 독립 검증기는 원본 해시, 실행 전후 소스, 표본과 관측 시간, 분위수와 선택 규칙, 실제 성장·영혼 회귀 행동을 재계산한다. 이전 R18 검증과 이후 발견한 단축 경로를 포함해 실패 실험 원본을 보존했다.

**시간 해석과 표본**

아래 값은 누적 시간이 아닌 각 환생 사이의 시간이며 `시:분:초`로 표시한다. 일반 입력은 초당 2회, 간헐 입력은 매 60초의 첫 15초에 초당 2회다. 고활동은 초당 8회이며 피버를 실제 엔진으로 처리한다. 상점은 30초마다 방문하며 영웅 공격력 증가를 기준으로 구매·강화를 선택한다. 기본 정책은 동료를 소모·합성하지 않고 환생이 준비되면 즉시 선택한다.

탐색은 시드 120001~120020, 이번 검증은 사용하지 않았던 126001~126100이다. 이미 사용한 125001~125100은 재사용하지 않았다. 연속 10회는 새 검증 시드의 첫 20개로 사전 지정했다. 첫 3회 관측 한도는 18시간, 10회는 60시간이며 첫 3회를 18시간 내 완료하지 못하면 조기 종료한다. 분위수는 예약된 전체 분모에서 미도달을 무한대로 포함해 `floor((n−1)*p)` 위치로 계산한다. 무한대는 원본 JSON의 `null`, 아래의 “미도달”이다.

**기본 시간 기준: 전부 통과**

일반·간헐 첫 3회는 p10≥2시간, p50 3~5시간, p90≤6시간이며 4~10회는 p50 3~5시간이다. 아래 모든 회차에서 미도달은 0이다.

{table(['ordinary','intermittent'])}

**고활동과 별도 스트레스**

고활동 첫 3회는 p10≥2시간 및 도달률≥90%를 모두 통과했다. 나머지 세 정책에는 일반 플레이 시간 합격을 부여하지 않는다. 입력 중단은 처음 2분만 일반 입력 후 멈추고 상점 구매를 하지 않는다. 강한 기존 자산은 Lv15·영혼20·금화100만·boss39 출신 Lv5 동료 5명으로 시작한다. 계속 영혼 회귀는 5초마다 stage40 도달 시 회귀하되 영웅 환생이 준비되면 우선한다.

{table(['high','idle','wealthy','soul-farming'])}

강한 기존 자산의 첫 환생 중앙값은 {clock(wealth['p50'])}이다. 모든 과거 세이브에 3~5시간 또는 최소 2시간을 보장하지 않는다. 계속 영혼 회귀한 표본은 각각 18시간 동안 {min(r['soulRecoveries'] for r in farm):,}~{max(r['soulRecoveries'] for r in farm):,}회 회귀하고 최종 영혼 {min(r['final']['souls'] for r in farm):,}~{max(r['final']['souls'] for r in farm):,}개를 기록했다. 영웅 환생 미도달은 계속 회귀하는 정책의 결과이며, 모든 축적 후 중단 전략을 막았다는 증거로 해석하지 않는다.

**영혼을 모은 뒤 중단하는 경로**

R18에서는 실제 고활동 단일 경로가 영혼 회귀 50회 후 첫 영웅 환생을 준비 시간 포함 6분 20초에 마쳤다. 이 반례를 보존하고, R19에서는 전투 시작 시 저장된 총 회귀 횟수의 같은 고정 배율 M(t)를 몬스터 HP와 필드 동료 공격력 모두에 적용했다. 영웅 환생과 영혼 회귀를 모두 세며 현재 파티·영혼·시간에 맞추는 동적 조정은 없다. 영혼 회귀 자격이나 보상, 보유 자산을 삭제하지 않았다.

[반례 원본](../../.agentdoc/v11-20260918-resume/reviews/finite-soul-farm-r18-b/result.json), [새 유한 회귀 검증](../../.agentdoc/v11-20260918-resume/balance/r19-finite-b/report.json).

새 검증은 탐색 시드 20개마다 회귀 1·3·10·50회를 실제 완료할 때까지 우선한 뒤 영웅 환생으로 전환한다. 고활동·5초 결정 간격·첫 3회·18시간 한도를 유지하며 첫 시간에는 준비가 전부 포함된다. 80개 경로에서 240/240회 도달, 회차별 p10≥2시간 12개 기준이 통과했다. 실제 회귀 1,280개의 전체 전후 세이브와 RNG를 독립 재생했다.

{finiteTable}

동료가 없는 경우도 실제 엔진으로 별도 확인했다. 첫 회귀 시 동료 0명인 제어 경로는 시작 후 4분 33.5초에 포획, 첫 환생 3시간 52분 40초였다. 첫 회귀 직전 5명을 모두 합법적으로 희생한 경로는 시작 후 2분 33.2초에 다시 포획, 첫 환생 4시간 59분 20초였다. 실제 회귀 50회 직후 세이브에서 남은 30명을 모두 희생한 경로도 제거 후 9분 35.2초에 다시 포획하고 3시간 29분 35초에 환생했다(앞선 회귀 준비 8분 35초 별도). 이 세 경로는 제어한 경계 검사이며 자연 표본의 분위수나 모든 무동료 세이브의 시간 보장이 아니다. 상점 구매·훈련 없이 정상 드롭과 자동 장착을 사용했고 실제 행동 43개를 독립 재생했다.

[동료 0명·마지막 동료 제거](../../.agentdoc/v11-20260918-resume/balance/r19-empty-party-guards/report.json), [50회 회귀 뒤 동료 제거](../../.agentdoc/v11-20260918-resume/balance/r19-after50-empty-party/report.json).

**성장·동료 관리·환생 미선택 진단**

아래 진단은 원래 280개 검증을 대체하지 않는다. 같은 탐색 시드 20개를 사용하고 실제 행동 기록을 별도로 보관한다.

| 진단 | 경로/예약된 회차 | 도달/예약 회차 | 결과 |
|---|---|---:|---|
| 즉시 성장 | 일반20×10, 간헐20×10, 고활동20×3 | 342/460 | 23개 회차 p10≥2시간 및 비어 있지 않음; 최소 p10 3:04:50 |
| 예비 동료 유지 성장 | 고활동20×10 | 200/200 | 10개 회차 p10≥2시간; 최소 p10 2:05:45 |
| 가득 찬 동료 교체 | 일반20×10 | 200/200 | 희생 1,854회 기록; 최대 stage368, 포획367, 원본 공격력 최대22자리 |
| 환생 미선택 | 고활동20×24시간 | 환생을 선택하지 않음 | 최대 stage462, 포획455, 원본 공격력 최대28자리 |

즉시 성장은 5초마다 현재 파티 5명과 비활성 재료 사이의 합법적 소모를 비교해 다음 동료 공격 증가가 가장 큰 행동을 선택한다. 증가량이 0이어도 소모하며 동률은 대상 ID, 재료 ID 순이다. 최소 5명을 남긴다. 실제 5,697회 소모를 독립 재계산했다. 예비 동료 유지 정책은 동료가 30명일 때만 같은 계산을 해 29명을 남겼고 실제 2,412회를 재계산했다.

즉시 성장의 미도달 118회를 삭제하지 않았다. 일반·간헐 각각 6/20 경로가 18시간에 첫 2회만 완료했고, 60시간까지 10회를 완료한 경로는 일반 5/20, 간헐 3/20이었다. 3~8회 도달은 각각 14/20, 9회는 각각 13/20이다. 같은 타입에 대응할 예비 동료를 소모하는 정책은 후반에 더 느려질 수 있다. 이 기준은 측정한 빠른 분위수의 단축 우회 방지이며 모든 성장 전략의 3~5시간 도달이나 정체 없음 보장이 아니다.

동료 교체는 30명이 가득 찼을 때 현재 보이는 보스의 원본 공격력이 가장 약한 보유 동료보다 강한 경우에만 희생한다. 이 진단의 1,854회는 집계와 정책 검증이며 매 행동의 전체 상태 재생을 주장하지 않는다. 환생 미선택 진단도 같은 정책이지만 24시간 동안 30명에 도달하지 않아 실제 희생은 0회였다. 따라서 이 진단만으로 희생 분기의 실행을 주장하지 않는다. 최장 단일 처치 공백은 약 5시간 20분이다. 영구 평탄 HP 대신 stage399 이후 고정 HP 상승을 재개했으며 24시간 관측 범위의 결과다. 무기한 전진이나 모든 관리 정책의 상한을 증명하지 않는다.

[성장](../../.agentdoc/v11-20260918-resume/balance/r19-growth-b/report.json), [예비 동료 성장](../../.agentdoc/v11-20260918-resume/balance/r19-reserve-b/report.json), [동료 교체](../../.agentdoc/v11-20260918-resume/balance/r19-management-b/report.json), [환생 미선택](../../.agentdoc/v11-20260918-resume/balance/r19-no-reset-b/report.json).

**보상과 적용 범위**

이번 일반 입력 검증 100개에서 첫 동료 중앙값은 {msmedian('firstCompanionMs')}, 첫 장착 무기는 {msmedian('firstEquippedWeaponMs')}, 첫 파티 장비 보너스는 {msmedian('firstPartyBonusMs')}다. 상점 첫 구매 중앙값은 {msmedian('firstPurchaseMs')}이며 구매 미도달 {sum(r['firstPurchaseMs'] is None for r in ordinary)}/100개도 전체 분모에 포함했다. 초기 무기는 주로 드롭으로 얻었다. 첫 Lv20은 {levels[20]}, Lv21은 {levels[21]}, Lv22는 {levels[22]}이고 Lv25→26 구간 중앙값은 {levelgap}이다. 전체 일반 경로의 최장 단일 처치 공백은 {clock(max(r['longestKillGapMs'] for r in ordinary)/60000)}다. 초반 레벨 상승이 빠르고 후반 레벨 간격이 길다는 체감상의 한계가 남는다.

첫 주기 실제 HP 피해 중 영웅 비중 중앙값은 {heroShare:.2f}%로 동료 중심의 방치형 진행이다. 첫 환생 시 파티 장비 보너스 중앙값은 {party:.2f}%여서 영웅 피해 비중만으로 장비 전체의 가치를 판단할 수 없다. 기본 상점 정책은 파티 보너스를 직접 최적화하지 않는다. 추가 장비·성장·합성·훈련·회귀 전략의 모든 조합을 탐색하지 않았으며 재미나 클릭 만족도 개선을 수치 통과만으로 주장하지 않는다.

고정 곡선은 최소 Lv26, 동료 필드 기반 공격력의 유한 범위, 레벨·별 성장의 필드 보너스 상한 25%, 전투 시작 시 총 회귀 횟수의 HP·동료 공통 배율을 사용한다. HP의 별도 총 회귀 횟수 배율 R(t)만 4회에서 포화하며 공통 M(t)에는 이 상한을 적용하지 않는다. 영웅 피버는 3배, 새 필드 동료 피버는 2배다. 시간 잠금과 현재 파티 공격력에 맞추는 조정은 없다.

보유 동료의 레벨·별·포획 인덱스·원본 공격력 및 PvP 계산은 보존한다. 기존 저장의 진행 중 전투는 v10 HP·동료 선정·공격·피버 3배를 유지하며 다음 전투부터 새 곡선을 적용한다. 저장된 전투의 총 회귀 스냅샷을 일관되게 사용하며 누락값은 0이고 다른 카운터에서 추측하지 않는다. 표현 불가능한 회귀 카운터·영혼 증가는 변경 전 거절하고 자동 방출의 카운터·보상도 함께 보존한다. 기존 재화·자산 보존 때문에 임의로 강한 과거 세이브까지 동일한 플레이 시간을 보장하지 않는다.

동결 소스에서 Host의 전체 1,264개 테스트·린트·타입 검사와 문자 그대로의 작업 AC가 통과했다. 실제 Electron·패키지·응답 시간 검증은 Host의 별도 최종 증거를 따른다.

재검증 명령:

```sh
node .harness/v11/balance-verify.mjs .agentdoc/v11-20260918-resume/balance/final.json
```
'''
Path('docs/v0.11/BALANCE_REPORT.md').write_text(text)
print('BALANCE_REPORT.md written',len(text), 'characters')
