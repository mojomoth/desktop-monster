from pathlib import Path
import json,hashlib,subprocess
R=Path('.agentdoc/v07-setup-20260911T122653Z')
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
review=read(R/'reviews/design-final-v070/session.json')
analysis=R/'evidence/final-v070-validation-analysis/snapshot-complete.json'
a=read(analysis)
assert a['integrity']=={'status':'PASS','errors':[]} and a['targetPassed'] is True
assert a['sourceDigest']==review['sourceDigest'] and a['evaluationDigest']==review['evaluationDigest']
assert a['reportFileSha256']==sha(R/'evidence/candidate-final-v070.json')

def command(action,*args):
 r=subprocess.run(['node','.harness/v7/loop/develop.mjs',action,str(R),*args],capture_output=True,text=True)
 print(action,' '.join(args),r.returncode,flush=True)
 if r.returncode:
  print(r.stdout,r.stderr,flush=True);raise SystemExit(r.returncode)

def verify(id,description):
 loop=read(R/'loop.json');t=next(t for t in loop['tasks'] if t['id']==id);checks={c['commandId']:c for c in t['attempts'][-1]['checks']}
 assert set(checks)=={'gates',*[a['id'] for a in t['ac']]}
 assert all(c['exitCode']==0 and c['sourceDigest']==c['endedDigest']==review['sourceDigest'] and c['evaluationDigest']==c['endedEvaluationDigest']==review['evaluationDigest'] for c in checks.values())
 lines=[f'# {id} — final0.7 fresh verification','',description,'','Source: '+review['sourceDigest'],'Evaluation: '+review['evaluationDigest'],'','All registered AC and exact npm test && npm run lint && npm run typecheck passed freshly on the same final source and owned-file manifests. Existing tests preserved; old results were not recertified.']
 lines += [f"- {k}: exit0; {c['log']}; SHA256 {c['sha256']}" for k,c in checks.items()]
 for p in [R/'evidence/candidate-final-v070.json',R/'evidence/validation-final-v070/execution.json',R/'evidence/final-v070-host-validation-check.json',analysis]:lines += [f'- Evidence: {p}; SHA256 {sha(p)}']
 lines += ['', 'Actual final100 first success whole/conditional p10/p50/p90/worst=1698.4/2736.6/3539.5/3723.3 sec,100/100 by90min. h70 eligibility whole p50=40596sec,50/100 reached and50 unreached; conditional p50=20933.6sec. Seen50/100, actual chosen0/100 under registered first-slot policy. Whole h70 p90/worst=null. Both registered goals PASS. Independent Balance snapshot passed full raw/archive integrity; later prose freeze remains separate and cannot alter this immutable snapshot.', '', 'Version/package/lock/tray0.7.0 fixed before final evidence. Four actual ordered design roles complete; separate audit.mjs result review, release900, actual330min Native, smoke/package/live compatibility pending. Integration and preflight0min diagnostics contribute zero natural observation. humanChecks=PENDING. No commit/push/deploy.', '']
 p=R/f'sessions/{id}-final-v070.md'
 with p.open('x') as f:f.write('\n'.join(lines))
 command('verify',id,str(p))

verify('V07-05','Fixed selected10450 progression and six named content goals passed fresh48 progression/143 harness/955 canonical tests plus newly executed100seed×12h acceptance. No parameter/content changes after validation.')
command('start','V07-06')
ps=subprocess.check_output(['ps','-axo','pid,ppid,pgid,etime,command'],text=True)
lines=[s for s in ps.splitlines() if any(x in s for x in ['node .harness/v7/loop/measure.mjs','loop/electron-e2e.cjs','node .harness/v7/loop/e2e-matrix.mjs','/desktop-monster/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'])]
assert all('50718' in s for s in lines)
p=R/'evidence/final-v070-integration-launch-processes.txt'
with p.open('x') as f:f.write('\n'.join(lines)+'\n')
command('check','V07-06','integration')
command('check','V07-06','gates')
verify('V07-06','Actual new registered integration0min journey on final0.7 source, isolated save/synthetic input/local network; all42 diagnostics followed by canonical955/lint/typecheck. This diagnostic is not part of330 natural minutes.')
