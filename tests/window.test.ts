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

  it('gives SMOKE runs a throwaway userData dir before the single-instance lock', () => {
    // Assumption 40 / F43: the lock file lives in userData — taking it with the
    // shared default would make a parallel smoke run quit silently, no SMOKE_OK.
    const smokeDir = indexTs.indexOf('desmon-smoke-');
    const lock = indexTs.indexOf('requestSingleInstanceLock()');
    expect(smokeDir).toBeGreaterThan(-1);
    expect(lock).toBeGreaterThan(smokeDir);
  });

  it('hides the dock before creating the overlay window', () => {
    const dockHide = indexTs.indexOf('app.dock?.hide()');
    const createWindow = indexTs.indexOf('createOverlayWindow()');
    expect(dockHide).toBeGreaterThan(-1);
    expect(createWindow).toBeGreaterThan(dockHide);
  });
});

describe('drag region (F15, static/style.css)', () => {
  it('keeps the 24-px top strip as the only NATIVE drag region', () => {
    // Whole-window drag is the custom threshold drag (tests/drag.test.ts) —
    // a full-window -webkit-app-region would swallow the fallback clicks.
    expect(styleCss).toMatch(/\.drag-handle\s*{[^}]*-webkit-app-region: drag;/);
    expect(styleCss).toMatch(/\.drag-handle\s*{[^}]*height: 24px;/);
  });

  it('keeps the page no-drag elsewhere so fallback clicks reach it', () => {
    expect(styleCss).toMatch(/body\s*{[^}]*-webkit-app-region: no-drag;/);
  });
});

describe('default position (Assumption 10, src/main/window.ts)', () => {
  it('computes the bottom-right of the work area inset by the margin', () => {
    expect(windowTs).toContain('EDGE_MARGIN = 16');
    expect(windowTs).toContain('workArea.x + workArea.width - WINDOW_W - EDGE_MARGIN');
    expect(windowTs).toContain('workArea.y + workArea.height - WINDOW_H - EDGE_MARGIN');
  });

  it('applies it from the primary display work area (Dock/taskbar excluded)', () => {
    expect(windowTs).toContain('screen.getPrimaryDisplay().workArea');
    expect(windowTs).toContain('win.setPosition(spot.x, spot.y)');
  });

  it('the overlay window is 480 by 300 and still sits above the dock margin', () => {
    // v3 (F64): the field doubled to a 240×150 canvas at 2× CSS.
    expect(windowTs).toContain('WINDOW_W = 480');
    expect(windowTs).toContain('WINDOW_H = 300');
    expect(styleCss).toMatch(/canvas\s*{[^}]*width: 480px;/);
    expect(styleCss).toMatch(/canvas\s*{[^}]*height: 300px;/);
    expect(styleCss).toMatch(/canvas\s*{[^}]*image-rendering: pixelated;/);
    expect(read('static/index.html')).toContain('width="240" height="150"');
  });

  it('pure-math default: 1920×1080 with a 40px taskbar lands clear of it', () => {
    // Mirror of defaultPosition() — window.ts value-imports electron and
    // cannot load under vitest, so the formula is pinned here numerically.
    const workArea = { x: 0, y: 0, width: 1920, height: 1040 };
    const x = workArea.x + workArea.width - 480 - 16;
    const y = workArea.y + workArea.height - 300 - 16;
    expect(x).toBe(1424);
    expect(y).toBe(724);
    expect(y + 300).toBeLessThanOrEqual(workArea.height); // never over the bar
  });
});
