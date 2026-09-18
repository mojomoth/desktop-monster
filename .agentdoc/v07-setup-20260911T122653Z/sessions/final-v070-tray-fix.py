"""Apply the actual reviewed version mismatch repair only after a recorded reviewer revision."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess

R = Path('.agentdoc/v07-setup-20260911T122653Z')
review = R / 'reviews/design-final-v070'
session = json.loads((review / 'session.json').read_text())
assert session['status'] == 'collecting' and session['role'] == 'designer' and session['round'] > 1
assert session['history'][-1]['report']['decision'] == 'revise' and session['openFindings']
assert 'tray' in json.dumps(session['openFindings']).lower()
assert json.loads(Path('package.json').read_text())['version'] == '0.7.0'
D = R / 'contracts/candidate-19'
D.mkdir()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
C = Path('.harness/v7/config.json')
L = R / 'loop.json'
T = Path('src/main/tray.ts')
originals = []
for p in [C, L, T, Path('tests/tray.test.ts'), review / 'session.json', R / 'evidence/final-v070-freeze.json']:
    out = D / (str(p).replace('/', '__') + '.original.txt')
    out.write_bytes(p.read_bytes())
    originals.append({'source': str(p), 'preserved': str(out), 'sha256': sha(out)})
c = json.loads(C.read_text())
l = json.loads(L.read_text())
for tasks in [c['tasks'], l['tasks']]:
    for id in ['V07-01', 'V07-06']:
        task = next(t for t in tasks if t['id'] == id)
        for path in ['src/main/tray.ts', 'tests/tray.test.ts']:
            if path not in task['files']:
                task['files'].append(path)
# No executor runs between the Host-owned paired contract writes.
C.write_text(json.dumps(c, ensure_ascii=False, indent=2) + '\n')
L.write_text(json.dumps(l, ensure_ascii=False, indent=2) + '\n')
s = T.read_text()
assert s.count("export const TRAY_TITLE = 'DesMon v0.6.0';") == 1
T.write_text(s.replace("export const TRAY_TITLE = 'DesMon v0.6.0';", "export const TRAY_TITLE = 'DesMon v0.7.0';"))
record = {'at': datetime.now(timezone.utc).isoformat(), 'state': 'version-display-repaired', 'reviewFindings': session['openFindings'],
          'originals': originals, 'mutated': [str(C), str(L), str(T)], 'after': {str(p): sha(p) for p in [C, L, T]},
          'scope': 'Existing literal title now matches alreadyfixed0.7 package/lock. Existing tray test unchanged; no new gameplay/numerical/content/timer changes. New checks and actualfun refresh required.'}
(D / 'transaction.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
subprocess.run(['node', '.harness/v7/loop/fun.mjs', 'refresh', str(review)], check=True)
subprocess.run(['node', '.harness/v7/loop/fun.mjs', 'next', str(review)], check=True)
print('REPAIR_APPLIED_AND_REVIEW_REFRESHED', flush=True)
