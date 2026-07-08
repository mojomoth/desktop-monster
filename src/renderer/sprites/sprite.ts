// SPEC F19 — sprites-as-code. A Sprite is a palette map plus string-row
// frames; '.' is transparent. All art in src/renderer/sprites/ is data of
// this shape and self-registers into the registry below so that
// tests/sprites.test.ts can verify every frame of every sprite.
//
// This module must compile under tsconfig.test (node): the only DOM
// reference is the TYPE-ONLY `Pick<CanvasRenderingContext2D, ...>` alias —
// no DOM value is ever touched at runtime.

/** The transparent character used in frame rows. */
export const TRANSPARENT = '.';

export interface Sprite {
  /** Frame width in game pixels; every row of every frame is exactly this long. */
  w: number;
  /** Frame height in game pixels; every frame has exactly this many rows. */
  h: number;
  /** Maps every non-transparent frame char to a CSS hex color. */
  palette: Record<string, string>;
  /** One string-row matrix per animation frame. */
  frames: string[][];
}

export interface DrawSpriteOptions {
  /** Mirror the frame horizontally (sprites face right by default). */
  flipX?: boolean;
  /** Draw every opaque pixel in this color instead (hit-flash etc.). */
  tint?: string;
}

/**
 * The minimal canvas surface drawSprite needs. Type-only projection of the
 * DOM context so sprite code stays testable in a node environment; a real
 * CanvasRenderingContext2D satisfies it structurally.
 */
export type SpriteCanvas = Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>;

/**
 * Paint one frame of a sprite at (x, y) in 1px game-pixel units.
 * Unknown frame indices and palette-less chars are skipped silently —
 * drawing must never throw mid-render-loop.
 */
export function drawSprite(
  ctx: SpriteCanvas,
  sprite: Sprite,
  frame: number,
  x: number,
  y: number,
  opts?: DrawSpriteOptions,
): void {
  const rows = sprite.frames[frame];
  if (rows === undefined) {
    return;
  }
  for (let ry = 0; ry < sprite.h; ry++) {
    const row = rows[ry];
    if (row === undefined) {
      continue;
    }
    for (let rx = 0; rx < sprite.w; rx++) {
      const ch = row.charAt(opts?.flipX === true ? sprite.w - 1 - rx : rx);
      if (ch === TRANSPARENT || ch === '') {
        continue;
      }
      const color = sprite.palette[ch];
      if (color === undefined) {
        continue;
      }
      ctx.fillStyle = opts?.tint ?? color;
      ctx.fillRect(x + rx, y + ry, 1, 1);
    }
  }
}

const registry = new Map<string, Sprite>();

/**
 * Register named sprites. Every art module calls this at load time so the
 * integrity tests cover ALL sprites (T12 additions included) by iterating
 * `allSprites()` — new art modules only need a side-effect import in the
 * test file. Duplicate names throw: silent overwrites would let a frame
 * escape the integrity sweep.
 */
export function registerSprites(entries: Record<string, Sprite>): void {
  for (const [name, sprite] of Object.entries(entries)) {
    if (registry.has(name)) {
      throw new Error(`sprite registered twice: ${name}`);
    }
    registry.set(name, sprite);
  }
}

/** Snapshot of every registered sprite, keyed by registration name. */
export function allSprites(): ReadonlyMap<string, Sprite> {
  return registry;
}
