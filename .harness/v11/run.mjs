#!/usr/bin/env node
// v7's resumable transitions + v91's source-bound command receipts. Host only.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const GATES = 'npm test && npm run lint && npm run typecheck';
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const config = JSON.parse(readFileSync(new URL('./config.json', import.meta.url)));
const assert = (ok, why) => { if (!ok) throw Error(why); };
const json = value => JSON.stringify(value, null, 2) + '\n';
const quote = value => "'" + value.replaceAll("'", "'\"'\"'") + "'";
export function manifest(paths, root = ROOT) {
  const files = {};
  const visit = path => {
    const full = resolve(root, path);
    if (!existsSync(full)) { files[path] = null; return; }
    if (statSync(full).isDirectory()) for (const name of readdirSync(full).sort()) visit(path + '/' + name);
    else files[relative(root, full)] = sha(readFileSync(full));
  };
  paths.forEach(visit);
  return files;
}
export const INPUT_PATHS = ['src','static','tests','scripts','.harness/v11','docs/v0.11/CONTRACT.md',
  'docs/v0.11/BALANCE_CANDIDATE.json','docs/v0.11/EVALUATION_PROTOCOL.json','docs/v0.11/PERFORMANCE_PROTOCOL.json','.harness/v10/launcher.mjs','.harness/v10/performance-v4.mjs','.harness/v10/ui-cases.mjs','.harness/v7/loop/package-check.mjs','.harness/v7/loop/evidence.mjs','.harness/v7/loop/config.mjs','.harness/v7/config.json','package.json','package-lock.json',
  'eslint.config.mjs','tsconfig.base.json','tsconfig.main.json','tsconfig.renderer.json','tsconfig.test.json'];
