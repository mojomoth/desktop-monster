"""Execute fresh registered V01–04 checks after actual Round06 four-role review."""
from pathlib import Path
import json
import subprocess

run = Path('.agentdoc/v07-setup-20260911T122653Z')
review = json.loads((run / 'reviews/design-round06/session.json').read_text())
assert review['status'] == 'design_review_complete'


def command(*args):
    result = subprocess.run(['node', '.harness/v7/loop/develop.mjs', args[0], str(run), *args[1:]], capture_output=True, text=True)
    print(' '.join(args), result.returncode, flush=True)
    if result.returncode:
        print(result.stdout, result.stderr, flush=True)
        raise SystemExit(result.returncode)


def verify(task_id, description):
    loop = json.loads((run / 'loop.json').read_text())
    task = next(task for task in loop['tasks'] if task['id'] == task_id)
    latest = {check['commandId']: check for check in task['attempts'][-1]['checks']}
    assert all(check['exitCode'] == 0 for check in latest.values())
    assert all(check['sourceDigest'] == review['sourceDigest'] == check['endedDigest'] and
               check['evaluationDigest'] == review['evaluationDigest'] == check['endedEvaluationDigest']
               for check in latest.values())
    lines = [f'# {task_id} — fresh round06 verification', '', description, '',
             'Source: ' + review['sourceDigest'], 'Evaluation: ' + review['evaluationDigest'], '']
    lines += [f"- {key}: exit0; {Path(check['log']).name}; SHA256 {check['sha256']}" for key, check in latest.items()]
    lines += ['', 'Every registered AC and exact npm test && npm run lint && npm run typecheck were freshly executed on the same source, evaluator and owned files (922 product tests). Historical evidence is preserved, never recertified.', '',
              'Round06 candidates remain unmeasured and unadopted. Round05 candidate100 validation FAILED; preserved independently and not used for new numerical proposal. Native first-readiness repair has deterministic regression evidence but actual final natural observation remains PENDING. Package0.6.0; humanChecks=PENDING. Final Native330min,9-policy release measurement, audit.mjs, smoke/package and live high-level server correspondence remain pending. No commit/push/deploy.', '']
    path = run / f'sessions/{task_id}-round06.md'
    with path.open('x') as stream:
        stream.write('\n'.join(lines))
    command('verify', task_id, str(path))


command('check', 'V07-01', 'design')
verify('V07-01', 'Round06 preregistration: three early-capture/XP candidates, five controls,21parameters, unchanged sixcontent conditions/goals/seeds. Actual ordered four-role fun review. V02 safe allocator repair and V05 extended guarantee remain to be implemented and freshly verified. Design PASS is not candidate performance or release PASS.')
command('start', 'V07-02')
