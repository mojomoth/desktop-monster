from pathlib import Path
import base64, datetime, hashlib, json, os, plistlib, re, subprocess, tempfile

root = Path.cwd()
out = root / '.agentdoc/v07-setup-20260911T122653Z/evidence/distribution'
out.mkdir(exist_ok=True)
report_path = out / 'dmg.json'
assert not report_path.exists(), 'Preserve the previous distribution proof'
dmg = root / 'release/DesMon-0.7.0-arm64.dmg'
app = root / 'release/mac-arm64/DesMon.app'
temp = Path(tempfile.mkdtemp(prefix='desmon-v070-dmg-'))
mount = temp / 'volume'
mount.mkdir()
report = {'kind': 'read-only-dmg-distribution-check', 'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'commands': [], 'checks': [], 'errors': [], 'mount': str(mount), 'limits': ['Read-only mounted contents; no installation, human observation, signing/notarization or live API exercise.']}
attached = False
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
def run(label, args):
    result = subprocess.run(args, capture_output=True, timeout=60)
    log = out / (label + '.log')
    with log.open('xb') as f:
        f.write(result.stdout + result.stderr)
    report['commands'].append({'command': args, 'exitCode': result.returncode, 'log': str(log), 'sha256': sha(log)})
    assert result.returncode == 0, label + ' failed'
    return result.stdout
def check(name, ok, details):
    report['checks'].append({'id': name, 'passed': bool(ok), 'details': details})
def inventory(base):
    files, links = {}, {}
    for directory, dirs, names in os.walk(base, followlinks=False):
        for name in dirs + names:
            p = Path(directory) / name
            key = str(p.relative_to(base))
            if p.is_symlink(): links[key] = os.readlink(p)
            elif p.is_file(): files[key] = sha(p)
    return {'files': files, 'symlinks': links}
try:
    before = inventory(app)
    report['dmg'] = {'path': str(dmg), 'size': dmg.stat().st_size, 'sha256': sha(dmg)}
    blockmap = Path(str(dmg) + '.blockmap')
    report['blockmap'] = {'path': str(blockmap), 'size': blockmap.stat().st_size, 'sha256': sha(blockmap)}
    latest = root / 'release/latest-mac.yml'
    metadata = latest.read_text()
    digest512 = base64.b64encode(hashlib.sha512(dmg.read_bytes()).digest()).decode()
    hashes = re.findall(r'^\s*sha512:\s*(\S+)\s*$', metadata, re.M)
    sizes = re.findall(r'^\s*size:\s*(\d+)\s*$', metadata, re.M)
    check('latest-version-path-size-sha512', 'version: 0.7.0' in metadata and ('url: ' + dmg.name) in metadata and ('path: ' + dmg.name) in metadata and hashes and all(h == digest512 for h in hashes) and sizes and all(int(s) == dmg.stat().st_size for s in sizes), {'path': str(latest), 'sha256': sha(latest), 'content': metadata, 'computedSha512': digest512})
    run('verify', ['hdiutil', 'verify', str(dmg)])
    check('dmg-checksum-verification', True, report['commands'][-1])
    mounted = run('attach', ['hdiutil', 'attach', '-readonly', '-nobrowse', '-noautoopen', '-plist', '-mountpoint', str(mount), str(dmg)])
    attached = True
    report['attachment'] = plistlib.loads(mounted)
    packed_app = mount / 'DesMon.app'
    packed = inventory(packed_app)
    check('all-mounted-app-files-and-symlinks-match', before == packed and bool(before['files']), {'regularFiles': len(before['files']), 'symlinks': len(before['symlinks']), 'verifiedApp': before, 'mountedApp': packed})
    info = plistlib.loads((packed_app / 'Contents/Info.plist').read_bytes())
    check('mounted-version', info.get('CFBundleShortVersionString') == info.get('CFBundleVersion') == '0.7.0', {k: info.get(k) for k in ['CFBundleShortVersionString', 'CFBundleVersion', 'CFBundleExecutable']})
    check('distribution-bytes-unchanged', report['dmg']['sha256'] == sha(dmg) and before == inventory(app), 'Read-only inspection preserved original DMG and verified app bytes.')
except Exception as error:
    report['errors'].append(repr(error))
finally:
    if attached or os.path.ismount(mount):
        try:
            run('detach', ['hdiutil', 'detach', str(mount)])
            attached = False
        except Exception as error:
            report['errors'].append(repr(error))
    if not attached:
        try:
            if mount.exists(): mount.rmdir()
            temp.rmdir()
        except Exception as error:
            report['errors'].append(repr(error))
    report['temporaryMountRemoved'] = not temp.exists()
    report['finishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    report['status'] = 'passed' if not report['errors'] and all(c['passed'] for c in report['checks']) and report['temporaryMountRemoved'] else 'failed'
    with report_path.open('x') as f:
        json.dump(report, f, indent=2)
        f.write('\n')
print(json.dumps({'status': report['status'], 'path': str(report_path), 'sha256': sha(report_path), 'checks': [(c['id'], c['passed']) for c in report['checks']], 'errors': report['errors']}))
raise SystemExit(0 if report['status'] == 'passed' else 1)
