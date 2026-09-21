import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verified, validateConfig, invalidate, sha, pathsOverlap, syncDefinitions, sameDefinition, digest } from './run.mjs';
test('latest failure, stale source, changed log or artifact rejects earlier success', () => {
  const dir=mkdtempSync(join(tmpdir(),'desmon-v11-journal-'));
  try {
    const log=join(dir,'log'),artifact=join(dir,'report.json'); writeFileSync(log,'pass');writeFileSync(artifact,'{}');
    const checks=['ac','gates'].map(id=>({id,before:'s',after:'s',exitCode:0,log,logHash:sha('pass'),artifacts:{[artifact]:sha('{}')}}));
    assert.equal(verified(checks,'s'),true);
    assert.equal(verified([...checks,{...checks[0],exitCode:1}],'s'),false);
    assert.equal(verified(checks,'new'),false);
    writeFileSync(artifact,'{"passed":true}');assert.equal(verified(checks,'s'),false);
    writeFileSync(artifact,'{}');writeFileSync(log,'forged');assert.equal(verified(checks,'s'),false);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('configuration rejects unknown dependencies, duplicate IDs and cycles',()=>{
  const task=(id,dependencies=[])=>({id,dependencies,ac:'node --version',files:[]});
  assert.throws(()=>validateConfig({version:11,tasks:[task('a',['b'])]}));
  assert.throws(()=>validateConfig({version:11,tasks:[task('a'),task('a')]}));
  assert.throws(()=>validateConfig({version:11,tasks:[task('a',['b']),task('b',['a'])]}));
  assert.ok(validateConfig({version:11,tasks:[task('a'),task('b',['a'])]}));
});
test('invalidation preserves attempts and reopens only affected descendants',()=>{
  const journal={tasks:['a','b','c'].map((id,i)=>({id,dependencies:i===1?['a']:[],status:'verified',checks:[{exitCode:1}],invalidations:[]}))};
  invalidate(journal,'a','changed');
  assert.deepEqual(journal.tasks.map(t=>t.status),['pending','pending','verified']);
  assert.equal(journal.tasks[0].checks[0].exitCode,1);
});

test('ownership prevents parent/child overlaps and required artifact omissions',()=>{
  assert.equal(pathsOverlap('src/core','src/core/fsm.ts'),true);
  assert.equal(pathsOverlap('src/core/engine.ts','src/core/fsm.ts'),false);
  assert.equal(verified([], 's', ['required.json']),false);
});

test('changed AC contracts replace stale journal commands and invalidate dependents without erasing receipts',()=>{
  const definitions=[{id:'a',owner:'Host',dependencies:[],files:[],ac:'new-check'},
    {id:'b',owner:'Host',dependencies:['a'],files:[],ac:'build'}];
  const journal={tasks:definitions.map(d=>({...d,status:'verified',checks:[{id:'ac',exitCode:0}],invalidations:[]}))};
  journal.tasks[0].ac='old-check';
  assert.equal(sameDefinition(journal.tasks[0],definitions[0]),false);
  assert.deepEqual(syncDefinitions(journal,definitions),['a']);
  assert.equal(journal.tasks[0].ac,'new-check');
  assert.deepEqual(journal.tasks.map(t=>t.status),['pending','pending']);
  assert.equal(journal.tasks[0].checks.length,1);
  assert.deepEqual(syncDefinitions(journal,definitions),[]);
  journal.tasks[0].status='running';assert.throws(()=>syncDefinitions(journal,definitions),/active tasks/);
  journal.tasks[0].status='implemented';assert.throws(()=>syncDefinitions(journal,definitions.slice(0,1)),/remove/);
});

test('live ownership extensions retain work, reject traversal and reject another live owner', async () => {
  const { claimFiles } = await import('./run.mjs');
  const definitions = [
    {id:'a',owner:'Host',dependencies:[],files:['src/a'],ac:'true'},
    {id:'b',owner:'Balance',dependencies:[],files:['src/b'],ac:'true'},
  ];
  const journal={tasks:definitions.map(t=>({...structuredClone(t),status:'running',checks:[],invalidations:[]}))};
  assert.deepEqual(claimFiles(journal,definitions,'a',['tests/a.test.ts']),['src/a','tests/a.test.ts']);
  assert.equal(journal.tasks[0].status,'running');
  assert.throws(()=>claimFiles(journal,definitions,'a',['../outside']));
  assert.throws(()=>claimFiles(journal,definitions,'a',['src/b/child.ts']));
});

test('source and protocol changes invalidate receipts while generated reports do not', () => {
  const root = mkdtempSync(join(tmpdir(), 'desmon-v11-binding-'));
  try {
    for (const path of ['src', 'docs/v0.11', '.agentdoc/run']) mkdirSync(join(root, path), {recursive:true});
    writeFileSync(join(root, 'src/core.ts'), 'first source');
    writeFileSync(join(root, 'docs/v0.11/EVALUATION_PROTOCOL.json'), '{}');
    const first = digest(root);
    writeFileSync(join(root, '.agentdoc/run/results.json'), '{"passed":true}');
    writeFileSync(join(root, 'docs/v0.11/ACCEPTANCE.md'), 'Recorded evidence');
    assert.equal(digest(root), first);
    writeFileSync(join(root, 'src/core.ts'), 'changed source');
    assert.notEqual(digest(root), first);
    const second = digest(root);
    writeFileSync(join(root, 'docs/v0.11/EVALUATION_PROTOCOL.json'), '{"changed":true}');
    assert.notEqual(digest(root), second);
    const third = digest(root);
    writeFileSync(join(root, 'README.md'), 'Changed operator documentation checked by packaging.test.ts');
    assert.notEqual(digest(root), third);
  } finally { rmSync(root, {recursive:true, force:true}); }
});
