import process from 'node:process';
import console from 'node:console';
import { resolve, join } from 'node:path';
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [sourceArg, outputArg, appId, depotId] = process.argv.slice(2);
try {
  if(!sourceArg||!outputArg||![appId,depotId].every(s=>/^[1-9]\d*$/.test(s??'')))throw Error('Usage: steam-stage.mjs WIN_UNPACKED OUTPUT APP_ID DEPOT_ID');
  const source=resolve(sourceArg), output=resolve(outputArg), files={};
  if(existsSync(output))throw Error('Output exists; keep previous artifacts');
  const scan=dir=>{for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())scan(p);else if(e.isFile()){
    if(e.name==='steam_appid.txt')throw Error('Development steam_appid.txt must not ship');
    files[p.slice(source.length+1)]=createHash('sha256').update(readFileSync(p)).digest('hex');
  }}};
  scan(source);
  for(const suffix of ['DesMon.exe','steam_api64.dll','steamworksjs.win32-x64-msvc.node'])if(!Object.keys(files).some(p=>p.endsWith(suffix)))throw Error(`Missing native runtime: ${suffix}`);
  if(/['"\r\n]/.test(source))throw Error('Content path cannot be represented in VDF');
  mkdirSync(output,{recursive:true});
  writeFileSync(join(output,'depot.vdf'),`"DepotBuildConfig"\n{\n "DepotID" "${depotId}"\n "ContentRoot" "${source.replaceAll('\\','/')}"\n "FileMapping" { "LocalPath" "*" "DepotPath" "." "recursive" "1" }\n}\n`);
  writeFileSync(join(output,'app.vdf'),`"AppBuild"\n{\n "AppID" "${appId}"\n "Desc" "DesMon 0.9 private test"\n "Preview" "1"\n "Depots" { "${depotId}" "depot.vdf" }\n}\n`);
  writeFileSync(join(output,'manifest.json'),JSON.stringify({version:1,appId,depotId,files},null,2)+'\n');
  console.log('SteamPipe dry-run configuration prepared. No upload performed.');
}catch(e){console.error(e.message);process.exitCode=1;}
