// Color space conversions: sRGB <-> linear sRGB <-> OKLab <-> OKLCH.
// OKLab matrices are from Björn Ottosson's reference implementation
// (https://bottosson.github.io/posts/oklab/).

/** sRGB channels in 0..1 (may fall outside that range before gamut mapping). */
export type RGB = { r: number; g: number; b: number };
export type Oklab = { L: number; a: number; b: number };
/** L in 0..1, C >= 0, h in degrees 0..360. */
export type Oklch = { L: number; C: number; h: number };

const toLinear = (c: number) =>
  Math.abs(c) <= 0.04045 ? c / 12.92 : Math.sign(c) * ((Math.abs(c) + 0.055) / 1.055) ** 2.4;

const toGamma = (c: number) =>
  Math.abs(c) <= 0.0031308 ? c * 12.92 : Math.sign(c) * (1.055 * Math.abs(c) ** (1 / 2.4) - 0.055);

export function rgbToOklab({ r, g, b }: RGB): Oklab {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function oklabToRgb({ L, a, b }: Oklab): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

export function oklabToOklch({ L, a, b }: Oklab): Oklch {
  const C = Math.hypot(a, b);
  // Hue is meaningless for greys; pin it to 0 so output is stable.
  const h = C < 1e-4 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { L, C, h };
}

export function oklchToOklab({ L, C, h }: Oklch): Oklab {
  const rad = (h * Math.PI) / 180;
  return { L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
}

export const rgbToOklch = (rgb: RGB) => oklabToOklch(rgbToOklab(rgb));
export const oklchToRgb = (lch: Oklch) => oklabToRgb(oklchToOklab(lch));

const EPS = 1e-6;
export const inGamut = ({ r, g, b }: RGB) =>
  r >= -EPS && r <= 1 + EPS && g >= -EPS && g <= 1 + EPS && b >= -EPS && b <= 1 + EPS;

/**
 * Bring an OKLCH color into sRGB by lowering chroma while holding lightness
 * and hue (the CSS Color 4 approach, minus the JND shortcut). Binary search
 * converges well within 20 steps.
 */
export function toGamut(lch: Oklch): Oklch {
  const L = Math.min(1, Math.max(0, lch.L));
  if (L >= 1 - EPS) return { L: 1, C: 0, h: lch.h };
  if (L <= EPS) return { L: 0, C: 0, h: lch.h };
  if (inGamut(oklchToRgb({ ...lch, L }))) return { ...lch, L };
  let lo = 0, hi = lch.C;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb({ L, C: mid, h: lch.h }))) lo = mid;
    else hi = mid;
  }
  return { L, C: lo, h: lch.h };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function parseHex(input: string): RGB | null {
  let hex = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(hex)) hex = hex.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}$/.test(hex)) return null;
  const n = parseInt(hex, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (c: number) => Math.round(clamp01(c) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export const hexToOklch = (hex: string) => {
  const rgb = parseHex(hex);
  return rgb ? rgbToOklch(rgb) : null;
};
export const oklchToHex = (lch: Oklch) => rgbToHex(oklchToRgb(toGamut(lch)));

export function rgbToHsl({ r, g, b }: RGB) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}

/** Every format the swatch inspector and the exporters offer. */
export function formats(hex: string) {
  const rgb = parseHex(hex)!;
  const lch = rgbToOklch(rgb);
  const hsl = rgbToHsl(rgb);
  const r = (n: number, d = 0) => Number(n.toFixed(d));
  return {
    hex,
    rgb: `rgb(${r(rgb.r * 255)} ${r(rgb.g * 255)} ${r(rgb.b * 255)})`,
    hsl: `hsl(${r(hsl.h)} ${r(hsl.s * 100)}% ${r(hsl.l * 100)}%)`,
    oklch: `oklch(${r(lch.L * 100, 1)}% ${r(lch.C, 3)} ${r(lch.h, 1)})`,
  };
}
