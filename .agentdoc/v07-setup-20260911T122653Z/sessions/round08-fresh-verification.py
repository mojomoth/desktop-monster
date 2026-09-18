"""Execute fresh registered V01–04 checks after actual Round08 four-role review."""
from pathlib import Path
import json
import subprocess

run = Path('.agentdoc/v07-setup-20260911T122653Z')
review = json.loads((run / 'reviews/design-round08/session.json').read_text())
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
    lines = [f'# {task_id} — fresh round08 verification', '', description, '',
             'Source: ' + review['sourceDigest'], 'Evaluation: ' + review['evaluationDigest'], '']
    lines += [f"- {key}: exit0; {Path(check['log']).name}; SHA256 {check['sha256']}" for key, check in latest.items()]
    lines += ['', 'Every registered AC and exact npm test && npm run lint && npm run typecheck were freshly executed on the same source, evaluator and owned files (955 product tests). Historical evidence is preserved, never recertified.', '',
              'Round08 candidates remain unmeasured and unadopted. Round07 all8 lack bothgoals:1153 first2878.7sec/20by90 PASS buth70populationnull/8of20 FAIL;1154/1155screeningFAIL, originals preserved. Actualallocator/count5/Nativefirst-readiness repairs have independent implementationreview and historicalregression evidence, never substituted for currentchecks or finalnatural observation. Round05 firstcandidate100validationFAILED, not used for newnumericalproposal. Package0.6.0; humanChecks=PENDING. Final Native330min,9-policy release measurement, audit.mjs, smoke/package and live high-level server correspondence remain pending. No commit/push/deploy.', '']
    path = run / f'sessions/{task_id}-round08.md'
    with path.open('x') as stream:
        stream.write('\n'.join(lines))
    command('verify', task_id, str(path))


command('check', 'V07-01', 'design')
verify('V07-01', 'Round08 exact21key threefieldtailHP hypotheses withfivecontrols, readexactofficialprotocol. Samecontent/goals/seeds and no newmechanic; sourceapplies control17 beforetrial. Actual orderedfourrolefuncompleted withsame source/evaluator; currentprotocol/harness/gates freshlypassed. No candidateadoption orperformanceclaim. Sixcontentconditions/goals/seeds unchanged; first and full12h both require newexecution.')
for task_id, ac, description in [
    ('V07-02', 'levels', 'Safe companion levels across save/server/all response boundaries, lossless overflow and before/after reincarnation confirmation.'),
    ('V07-03', 'codex', 'Shared actual acquisition, legacy ACK normalization, repeated boot and first acquisition notifications.'),
    ('V07-04', 'directory', 'Fifty player rows, hero and companion party, selected IDs, keyboard/focus continuity and stale/error handling.')]:
    command('start', task_id)
    command('check', task_id, ac)
    command('check', task_id, 'gates')
    verify(task_id, description)
command('start', 'V07-05')
