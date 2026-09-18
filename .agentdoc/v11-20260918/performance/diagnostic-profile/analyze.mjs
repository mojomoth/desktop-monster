// Generated read-only reduction; raw files stay authoritative.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const dir=dirname(fileURLToPath(import.meta.url));
const read=name=>JSON.parse(readFileSync(join(dir,name),'utf8'));
const percentile=(values,q)=>[...values].sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*q)-1)];
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
const report=read('report.json'),result={diagnosticOnly:true,completedPair:report.completedPair,replacesRegisteredPerformance:false,method:report.method,runs:[]};
for(const row of report.runs){
  const out={kind:row.kind,errors:row.errors,runtimePassed:row.runtime?.passed,appHash:row.appHash,fixedScene:row.fixedScene};result.runs.push(out);
  if(!row.frames)continue;
  const dt=row.frames.times.slice(1).map((v,i)=>v-row.frames.times[i]),elapsed=row.frames.end-row.frames.start;
  out.raf={count:row.frames.times.length,elapsedMs:elapsed,hz:row.frames.times.length/elapsed*1000,p50Ms:percentile(dt,.5),p95Ms:percentile(dt,.95),maxMs:Math.max(...dt)};
  const metrics=row.metrics.slice(1),families=[...new Set(row.metrics.flatMap(m=>m.processes.map(p=>p.type)))];
  out.cpu={totalSamples:metrics.length,meanPercent:avg(metrics.map(m=>m.processes.reduce((s,p)=>s+p.cpu.percentCPUUsage,0))),p95Percent:percentile(metrics.map(m=>m.processes.reduce((s,p)=>s+p.cpu.percentCPUUsage,0)),.95),byType:{}};
  for(const type of families){
    const first=row.metrics[0].processes.filter(p=>p.type===type),last=row.metrics.at(-1).processes.filter(p=>p.type===type);
    out.cpu.byType[type]={meanPercent:avg(metrics.map(m=>m.processes.filter(p=>p.type===type).reduce((s,p)=>s+p.cpu.percentCPUUsage,0))),cumulativeCpuSecondsDelta:last.reduce((s,p)=>s+p.cpu.cumulativeCPUUsage,0)-first.reduce((s,p)=>s+p.cpu.cumulativeCPUUsage,0),pidsBefore:first.map(p=>p.pid),pidsAfter:last.map(p=>p.pid)};
  }
  const profile=read(row.kind+'/renderer.cpuprofile'),nodes=new Map(profile.nodes.map(n=>[n.id,n])),self=new Map();
  for(let i=0;i<profile.samples.length;i++){const n=nodes.get(profile.samples[i]),f=n.callFrame,key=[f.functionName||'(anonymous)',f.url,f.lineNumber+1].join(' | ');self.set(key,(self.get(key)||0)+(profile.timeDeltas[i]||0));}
  out.cpuProfile={durationMs:(profile.endTime-profile.startTime)/1000,samples:profile.samples.length,topSelfMs:[...self].map(([functionAndLocation,us])=>({functionAndLocation,ms:us/1000})).sort((a,b)=>b.ms-a.ms).slice(0,45)};
  const trace=read(row.kind+'/trace.json'),events=trace.traceEvents??trace,names=new Map(),threads={},processes={};
  for(const e of events){if(e.ph==='M'&&e.name==='thread_name')threads[e.pid+':'+e.tid]=e.args.name;if(e.ph==='M'&&e.name==='process_name')processes[e.pid]=e.args.name;}
  for(const e of events){if(e.ph!=='X')continue;const key=[processes[e.pid]??e.pid,threads[e.pid+':'+e.tid]??e.tid,e.name].join(' | '),v=names.get(key)??{name:key,count:0,durationUs:0,maxUs:0};v.count++;v.durationUs+=e.dur??0;v.maxUs=Math.max(v.maxUs,e.dur??0);names.set(key,v);}
  out.trace={events:events.length,bufferUsage:row.bufferUsage,processes,threads,topDurations:[...names.values()].sort((a,b)=>b.durationUs-a.durationUs).slice(0,45),paintEvents:[...names.values()].filter(v=>/Paint|Raster|Composite|DrawFrame|BeginFrame|UpdateLayer/.test(v.name))};
  out.scene={beforeIndex:row.before.save.monsterIndex,afterIndex:row.after.save.monsterIndex,beforeKills:row.before.save.killCount,afterKills:row.after.save.killCount,companions:row.after.save.companions,loadout:row.after.save.equipment.loadout,beforeHp:row.before.save.monsterHp,afterHp:row.after.save.monsterHp};
}
writeFileSync(join(dir,'analysis.json'),JSON.stringify(result,null,2)+'\n');
const files=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(p,e.name)):[join(p,e.name)]);
writeFileSync(join(dir,'artifact-hashes.json'),JSON.stringify(Object.fromEntries(files(dir).filter(p=>!p.endsWith('/artifact-hashes.json')).map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),null,2)+'\n');
console.log(JSON.stringify(result.runs.map(r=>({kind:r.kind,raf:r.raf,cpu:r.cpu,profile:r.cpuProfile?.topSelfMs.slice(0,12),trace:r.trace?.paintEvents})),null,2));
