// T17 — tray icon + menu (SPEC F23, Assumption 16).
//
// trayIcon.ts and tray.ts are electron-free with injected dependencies, so:
// - the PNG encoder is verified by DECODING its output: an independent
//   (table-free) CRC-32 implementation checks every chunk checksum, and
//   node:zlib inflateSync recovers the scanlines, which must reproduce the
//   pixel matrix exactly;
// - the menu template and the rebuild-on-mode-change behavior run against
//   fake Tray/Menu factories;
// - the live Electron wiring in src/main/index.ts is pinned as source text
//   (same approach as the window/smoke source-contract tests).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { InputModePayload } from '../src/shared/ipc.js';
import {
  buildTrayMenuTemplate,
  getActiveTray,
  INPUT_FALLBACK_LABEL,
  INPUT_GLOBAL_LABEL,
  QUIT_LABEL,
  RESET_LABEL,
  setupTray,
  TRAY_TITLE,
  TRAY_TOOLTIP,
} from '../src/main/tray.js';
import type { TrayLike, TrayMenuActions, TrayMenuItem } from '../src/main/tray.js';
import {
  crc32,
  encodeTrayIconPng,
  TRAY_ICON_PALETTE,
  TRAY_ICON_PIXELS,
  TRAY_ICON_SIZE,
} from '../src/main/trayIcon.js';

const GLOBAL_MODE: InputModePayload = { mode: 'global', accessibilityGranted: true };
const FALLBACK_MODE: InputModePayload = { mode: 'fallback', accessibilityGranted: false };

/** Independent CRC-32 (bitwise, no lookup table) to cross-check the encoder's. */
function referenceCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) {
      crc = (crc & 1) === 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ParsedChunk {
  type: string;
  data: Buffer;
  crc: number;
  crcInput: Buffer;
}

function parseChunks(png: Buffer): ParsedChunk[] {
  const chunks: ParsedChunk[] = [];
  let offset = 8; // skip the signature
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    chunks.push({
      type: png.subarray(offset + 4, offset + 8).toString('latin1'),
      data: png.subarray(offset + 8, offset + 8 + length),
      crc: png.readUInt32BE(offset + 8 + length),
      crcInput: png.subarray(offset + 4, offset + 8 + length),
    });
    offset += 12 + length;
  }
  return chunks;
}

function chunkOfType(png: Buffer, type: string): ParsedChunk {
  const found = parseChunks(png).find((chunk) => chunk.type === type);
  if (found === undefined) {
    throw new Error(`no ${type} chunk`);
  }
  return found;
}

function noopActions(): TrayMenuActions {
  return { openAccessibilitySettings: () => {}, resetProgress: () => {}, quit: () => {} };
}

describe('tray icon pixel matrix (F23: sprites-as-code, no asset file)', () => {
  it('is a 16×16 matrix whose every char is in the palette', () => {
    expect(TRAY_ICON_PIXELS).toHaveLength(TRAY_ICON_SIZE);
    for (const row of TRAY_ICON_PIXELS) {
      expect(row).toHaveLength(TRAY_ICON_SIZE);
      for (const char of row) {
        expect(TRAY_ICON_PALETTE[char]).toBeDefined();
      }
    }
  });

  it('uses at least one transparent and one opaque pixel', () => {
    const flat = TRAY_ICON_PIXELS.join('');
    expect(flat).toContain('.');
    expect(flat).toMatch(/[^.]/);
  });
});

