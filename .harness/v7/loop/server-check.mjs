#!/usr/bin/env node
// Read-only deployment comparison; never registers players, pushes or deploys.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, manifest, sourceDigest, sha256 } from './evidence.mjs';
const check = (ok, why) => { if (!ok) throw Error(why); };
const json = value => JSON.stringify(value, null, 2) + '\n';
export const LIVE_SERVER_URL = 'https://desmon-server-v3.onrender.com';
export function serverSources() {
  const files = manifest(['src/core','src/server','src/shared']);
  for (const path of ['src/main/net.ts','package.json','package-lock.json','tsconfig.main.json','tsconfig.base.json']) files[path] = sha256(readFileSync(resolve(ROOT,path)));
  return files;
}
export function serverBuild() {
  const files = manifest(['dist/electron/core','dist/electron/server','dist/electron/shared']);
  files['dist/electron/main/net.js'] = sha256(readFileSync(resolve(ROOT,'dist/electron/main/net.js')));
  return files;
}
const same = (a,b) => JSON.stringify(Object.entries(a??{}).sort()) === JSON.stringify(Object.entries(b??{}).sort());
export function deployedSourcesMatch(files, commit, gitRead) {
  if (!/^[a-f0-9]{40}$/.test(commit??'')) return false;
  return Object.entries(files).every(([path, hash]) => {
    const bytes = gitRead(commit, path);
    return bytes !== null && sha256(bytes) === hash;
  });
}
function gitRead(commit, path) {
  const result = spawnSync('git',['show',`${commit}:${path}`],{cwd:ROOT,maxBuffer:32*1024*1024});
  return result.status === 0 ? result.stdout : null;
}
export function verifyCompatibility(report, current, read=readFileSync, readGit=gitRead) {
  check(report?.kind === 'desmon-v07-server-compatibility', 'Expected server compatibility evidence');
  check(report.sourceDigest === current.sourceDigest && same(report.sources,current.sources) && same(report.build,current.build), 'Stale server source or build');
  check(report.local?.status === 'PASSED' && report.local.command === 'npx vitest run tests/companionLevelsV7.test.ts tests/server' && report.local.exitCode === 0,
    'Actual high-level client/server roundtrip tests must pass');
  check(sha256(read(report.local.log)) === report.local.sha256 && same(report.tests,current.tests), 'Stale test source or log');
  check(report.buildLog?.exitCode===0 && report.buildLog.command==='npm run build' && sha256(read(report.buildLog.path))===report.buildLog.sha256,'Stale or missing build log');
  check(report.live?.url === LIVE_SERVER_URL && report.live.status === 'PASSED' && report.live.health?.ok === true && deployedSourcesMatch(report.sources,report.live.health.sha,readGit),
    'Live compatibility PENDING: health SHA must contain the exact tested server sources and dependencies');
  return { local:'PASSED', live:'PASSED', sha:report.live.health.sha };
}
const tests = () => ({...manifest(['tests/server']), 'tests/companionLevelsV7.test.ts':sha256(readFileSync(resolve(ROOT,'tests/companionLevelsV7.test.ts')))});
const current = () => ({sourceDigest:sourceDigest(),sources:serverSources(),build:serverBuild(),tests:tests()});
async function health(url) {
  const response = await fetch(new URL('/healthz',url),{signal:AbortSignal.timeout(30000)});
  check(response.ok,'Health HTTP failure');
  return response.json();
}
async function main() {
  const [first,second,baseUrl=LIVE_SERVER_URL] = process.argv.slice(2);
  const capture = first === 'capture';
  const path = resolve(capture ? second : first ?? '');
  check(first && (!capture || second), 'Usage: server-check.mjs [capture] OUTPUT.json [server URL]');
  if (capture) {
    check(!existsSync(path),'Preserve the original; choose a new server evidence path');
    check(baseUrl===LIVE_SERVER_URL,'Use the registered production server URL');
    mkdirSync(dirname(path),{recursive:true});
    const buildSource=sourceDigest();
    const build = spawnSync('npm',['run','build'],{cwd:ROOT,encoding:'utf8'});
    writeFileSync(path+'.build.log',(build.stdout??'')+(build.stderr??''),{flag:'wx'});
    check(build.status === 0,'Server build failed');
    check(buildSource===sourceDigest(),'Sources changed during build');
    const before = current();
    const command = 'npx vitest run tests/companionLevelsV7.test.ts tests/server';
    const local = spawnSync('npx',['vitest','run','tests/companionLevelsV7.test.ts','tests/server'],{cwd:ROOT,encoding:'utf8'});
    const log = path+'.tests.log';
    writeFileSync(log,(local.stdout??'')+(local.stderr??''),{flag:'wx'});
    check(same(before.sources,serverSources()) && before.sourceDigest===sourceDigest() && same(before.tests,tests()),'Sources changed while testing');
    let live = {status:'PENDING',url:baseUrl,reason:'Not checked'};
    try {
      const result = await health(baseUrl);
      live = {status:result.ok === true && deployedSourcesMatch(before.sources,result.sha,gitRead) ? 'PASSED':'PENDING',url:baseUrl,health:result,
        reason:'Compared every tested server/core/shared/client file, package manifests and compiler settings against the actual health commit; no deployment performed.'};
    } catch(error) { live.reason=String(error); }
    writeFileSync(path,json({kind:'desmon-v07-server-compatibility',capturedAt:new Date().toISOString(),...before,
      buildLog:{command:'npm run build',exitCode:build.status,path:path+'.build.log',sha256:sha256(readFileSync(path+'.build.log'))},
      local:{status:local.status===0?'PASSED':'FAILED',command,exitCode:local.status,log,sha256:sha256(readFileSync(log))},live}),{flag:'wx'});
  }
  const report = JSON.parse(readFileSync(path,'utf8'));
  const result = verifyCompatibility(report,current());
  const live = await health(report.live.url);
  check(live.ok===true && live.sha===result.sha,'Live deployment changed since verification');
  console.log(json(result));
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
