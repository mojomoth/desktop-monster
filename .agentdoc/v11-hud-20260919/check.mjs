import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchRuntime } from '../../.harness/v10/launcher.mjs';
import { fixture } from '../../.harness/v11/runtime.mjs';
import { hudCases } from '../../.harness/v11/ui-cases.mjs';
import { digest, sha } from '../../.harness/v11/run.mjs';

const require = createRequire(import.meta.url);
const core = require('../../dist/electron/core/index.js');
const gear = require('../../dist/electron/core/equipment.js');
const output = resolve('.agentdoc/v11-hud-20260919');
const appPath = resolve('release/hud-20260919/mac-arm64/DesMon.app');
const result = { source: digest(), appPath, asarSha256: sha(readFileSync(appPath + '/Contents/Resources/app.asar')), passed: false };
let runtime;
try {
  runtime = await launchRuntime({ appPath, outputDir: output + '/native', save: fixture(core, gear, 'hud').save,
    settings: { gameScale: 1, muted: true, screenShake: false, welcomeSeen: true, globalInputRequested: false },
    identity: { name: 'FixtureMe', playerId: 'fixture-me', token: 'fixture-me-token', notifiedTheftIds: [] } });
  result.ui = await hudCases(runtime, core.FEVER_INPUTS);
} catch (error) {
  result.error = String(error);
  result.ui = error.ui ?? result.ui;
} finally {
  if (runtime) result.runtime = await runtime.close();
  result.passed = result.ui?.passed === true && result.runtime?.passed === true && result.source === digest();
  writeFileSync(output + '/result.json', JSON.stringify(result, null, 2) + '\n');
}
assert(result.passed, result.error ?? 'HUD verification failed');
console.log(JSON.stringify({ passed: result.passed, checks: result.ui.checks.length, screenshots: result.ui.screenshots.length }));
