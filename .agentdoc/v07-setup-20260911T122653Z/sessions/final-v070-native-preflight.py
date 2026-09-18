"""Actual zero-minute diagnostics for Host's final design review, never natural observation."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import subprocess
import tarfile

R = Path('.agentdoc/v07-setup-20260911T122653Z')
O = R / 'evidence/preflight/final-v070-rare/attempt01'
review = json.loads((R / 'reviews/design-final-v070/session.json').read_text())
assert review['status'] == 'collecting' and review['role'] == 'playtester'
assert not O.exists()
O.mkdir(parents=True)
now = lambda: datetime.now(timezone.utc).isoformat()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
artifact = lambda p: {'path': str(p), 'sha256': sha(p)}
live = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {sourceDigest,evaluationDigest} from './.harness/v7/loop/evidence.mjs'; console.log(JSON.stringify({sourceDigest:sourceDigest(),evaluationDigest:evaluationDigest()}));"], text=True))
assert live['sourceDigest'] == review['sourceDigest'] and live['evaluationDigest'] == review['evaluationDigest']
record = {'kind': 'actual-native-design-preflight', 'startedAt': now(), 'pid': os.getpid(), 'pgid': os.getpgrp(),
          'appVersion': json.loads(Path('package.json').read_text())['version'], **live, 'naturalMinutes': 0, 'fixtureDiagnostics': True}
assert record['appVersion'] == '0.7.0'
for label, names in [('source', ['src', 'static', 'tests', 'package.json', 'package-lock.json', *[str(p) for p in Path('.').glob('tsconfig*.json')]]),
                     ('evaluation', ['.harness/v7', 'docs/v0.7/EVALUATION_PROTOCOL.json', 'docs/v0.7/DESIGN_DECISIONS.md'])]:
    path = O / (label + '.tar.gz')
    with tarfile.open(path, 'w:gz') as tar:
        for name in names:
            assert not Path(name).is_absolute()
            tar.add(name, arcname=str(name))
    record[label + 'Archive'] = artifact(path)
report = O / 'journey.json'
log = O / 'execution.log'
argv = ['node', '.harness/v7/loop/e2e.mjs', str(report), '0', 'active']
record['argv'] = argv
(O / 'execution.json').write_text(json.dumps(record, indent=2) + '\n')
print('NATIVE_PREFLIGHT_PID', os.getpid(), 'PGID', os.getpgrp(), flush=True)
with log.open('x') as stream:
    result = subprocess.run(argv, stdout=stream, stderr=subprocess.STDOUT)
record.update(endedAt=now(), exitCode=result.returncode, log=artifact(log))
if report.exists():
    record['report'] = artifact(report)
    data = json.loads(report.read_text())
    record['status'] = data.get('status')
    record['checks'] = len(data.get('checks', []))
(O / 'execution.json').write_text(json.dumps(record, indent=2) + '\n')
print('NATIVE_PREFLIGHT_COMPLETE', result.returncode, flush=True)
raise SystemExit(result.returncode)