export const digest = (root = ROOT) => sha(json(manifest(INPUT_PATHS, root)));
export function validateConfig(value) {
  assert(value.version === 11 && Array.isArray(value.tasks), 'Invalid config');
  const ids = new Set(value.tasks.map(t => t.id));
  assert(ids.size === value.tasks.length, 'Duplicate tasks');
  const active = new Set(), done = new Set();
  const visit = id => {
    assert(ids.has(id), 'Unknown dependency'); assert(!active.has(id), 'Cyclic dependency');
    if (done.has(id)) return;
    active.add(id); const task = value.tasks.find(t => t.id === id);
    assert(typeof task.ac === 'string' && task.ac.length > 0 && Array.isArray(task.files), 'Missing AC/files');
    task.dependencies.forEach(visit); active.delete(id); done.add(id);
  };
  ids.forEach(visit); return value;
}
validateConfig(config);
export const pathsOverlap = (a, b) => a === b || a.startsWith(b + '/') || b.startsWith(a + '/');
/** Host may extend a live task's ownership without resetting its in-flight work. */
export function claimFiles(journal, definitions, id, paths) {
  const task = journal.tasks.find(t => t.id === id), definition = definitions.find(t => t.id === id);
  assert(task && definition && sameDefinition(task, definition), 'Claim requires a current task contract');
  assert(Array.isArray(paths) && paths.length > 0 && paths.every(path => typeof path === 'string' &&
    path.length > 0 && !path.startsWith('/') && !path.split('/').some(part => !part || part === '..' || part === '.')), 'Invalid relative ownership path');
  assert(!journal.tasks.some(other => other.id !== id && other.status === 'running' &&
    other.files.some(a => paths.some(b => pathsOverlap(a, b)))), 'File ownership overlaps running task');
  definition.files = [...new Set([...definition.files, ...paths])];
  task.files = [...definition.files];
  if (task.status === 'verified') invalidate(journal, id, 'Ownership extended; recheck final source');
  return task.files;
}
export function receiptValid(receipt, current, artifacts) {
  if (!receipt || receipt.exitCode !== 0 || receipt.before !== current || receipt.after !== current ||
    !existsSync(receipt.log) || sha(readFileSync(receipt.log)) !== receipt.logHash) return false;
  if (artifacts && JSON.stringify(Object.keys(receipt.artifacts ?? {}).sort()) !== JSON.stringify([...artifacts].sort())) return false;
  return Object.entries(receipt.artifacts ?? {}).every(([path, expected]) =>
    expected !== null && existsSync(path) && sha(readFileSync(path)) === expected);
}
export function verified(checks, current, artifacts) {
  return ['ac','gates'].every(id => receiptValid(checks.filter(c => c.id === id).at(-1), current, id === 'ac' ? artifacts : undefined));
}
export function invalidate(journal, id, reason) {
  const pending = [id], seen = new Set();
  while (pending.length) {
    const next = pending.shift(); if (seen.has(next)) continue; seen.add(next);
    const task = journal.tasks.find(t => t.id === next); assert(task, 'Unknown task');
    task.status = 'pending'; task.invalidations.push({ at: new Date().toISOString(), reason });
    pending.push(...journal.tasks.filter(t => t.dependencies.includes(next)).map(t => t.id));
  }
  return journal;
}
const definitionKeys = ['id','owner','dependencies','files','ac','artifacts'];
export const sameDefinition = (task, definition) => definitionKeys.every(key => JSON.stringify(task[key]) === JSON.stringify(definition[key]));
export function syncDefinitions(journal, definitions) {
  assert(!journal.tasks.some(task => task.status === 'running'), 'Finish active tasks before contract synchronization');
  assert(journal.tasks.every(task => definitions.some(definition => definition.id === task.id)), 'Cannot silently remove journal tasks');
  const changed = [];
  for (const definition of definitions) {
    let task = journal.tasks.find(task => task.id === definition.id);
    if (!task) { task = {...definition,status:'pending',checks:[],invalidations:[]}; journal.tasks.push(task); changed.push(task.id); }
    else if (!sameDefinition(task, definition)) {
      for (const key of definitionKeys) delete task[key];
      Object.assign(task, definition); changed.push(task.id);
    }
  }
  for (const id of changed) invalidate(journal,id,'Task contract changed; retained earlier receipts');
  return changed;
}
const atomic = (path, value) => { mkdirSync(dirname(path), {recursive:true}); writeFileSync(path+'.tmp',json(value)); renameSync(path+'.tmp',path); };
async function main() {
  const [action, directory, id, arg] = process.argv.slice(2);
  assert(directory, 'Usage: run.mjs init|sync|register|start|implemented|check|verify|invalidate|block|status|next RUN [TASK/ROLE] [ARG]');
  const run = resolve(directory), file = resolve(run, 'loop.json');
  if (action === 'init') {
    assert(!existsSync(file), 'Journal already exists');
    atomic(file, {version:11,run,createdAt:new Date().toISOString(),source:digest(),agents:{},history:[],
      tasks:config.tasks.map(t => ({...t,status:'pending',checks:[],invalidations:[]}))}); return;
  }
  const journal = JSON.parse(readFileSync(file)); assert(journal.version === 11 && journal.run === run, 'Wrong journal');
  if (action === 'sync') {
    console.log(json({changed:syncDefinitions(journal,config.tasks)}));
  } else if (action === 'register') {
    assert(id && arg && arg.startsWith('/root'), 'Register actual host collaboration agent path');
    assert(!Object.entries(journal.agents).some(([role,agent]) => role !== id && agent === arg), 'Each role needs distinct agent');
    journal.agents[id] = arg;
  } else if (action === 'claim') {
    claimFiles(journal, config.tasks, id, JSON.parse(arg));
    atomic(fileURLToPath(new URL('./config.json', import.meta.url)), config);
  } else if (action === 'status' || action === 'next') {
    const ready = t => t.dependencies.every(dep => ['implemented','verified'].includes(journal.tasks.find(t => t.id === dep).status));
    console.log(json(journal.tasks.filter(t => action === 'status' || t.status === 'pending' && ready(t))
      .map(t => ({id:t.id,owner:t.owner,status:t.status,agent:t.agent,ready:ready(t)})))); return;
  } else {
    assert(config.tasks.every(definition => sameDefinition(journal.tasks.find(task => task.id === definition.id) ?? {},definition)), 'Task contract changed; run sync before proceeding');
    const task = journal.tasks.find(t => t.id === id); assert(task, 'Unknown task');
    if (action === 'start') {
      assert(['pending','implemented'].includes(task.status), 'Task already running/verified');
      assert(journal.agents[task.owner], 'Register assigned agent before dispatch');
      assert(task.dependencies.every(dep => ['implemented','verified'].includes(journal.tasks.find(t => t.id === dep).status)), 'Dependencies not implemented');
      assert(!journal.tasks.some(other => other.id !== id && other.status === 'running' && other.files.some(a => task.files.some(b => pathsOverlap(a,b)))), 'File ownership overlaps running task');
      task.status = 'running'; task.agent = journal.agents[task.owner]; task.startedAt = new Date().toISOString(); task.source = digest();
    } else if (action === 'implemented') {
      assert(task.status === 'running', 'Task not running'); task.status = 'implemented';
      task.handoff = arg ?? ''; task.implementedSource = digest();
    } else if (action === 'check') {
      assert(['running','implemented','verified'].includes(task.status), 'Start task first');
      assert(['ac','gates'].includes(arg), 'Only registered AC or canonical gates');
      const command = arg === 'gates' ? GATES : task.ac.replaceAll('{runDir}',quote(run));
      const before = digest(); const log = resolve(run,'evidence',`${id}-${arg}-${Date.now()}.log`);
      mkdirSync(dirname(log),{recursive:true});
      const result = spawnSync(command,{cwd:ROOT,shell:'/bin/zsh',encoding:'utf8',maxBuffer:32*1024*1024});
      writeFileSync(log,(result.stdout??'')+(result.stderr??''),{flag:'wx'});
      const artifacts = Object.fromEntries((arg === 'ac' ? task.artifacts??[] : []).map(path => {
        const full = path.replaceAll('{runDir}',run); return [full,existsSync(full)?sha(readFileSync(full)):null];
      }));
      const receipt = {id:arg,command,before,after:digest(),exitCode:result.status??1,log,logHash:sha(readFileSync(log)),artifacts,at:new Date().toISOString()};
      task.checks.push(receipt); task.status = 'implemented';
      process.exitCode = receipt.exitCode || Number(receipt.before !== receipt.after);
      console.log(json(receipt));
    } else if (action === 'verify') {
      const current = digest();
      const gates = journal.tasks.flatMap(t => t.checks.filter(c => c.id === 'gates')).sort((a,b) => a.at.localeCompare(b.at));
      assert(verified([...task.checks.filter(c => c.id !== 'gates'),...gates],current,(task.artifacts??[]).map(path => path.replaceAll('{runDir}',run))), 'Latest AC/gates must pass for current source');
      assert(task.dependencies.every(dep => journal.tasks.find(t => t.id === dep).status === 'verified' && journal.tasks.find(t => t.id === dep).verifiedSource === current), 'Verify dependencies first');
      task.status = 'verified'; task.verifiedSource = current;
    } else if (action === 'invalidate') invalidate(journal,id,arg??'source changed');
    else if (action === 'block') {
      const evidence = JSON.parse(readFileSync(arg));
      assert(evidence.environmental === true && new Set(evidence.attempts?.map(x=>JSON.stringify(x))).size >= 3, 'Need three distinct environmental recovery attempts');
      task.status = 'blocked'; task.blocker = evidence;
    } else throw Error('Unknown action');
  }
  journal.history.push({at:new Date().toISOString(),action,id,arg}); atomic(file,journal);
}
if(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error => { console.error(error.message); process.exitCode=1; });
