import process from 'node:process';
import console from 'node:console';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [command, supplied] = process.argv.slice(2);
const run = (bin,args,env={}) => { const r=spawnSync(bin,args,{stdio:'inherit',env:{...process.env,...env}});if(r.error)throw r.error;if(r.status!==0)throw Error(`${bin} exited ${r.status}`); };
try {
  if(command==='package') {
    run(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.main.json']);
    run(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.renderer.json']);
    run(process.execPath,['node_modules/electron-builder/cli.js','--win','--x64'],{CSC_IDENTITY_AUTO_DISCOVERY:'false'});
  } else if(command==='smoke') {
    if(process.platform!=='win32')throw Error('Windows runtime verification requires Windows');
    const executable=resolve(supplied??'release/win-unpacked/DesMon.exe');
    const r=spawnSync(executable,[],{encoding:'utf8',timeout:30000,env:{...process.env,SMOKE:'1',DESMON_SERVER_URL:'',DESMON_STEAM_APP_ID:''}});
    console.log(r.stdout??'');if(r.error||r.status!==0||!r.stdout?.includes('SMOKE_OK'))throw Error('Packaged Windows smoke failed');
  } else if(command==='manifest') {
    const root=resolve('release'), files={};
    for(const name of readdirSync(root))if(name.endsWith('.exe'))files[name]=createHash('sha256').update(readFileSync(join(root,name))).digest('hex');
    const app=join(root,'win-unpacked','DesMon.exe');if(!existsSync(app)||!Object.keys(files).length)throw Error('Windows installer/unpacked output missing');
    files['win-unpacked/DesMon.exe']=createHash('sha256').update(readFileSync(app)).digest('hex');
    writeFileSync(join(root,'windows-manifest.json'),JSON.stringify({version:1,platform:'win32',arch:'x64',files},null,2)+'\n');
  } else throw Error('Usage: windows.mjs package|smoke|manifest [EXE]');
} catch(e){console.error(e.message);process.exitCode=1;}