describe('pure-code PNG encoder (trayIcon.ts)', () => {
  const png = encodeTrayIconPng();

  it('starts with the PNG signature and frames IHDR, IDAT, IEND in order', () => {
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(parseChunks(png).map((chunk) => chunk.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
  });

  it('declares a 16×16, 8-bit, RGBA, non-interlaced image in IHDR', () => {
    const ihdr = chunkOfType(png, 'IHDR');
    expect(ihdr.data).toHaveLength(13);
    expect(ihdr.data.readUInt32BE(0)).toBe(TRAY_ICON_SIZE); // width
    expect(ihdr.data.readUInt32BE(4)).toBe(TRAY_ICON_SIZE); // height
    expect(ihdr.data[8]).toBe(8); // bit depth
    expect(ihdr.data[9]).toBe(6); // color type: truecolor + alpha
    expect(ihdr.data[10]).toBe(0); // compression: deflate
    expect(ihdr.data[11]).toBe(0); // filter method 0
    expect(ihdr.data[12]).toBe(0); // no interlace
  });

  it('writes a valid CRC-32 over type+data for every chunk', () => {
    for (const chunk of parseChunks(png)) {
      expect(chunk.crc).toBe(referenceCrc32(chunk.crcInput));
      expect(chunk.crc).toBe(crc32(chunk.crcInput)); // both implementations agree
    }
  });

  it('inflates IDAT to filter-0 scanlines that reproduce the matrix exactly', () => {
    const raw = inflateSync(chunkOfType(png, 'IDAT').data);
    const stride = 1 + TRAY_ICON_SIZE * 4;
    expect(raw).toHaveLength(TRAY_ICON_SIZE * stride);
    for (let y = 0; y < TRAY_ICON_SIZE; y++) {
      expect(raw[y * stride]).toBe(0); // filter type None
      for (let x = 0; x < TRAY_ICON_SIZE; x++) {
        const char = TRAY_ICON_PIXELS[y]?.[x] ?? '';
        const expected = TRAY_ICON_PALETTE[char] ?? [0, 0, 0, 0];
        const p = y * stride + 1 + x * 4;
        expect([raw[p], raw[p + 1], raw[p + 2], raw[p + 3]]).toEqual([...expected]);
      }
    }
  });

  it('encodes unknown palette chars as transparent instead of throwing', () => {
    const png2 = encodeTrayIconPng(['?a', 'b?'], { a: [1, 2, 3, 255], b: [4, 5, 6, 255] });
    const raw = inflateSync(chunkOfType(png2, 'IDAT').data);
    // Row 0: filter, then '?' (transparent) and 'a'.
    expect([raw[1], raw[2], raw[3], raw[4]]).toEqual([0, 0, 0, 0]);
    expect([raw[5], raw[6], raw[7], raw[8]]).toEqual([1, 2, 3, 255]);
  });
});

describe('tray menu template (F23)', () => {
  it('lists title, status, separator, Reset Progress, Quit — in that order', () => {
    const template = buildTrayMenuTemplate(GLOBAL_MODE, noopActions());
    expect(template.map((item) => item.label ?? item.type)).toEqual([
      TRAY_TITLE,
      INPUT_GLOBAL_LABEL,
      'separator',
      RESET_LABEL,
      QUIT_LABEL,
    ]);
  });

  it('pins the title to package.json version and the disabled rows', () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version: string };
    expect(TRAY_TITLE).toBe(`DesMon v${pkg.version}`);
    const template = buildTrayMenuTemplate(GLOBAL_MODE, noopActions());
    expect(template[0]?.enabled).toBe(false);
    expect(template[1]?.enabled).toBe(false); // global status: informational
    expect(template[1]?.click).toBeUndefined();
  });

  it('in fallback mode the status row opens the Accessibility settings', () => {
    let opened = 0;
    const template = buildTrayMenuTemplate(FALLBACK_MODE, {
      ...noopActions(),
      openAccessibilitySettings: () => {
        opened += 1;
      },
    });
    const status = template[1];
    expect(status?.label).toBe(INPUT_FALLBACK_LABEL);
    expect(status?.label).toContain('Accessibility');
    status?.click?.();
    expect(opened).toBe(1);
  });

  it('Reset Progress and Quit invoke their actions', () => {
    const calls: string[] = [];
    const template = buildTrayMenuTemplate(GLOBAL_MODE, {
      openAccessibilitySettings: () => calls.push('grant'),
      resetProgress: () => calls.push('reset'),
      quit: () => calls.push('quit'),
    });
    template.find((item) => item.label === RESET_LABEL)?.click?.();
    template.find((item) => item.label === QUIT_LABEL)?.click?.();
    expect(calls).toEqual(['reset', 'quit']);
  });
});

describe('setupTray controller (F23: build once, rebuild on mode change)', () => {
  function makeFakes(initialMode: InputModePayload): {
    tray: TrayLike;
    tooltips: string[];
    builtTemplates: TrayMenuItem[][];
    setMenus: unknown[];
    deps: Parameters<typeof setupTray>[0];
  } {
    const tooltips: string[] = [];
    const builtTemplates: TrayMenuItem[][] = [];
    const setMenus: unknown[] = [];
    const tray: TrayLike = {
      setToolTip: (tip) => {
        tooltips.push(tip);
      },
      setContextMenu: (menu) => {
        setMenus.push(menu);
      },
    };
    const deps: Parameters<typeof setupTray>[0] = {
      createTray: () => tray,
      buildMenu: (template) => {
        builtTemplates.push(template);
        return { built: builtTemplates.length };
      },
      getInputMode: () => initialMode,
      actions: noopActions(),
    };
    return { tray, tooltips, builtTemplates, setMenus, deps };
  }

  it('sets the tooltip and builds the initial menu from getInputMode()', () => {
    const fakes = makeFakes(FALLBACK_MODE);
    setupTray(fakes.deps);
    expect(fakes.tooltips).toEqual([TRAY_TOOLTIP]);
    expect(fakes.setMenus).toHaveLength(1);
    expect(fakes.builtTemplates[0]?.[1]?.label).toBe(INPUT_FALLBACK_LABEL);
  });

  it('refresh(mode) rebuilds the menu and applies it to the tray', () => {
    const fakes = makeFakes(FALLBACK_MODE);
    const controller = setupTray(fakes.deps);
    controller.refresh(GLOBAL_MODE);
    expect(fakes.setMenus).toHaveLength(2);
    expect(fakes.builtTemplates[1]?.[1]?.label).toBe(INPUT_GLOBAL_LABEL);
    expect(fakes.setMenus[1]).toEqual({ built: 2 });
  });

  it('keeps a module-scope reference to the live tray (GC keep-alive)', () => {
    const fakes = makeFakes(GLOBAL_MODE);
    setupTray(fakes.deps);
    expect(getActiveTray()).toBe(fakes.tray);
  });
});

describe('tray wiring (source contract, src/main/index.ts)', () => {
  const indexTs = readFileSync(join(process.cwd(), 'src/main/index.ts'), 'utf8');

  it('creates the Tray from the code-encoded PNG via nativeImage', () => {
    expect(indexTs).toContain('new Tray(nativeImage.createFromBuffer(encodeTrayIconPng()))');
    expect(indexTs).toContain('Menu.buildFromTemplate(template)');
    expect(indexTs).toContain('getInputMode: getCurrentInputMode');
  });

  it('wires the menu actions to reset IPC, the settings deep link and quit', () => {
    expect(indexTs).toContain('win.webContents.send(IPC.RESET)');
    expect(indexTs).toContain('void shell.openExternal(ACCESSIBILITY_SETTINGS_URL)');
    expect(indexTs).toContain('app.quit()');
  });

  it('rebuilds the menu from the global-input mode-change path', () => {
    const send = indexTs.indexOf('win.webContents.send(IPC.INPUT_MODE, payload)');
    const refresh = indexTs.indexOf('tray.refresh(payload)');
    expect(send).toBeGreaterThan(-1);
    expect(refresh).toBeGreaterThan(send);
  });
});
