#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, sourceDigest, evaluationDigest } from './evidence.mjs';
import { CONFIG } from './config.mjs';

export const MENU_VISIT_MS = CONFIG.native.longJourney.menuVisitSeconds * 1000;
export const REQUIRED_NATIVE_CHECKS = [
  'native-overlay', 'preload-isolation', 'painted-canvas', 'save-reload', 'menu-singleton',
  'menu-codex', 'menu-battle', 'hero-choice-reset-preserve',
  'v07-codex-strict-legacy', 'v07-codex-legacy-ack-normalization', 'v07-codex-unacquired-goal',
  'v07-codex-offer-stays-silhouette', 'v07-codex-selection-reveals-one', 'v07-codex-acquired-ack-only',
  'v07-codex-restart-preservation', 'v07-codex-first-kill-reveals', 'v07-codex-owned-without-kill-masked',
  'v07-level-over-10-save-reload', 'v07-level-over-10-network-roundtrip',
  'v07-pvp-party-in-every-row', 'v07-pvp-selected-id',
  'v07-pvp-keyboard-navigation', 'v07-pvp-focus-retained', 'v07-pvp-removed-row-focus-fallback',
  'v07-pvp-preview-id-roundtrip', 'v07-companion-reincarnation-confirm',
  'v07-companion-reincarnation-cancel', 'v07-companion-reincarnation-target-change-invalidates',
  'v07-rare-third-choice-ui',
];
export function parseRunArguments(args) {
  const [output, minutes = '5', profile = 'active', ...extra] = args;
  if (!output || extra.length || !CONFIG.native.durationsMinutes.map(String).includes(minutes) ||
    !CONFIG.native.profiles.includes(profile) || (Number(minutes) === CONFIG.native.longJourney.minutes && profile !== CONFIG.native.longJourney.profile)) {
    throw new Error('Usage: node .harness/v7/loop/e2e.mjs <output.json> [0|5|15|30|180 minutes] [active|idle|intermittent]\n0 = diagnostics; 5/15/30 = observation; 180 active = continuous play with menu visits every 10 minutes.');
  }
  return { output, minutes, profile };
}
export const menuVisitSchedule = minutes => minutes === CONFIG.native.longJourney.minutes
  ? Array.from({ length: minutes * 60_000 / MENU_VISIT_MS }, (_, index) => (index + 1) * MENU_VISIT_MS) : [];

/** Sample before consuming a ready offer; later reincarnations cannot replace the first observation. */
export function recordFirstReadiness(observation, ready, elapsedMs) {
  if (ready && observation.firstReadyElapsedMs === null) observation.firstReadyElapsedMs = elapsedMs;
}

/** A crash leaves the last whole checkpoint, never a truncated original JSON. */
export function writeRunCheckpoint(file, report) {
  const temporary = `${file}.checkpoint.tmp`;
  writeFileSync(temporary, `${JSON.stringify(report, null, 2)}\n`);
  renameSync(temporary, file);
}

async function main() {
const { output, minutes, profile } = parseRunArguments(process.argv.slice(2));
const file = resolve(output);
if (existsSync(file)) throw new Error('Output already exists; preserve the original and choose a new path.');
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
    resolve(ROOT, '.harness/v7/loop/electron-e2e.cjs'), file, minutes, profile], env,
  Number(minutes) * 60_000 + 120_000);
  if (sourceDigest() !== digest || evaluationDigest() !== toolsDigest) throw new Error('Source/tools changed during E2E; evidence is stale.');
} catch (error) {
  // Keep native failure evidence when it exists; a launcher failure remains visible separately.
  writeFileSync(`${file}.failure.txt`, `${error.stack ?? error}\n`);
  console.error(error.message);
  process.exitCode = 1;
}
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
