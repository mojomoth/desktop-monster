// SPEC F19 — shared color vocabulary for all sprites-as-code, plus the HSL
// tier-tint helper (GAME_ARCHITECTURE §4: species repeat with a hue-shifted
// palette per tier so scaling monsters look new). Pure math — no DOM.

/** DB16 (DawnBringer 16) palette, the base vocabulary for all sprite art. */
export const COLORS = {
  void: '#140c1c',
  maroon: '#442434',
  navy: '#30346d',
  slate: '#4e4a4e',
  brown: '#854c30',
  forest: '#346524',
  red: '#d04648',
  gray: '#757161',
  blue: '#597dce',
  orange: '#d27d2c',
  steel: '#8595a1',
  green: '#6daa2c',
  skin: '#d2aa99',
  cyan: '#6dc2ca',
  yellow: '#dad45e',
  white: '#deeed6',
} as const;

/** Hue degrees added per monster tier by paletteForTier. */
export const TIER_HUE_STEP = 60;

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function clampByte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

/** Parse '#rrggbb' into HSL (h in [0,360), s and l in [0,1]). */
export function hexToHsl(hex: string): Hsl {
  const digits = /^#([0-9a-f]{6})$/i.exec(hex)?.[1];
  if (digits === undefined) {
    throw new Error(`not a #rrggbb color: ${hex}`);
  }
  const int = parseInt(digits, 16);
  const r = ((int >> 16) & 0xff) / 255;
  const g = ((int >> 8) & 0xff) / 255;
  const b = (int & 0xff) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l };
  }
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) {
    h = ((g - b) / delta) % 6;
  } else if (max === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }
  h *= 60;
  if (h < 0) {
    h += 360;
  }
  return { h, s, l };
}

/** Convert HSL (h degrees, s/l in [0,1]) to '#rrggbb'. */
export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (v: number): string => clampByte((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Rotate a '#rrggbb' color's hue by `degrees`, keeping saturation/lightness. */
export function shiftHue(hex: string, degrees: number): string {
  const { h, s, l } = hexToHsl(hex);
  if (s === 0) {
    return hex.toLowerCase(); // grayscale has no hue to rotate
  }
  return hslToHex(h + degrees, s, l);
}

/** Hue-rotate every color of a sprite palette by the same amount. */
export function tintPalette(palette: Record<string, string>, degrees: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [ch, color] of Object.entries(palette)) {
    out[ch] = shiftHue(color, degrees);
  }
  return out;
}

/**
 * Palette variant for a monster tier (tier = floor(monsterIndex / 5), see
 * core/monsters.ts). Tier 0 is the sprite's own palette, untouched; each
 * later tier rotates hue by TIER_HUE_STEP degrees.
 */
export function paletteForTier(palette: Record<string, string>, tier: number): Record<string, string> {
  const step = Math.max(0, Math.floor(tier)) * TIER_HUE_STEP;
  if (step % 360 === 0) {
    return { ...palette };
  }
  return tintPalette(palette, step);
}
