"""Fresh final 0.7.0 100-seed validation; no prior report reuse or resume."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import subprocess
import tarfile

R = Path('.agentdoc/v07-setup-20260911T122653Z')
O = R / 'evidence/validation-final-v070'
REPORT = R / 'evidence/candidate-final-v070.json'
P = Path('docs/v0.7/EVALUATION_PROTOCOL.json')
now = lambda: datetime.now(timezone.utc).isoformat()
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
artifact = lambda path: {'path': str(path), 'sha256': sha(path)}

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def archive(path, names):
    assert not path.exists()
    with tarfile.open(path, 'w:gz') as tar:
        for name in names:
            assert not Path(name).is_absolute()
            tar.add(name, arcname=str(name))
    return artifact(path)

assert not O.exists() and not REPORT.exists() and not Path(str(REPORT) + '.runs').exists()
protocol_bytes = P.read_bytes()
assert sha(P) == '52f4206ceefec593171a7017db41f4ab7eb8c930a0314c5b018999bd81358192'
p = json.loads(protocol_bytes)
assert p['round'] == 8 and p['experimentStage'] == 'validation'
assert p['selectedExperiment'] == {'kind': 'candidate', 'id': 'candidate-r8-tail10450'}
loop = json.loads((R / 'loop.json').read_text())
task = next(t for t in loop['tasks'] if t['id'] == 'V07-05')
assert loop['phase'] == 'candidate' and task['status'] == 'running'
checks = {c['commandId']: c for c in task['attempts'][-1]['checks']}
selected_checks = [checks[key] for key in ['progression', 'harness', 'gates']]
assert all(c['exitCode'] == 0 and c['sourceDigest'] == c['endedDigest'] and c['evaluationDigest'] == c['endedEvaluationDigest'] and sha(Path(c['log'])) == c['sha256'] for c in selected_checks)
assert len({c['sourceDigest'] for c in selected_checks}) == 1
assert len({c['evaluationDigest'] for c in selected_checks}) == 1
live = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {sourceDigest,evaluationDigest} from './.harness/v7/loop/evidence.mjs'; console.log(JSON.stringify({sourceDigest:sourceDigest(),evaluationDigest:evaluationDigest()}));"], text=True))
assert all(c['sourceDigest'] == live['sourceDigest'] and c['evaluationDigest'] == live['evaluationDigest'] for c in selected_checks)
review = json.loads((R / 'reviews/design-final-v070/session.json').read_text())
assert review['status'] == 'design_review_complete'
assert all(review[key] == live[key] for key in ['sourceDigest', 'evaluationDigest'])
subprocess.run(['node', '.harness/v7/loop/fun.mjs', 'verify', str(R / 'reviews/design-final-v070')], check=True, capture_output=True, text=True)
current_files = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {fileManifest} from './.harness/v7/loop/develop.mjs'; import {readFileSync} from 'node:fs'; const loop=JSON.parse(readFileSync(process.argv[1],'utf8')); console.log(JSON.stringify(fileManifest(loop.tasks.find(t=>t.id==='V07-05').files)));", str(R / 'loop.json')], text=True))
assert all(c['filesHash'] == c['endedFilesHash'] == current_files for c in selected_checks)
O.mkdir()
(O / 'protocol.adopted.json').write_bytes(protocol_bytes)
record = {'kind': 'actual-production-validation', 'round': 8, 'startedAt': now(),
          'pid': os.getpid(), 'pgid': os.getpgrp(), 'appVersion': json.loads(Path('package.json').read_text())['version'],
          'seedSet': {'name': 'validation', 'start': 1, 'count': 100},
          'experiment': p['selectedExperiment'], 'protocol': artifact(O / 'protocol.adopted.json'),
          'readinessChecks': selected_checks, 'commands': []}
assert record['appVersion'] == '0.7.0'
record['sourceArchive'] = archive(O / 'production-source.tar.gz', ['src', 'static', 'tests', 'package.json', 'package-lock.json', *[str(x) for x in Path('.').glob('tsconfig*.json')]])
record['evaluationArchive'] = archive(O / 'evaluation.tar.gz', ['.harness/v7', str(P), 'docs/v0.7/DESIGN_DECISIONS.md'])
write(O / 'execution.json', record)
print('VALIDATION_PID', os.getpid(), 'PGID', os.getpgrp(), flush=True)

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

command('measure', ['node', '.harness/v7/loop/measure.mjs', 'run', str(REPORT), '--phase', 'candidate', '--candidate', p['selectedExperiment']['id'], '--seed-set', 'validation', '--workers', '4'], (0, 1))
command('structural-verify', ['node', '.harness/v7/loop/measure.mjs', 'verify', str(REPORT)])
report = json.loads(REPORT.read_text())
assert sorted(row['seed'] for row in report['runs']) == list(range(1, 101))
assert report['experiment']['id'] == p['selectedExperiment']['id']
assert report['sourceDigest'] == selected_checks[0]['sourceDigest']
assert report['evaluationDigest'] == selected_checks[0]['evaluationDigest']
record['report'] = artifact(REPORT)
record.update({key: report[key] for key in ['sourceDigest', 'evaluationDigest', 'rawSha256', 'targets']})
record['buildArchive'] = archive(O / 'compiled-build.tar.gz', ['dist'])
assert P.read_bytes() == protocol_bytes
record['endedAt'] = now()
write(O / 'execution.json', record)
print('VALIDATION_COMPLETE', flush=True)
