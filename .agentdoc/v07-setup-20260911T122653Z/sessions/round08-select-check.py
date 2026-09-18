"""Host independent numerical selection check; execute only after all8 trials complete."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import math

run=Path('.agentdoc/v07-setup-20260911T122653Z')
root=run/'evidence/exploration/round-08'
protocol=json.loads((root/'protocol.preregistered.json').read_text())
assert protocol['round']==8 and protocol['selectedExperiment'] is None
sha=lambda path:hashlib.sha256(Path(path).read_bytes()).hexdigest()
def ticks(sec):
    return None if sec is None else round(sec*10)
def quantile(values,q):
    ordered=sorted(values,key=lambda x:(x is None,x if x is not None else 0))
    return ordered[math.floor((len(ordered)-1)*q)]
def load_report(execution,label):
    entry=execution[label]
    assert sha(entry['path'])==entry['sha256']
    report=json.loads(Path(entry['path']).read_text())
    assert sorted(row['seed'] for row in report['runs'])==list(range(10001,10021))
    return report
rows=[]
for kind,experiments in [('control',protocol['controls']),('candidate',protocol['candidates'])]:
    for experiment in experiments:
        execution_path=root/experiment['id']/'execution.json'
        execution=json.loads(execution_path.read_text())
        assert execution.get('endedAt') and execution['experiment']==experiment
        screening=load_report(execution,'screening')
        first=[ticks(row['checkpoints'][-1]['firstAcceptedSec']) for row in screening['runs']]
        median=quantile(first,.5);p90=quantile(first,.9)
        by90=sum(value is not None and value<=54000 for value in first)
        first_pass=median is not None and 27000<=median<=36000 and by90>=18
        assert first_pass==screening['targets']['passed']
        final=None;full_pass=False
        if first_pass:
            full=load_report(execution,'full-12h')
            assert [ticks(row['checkpoints'][-1]['firstAcceptedSec']) for row in sorted(full['runs'],key=lambda x:x['seed'])]==[ticks(row['checkpoints'][-1]['firstAcceptedSec']) for row in sorted(screening['runs'],key=lambda x:x['seed'])]
            values=[]
            for row in full['runs']:
                found=[ticks(event['sec']) for event in row['records'] if event['kind']=='eligibleHero' and event['id']=='h70']
                values.append(min(found) if found else None)
            final=quantile(values,.5)
            full_pass=final is not None and 288000<=final<=432000
            assert full_pass==full['targets']['passed']
        else:
            assert execution['full-12h']['status']=='NOT_EXECUTED'
        rows.append({'kind':kind,'id':experiment['id'],'execution':str(execution_path),'executionSha256':sha(execution_path),'firstMedianTicks':median,'firstP90Ticks':p90,'by90':by90,'samples':20,'firstPass':first_pass,'h70MedianTicks':final,'bothPassed':first_pass and full_pass})
assert len(rows)==8
ranking=sorted([dict(row,tuple=[abs(row['firstMedianTicks']-31500),abs(row['h70MedianTicks']-360000),row['firstP90Ticks'],row['id']]) for row in rows if row['bothPassed']],key=lambda row:row['tuple'])
result={'at':datetime.now(timezone.utc).isoformat(),'scope':'Host independently recalculated actual complete report rows; whole-sample quantiles in100ms integer ticks and denominator20. All8 complete before ranking. No adoption performed by this checker.','rows':rows,'ranking':ranking,'proposedExperiment':{'kind':ranking[0]['kind'],'id':ranking[0]['id']} if ranking else None}
output=run/'evidence/round08-host-selection-check.json'
with output.open('x') as stream:json.dump(result,stream,ensure_ascii=False,indent=2);stream.write('\n')
print(json.dumps({'path':str(output),'sha256':sha(output),'proposedExperiment':result['proposedExperiment'],'ranking':ranking},ensure_ascii=False,indent=2))
