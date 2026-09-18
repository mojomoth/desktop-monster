#!/usr/bin/env node
// Read-only convergence check; a failed/missing latest receipt cannot fall back to an older pass.
import assert from 'node:assert/strict';
import { lstatSync, readFileSync, readdirSync, readlinkSync, statSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { ROOT, GATES, config, digest, manifest, receiptValid, sha } from './run.mjs';
import { verifyBalance } from './balance-verify.mjs';
import { fingerprints } from './launcher.mjs';
import { verifyIsolation } from './performance-isolation.mjs';
const require=createRequire(import.meta.url), asar=require('@electron/asar'), yaml=require('js-yaml');
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const quote=value=>"'"+value.replaceAll("'","'\"'\"'")+"'";
export function artifactHash(path) {
  path=resolve(path);
  if (!lstatSync(path).isDirectory()) return sha(readFileSync(path));
  const entries={};
  const visit=directory=>{for(const name of readdirSync(directory).sort()) {
    const file=join(directory,name), key=relative(path,file), stat=lstatSync(file);
    if(stat.isSymbolicLink())entries[key]={link:readlinkSync(file)};
    else if(stat.isDirectory())visit(file);
    else entries[key]=sha(readFileSync(file));
  }};
  visit(path); assert(Object.keys(entries).length,'Empty artifact directory');
  return sha(JSON.stringify(entries,null,2)+'\n');
}
function hashed(record) {
  assert(record&&typeof record.path==='string'&&/^[a-f0-9]{64}$/.test(record.sha256),'Missing artifact path/hash');
  assert.equal(artifactHash(record.path),record.sha256,'Artifact changed: '+record.path);
  return resolve(record.path);
}
export function validateReviews(document,current,root=ROOT) {
  assert.equal(document.version,10); assert.equal(document.source,current,'Review is stale'); assert.equal(document.passed,true);
  const required={
    'core-host':['src/core/equipment.ts','src/core/engine.ts','src/core/save.ts','src/main/ipc.ts','src/main/coordinator.ts','src/main/recovery.ts','src/renderer/index.ts','src/menu/equipment.ts'],
    backend:['src/server/app.ts','src/server/gold.ts','src/server/store.ts','src/server/pgStore.ts','src/main/net.ts','src/shared/api.ts'],
    visual:['src/renderer/game.ts','src/renderer/anim.ts','src/core/fsm.ts'],
  };
  const authors={'core-host':['/root','/root/equipment_economy'],backend:['/root/backend_v10'],visual:['/root/sprite_qa']};
  assert(Array.isArray(document.reviews)&&document.reviews.length===3,'Three independent scope reviews required');
  assert.deepEqual(document.reviews.map(review=>review.scope).sort(),Object.keys(required).sort(),'Missing/duplicate review scopes');
  for(const review of document.reviews) {
    assert.equal(review.verdict,'approved','Unresolved review: '+review.scope);
    assert(typeof review.reviewer==='string'&&/^\/root(?:\/[a-z0-9_]+)*$/.test(review.reviewer),'Missing actual reviewer ID');
    assert(Array.isArray(review.implementedBy)&&authors[review.scope].every(id=>review.implementedBy.includes(id)),'Incomplete author provenance');
    assert(!review.implementedBy.includes(review.reviewer),'Self-approval: '+review.scope);
    hashed(review.evidence);
    assert(review.sourceHashes&&required[review.scope].every(path=>path in review.sourceHashes),'Missing reviewed source bindings');
    for(const [path,hash] of Object.entries(review.sourceHashes)) assert.equal(sha(readFileSync(resolve(root,path))),hash,'Reviewed source changed: '+path);
  }
  for(const key of ['windowsHardware','postgresql','humanFun']) {
    const record=document.externalChecks?.[key];
    assert(record&&typeof record.performed==='boolean'&&typeof record.note==='string'&&record.note.trim(),'External check must explicitly record execution/limitation: '+key);
    if(record.performed)hashed(record.evidence);
  }
  return document;
}
export function validateReceipts(journal,current,run,tasks=config.tasks) {
  assert.equal(journal.version,10); assert.equal(journal.run,resolve(run));
  assert(Array.isArray(journal.tasks));
  const latest=journal.tasks.flatMap(task=>task.checks??[]).filter(receipt=>receipt.id==='gates').sort((a,b)=>a.at.localeCompare(b.at)).at(-1);
  assert(latest?.command===GATES&&receiptValid(latest,current),'Latest canonical gates failed, stale, or altered');
  for(const definition of tasks.filter(task=>task.id!=='V10-10')) {
    const task=journal.tasks.find(task=>task.id===definition.id);
    assert(task?.status==='verified'&&task.verifiedSource===current,'Task is not verified for current source: '+definition.id);
    const ac=task.checks.filter(receipt=>receipt.id==='ac').at(-1);
    const command=definition.ac.replaceAll('{runDir}',quote(resolve(run)));
    const artifacts=(definition.artifacts??[]).map(path=>path.replaceAll('{runDir}',resolve(run)));
    assert(ac?.command===command&&receiptValid(ac,current,artifacts),'Latest AC failed, stale, or altered: '+definition.id);
  }
}
export function validatePerformanceReview(review, comparison, isolation, current) {
  assert(review?.version === 1 && review.source === current && review.verdict === 'approved' && review.scope === 'performance-result', 'Missing current independent performance approval');
  assert(typeof review.reviewer === 'string' && /^\/root\/[a-z0-9_/]+$/.test(review.reviewer) && review.reviewer !== '/root/sprite_qa', 'Performance implementation cannot approve itself');
  assert.deepEqual(review.comparison, comparison, 'Performance review comparison differs');
  assert.deepEqual(review.isolation, isolation, 'Performance review isolation differs');
  const evidence = read(hashed(isolation)); hashed(comparison);
  assert.equal(review.reviewer, read(hashed(evidence.registration)).independentReviewer, 'Unexpected performance result reviewer');
  assert(Date.parse(review.at) >= Date.parse(evidence.endedAt), 'Performance review predates completed observations');
}
function validateNative(report,current,macAsar) {
  assert(report.version===10&&report.source===current&&report.sourceUnchanged===true&&report.passed===true,'Native report is stale/incomplete');
  assert.deepEqual(report.errors,[]);
  const names=['bare','sword','greatsword','spear','gun','dagger','staff','hammer','gauntlet','epic'].map(name=>'motion-'+name).concat(['equipment','equipment-restart','boss-drop','hero-pvp','hero-party-pvp','historical-replay']);
  assert.deepEqual(report.attempts.map(attempt=>attempt.name).sort(),names.sort(),'Missing native scenarios');
  for(const attempt of report.attempts) {
    const runtime=attempt.runtime;
    assert(attempt.ui?.passed===true&&runtime?.passed===true&&runtime.metadata?.version==='0.10.0','Failed native scenario '+attempt.name);
    assert(runtime.appUnchanged===true&&runtime.appHash===sha(readFileSync(macAsar))&&runtime.exitCode===0&&runtime.signal===null,'Native package changed/failed');
    assert(runtime.launcherHash===sha(readFileSync(resolve(ROOT,'.harness/v10/launcher.mjs'))),'Native launcher changed');
    assert(runtime.packageBinding?.passed===true&&runtime.packageBinding.checked>0&&runtime.packageBinding.mismatches.length===0,'Native package binding failed');
    assert.deepEqual(runtime.errors,[]); assert.deepEqual(runtime.diagnostics?.errors,[]);
    assert(runtime.diagnostics.hookLoads===0&&runtime.diagnostics.permissionCalls.every(call=>!call.prompt),'Unsafe native input boundary');
    for(const screenshot of attempt.ui.screenshots??[]) assert.equal(report.artifacts[screenshot.path],sha(readFileSync(screenshot.path)),'Missing screenshot receipt');
  }
  assert(Object.keys(report.artifacts).length>=10,'Native visual evidence missing');
  for(const [path,hash] of Object.entries(report.artifacts))assert.equal(sha(readFileSync(path)),hash,'Native screenshot altered');
}
export function validateGallery(report,macAsar,core) {
  assert(report.version===10&&report.passed===true&&report.sourceUnchanged===true&&report.fixtureSaveUnchangedDuringDrawing===true,'Incomplete native gallery');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.source,fingerprints(),'Native gallery source/build changed');
  assert.equal(report.generatorHash,sha(readFileSync(resolve(ROOT,'.harness/v10/gallery.mjs'))),'Gallery generator changed');
  assert(report.runtime?.passed===true&&report.runtime.metadata?.version==='0.10.0'&&report.runtime.appHash===sha(readFileSync(macAsar))&&report.runtime.appUnchanged===true,'Gallery package differs');
  assert(report.runtime.packageBinding?.passed===true&&report.runtime.packageBinding.checked>0&&report.runtime.packageBinding.mismatches.length===0,'Gallery payload binding failed');
  assert(report.pages.length===150&&report.samples===7148&&report.overviews.length===4,'Missing gallery pages/samples/overviews');
  const expected=[],actual=[];
  const add=(id,hero,pose,flipX,theme)=>JSON.stringify([id,hero,pose,flipX,theme]);
  for(const theme of ['dark','light']) {
    for(const item of core.EQUIPMENT_CATALOG) {
      expected.push(add(item.id,'',0,false,theme));
      if(item.kind==='weapon')for(let pose=0;pose<5;pose++)for(const flipX of [false,true])expected.push(add(item.id,'h00',pose,flipX,theme));
    }
    for(let i=0;i<71;i++)for(let pose=0;pose<5;pose++)for(const flipX of [false,true])expected.push(add('bare','h'+String(i).padStart(2,'0'),pose,flipX,theme));
    for(let i=1;i<71;i++)for(const template of core.EQUIPMENT_CATALOG) {
      const hero='h'+String(i).padStart(2,'0'),item={id:'e1',templateId:template.id,enhancement:'0',roll:100,seed:1,attempts:'0'};
      if(template.kind==='weapon'&&template.rarity==='epic'&&template.tier===3&&core.canEquip(item,hero,1000))
        for(let pose=0;pose<5;pose++)for(const flipX of [false,true])expected.push(add(template.id,hero,pose,flipX,theme));
    }
  }
  const image=record=>{const path=hashed(record),bytes=readFileSync(path);assert(bytes.length>=24&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a'&&bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0,'Invalid gallery PNG');if(record.bytes!==undefined)assert.equal(record.bytes,bytes.length);};
  assert.equal(new Set([...report.pages,...report.overviews].map(page=>page.path)).size,154,'Reused gallery image path');
  for(const page of report.pages) {
    image(page);assert(page.samples.length>0&&page.samples.length<=48,'Unbounded/empty gallery page');
    for(const sample of page.samples){assert(Number.isSafeInteger(sample.pixels)&&sample.pixels>0,'Blank gallery sprite');actual.push(add(sample.id,sample.hero,sample.pose,sample.flipX,sample.theme));}
  }
  assert.equal(actual.length,7148);assert.deepEqual(actual.sort(),expected.sort(),'Missing or duplicated hero/weapon/frame/facing/theme coverage');
  assert.deepEqual(report.overviews.map(page=>page.name).sort(),['all-224-icons-dark','all-224-icons-light','all-71-bare-dark','all-71-bare-light']);
  for(const page of report.overviews) {
    image(page);
    const ids=page.name.includes('224')?core.EQUIPMENT_CATALOG.map(item=>item.id):Array.from({length:71},(_,i)=>'h'+String(i).padStart(2,'0'));
    assert.deepEqual(page.manifest.map(item=>item.id).sort(),ids.sort(),'Incomplete overview manifest');
  }
  image(report.fieldScreenshot);
}
export function validateInstalledCopy(expected, extracted) {
  const expectedHash=artifactHash(expected), extractedHash=artifactHash(extracted);
  assert.equal(extractedHash,expectedHash,'Installer payload differs from verified app: '+expected);
  return extractedHash;
}
export async function validateInstallerPayloads(paths) {
  const scratch=mkdtempSync(join(tmpdir(),'desmon-v10-installers-')), mount=join(scratch,'dmg');
  const run=(command,args)=>{
    const result=spawnSync(command,args,{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
    assert.equal(result.status,0,'Installer extraction failed: '+command+' '+(result.error??'')+(result.stderr??'')+(result.stdout??''));
  };
  let mounted=false;
  try {
    mkdirSync(mount);
    run('/usr/bin/hdiutil',['attach','-readonly','-nobrowse','-noautoopen','-mountpoint',mount,resolve(paths.macDmg)]);
    mounted=true;
    const macPayloadHash=validateInstalledCopy(paths.macApp,join(mount,basename(paths.macApp)));
    const sevenZip=await require('app-builder-lib/out/toolsets/7zip').getPath7za();
    const installer=join(scratch,'installer'), windows=join(scratch,'windows');
    run(sevenZip,['x','-y',resolve(paths.windowsInstaller),'-o'+installer,'$PLUGINSDIR/app-64.7z']);
    run(sevenZip,['x','-y',join(installer,'$PLUGINSDIR/app-64.7z'),'-o'+windows]);
    const windowsPayloadHash=validateInstalledCopy(resolve(dirname(paths.windowsAppAsar),'..'),windows);
    return {macPayloadHash,windowsPayloadHash,extractor:{path:sevenZip,sha256:sha(readFileSync(sevenZip))},
      macDmgHash:artifactHash(paths.macDmg),windowsInstallerHash:artifactHash(paths.windowsInstaller)};
  } finally {
    // Never remove a still-mounted image if detach fails; retain its owned scratch path for diagnosis.
    if(mounted)run('/usr/bin/hdiutil',['detach',mount]);
    rmSync(scratch,{recursive:true,force:true});
  }
}
async function validatePackages(packages) {
  assert(packages&&['macApp','macDmg','windowsInstaller','windowsAppAsar'].every(key=>packages[key]),'Missing platform artifacts');
  const paths=Object.fromEntries(Object.entries(packages).map(([key,value])=>[key,hashed(value)]));
  assert(paths.macApp.endsWith('.app')&&statSync(paths.macApp).isDirectory(),'Missing macOS app');
  assert(paths.macDmg.endsWith('.dmg')&&statSync(paths.macDmg).size>0,'Missing DMG');
  assert(paths.windowsInstaller.endsWith('.exe')&&readFileSync(paths.windowsInstaller).subarray(0,2).toString()==='MZ','Invalid Windows installer');
  for(const [path,name] of [[paths.macDmg,'latest-mac.yml'],[paths.windowsInstaller,'latest.yml']]) {
    const update=yaml.load(readFileSync(join(dirname(path),name),'utf8')), bytes=readFileSync(path);
    assert.equal(update.version,'0.10.0','Wrong installer/disk-image version');
    const hash=createHash('sha512').update(bytes).digest('base64');
    assert(update.files?.some(file=>file.sha512===hash&&file.size===bytes.length),'Installer/disk-image differs from versioned builder manifest');
  }
  const executable=readFileSync(paths.windowsInstaller), versionOffset=executable.indexOf(Buffer.from('ProductVersion','utf16le'));
  assert(versionOffset>=0&&/^ProductVersion\u0000+0\.10\.0(?:\.0)?\u0000/.test(executable.subarray(versionOffset,versionOffset+100).toString('utf16le')),'Windows resource version differs');
  const macAsar=join(paths.macApp,'Contents/Resources/app.asar');
  const payload=manifest(['dist','static']);
  for(const archive of [macAsar,paths.windowsAppAsar]) {
    const pkg=JSON.parse(asar.extractFile(archive,'package.json').toString());
    assert.equal(pkg.version,'0.10.0','Wrong packaged version');
    for(const [path,hash] of Object.entries(payload).filter(([path])=>!path.startsWith('dist/electron/server/'))) {
      assert.equal(sha(asar.extractFile(archive,path)),hash,'Package differs from current compiled payload: '+path);
    }
  }
  return {macAsar,installerPayloads:await validateInstallerPayloads(paths)};
}
export async function verifyFinal(run) {
  run=resolve(run); const current=digest();
  assert.equal(read(resolve(ROOT,'package.json')).version,'0.10.0');
  validateReceipts(read(join(run,'loop.json')),current,run);
  const balance=verifyBalance(join(run,'balance/final.json'));
  const reviews=validateReviews(read(join(run,'reviews/final.json')),current);
  const {macAsar,installerPayloads}=await validatePackages(reviews.packages);
  validateNative(read(join(run,'native/final.json')),current,macAsar);
  const catalog=spawnSync(process.execPath,[resolve(ROOT,'.harness/v10/catalog.mjs'),'verify'],{cwd:ROOT,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
  assert.equal(catalog.status,0,'Catalog verification failed: '+(catalog.stderr??'')+(catalog.stdout??''));
  const gear=require(resolve(ROOT,'dist/electron/core/equipment.js'));
  assert(gear.EQUIPMENT_CATALOG.filter(item=>item.kind==='weapon').length>=128&&gear.EQUIPMENT_CATALOG.filter(item=>item.kind==='accessory').length>=96,'Insufficient catalog');
  validateGallery(read(join(run,'native/gallery-final.json')),macAsar,gear);
  const performanceFile=join(run,'performance/comparison.json');
  const performance=spawnSync(process.execPath,[resolve(ROOT,'.harness/v10/performance-report.mjs'),'verify',performanceFile],{cwd:ROOT,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
  assert.equal(performance.status,0,'Performance verification failed: '+(performance.stderr??'')+(performance.stdout??''));
  const comparison=read(performanceFile);
  for(const slot of ['candidate-active','candidate-idle','mixed'])assert.equal(comparison.artifacts[slot].appHash,sha(readFileSync(macAsar)),'Performance package differs from final package');
  const isolationPath=join(run,'performance/isolation.json');
  const isolation=verifyIsolation(isolationPath,comparison,current);
  validatePerformanceReview(read(join(run,'reviews/performance-result-final.json')),
    {path:performanceFile,sha256:sha(readFileSync(performanceFile))},
    {path:isolationPath,sha256:sha(readFileSync(isolationPath))},current);
  assert.equal(digest(),current,'Source changed during final verification');
  return {version:10,passed:true,source:current,balance,isolation,installerPayloads,externalChecks:reviews.externalChecks};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {assert(process.argv[2],'Usage: final-check.mjs RUN_DIRECTORY');console.log(JSON.stringify(await verifyFinal(process.argv[2]),null,2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
