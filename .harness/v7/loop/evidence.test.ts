import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { evaluationDigest, sourceDigest, sha256 } from './evidence.mjs';
import { verifyPreservation } from './setup-check.mjs';

const directories: string[] = [];
const put = (root: string, path: string, text: string) => {
  const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text);
};
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'desmon-v7-evidence-')); directories.push(root);
  for (const [path, text] of Object.entries({ 'src/game.ts': 'source', 'static/index.html': 'page',
    'package.json': '{"version":"0.6.0"}', '.harness/CURRENT': 'v3\n',
    '.harness/v7/config.json': '{}', '.harness/v7/agents/critic.md': 'independent',
    '.harness/v7/loop/run.mjs': 'runner', 'docs/v0.7/EVALUATION_PROTOCOL.json': '{}',
    'docs/v0.7/HANDOFF.md': 'pending' })) put(root, path, text);
  return root;
}
afterEach(() => { for (const root of directories.splice(0)) rmSync(root, { recursive: true, force: true }); });
describe('separate product and evaluation fingerprints', () => {
  it('binds role contracts and protocol but avoids report self-invalidation', () => {
    const root = fixture(), source = sourceDigest(root), evaluation = evaluationDigest(root);
    put(root, 'docs/v0.7/HANDOFF.md', 'finished');
    expect(sourceDigest(root)).toBe(source); expect(evaluationDigest(root)).toBe(evaluation);
    put(root, '.harness/v7/agents/critic.md', 'changed contract');
    expect(sourceDigest(root)).toBe(source); expect(evaluationDigest(root)).not.toBe(evaluation);
    const next = evaluationDigest(root);
    put(root, 'docs/v0.7/EVALUATION_PROTOCOL.json', '{"candidate":1}');
    expect(evaluationDigest(root)).not.toBe(next);
  });
  it('detects newly introduced product files as source changes', () => {
    const root = fixture(), before = sourceDigest(root);
    put(root, 'src/added.ts', 'unexpected setup mutation');
    expect(sourceDigest(root)).not.toBe(before);
  });
  it('checks original files and version even when product source is unchanged', () => {
    const root = fixture(), run = join(root, 'session');
    put(run, 'baseline/metadata.json', JSON.stringify({sourceDigest:sourceDigest(root),appVersion:'0.6.0',harnessPointer:'v3'}));
    put(run, 'baseline/files.json', JSON.stringify({'.harness/CURRENT':sha256('v3\n')}));
    expect(verifyPreservation(run, root).status).toBe('preserved');
    put(root, '.harness/CURRENT', 'v7\n');
    expect(() => verifyPreservation(run, root)).toThrow(/Preserved file/);
  });
});
