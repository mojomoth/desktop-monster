import { log } from 'node:console';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { sourceDigest, evaluationDigest, sha256 } from '../../../.harness/v7/loop/evidence.mjs';
const runDir = '.agentdoc/v07-setup-20260911T122653Z';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => existsSync(path) ? sha256(readFileSync(path)) : null;
const record = path => ({ path, sha256: hash(path) });
const source = sourceDigest(); const evaluator = evaluationDigest();
const loop = read(`${runDir}/loop.json`);
const tasks = loop.tasks.map(task => {
  const final = task.verificationHistory?.at(-1);
  const latestChecks = Object.values(Object.fromEntries(task.attempts.at(-1).checks.map(check => [check.commandId, check])));
  return {
    id: task.id, status: task.status,
    latestVerification: final ? {at: final.at, sourceDigest: final.sourceDigest, evaluationDigest: final.evaluationDigest,
      currentSourceMatches: final.sourceDigest === source, currentEvaluatorMatches: final.evaluationDigest === evaluator,
      session: final.ac, sessionHashMatches: hash(final.ac.path) === final.ac.sha256,
      ownedFiles: Object.entries(final.filesHash).map(([path, expected]) => ({path, expected, current:hash(path), matches:hash(path) === expected}))} : null,
    latestChecks: latestChecks.map(check => ({commandId:check.commandId, command:check.command, exitCode:check.exitCode, at:check.at,
      sourceDigest:check.sourceDigest, endedDigest:check.endedDigest, evaluationDigest:check.evaluationDigest, endedEvaluationDigest:check.endedEvaluationDigest,
      log:check.log, expectedLogSha256:check.sha256, actualLogSha256:hash(check.log), logMatches:hash(check.log)===check.sha256,
      currentOwnedFilesMatch: JSON.stringify(Object.fromEntries(Object.keys(check.endedFilesHash).map(path=>[path,hash(path)]))) === JSON.stringify(check.endedFilesHash)
    }))
  };
});
const audit = read(`${runDir}/reviews/final/audit.json`);
const native = read(`${runDir}/evidence/native/matrix-state.json`);
const processes = execFileSync('ps',['-axo','pid=,ppid=,pgid=,command='],{encoding:'utf8'}).trim().split('\n').map(line=>{
  const match=/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/.exec(line);
  return match ? {pid:Number(match[1]),ppid:Number(match[2]),pgid:Number(match[3]),command:match[4]} : null;
}).filter(Boolean);
const artifacts = ['evidence/candidate-final-v070.json','evidence/release.json','evidence/native/matrix.json','evidence/native-final-host-check.json',
 'evidence/package/package.json','evidence/distribution/dmg.json','evidence/server/compatibility.json','evidence/server/compatibility-static-mapping.json',
 'evidence/release-v070-analysis/FROZEN.json','reviews/design-final-v070/session.json','reviews/final/audit.json','reviews/final/report.md',
 'evidence/final-v070-preservation-balance.json','evidence/final-v070-preservation-balance-amendment.json','evidence/final-v070-preservation-git-designer.json'].map(path=>record(`${runDir}/${path}`));
const data = {capturedAt:new Date().toISOString(),mode:'read-only-closeout-facts',reexecutionOfTestsOrMeasurements:false,
 sourceDigest:source,evaluationDigest:evaluator,expectedFrozenSource:'84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131',expectedFrozenEvaluation:'c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d',
 packageVersion:read('package.json').version,lockVersion:read('package-lock.json').version,lockRootVersion:read('package-lock.json').packages[''].version,
 current:readFileSync('.harness/CURRENT','utf8'),phase:loop.phase,tasks,
 audit:{status:audit.status,role:audit.role,reports:audit.history.map(({role,agent,findings})=>({role,agent,findings})),humanChecks:audit.history.at(-1).humanChecks,release:'NOT_EVALUATED'},
 nativeState:{running:native.running??null,runs:native.runs.length,attempts:native.attempts.length},
 processObservation:{scope:'Known former Native/matrix PID checks and literal v7 node/caffeinate executor command filter only; Python wrappers, Electron and generic npm/package are not exhaustively enumerated. Completion also relies on immutable process exit records and Native matrix state.',userApp50718:processes.find(process=>process.pid===50718)??null,formerNative94057:processes.find(process=>process.pid===94057)??null,formerMatrix25832:processes.find(process=>process.pid===25832)??null,
   activeV7Executors:processes.filter(process=>/^(?:\S*\/)?(?:node|caffeinate)\b/.test(process.command)&&/\.harness\/v7\/loop\/(?:measure|e2e|e2e-matrix|package-check)\.mjs/.test(process.command))},
 artifacts,documents:['docs/v0.7/ACCEPTANCE.md','docs/v0.7/HANDOFF.md'].map(record),distribution:record('release/DesMon-0.7.0-arm64.dmg'),
 limitations:['This read-only snapshot checks current bytes against recorded executions; it does not rerun, re-date or recertify old results. Collector exit0 alone is not a claim that every collected comparison is true; inspect each flag.',
 'H07 setup is historical. V07-07 stays running/unverified with mandatory server AC exit1; this journal status does not mean an executor is active.',
 'Final status-document edits have different owned-file hashes than earlier V07-07 checks; those executions remain valid historical records for their exact inputs.',
 'humanChecks remains PENDING. Operational authenticated API/DB compatibility and deployment correspondence are not proven.']};
const output=`${runDir}/evidence/final-v070-closeout-host.json`;
writeFileSync(output,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
log(JSON.stringify({output,sha256:hash(output),sourceDigest:source,evaluationDigest:evaluator,phase:loop.phase,audit:data.audit.status,
 verifiedTasks:tasks.filter(task=>/^V07-0[1-6]$/.test(task.id)).map(task=>({id:task.id,sourceMatches:task.latestVerification.currentSourceMatches,evaluatorMatches:task.latestVerification.currentEvaluatorMatches,ownedMatches:task.latestVerification.ownedFiles.every(file=>file.matches),sessionHashMatches:task.latestVerification.sessionHashMatches,logsMatch:task.latestChecks.every(check=>check.logMatches)})),processObservation:data.processObservation},null,2));
