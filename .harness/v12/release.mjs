#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { digest, ROOT, sha } from './run.mjs';
import { artifactHash, validateReleaseCommands } from './final-check.mjs';

const [directory, action] = process.argv.slice(2);
assert(directory && ['smoke', 'mac', 'windows', 'collect'].includes(action),
  'Usage: release.mjs RUN smoke|mac|windows|collect');
const run = resolve(directory), file = join(run, 'release.json');
mkdirSync(join(run, 'evidence'), { recursive: true });
const record = existsSync(file) ? JSON.parse(readFileSync(file)) : { version: '0.12.0', commands: [] };
assert.equal(record.version, '0.12.0');
if (action === 'collect') {
  record.source = digest();
  validateReleaseCommands(record, record.source);
  record.packages = Object.fromEntries(Object.entries({
    macApp: 'release/mac-arm64/DesMon.app',
    macDmg: 'release/DesMon-0.12.0-arm64.dmg',
    windowsInstaller: 'release/DesMon Setup 0.12.0.exe',
    windowsAppAsar: 'release/win-unpacked/resources/app.asar',
  }).map(([key, path]) => [key, { path: resolve(ROOT, path), sha256: artifactHash(resolve(ROOT, path)) }]));
} else {
  const script = { smoke: 'smoke', mac: 'package', windows: 'package:win' }[action];
  const command = 'npm run ' + script, before = digest();
  const log = join(run, 'evidence', 'release-' + action + '-' + Date.now() + '.log');
  let output = '';
  const child = spawn('npm', ['run', script], { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => {
    output += bytes.toString(); process.stdout.write(bytes);
  });
  const exitCode = await new Promise(resolveCode => {
    child.once('error', error => { output += String(error); resolveCode(1); });
    child.once('close', code => resolveCode(code ?? 1));
  });
  writeFileSync(log, output, { flag: 'wx' });
  const after = digest();
  record.commands.push({ command, before, after, exitCode, log, logHash: sha(readFileSync(log)), at: new Date().toISOString() });
  record.source = after;
  process.exitCode = exitCode || Number(before !== after);
}
writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ file, source: record.source, action, exitCode: process.exitCode ?? 0 }));
