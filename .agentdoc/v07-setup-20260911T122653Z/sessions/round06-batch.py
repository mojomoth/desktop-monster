"""One-off execution journal for the preregistered round06; never resumes/overwrites outputs."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import re
import subprocess
import tarfile

print("BATCH_PID", os.getpid(), "PGID", os.getpgrp(), flush=True)
root = Path.cwd()
run_dir = Path('.agentdoc/v07-setup-20260911T122653Z')
out = run_dir / 'evidence/exploration/round-06'
protocol_path = Path('docs/v0.7/EVALUATION_PROTOCOL.json')
protocol_bytes = protocol_path.read_bytes()
protocol = json.loads(protocol_bytes)
assert protocol['round'] == 6 and protocol['selectedExperiment'] is None
assert protocol['progressionParameterVersion'] == 3
first_keys = ['firstKillSec', 'firstRewardSec', 'firstLevelSec', 'firstCaptureSec', 'firstReadySec', 'firstOpenSec', 'firstAcceptedSec']



def now():
    return datetime.now(timezone.utc).isoformat()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def artifact(path):
    return {'path': str(path), 'sha256': sha(path)}


def archive(path, names):
    assert not path.exists(), path
    with tarfile.open(path, 'w:gz') as tar:
        for name in names:
            assert not Path(name).is_absolute(), name
            tar.add(name, arcname=str(name))
    return artifact(path)


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


assert not (out / 'protocol.preregistered.json').exists()
(out / 'protocol.preregistered.json').write_bytes(protocol_bytes)
evaluation_archive = archive(out / 'evaluation.tar.gz', [
    '.harness/v7', 'docs/v0.7/EVALUATION_PROTOCOL.json', 'docs/v0.7/DESIGN_DECISIONS.md'])
parameter_path = Path('src/core/progression.ts')
(out / 'production-before.original.txt').write_bytes(parameter_path.read_bytes())

for kind, experiments in [('control', protocol['controls']), ('candidate', protocol['candidates'])]:
    for experiment in experiments:
        assert protocol_path.read_bytes() == protocol_bytes
        trial = out / experiment['id']
        trial.mkdir()
        params = experiment['parameters']
        text = parameter_path.read_text()
        for key, value in params.items():
            text, count = re.subn(r'^  ' + re.escape(key) + r': [^\n]+,$',
                                 '  ' + key + ': ' + json.dumps(value) + ',', text, flags=re.M)
            assert count == 1, (key, count)
        text, count = re.subn(r'Registered production [^;]+;',
                             'Registered production ' + experiment['id'] + ';', text)
        assert count == 1
        parameter_path.write_text(text)
        record = {'kind': 'actual-production-exploration', 'round': 6,
                  'startedAt': now(), 'experimentKind': kind, 'experiment': experiment,
                  'seedSet': {'name': 'exploration', 'start': 10001, 'count': 20},
                  'protocol': artifact(out / 'protocol.preregistered.json'),
                  'evaluationArchive': evaluation_archive, 'commands': []}
        record['sourceArchive'] = archive(trial / 'production-source.tar.gz',
            ['src', 'static', 'tests', 'package.json', 'package-lock.json',
             *[str(path) for path in Path('.').glob('tsconfig*.json')]])

        def command(label, argv, allowed=(0,)):
            log = trial / (label + '.log')
            assert not log.exists()
            entry = {'label': label, 'argv': argv, 'startedAt': now()}
            with log.open('w') as stream:
                result = subprocess.run(argv, stdout=stream, stderr=subprocess.STDOUT)
            entry.update(endedAt=now(), exitCode=result.returncode,
                         log=str(log), sha256=sha(log))
            record['commands'].append(entry)
            write_json(trial / 'execution.json', record)
            print(experiment['id'], label, result.returncode, flush=True)
            if result.returncode not in allowed:
                raise SystemExit(f'{label} failed; preserved {log}')

        command('production-tests', ['npx', 'vitest', 'run', 'tests/progressionV7.test.ts',
                'tests/formulas.test.ts', 'tests/engine.test.ts', 'tests/balance.test.ts'])
        for label in ['screening', 'full-12h']:
            report_path = trial / (label + '.json')
            argv = ['node', '.harness/v7/loop/measure.mjs', 'run', str(report_path),
                    '--phase', 'candidate', '--' + kind, experiment['id'],
                    '--seed-set', 'exploration', '--workers', '4']
            if label == 'screening':
                argv.append('--screening')
            command(label, argv, allowed=(0, 1))
            command(label + '-verify', ['node', '.harness/v7/loop/measure.mjs',
                                       'verify', str(report_path)])
            report = json.loads(report_path.read_text())
            assert sorted(row['seed'] for row in report['runs']) == list(range(10001, 10021))
            record[label] = {**artifact(report_path), **{key: report[key] for key in
                ['sourceDigest', 'evaluationDigest', 'experiment', 'targets', 'rawSha256']},
                'buildSha256': report['build']['sha256']}
            if label == 'full-12h':
                screening = json.loads((trial / 'screening.json').read_text())
                def prefix(row):
                    last = row['checkpoints'][-1]
                    cutoff = last['firstAcceptedSec']
                    # Full12h also has the screening120min checkpoint: compare the
                    # same observation horizon if screening was censored.
                    if cutoff is None or cutoff > 7200:
                        cutoff = 7200
                    return {'seed': row['seed'],
                        'firstEvents': {key: (last[key] if last[key] is None or last[key] <= 7200 else None) for key in first_keys},
                        'recordsThroughFirstChoice': [event for event in row['records'] if event['sec'] <= cutoff],
                        'actionsThroughFirstChoice': [event for event in row['actions'] if event['sec'] <= cutoff]}
                expected = [prefix(row) for row in sorted(screening['runs'], key=lambda row: row['seed'])]
                actual = [prefix(row) for row in sorted(report['runs'], key=lambda row: row['seed'])]
                comparison = {'createdAt': now(), 'reference': artifact(trial / 'screening.json'),
                    'report': artifact(report_path), 'scope': 'Same experiment and seed: seven recorded first events plus recorded content/actions through first accepted choice or120min censoring. No per-attack/per-kill trace claim; no equality to previous XP/capture candidates.',
                    'passed': actual == expected, 'samples': 20,
                    'differentSeeds': [a['seed'] for a, b in zip(actual, expected) if a != b],
                    'actualPrefixes': actual, 'screeningPrefixes': expected}
                comparison_path = trial / 'screening-full-pairing.json'
                write_json(comparison_path, comparison)
                record['screeningFullPairing'] = {**artifact(comparison_path), 'passed': comparison['passed']}
                write_json(trial / 'execution.json', record)
                assert comparison['passed'], 'Same-candidate recorded first-journey pairing failed; originals preserved.'
            write_json(trial / 'execution.json', record)
            if label == 'screening' and report['targets']['passed'] is not True:
                record['full-12h'] = {'status': 'NOT_EXECUTED', 'reason': 'Screening goals failed.'}
                break
        record['buildArchive'] = archive(trial / 'compiled-build.tar.gz', ['dist'])
        record['endedAt'] = now()
        write_json(trial / 'execution.json', record)
        print(experiment['id'], 'COMPLETE', flush=True)
