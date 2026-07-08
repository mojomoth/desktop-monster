// T19 — unsigned macOS packaging + README (SPEC F25/F26/F27).
// `npm run package` itself is too heavy for unit tests (electron-builder,
// dmg creation); F25's artifact existence is proven by the task AC run.
// These tests pin the two halves the gates CAN prove deterministically:
// the electron-builder safety config (F26) and the README operator docs
// (F27) — so a later edit that breaks either fails `npm test`, not just
// the one-off packaging run.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string): string => readFileSync(join(process.cwd(), rel), 'utf8');

interface BuildConfig {
  appId: string;
  productName: string;
  npmRebuild: boolean;
  directories: { output: string };
  files: string[];
  asarUnpack: string[];
  mac: {
    target: { target: string; arch: string[] }[];
    identity: null;
    hardenedRuntime: boolean;
    notarize: boolean;
    category: string;
  };
  win: { target: { target: string; arch: string[] }[] };
  nsis: Record<string, unknown>;
}

const pkg = JSON.parse(read('package.json')) as {
  version: string;
  scripts: Record<string, string>;
  build: BuildConfig;
};
const readme = read('README.md');

describe('packaging config safety (F26, package.json build)', () => {
  it('never signs: identity null, hardenedRuntime and notarize false, auto-discovery off', () => {
    expect(pkg.build.mac.identity).toBeNull();
    expect(pkg.build.mac.hardenedRuntime).toBe(false);
    expect(pkg.build.mac.notarize).toBe(false);
    expect(pkg.scripts['package']).toContain('CSC_IDENTITY_AUTO_DISCOVERY=false');
  });

  it('never rebuilds native modules and unpacks .node prebuilds from asar', () => {
    expect(pkg.build.npmRebuild).toBe(false);
    expect(pkg.build.asarUnpack).toContain('**/*.node');
  });

  it('packages the built app and static shell into release/', () => {
    expect(pkg.build.directories.output).toBe('release');
    expect(pkg.build.files).toContain('dist/**/*');
    expect(pkg.build.files).toContain('static/**/*');
  });

  it('mac target is a dmg for arm64 only and the package script builds mac only', () => {
    expect(pkg.build.mac.target).toEqual([{ target: 'dmg', arch: ['arm64'] }]);
    expect(pkg.scripts['package']).toContain('electron-builder --mac');
    expect(pkg.scripts['package']).not.toContain('--win');
  });

  it('windows nsis target is present as config only', () => {
    expect(pkg.build.win.target).toEqual([{ target: 'nsis', arch: ['x64'] }]);
    expect(pkg.build.nsis).toBeTruthy();
  });
});

describe('README operator docs (F27)', () => {
  it('documents how to run from source', () => {
    expect(readme).toContain('npm ci');
    expect(readme).toContain('npm start');
    expect(readme).toContain('npm run package');
  });

  it('documents the Accessibility grant for BOTH the dev and packaged identities', () => {
    expect(readme.toLowerCase()).toContain('accessibility');
    expect(readme).toContain('node_modules/electron/dist/Electron.app');
    expect(readme).toContain('"Electron"');
    expect(readme).toContain('"DesMon"');
  });

  it('documents the Gatekeeper "Open Anyway" flow for the unsigned app', () => {
    expect(readme).toContain('Open Anyway');
    expect(readme.toLowerCase()).toContain('unsigned');
  });

  it('documents the save-file location and Reset Progress', () => {
    expect(readme).toContain('~/Library/Application Support/DesMon/save.json');
    expect(readme).toContain('Reset Progress');
  });

  it('documents that the Windows target is config-only', () => {
    expect(readme.toLowerCase()).toContain('config only');
  });

  it('names the exact packaged artifacts the AC checks for (kept in sync with version)', () => {
    expect(readme).toContain(`release/DesMon-${pkg.version}-arm64.dmg`);
    expect(readme).toContain('release/mac-arm64/DesMon.app');
  });
});
