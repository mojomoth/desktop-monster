#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ROOT, sourceDigest, evaluationDigest } from './evidence.mjs';

const [output, minutes = '5', profile = 'active'] = process.argv.slice(2);
if (!output || !['0', '5', '15', '30'].includes(minutes) || !['active', 'idle', 'intermittent'].includes(profile)) {
  console.error('Usage: node .harness/v5/loop/e2e.mjs <output.json> [0|5|15|30 minutes] [active|idle|intermittent]\n0 = functional checks only; 5/15/30 = real elapsed time.');
  process.exit(1);
}
const file = resolve(output);
mkdirSync(dirname(file), { recursive: true });
const digest = sourceDigest();
const toolsDigest = evaluationDigest();
const run = (cmd, args, env, timeout) => new Promise((accept, reject) => {
  const child = spawn(cmd, args, { cwd: ROOT, env, stdio: 'inherit' });
  const timer = setTimeout(() => child.kill('SIGTERM'), timeout);
  child.on('error', (error) => { clearTimeout(timer); reject(error); });
  child.on('exit', (code, signal) => {
    clearTimeout(timer);
    code === 0 ? accept() : reject(new Error(`${cmd} exited ${code ?? signal}`));
  });
});
try {
  await run('npm', ['run', 'build'], process.env, 120_000);
  if (sourceDigest() !== digest) throw new Error('Source changed during build; rerun.');
  const env = { ...process.env, SMOKE: '1', DESMON_SERVER_URL: '', DESMON_E2E_DIGEST: digest, DESMON_E2E_TOOLS: toolsDigest };
  delete env.ELECTRON_RUN_AS_NODE;
  await run(process.execPath, [resolve(ROOT, 'node_modules/electron/cli.js'),
    resolve(ROOT, '.harness/v5/loop/electron-e2e.cjs'), file, minutes, profile], env,
  Number(minutes) * 60_000 + 120_000);
  if (sourceDigest() !== digest || evaluationDigest() !== toolsDigest) throw new Error('Source/tools changed during E2E; evidence is stale.');
} catch (error) {
  // Keep native failure evidence when it exists; a launcher failure remains visible separately.
  writeFileSync(`${file}.failure.txt`, `${error.stack ?? error}\n`);
  console.error(error.message);
  process.exitCode = 1;
}
