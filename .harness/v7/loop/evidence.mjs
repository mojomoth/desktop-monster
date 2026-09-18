import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
export { ROOT } from './config.mjs';
import { ROOT } from './config.mjs';

export const sha256 = data => createHash('sha256').update(data).digest('hex');
export function manifest(paths, root = ROOT) {
  const files = {};
  const walk = path => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = resolve(path, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files[relative(root, full)] = sha256(readFileSync(full));
    }
  };
  for (const path of paths) walk(resolve(root, path));
  return files;
}
export const digestManifest = files => sha256(Object.entries(files).sort(([a],[b]) => a.localeCompare(b)).map(([path,hash]) => `${path}\0${hash}`).join('\n'));
export function sourceDigest(root = ROOT) {
  const files = manifest(['src','static'], root);
  for (const name of readdirSync(root)) if (/^(package(-lock)?|tsconfig[^/]*)\.json$/.test(name)) files[name] = sha256(readFileSync(resolve(root, name)));
  // Preserve the v5 algorithm so the setup start/end snapshots remain comparable.
  return sha256(Object.keys(files).sort().map(path => `${path}\0${files[path]}`).join('\n'));
}
export function evaluationDigest(root = ROOT) {
  const files = manifest(['.harness/v7'], root);
  files['docs/v0.7/EVALUATION_PROTOCOL.json'] = sha256(readFileSync(resolve(root, 'docs/v0.7/EVALUATION_PROTOCOL.json')));
  return digestManifest(files);
}
export function buildDigest(root = ROOT) {
  if (!existsSync(resolve(root, 'dist/electron/core'))) throw Error('Build is missing');
  return digestManifest(manifest(['dist/electron/core'], root));
}
