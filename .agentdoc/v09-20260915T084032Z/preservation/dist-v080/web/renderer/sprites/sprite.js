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
/**
 * Uniform world pixel scale (Assumption 17; user change 2026-09-04). Every
 * world sprite draws at this integer scale so a pixel is one size everywhere;
 * size variety comes from native art dimensions. game.ts re-exports it as
 * `SPRITE_SCALE`.
 */
export const UNIT_SCALE = 2;
/**
 * Paint one frame of a sprite at (x, y) in 1px game-pixel units.
 * Unknown frame indices and palette-less chars are skipped silently —
 * drawing must never throw mid-render-loop.
 */
export function drawSprite(ctx, sprite, frame, x, y, opts) {
    const rows = sprite.frames[frame];
    if (rows === undefined) {
        return;
    }
    const scale = opts?.scale ?? 1;
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
            ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
        }
    }
}
const registry = new Map();
/**
 * Register named sprites. Every art module calls this at load time so the
 * integrity tests cover ALL sprites (T12 additions included) by iterating
 * `allSprites()` — new art modules only need a side-effect import in the
 * test file. Duplicate names throw: silent overwrites would let a frame
 * escape the integrity sweep.
 */
export function registerSprites(entries) {
    for (const [name, sprite] of Object.entries(entries)) {
        if (registry.has(name)) {
            throw new Error(`sprite registered twice: ${name}`);
        }
        registry.set(name, sprite);
    }
}
/** Snapshot of every registered sprite, keyed by registration name. */
export function allSprites() {
    return registry;
}
