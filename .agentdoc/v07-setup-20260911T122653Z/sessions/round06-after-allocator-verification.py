"""Fresh V02–04 verification after the actual round06 safe allocator implementation."""
from pathlib import Path
import json
import subprocess
run=Path('.agentdoc/v07-setup-20260911T122653Z')

def command(*args):
    result=subprocess.run(['node','.harness/v7/loop/develop.mjs',args[0],str(run),*args[1:]],capture_output=True,text=True)
    print(' '.join(args),result.returncode,flush=True)
    if result.returncode:
        print(result.stdout,result.stderr,flush=True)
        raise SystemExit(result.returncode)

for task_id,ac,description in [
    ('V07-02','levels','Safe companion levels and before/after reincarnation confirmation; new safe exhausted allocator, large external IDs, local duplicate/overflow guards before removal, natural capture duplicate refusal and external delivery preservation. Critic positive-Infinity JSON1e400 follow-up was reproduced1FAIL/32PASS then fixed; original logs and new same-source checks are preserved.'),
    ('V07-03','codex','Shared actual acquisition, legacy ACK normalization, repeated boot and first acquisition notifications on current source.'),
    ('V07-04','directory','Fifty keyed players, hero/party rows, requested opponent IDs, keyboard focus preservation and stale/error handling on current source.')]:
    if task_id!='V07-02':command('start',task_id)
    if task_id!='V07-02':
        command('check',task_id,ac)
        command('check',task_id,'gates')
    loop=json.loads((run/'loop.json').read_text())
    task=next(t for t in loop['tasks'] if t['id']==task_id)
    latest={c['commandId']:c for c in task['attempts'][-1]['checks']}
    source=latest['gates']['sourceDigest'];evaluation=latest['gates']['evaluationDigest']
    assert all(c['exitCode']==0 and c['sourceDigest']==source==c['endedDigest'] and c['evaluationDigest']==evaluation==c['endedEvaluationDigest'] for c in latest.values())
    lines=[f'# {task_id} — fresh Round06 verification','',description,'','Source: '+source,'Evaluation: '+evaluation,'']
    lines += [f"- {key}: exit0; {Path(c['log']).name}; SHA256 {c['sha256']}" for key,c in latest.items()]
    lines += ['', 'Every registered AC and exact npm test && npm run lint && npm run typecheck were freshly executed on the same source, evaluator and owned files. Previous failed/historical results remain immutable and are not recertified. Round06 experiments remain unmeasured/unadopted. V05 earlyCaptureCount guarantee implementation and new exploration remain pending; Round05 candidate100 validation failed. Package0.6.0; humanChecks=PENDING. Final version freeze, actual Native330min,9-policy release measurement,audit,smoke/package/live server compatibility remain pending. No commit/push/deploy.','']
    session=run/f'sessions/{task_id}-round06.md'
    with session.open('x') as stream:stream.write('\n'.join(lines))
    command('verify',task_id,str(session))
command('start','V07-05')
