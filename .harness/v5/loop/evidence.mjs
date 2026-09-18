import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const sha256 = (data) => createHash('sha256').update(data).digest('hex');

/** Bind evidence to dirty working files too, not merely the last git commit. */
export function sourceDigest(root = ROOT) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(path);
    }
  };
  for (const dir of ['src', 'static']) walk(resolve(root, dir));
  for (const name of readdirSync(root)) {
    if (/^(package(-lock)?|tsconfig[^/]*)\.json$/.test(name)) files.push(resolve(root, name));
  }
  return sha256(files.sort().map((path) => `${relative(root, path)}\0${sha256(readFileSync(path))}`).join('\n'));
}

/** Runner, protocol and harness tests are versioned separately from game source. */
export function evaluationDigest(root = ROOT) {
  const dir = resolve(root, '.harness/v5/loop');
  const paths = readdirSync(dir).filter(n => /\.(mjs|cjs|ts)$/.test(n)).map(n => resolve(dir, n));
  paths.push(resolve(root, '.harness/v5/vitest.config.mts'), resolve(root, 'docs/v0.6/EVALUATION_PROTOCOL.json'));
  return sha256(paths.sort().map(path => `${relative(root, path)}\0${sha256(readFileSync(path))}`).join('\n'));
}
