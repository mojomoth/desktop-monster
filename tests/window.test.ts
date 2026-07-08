// T02 — overlay window + accessory lifecycle (SPEC F15/F16).
// Main-process modules cannot be imported under vitest (the `electron` package
// resolves to a binary path outside Electron), so these are source-contract
// tests: they pin the literal option spellings the feature ACs grep for AND
// the call-order constraints the greps cannot see. Runtime behaviour is
// covered by `npm run smoke` (headful) and Manual M1.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string): string => readFileSync(join(process.cwd(), rel), 'utf8');

const windowTs = read('src/main/window.ts');
const indexTs = read('src/main/index.ts');
const styleCss = read('static/style.css');

describe('overlay window options (F15, src/main/window.ts)', () => {
  it.each([
    'transparent: true',
    'frame: false',
    'hasShadow: false',
    'resizable: false',
    'roundedCorners: false',
    'skipTaskbar: true',
    'acceptFirstMouse: true',
    'show: false',
    'contextIsolation: true',
    'nodeIntegration: false',
    'sandbox: true',
    'backgroundThrottling: false',
    "setAlwaysOnTop(true, 'screen-saver')",
    'visibleOnFullScreen: true',
    'skipTransformProcessType: true',
    "once('ready-to-show'",
  ])('declares %s', (literal) => {
    expect(windowTs).toContain(literal);
  });

  it('sets always-on-top level before joining all workspaces', () => {
    // `win.`-prefixed so comments mentioning the methods do not match.
    const onTop = windowTs.indexOf('win.setAlwaysOnTop');
    const allWorkspaces = windowTs.indexOf('win.setVisibleOnAllWorkspaces');
    expect(onTop).toBeGreaterThan(-1);
    expect(allWorkspaces).toBeGreaterThan(onTop);
  });
});

describe('accessory lifecycle (F16, src/main/index.ts)', () => {
  it("names the app 'DesMon'", () => {
    expect(indexTs).toContain("app.setName('DesMon')");
  });

  it('quits a second instance via the single-instance lock', () => {
    expect(indexTs).toContain('requestSingleInstanceLock');
  });

  it('hides the dock before creating the overlay window', () => {
    const dockHide = indexTs.indexOf('app.dock?.hide()');
    const createWindow = indexTs.indexOf('createOverlayWindow()');
    expect(dockHide).toBeGreaterThan(-1);
    expect(createWindow).toBeGreaterThan(dockHide);
  });
});

describe('drag region (F15, static/style.css)', () => {
  it('marks only the 24-px top strip as draggable', () => {
    expect(styleCss).toMatch(/\.drag-handle\s*{[^}]*-webkit-app-region: drag;/);
    expect(styleCss).toMatch(/\.drag-handle\s*{[^}]*height: 24px;/);
  });

  it('keeps the page no-drag elsewhere so fallback clicks reach it', () => {
    expect(styleCss).toMatch(/body\s*{[^}]*-webkit-app-region: no-drag;/);
  });
});
