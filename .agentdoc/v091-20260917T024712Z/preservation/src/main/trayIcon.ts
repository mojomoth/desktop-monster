// Tray icon as code (SPEC F23, Assumption 16): a 16×16 pixel matrix encoded
// into a real PNG entirely in-process — PNG chunk framing + node:zlib
// deflateSync + a CRC-32 table — so NO binary asset file exists anywhere.
// src/main/index.ts wraps the buffer with nativeImage.createFromBuffer
// (avoids createFromBitmap's platform-dependent byte order). This module is
// electron-free (persistence.ts pattern): vitest decodes the emitted PNG with
// an independent CRC-32 + inflateSync and verifies it pixel-for-pixel.

import { deflateSync } from 'node:zlib';

/** One RGBA color, 0–255 per channel. */
export type Rgba = readonly [r: number, g: number, b: number, a: number];

export const TRAY_ICON_SIZE = 16;

const TRANSPARENT: Rgba = [0, 0, 0, 0];

/** '.' = transparent; DB16-ish slime greens + the dark outline color. */
export const TRAY_ICON_PALETTE: Readonly<Record<string, Rgba>> = {
  '.': TRANSPARENT,
  o: [34, 32, 52, 255], // eyes / mouth (DB16 near-black)
  g: [106, 190, 48, 255], // slime body green
  G: [153, 229, 80, 255], // slime highlight green
};

/** The DesMon slime, 16×16 — same sprites-as-code style as the renderer art. */
export const TRAY_ICON_PIXELS: readonly string[] = [
  '................',
  '................',
  '......gggg......',
  '....ggGGGGgg....',
  '...gGGGGGGGGg...',
  '..gGGGGGGGGGGg..',
  '..gGGGGGGGGGGg..',
  '.gGGooGGGGooGGg.',
  '.gGGooGGGGooGGg.',
  '.gGGGGGGGGGGGGg.',
  '.gGGGGGooGGGGGg.',
  '.gGGGGGGGGGGGGg.',
  '..gGGGGGGGGGGg..',
  '...gggggggggg...',
  '................',
  '................',
];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable !== null) {
    return crcTable;
  }
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}

/** CRC-32 (ISO 3309, the PNG chunk checksum) over the given bytes. */
export function crc32(bytes: Uint8Array): number {
  const table = getCrcTable();
  let c = 0xffffffff;
  for (const byte of bytes) {
    c = (table[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Frame one PNG chunk: 4-byte length, 4-byte type, data, CRC(type + data). */
function pngChunk(type: string, data: Uint8Array): Buffer {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 'latin1');
  chunk.set(data, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
}

/**
 * Encode a pixel matrix as an 8-bit RGBA PNG (color type 6, filter type 0 on
 * every scanline, one IDAT deflated with node:zlib deflateSync). Unknown
 * palette chars encode as transparent — the encoder never throws.
 */
export function encodeTrayIconPng(
  pixels: readonly string[] = TRAY_ICON_PIXELS,
  palette: Readonly<Record<string, Rgba>> = TRAY_ICON_PALETTE,
): Buffer {
  const height = pixels.length;
  const width = pixels[0]?.length ?? 0;

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth: 8 bits per channel
  ihdr[9] = 6; // color type: truecolor with alpha (RGBA)
  ihdr[10] = 0; // compression method: deflate
  ihdr[11] = 0; // filter method 0
  ihdr[12] = 0; // interlace: none

  // Per scanline: 1 filter-type byte (0 = None) + width × RGBA.
  const raw = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (const row of pixels) {
    raw[offset] = 0;
    offset += 1;
    for (const char of row) {
      const [r, g, b, a] = palette[char] ?? TRANSPARENT;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
      offset += 4;
    }
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
}
