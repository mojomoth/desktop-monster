import { describe, expect, it } from 'vitest';
import { allSprites, drawSprite } from '../src/renderer/sprites/sprite.js';
import type { DrawSpriteOptions, Sprite, SpriteCanvas } from '../src/renderer/sprites/sprite.js';
import '../src/renderer/sprites/index.js';

/** Frozen v0.10 pixel painter: independent oracle for the optimized primitive. */
function oldDraw(ctx: SpriteCanvas, sprite: Sprite, frame: number, x: number, y: number, opts: DrawSpriteOptions = {}): void {
  const rows = sprite.frames[frame];
  if (!rows) return;
  const scale = opts.scale ?? 1;
  for (let ry = 0; ry < sprite.h; ry++) {
    const row = rows[ry];
    if (!row) continue;
    for (let rx = 0; rx < sprite.w; rx++) {
      const ch = row.charAt(opts.flipX ? sprite.w - 1 - rx : rx);
      if (ch === '.' || ch === '' || sprite.palette[ch] === undefined) continue;
      ctx.fillStyle = opts.tint ?? sprite.palette[ch]!;
      ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
    }
  }
}

function surface(width: number, height: number): { ctx: SpriteCanvas; pixels: Uint32Array; calls: number[][] } {
  const pixels = new Uint32Array(width * height), calls: number[][] = [];
  const ctx = { fillStyle: '', fillRect(x: number, y: number, w: number, h: number): void {
    calls.push([x, y, w, h]);
    const color = Number.parseInt(ctx.fillStyle.slice(1), 16) + 1;
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
      if (Number.isInteger(px) && Number.isInteger(py) && px >= 0 && px < width && py >= 0 && py < height) pixels[py * width + px] = color;
    }
  } };
  return { ctx, pixels, calls };
}

describe('v11 sprite strip raster equivalence', () => {
  it('preserves every registered frame pixel with mirror, tint, scale and clipping', () => {
    let oldCalls = 0, newCalls = 0, frames = 0;
    for (const [name, art] of allSprites()) for (let frame = 0; frame < art.frames.length; frame++) {
      for (const scale of [1, 2, 3]) for (const flipX of [false, true]) for (const tint of [undefined, '#123456']) {
        const before = surface(art.w * scale + 5, art.h * scale + 5);
        const after = surface(art.w * scale + 5, art.h * scale + 5);
        const opts = { scale, flipX, ...(tint ? { tint } : {}) };
        oldDraw(before.ctx, art, frame, -1, 2, opts);
        drawSprite(after.ctx, art, frame, -1, 2, opts);
        expect(Buffer.from(after.pixels.buffer).equals(Buffer.from(before.pixels.buffer)),
          `${name}/${frame}/${scale}/${flipX}/${tint}`).toBe(true);
        oldCalls += before.calls.length; newCalls += after.calls.length; frames++;
      }
    }
    expect(frames).toBeGreaterThan(100);
    expect(newCalls).toBeLessThan(oldCalls * 0.75);
  }, 30000);

  it('retains original rectangle coverage for fractional geometry and missing palette entries', () => {
    const art: Sprite = { w: 8, h: 2, palette: { a: '#123456' }, frames: [['aaa.???a', 'aaaa']] };
    for (const [x, y, scale] of [[0.5, 0, 2], [0, 0.5, 2], [0, 0, 1.5]]) {
      const before = surface(30, 20), after = surface(30, 20);
      oldDraw(before.ctx, art, 0, x!, y!, { scale: scale!, flipX: true });
      drawSprite(after.ctx, art, 0, x!, y!, { scale: scale!, flipX: true });
      expect(after.calls).toEqual(before.calls);
      expect(after.pixels).toEqual(before.pixels);
    }
  });
});
