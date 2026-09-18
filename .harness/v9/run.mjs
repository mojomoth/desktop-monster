import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, renameSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const GATES = 'npm test && npm run lint && npm run typecheck';
const sha = x => createHash('sha256').update(x).digest('hex');
const config = JSON.parse(readFileSync(new URL('./config.json', import.meta.url)));
export function digest(root = ROOT, paths = ['src','static','tests','.harness/v9','scripts','.github']) {
  const files = {};
  const visit = p => { if (!existsSync(p)) return; if(statSync(p).isFile()){files[relative(root,p)]=sha(readFileSync(p));return;} for (const e of readdirSync(p,{withFileTypes:true})) {
    const path=join(p,e.name); if(e.isDirectory())visit(path); else if(e.isFile())files[relative(root,path)]=sha(readFileSync(path));
  }};
  for(const dir of paths)visit(join(root,dir));
  for(const name of readdirSync(root))if(/^(package(-lock)?|tsconfig[^/]*)\.json$/.test(name)||/^(eslint|vitest)\.config\./.test(name))files[name]=sha(readFileSync(join(root,name)));
  return sha(JSON.stringify(Object.entries(files).sort(([a],[b])=>a.localeCompare(b))));
}
export function verified(checks, current, gateSource = current) {
  return ['ac','gates'].every(id=>checks.some(c=>c.id===id && c.exitCode===0 && c.before===(id==='gates'?gateSource:current) && c.after===c.before && existsSync(c.log) && sha(readFileSync(c.log))===c.logHash));
}
function impact(id, seen=new Set()) {
  if(seen.has(id))return [];seen.add(id);
  const task=config.tasks.find(t=>t.id===id);if(!task)throw Error('Unknown dependency');
  return [...task.files,'tests','.harness/v9',...task.dependencies.flatMap(dep=>impact(dep,seen))];
}
function main() {
  const [action, directory, id, check]=process.argv.slice(2);
  if(!directory)throw Error('Usage: run.mjs init|status|check|verify RUN [TASK] [ac|gates]');
  const dir=resolve(directory), path=join(dir,'v9-journal.json');
  const write=value=>{writeFileSync(path+'.tmp',JSON.stringify(value,null,2)+'\n');renameSync(path+'.tmp',path);};
  if(action==='init'){
    if(existsSync(path))throw Error('Journal already exists'); mkdirSync(dir,{recursive:true});
    write({version:9,createdAt:new Date().toISOString(),tasks:config.tasks.map(t=>({...t,status:'pending',checks:[]}))});return;
  }
  const journal=JSON.parse(readFileSync(path));
  if(action==='status'){console.log(JSON.stringify(journal,null,2));return;}
  const task=journal.tasks.find(t=>t.id===id); if(!task)throw Error('Unknown task');
  if(action==='check'){
    if(!['ac','gates'].includes(check))throw Error('Only registered checks may run');
    const command=check==='gates'?GATES:config.tasks.find(t=>t.id===id).ac;
    const source=()=>check==='gates'?digest():digest(ROOT,impact(id));
    const before=source(), log=join(dir,`${id}-${check}-${Date.now()}.log`);
    const startedAt=new Date().toISOString();
    const result=spawnSync(command,{cwd:ROOT,shell:true,encoding:'utf8',maxBuffer:16*1024*1024});
    writeFileSync(log,(result.stdout??'')+(result.stderr??''),{flag:'wx'});
    const attempt={id:check,command,startedAt,endedAt:new Date().toISOString(),before,after:source(),exitCode:result.status??1,log,logHash:sha(readFileSync(log))};
    task.checks.push(attempt);task.status='running';write(journal);console.log(JSON.stringify(attempt));process.exitCode=attempt.exitCode || Number(before!==attempt.after);return;
  }
  if(action==='verify'){
    const gates=journal.tasks.flatMap(t=>t.checks.filter(c=>c.id==='gates'));
    if(!verified([...task.checks,...gates],digest(ROOT,impact(id)),digest()))throw Error('Current AC and gates evidence required');
    for(const dep of task.dependencies){const parent=journal.tasks.find(t=>t.id===dep);if(parent?.status!=='verified'||!verified([...parent.checks,...gates],digest(ROOT,impact(dep)),digest()))throw Error('Current dependency verification required: '+dep);}
    task.status='verified';task.verifiedAt=new Date().toISOString();write(journal);return;
  }
  throw Error('Unknown action');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
