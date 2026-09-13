import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BrowserWindow } from 'electron';
import { GAME_SCALES, readGameScale, writeGameScale } from '../src/main/settings.js';
import { applyOverlayScale } from '../src/main/window.js';

vi.mock('electron', () => ({
  BrowserWindow: class {},
  screen: { getDisplayMatching: () => ({ workArea: { x: -1920, y: 0, width: 1920, height: 1040 } }) },
}));

const dirs: string[] = [];
afterEach(() => { dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })); });
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'desmon-settings-'));
  dirs.push(dir);
  return dir;
}

describe('game size preferences', () => {
  it('persists every supported size without touching game progress', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'save.json'), 'progress');
    for (const scale of GAME_SCALES) {
      expect(writeGameScale(dir, scale)).toBe(true);
      expect(readGameScale(dir)).toBe(scale);
    }
    expect(readFileSync(join(dir, 'save.json'), 'utf8')).toBe('progress');
  });

  it('defaults safely for missing, corrupt and unsupported preferences', () => {
    const dir = tempDir();
    expect(readGameScale(dir)).toBe(1);
    for (const raw of ['{', 'null', '[]', '{}', '{"gameScale":"2"}', '{"gameScale":0}', '{"gameScale":100}']) {
      writeFileSync(join(dir, 'settings.json'), raw);
      expect(readGameScale(dir)).toBe(1);
    }
    expect(writeGameScale(dir, 1.5)).toBe(true);
    for (const scale of [0, -1, NaN, Infinity, 4]) expect(writeGameScale(dir, scale)).toBe(false);
    expect(readGameScale(dir)).toBe(1.5);
    expect(writeGameScale(join(dir, 'settings.json'), 2)).toBe(false);
  });

  it('resizes all five choices around the same corner on a secondary display', () => {
    let bounds = { x: -416, y: 764, width: 400, height: 260 };
    const win = {
      isDestroyed: () => false,
      getBounds: () => bounds,
      setBounds: (next: typeof bounds) => { bounds = next; },
    } as unknown as BrowserWindow;
    for (const [scale, width, height] of [[2, 800, 520], [1.5, 600, 390], [1, 400, 260], [2 / 3, 267, 173], [0.5, 200, 130]] as const) {
      expect(applyOverlayScale(win, scale)).toBe(true);
      expect(bounds).toEqual({ x: -16 - width, y: 1024 - height, width, height });
    }
    const before = { ...bounds };
    expect(applyOverlayScale(win, 0)).toBe(false);
    expect(bounds).toEqual(before);
  });

  it('keeps enlarged windows within the work area and ignores destroyed windows', () => {
    const setBounds = vi.fn();
    const win = { isDestroyed: () => false,
      getBounds: () => ({ x: -1920, y: 0, width: 400, height: 260 }), setBounds,
    } as unknown as BrowserWindow;
    expect(applyOverlayScale(win, 2)).toBe(true);
    expect(setBounds).toHaveBeenCalledWith({ x: -1920, y: 0, width: 800, height: 520 });
    expect(applyOverlayScale({ isDestroyed: () => true } as BrowserWindow, 1)).toBe(false);
  });
});
