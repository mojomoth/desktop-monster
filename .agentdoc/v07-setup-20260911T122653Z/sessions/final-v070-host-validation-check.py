"""Independent Host aggregation, only after actual completed final100; never tune parameters."""
from pathlib import Path
from decimal import Decimal
from datetime import datetime, timezone
import hashlib
import json

R = Path('.agentdoc/v07-setup-20260911T122653Z')
P = R / 'evidence/candidate-final-v070.json'
E = R / 'evidence/validation-final-v070/execution.json'
O = R / 'evidence/final-v070-host-validation-check.json'
assert not O.exists()
execution = json.loads(E.read_text())
assert execution['endedAt']
assert all(c['exitCode'] in (0, 1) for c in execution['commands'])
assert execution['report']['sha256'] == hashlib.sha256(P.read_bytes()).hexdigest()
d = json.loads(P.read_text(), parse_float=Decimal)
review = json.loads((R / 'reviews/design-final-v070/session.json').read_text())
assert all(d[k] == review[k] == execution[k] for k in ['sourceDigest', 'evaluationDigest'])
assert d['phase'] == 'candidate' and sorted(r['seed'] for r in d['runs']) == list(range(1, 101))
assert all(r['policy'] == d['settings']['baseline'] and r['checkpoints'][-1]['minutes'] == 720 for r in d['runs'])
def ticks(value):
    if value is None: return None
    t = Decimal(value) * 10
    assert t == t.to_integral_value()
    return int(t)
def distribution(values):
    ordered = sorted((ticks(v) for v in values), key=lambda v: (v is None, v))
    finite = [v for v in ordered if v is not None]
    def quantiles(rows):
        return {key: None if not rows or rows[(len(rows)-1)*q//10] is None else rows[(len(rows)-1)*q//10]/10
                for key,q in [('p10',1),('p50',5),('p90',9),('worst',10)]}
    return {'samples': len(values), 'reached': len(finite), 'unreached': len(values)-len(finite), 'population':quantiles(ordered), 'conditional':quantiles(finite)}
def event(run, kind, id=None):
    rows=[r['sec'] for r in run['records'] if r['kind']==kind and (id is None or r.get('id')==id)]
    assert len(rows)<=1
    return rows[0] if rows else None
names=['firstKillSec','firstRewardSec','firstLevelSec','firstCaptureSec','firstReadySec','firstOpenSec','firstAcceptedSec']
first={name:distribution([event(r,name) for r in d['runs']]) for name in names}
for r in d['runs']:
    assert all(event(r,n)==r['checkpoints'][-1][n] for n in names)
content={}
for m in d['protocol']['milestones']:
    kinds=['eligibleHero','seenHero','chosenHero'] if m['kind']=='hero' else ['eligibleMonster','seenMonster','killedMonster','capturedMonster']
    content[m['id']]={k:distribution([event(r,k,m['id']) for r in d['runs']]) for k in kinds}
by90=sum(event(r,'firstAcceptedSec') is not None and event(r,'firstAcceptedSec')<=5400 for r in d['runs'])
f=first['firstAcceptedSec']['population']['p50'];h=content['h70']['eligibleHero']['population']['p50']
passed=f is not None and 2700<=f<=3600 and by90>=90 and h is not None and 28800<=h<=43200
assert passed==d['targets']['passed']
result={'at':datetime.now(timezone.utc).isoformat(),'scope':'Fresh completed final0.7 100 raw runs independently recomputed by Host in exact100ms integers; no tuning or past result reuse.',
        'report':execution['report'],'execution':{'path':str(E),'sha256':hashlib.sha256(E.read_bytes()).hexdigest()},'sourceDigest':d['sourceDigest'],'evaluationDigest':d['evaluationDigest'],
        'first':first,'by90':by90,'denominator':100,'firstReadyOpenAcceptedEqual':all(event(r,'firstReadySec')==event(r,'firstOpenSec')==event(r,'firstAcceptedSec') for r in d['runs']),
        'content':content,'goalsPassed':passed,'humanChecks':'PENDING'}
with O.open('x') as f: f.write(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'reportSha256':execution['report']['sha256'],'first':first['firstAcceptedSec'],'by90':by90,'h70':content['h70'],'goalsPassed':passed},indent=2))
