// Isolated production core execution; the parent exclusively validates and saves results.
import { parentPort } from 'node:worker_threads';
import { simulate } from './measure.mjs';
import * as core from '../../../dist/electron/core/index.js';

parentPort.on('message', ({ policy, seed, options }) => {
  try { parentPort.postMessage({ ok: true, run: simulate(core, policy, seed, options) }); }
  catch (error) { parentPort.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) }); }
});
