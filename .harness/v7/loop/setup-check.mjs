#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, sourceDigest, sha256 } from './evidence.mjs';
import { CONFIG } from './config.mjs';

export function verifyPreservation(directory, root = ROOT) {
  const start = JSON.parse(readFileSync(resolve(directory, 'baseline/metadata.json'), 'utf8'));
  const files = JSON.parse(readFileSync(resolve(directory, 'baseline/files.json'), 'utf8'));
  if (start.sourceDigest !== sourceDigest(root)) throw Error('Product source changed during harness setup');
  for (const [path, hash] of Object.entries(files)) {
    if (sha256(readFileSync(resolve(root, path))) !== hash) throw Error(`Preserved file changed: ${path}`);
  }
  const appVersion = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
  const pointer = readFileSync(resolve(root, '.harness/CURRENT'), 'utf8').trim();
  if (appVersion !== start.appVersion || appVersion !== CONFIG.baselineAppVersion || pointer !== 'v3' || pointer !== start.harnessPointer) throw Error('App version or existing harness pointer changed');
  return { status: 'preserved', appVersion, harnessPointer: pointer, sourceDigest: start.sourceDigest, files: Object.keys(files).length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (!process.argv[2]) throw Error('Usage: setup-check.mjs <setup-run-dir>');
    console.log(JSON.stringify(verifyPreservation(resolve(process.argv[2])), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
