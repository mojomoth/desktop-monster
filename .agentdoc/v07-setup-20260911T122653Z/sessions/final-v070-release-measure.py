"""New actual 9-policy x 100-seed release measurement, only after actual phase advance."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import subprocess
import tarfile

R = Path('.agentdoc/v07-setup-20260911T122653Z')
O = R / 'evidence/measurement-release-v070'
REPORT = R / 'evidence/release.json'
P = Path('docs/v0.7/EVALUATION_PROTOCOL.json')
now = lambda: datetime.now(timezone.utc).isoformat()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
artifact = lambda p: {'path': str(p), 'sha256': sha(p)}

def write(p, value):
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def archive(p, names):
    assert not p.exists()
    with tarfile.open(p, 'w:gz') as tar:
        for name in names:
            assert not Path(name).is_absolute()
            tar.add(name, arcname=str(name))
    return artifact(p)

assert not O.exists() and not REPORT.exists() and not Path(str(REPORT) + '.runs').exists()
protocol_bytes = P.read_bytes()
assert sha(P) == '52f4206ceefec593171a7017db41f4ab7eb8c930a0314c5b018999bd81358192'
p = json.loads(protocol_bytes)
assert p['experimentStage'] == 'validation'
assert p['selectedExperiment'] == {'kind': 'candidate', 'id': 'candidate-r8-tail10450'}
loop = json.loads((R / 'loop.json').read_text())
assert loop['phase'] == 'release'
assert next(t for t in loop['tasks'] if t['id'] == 'V07-07')['status'] == 'running'
checks = []
for id, required in [('V07-05', ['progression', 'harness', 'measurement', 'gates']), ('V07-06', ['integration', 'gates'])]:
    task = next(t for t in loop['tasks'] if t['id'] == id)
    assert task['status'] == 'verified'
    latest = {c['commandId']: c for c in task['verificationHistory'][-1]['checks']}
    checks += [latest[k] for k in required]
live = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {sourceDigest,evaluationDigest} from './.harness/v7/loop/evidence.mjs'; console.log(JSON.stringify({sourceDigest:sourceDigest(),evaluationDigest:evaluationDigest()}));"], text=True))
assert all(c['exitCode'] == 0 and c['sourceDigest'] == c['endedDigest'] == live['sourceDigest'] and c['evaluationDigest'] == c['endedEvaluationDigest'] == live['evaluationDigest'] and sha(Path(c['log'])) == c['sha256'] for c in checks)
review = json.loads((R / 'reviews/design-final-v070/session.json').read_text())
assert review['status'] == 'design_review_complete'
assert all(review[key] == live[key] for key in ['sourceDigest', 'evaluationDigest'])
subprocess.run(['node', '.harness/v7/loop/fun.mjs', 'verify', str(R / 'reviews/design-final-v070')], check=True, capture_output=True, text=True)
current_files = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {fileManifest,verifyRecordedEvidence} from './.harness/v7/loop/develop.mjs'; import {readFileSync} from 'node:fs'; const loop=JSON.parse(readFileSync(process.argv[1],'utf8')); verifyRecordedEvidence(loop); console.log(JSON.stringify(Object.fromEntries(loop.tasks.filter(t=>['V07-05','V07-06'].includes(t.id)).map(t=>[t.id,fileManifest(t.files)]))));", str(R / 'loop.json')], text=True))
for id in ['V07-05', 'V07-06']:
    task = next(t for t in loop['tasks'] if t['id'] == id)
    latest = {c['commandId']: c for c in task['verificationHistory'][-1]['checks']}
    assert all(c['filesHash'] == c['endedFilesHash'] == current_files[id] for c in latest.values())
policies = json.loads(Path('.harness/v7/config.json').read_text())['measurement']['validationPolicies']
assert len(policies) == 9 and len({json.dumps(x, sort_keys=True) for x in policies}) == 9
O.mkdir()
(O / 'protocol.adopted.json').write_bytes(protocol_bytes)
record = {'kind': 'actual-production-release-policy-measurement', 'startedAt': now(), 'pid': os.getpid(), 'pgid': os.getpgrp(),
          'appVersion': json.loads(Path('package.json').read_text())['version'], 'seedSet': {'name': 'validation', 'start': 1, 'count': 100},
          'policies': policies, 'experiment': p['selectedExperiment'], 'protocol': artifact(O / 'protocol.adopted.json'), 'readinessChecks': checks, 'commands': []}
assert record['appVersion'] == '0.7.0'
record['sourceArchive'] = archive(O / 'production-source.tar.gz', ['src', 'static', 'tests', 'package.json', 'package-lock.json', *[str(x) for x in Path('.').glob('tsconfig*.json')]])
record['evaluationArchive'] = archive(O / 'evaluation.tar.gz', ['.harness/v7', str(P), 'docs/v0.7/DESIGN_DECISIONS.md'])
write(O / 'execution.json', record)
print('RELEASE_MEASURE_PID', os.getpid(), 'PGID', os.getpgrp(), flush=True)

def command(label, argv, allowed=(0,)):
    assert P.read_bytes() == protocol_bytes
    log = O / (label + '.log')
    entry = {'label': label, 'argv': argv, 'startedAt': now()}
    with log.open('x') as stream:
        result = subprocess.run(argv, stdout=stream, stderr=subprocess.STDOUT)
    entry.update(endedAt=now(), exitCode=result.returncode, log=artifact(log))
    record['commands'].append(entry)
    write(O / 'execution.json', record)
    print(label, result.returncode, flush=True)
    if result.returncode not in allowed:
        raise SystemExit(f'{label} failed; originals preserved')

command('measure', ['node', '.harness/v7/loop/measure.mjs', 'run', str(REPORT), '--phase', 'release', '--suite', '--candidate', p['selectedExperiment']['id'], '--seed-set', 'validation', '--workers', '4'], (0, 1))
command('structural-verify', ['node', '.harness/v7/loop/measure.mjs', 'verify', str(REPORT)])
report = json.loads(REPORT.read_text())
assert report['phase'] == 'release' and report['policies'] == policies and len(report['runs']) == 900
for policy in policies:
    assert sorted(row['seed'] for row in report['runs'] if row['policy'] == policy) == list(range(1, 101))
assert report['sourceDigest'] == live['sourceDigest'] and report['evaluationDigest'] == live['evaluationDigest']
record['report'] = artifact(REPORT)
record.update({key: report[key] for key in ['sourceDigest', 'evaluationDigest', 'rawSha256', 'targets']})
record['buildArchive'] = archive(O / 'compiled-build.tar.gz', ['dist'])
assert P.read_bytes() == protocol_bytes
record['endedAt'] = now()
write(O / 'execution.json', record)
print('RELEASE_MEASUREMENT_COMPLETE', flush=True)
