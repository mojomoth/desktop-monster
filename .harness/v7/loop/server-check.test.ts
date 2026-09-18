import { describe, expect, it } from 'vitest';
import { sha256 } from './evidence.mjs';
import { deployedSourcesMatch, verifyCompatibility, LIVE_SERVER_URL } from './server-check.mjs';
const current = {sourceDigest:'a'.repeat(64),sources:{'src/server/app.ts':sha256('tested server')},build:{'dist/electron/server/app.js':sha256('build')},tests:{'tests/server/app.test.ts':sha256('tests')}};
const fixture = () => ({kind:'desmon-v07-server-compatibility',...structuredClone(current),
  buildLog:{command:'npm run build',exitCode:0,path:'build.log',sha256:sha256('passed log')},
  local:{status:'PASSED',command:'npx vitest run tests/companionLevelsV7.test.ts tests/server',exitCode:0,log:'tests.log',sha256:sha256('passed log')},
  live:{status:'PASSED',url:LIVE_SERVER_URL,health:{ok:true,sha:'b'.repeat(40)}}});
describe('live high-level server compatibility evidence',()=>{
  it('requires both actual high-level tests and a deployed commit containing their exact source',()=>{
    expect(verifyCompatibility(fixture(),current,()=>Buffer.from('passed log'),()=>Buffer.from('tested server'))).toMatchObject({local:'PASSED',live:'PASSED'});
    const pending=fixture();pending.live.status='PENDING';
    expect(()=>verifyCompatibility(pending,current,()=>Buffer.from('passed log'),()=>Buffer.from('tested server'))).toThrow(/PENDING/);
    expect(()=>verifyCompatibility(fixture(),current,()=>Buffer.from('passed log'),()=>Buffer.from('different source'))).toThrow(/PENDING/);
    expect(deployedSourcesMatch(current.sources,'dev',()=>Buffer.from('tested server'))).toBe(false);
    expect(deployedSourcesMatch(current.sources,'b'.repeat(40),()=>null)).toBe(false);
    const local=fixture();local.live.url='http://localhost:1234';
    expect(()=>verifyCompatibility(local,current,()=>Buffer.from('passed log'),()=>Buffer.from('tested server'))).toThrow(/PENDING/);
  });
  it('rejects stale source, build, tests, log and the empty-roster legacy probe',()=>{
    for(const change of [{sourceDigest:'c'.repeat(64)},{build:{}},{tests:{}}]) {
      expect(()=>verifyCompatibility({...fixture(),...change},current,()=>Buffer.from('passed log'),()=>Buffer.from('tested server'))).toThrow(/Stale/);
    }
    expect(()=>verifyCompatibility(fixture(),current,()=>Buffer.from('new log'),()=>Buffer.from('tested server'))).toThrow(/Stale/);
    expect(()=>verifyCompatibility({...fixture(),buildLog:undefined},current,()=>Buffer.from('passed log'),()=>Buffer.from('tested server'))).toThrow(/build log/);
    const probe=fixture();probe.local.command='node dist/electron/server/probe.js';
    expect(()=>verifyCompatibility(probe,current,()=>Buffer.from('passed log'),()=>Buffer.from('tested server'))).toThrow(/roundtrip/);
  });
});
