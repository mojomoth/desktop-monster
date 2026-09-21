import { observe } from '../v10/performance-v4.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const [kind,app,dir]=process.argv.slice(2);
if(!['baseline','candidate'].includes(kind)||!app||!dir)throw Error('Usage: run-performance.mjs baseline|candidate APP OUTPUT_DIRECTORY');
const root=resolve(dir);mkdirSync(root,{recursive:true});
const file=join(root,kind+'-queue.json');if(existsSync(file))throw Error('Existing queue; retain it and select a new attempt directory');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const q={kind,app:resolve(app),appHash:sha(join(app,'Contents/Resources/app.asar')),protocolHash:sha('docs/v0.12/PERFORMANCE_PROTOCOL.json'),observerHash:sha('.harness/v10/performance-v4.mjs'),pid:process.pid,startedAt:new Date().toISOString(),slots:[]};
const save=()=>writeFileSync(file,JSON.stringify(q,null,2)+'\n');save();
try{for(const profile of ['active','idle']){const path=join(root,kind+'-'+profile+'.json');const slot={profile,path,status:'running'};q.slots.push(slot);save();await observe(app,path,profile,30);slot.status='passed';save();}q.passed=true;}catch(e){q.error=String(e);q.passed=false;process.exitCode=1;}finally{q.endedAt=new Date().toISOString();save();}
