// Generated bounded diagnostic: one 60s pair, no app/harness edits or game mutation.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const ROOT = '/Users/jeongyounglee/work/repo/desktop-monster';
const OUT = dirname(fileURLToPath(import.meta.url));
const BASE = '/var/folders/lx/2l4_myln77j11v_rskxlc7kr0000gn/T/desmon-baseline-reference-0szNqs';
const { launchRuntime } = await import(join(ROOT, '.harness/v10/launcher.mjs'));
const { controls } = await import(join(ROOT, '.harness/v10/ui-cases.mjs'));
const require = createRequire(import.meta.url);
const core = require(join(BASE, 'dist/electron/core/index.js'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const write = (name, value) => writeFileSync(join(OUT, name), JSON.stringify(value, null, 2) + '\n');
const sleep = ms => new Promise(done => setTimeout(done, ms));
const files = path => readdirSync(path, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(path,e.name)) : [join(path,e.name)]);
const sources = () => Object.fromEntries(['src','static','dist','.harness/v10','.harness/v11'].flatMap(p => files(join(ROOT,p))).map(p => [p,sha(p)]));
const now = Date.now();
const old = JSON.parse(readFileSync(join(ROOT,'.agentdoc/v11-20260918/performance/diagnostic-cadence03/baseline.json'))).fixture;
const fixture = core.createEngine(core.parseSave({ ...old, monsterIndex:1000, monsterSpeciesId:'slime', monsterHp:'9'.repeat(80), bestIndex:1000 }), core.mulberry32(7), {now:()=>now,equipmentSeed:7}).toSave();
fixture.monsterCurveVersion = 10; fixture.monsterCurveRebirths = 0;
write('fixture.json',fixture);
const report = { diagnosticOnly:true, replacesRegisteredPerformance:false, startedAt:new Date().toISOString(),
  method:{durationMs:60000,warmupMs:5000,order:['baseline','candidate'],attemptsPerApp:1,inputs:0,
    scene:'Same serialized save: five level-1/star-0 boss-index-7 slimes, same empty loadout, index-1000 normal slime with frozen legacy curve; no kills permitted.',
    observation:'v10 production launcher/controls with isolated native boundaries; one startup debugger pause installs read-only game observer, then resumes/detaches. Controls add one rAF motion observer; diagnostic adds one rAF timestamp observer. Field CDP CPU sampler at 1000us and Chromium devtools.timeline trace run together. app.getAppMetrics sampled every 5s. All observer/profiler overhead retained, uncalibrated and not subtracted; this instrumented 60s pair cannot replace registered uninstrumented 30min results.',
    traceCategories:['devtools.timeline'],cpuSamplingIntervalUs:1000},
  fixtureSha256:sha(join(OUT,'fixture.json')),scriptSha256:sha(fileURLToPath(import.meta.url)),sourceBefore:sources(),runs:[],errors:[] };
write('report.json',report);
for (const [kind, cwd, app] of [['baseline',BASE,join(ROOT,'.agentdoc/v11-20260918/preservation/DesMon-0.10.0.app')],['candidate',ROOT,join(ROOT,'release/mac-arm64/DesMon.app')]]) {
  let runtime, ui;
  const row = {kind,startedAt:new Date().toISOString(),appPath:app,appHash:sha(join(app,'Contents/Resources/app.asar')),referenceCwd:cwd,metrics:[],errors:[]};
  report.runs.push(row); write('report.json',report);
  try {
    process.chdir(cwd);
    runtime = await launchRuntime({appPath:app,outputDir:join(OUT,kind),save:fixture,
      settings:{gameScale:1,muted:true,screenShake:false,welcomeSeen:true,globalInputRequested:false},
      identity:{name:'FixtureMe',playerId:'fixture-me',token:'fixture-me-token',notifiedTheftIds:[]}});
    ui = await controls(runtime);
    await ui.main('(p.field.webContents.setAudioMuted(true), true)');
    await sleep(5000);
    row.before = await ui.read();
    if (row.before.save.killCount !== 0 || row.before.save.monsterIndex !== 1000 || row.before.save.companions.length !== 5) throw Error('Fixed-scene warmup changed membership or encounter');
    await ui.main(`(async()=>{const d=p.field.webContents.debugger;d.attach('1.3');p.profileDiagnostic={profiler:true,tracing:false};await d.sendCommand('Profiler.enable');await d.sendCommand('Profiler.setSamplingInterval',{interval:1000});await p.e.contentTracing.startRecording({included_categories:['devtools.timeline'],excluded_categories:['*'],recording_mode:'record-until-full',trace_buffer_size_in_kb:65536});p.profileDiagnostic.tracing=true;await d.sendCommand('Profiler.start');return true;})()`);
    row.start = await ui.field(`(()=>{const v=globalThis.__pairedProfile={start:performance.now(),timeOrigin:performance.timeOrigin,times:[],running:true};const tick=t=>{if(!v.running)return;v.times.push(t);requestAnimationFrame(tick);};requestAnimationFrame(tick);return {start:v.start,timeOrigin:v.timeOrigin};})()`);
    const began=performance.now();
    row.metrics.push(await ui.main('({at:Date.now(),processes:p.e.app.getAppMetrics()})'));
    console.log(kind+' profiling started '+new Date().toISOString());
    for(let n=1;n<=12;n++) {
      await sleep(Math.max(0,began+n*5000-performance.now()));
      row.metrics.push(await ui.main('({at:Date.now(),processes:p.e.app.getAppMetrics()})'));
      if(n%6===0)console.log(kind+' '+(n*5)+'s');
    }
    row.frames = await ui.field('(()=>{const v=globalThis.__pairedProfile;v.running=false;v.end=performance.now();return v;})()');
    row.observedHostDurationMs=performance.now()-began;
    row.bufferUsage=await ui.main('p.e.contentTracing.getTraceBufferUsage()');
    row.profileStop = await ui.main(`(async()=>{const d=p.field.webContents.debugger;const v=await d.sendCommand('Profiler.stop');p.profileDiagnostic.profiler=false;p.fs.writeFileSync(${JSON.stringify(join(OUT,kind,'renderer.cpuprofile'))},JSON.stringify(v.profile));return {startTime:v.profile.startTime,endTime:v.profile.endTime,samples:v.profile.samples.length};})()`);
    row.tracePath=await ui.main(`p.e.contentTracing.stopRecording(${JSON.stringify(join(OUT,kind,'trace.json'))}).then(path=>{p.profileDiagnostic.tracing=false;return path;})`);
    await ui.main('(p.field.webContents.debugger.detach(), true)');
    row.after=await ui.read();
    row.fixedScene = row.after.save.killCount === 0 && row.after.save.monsterIndex === 1000 && JSON.stringify(row.before.save.companions)===JSON.stringify(row.after.save.companions) && JSON.stringify(row.before.save.equipment.loadout)===JSON.stringify(row.after.save.equipment.loadout);
    if(!row.fixedScene)throw Error('Fixed-scene invariant changed during measurement');
  } catch(error) {
    row.errors.push(String(error.stack??error)); report.errors.push(kind+': '+String(error));
  } finally {
    if(ui)try{row.cleanup=await ui.main(`(async()=>{const s=p.profileDiagnostic,d=p.field.webContents.debugger,result={};if(s?.profiler){try{const v=await d.sendCommand('Profiler.stop');p.fs.writeFileSync(${JSON.stringify(join(OUT,kind,'partial.cpuprofile'))},JSON.stringify(v.profile));result.profilerStopped=true;}catch(error){result.profilerError=String(error);}}if(s?.tracing){try{result.partialTrace=await p.e.contentTracing.stopRecording(${JSON.stringify(join(OUT,kind,'partial-trace.json'))});}catch(error){result.traceError=String(error);}}if(d.isAttached())d.detach();return result;})()`);}catch(error){row.errors.push('Cleanup: '+String(error));}
    if(runtime)row.runtime=await runtime.close();
    row.finishedAt=new Date().toISOString();
    process.chdir(ROOT);write(kind+'.json',row);write('report.json',report);
  }
  if(row.errors.length || row.runtime?.passed!==true)break;
}
report.finishedAt=new Date().toISOString();report.sourceAfter=sources();report.sourceUnchanged=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);
report.completedPair=report.runs.length===2&&report.runs.every(r=>r.fixedScene&&r.runtime?.passed&&r.errors.length===0);
report.artifacts=Object.fromEntries(files(OUT).filter(p=>!p.endsWith('/report.json')).map(p=>[p,sha(p)]));write('report.json',report);
console.log(JSON.stringify({completedPair:report.completedPair,sourceUnchanged:report.sourceUnchanged,errors:report.errors}));
if(!report.completedPair||!report.sourceUnchanged)process.exitCode=1;
