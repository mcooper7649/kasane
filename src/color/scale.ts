import { hexToOklch, oklchToHex, type Oklch } from "./convert";

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Step = (typeof STEPS)[number];

/** Target OKLCH lightness per step: even perceptual spacing, with extra room at the light end for tints. */
export const TARGET_L = [0.975, 0.94, 0.885, 0.81, 0.715, 0.625, 0.535, 0.455, 0.38, 0.305, 0.225];

export type Scale = {
  /** Hex per step, lightest first. */
  shades: string[];
  /** Index of the step that holds the input color unchanged. */
  anchor: number;
};

/** The step whose target lightness is nearest to L. */
export function nearestStep(L: number): number {
  let best = 0;
  TARGET_L.forEach((t, i) => {
    if (Math.abs(t - L) < Math.abs(TARGET_L[best] - L)) best = i;
  });
  return best;
}

// Yellows and oranges look muddy when darkened at a fixed hue, so their dark
// steps drift toward red, the way pigment does. Other hues stay put.
function hueDrift(h: number, dL: number): number {
  const warm = h > 45 && h < 115 ? 1 - Math.abs(h - 80) / 35 : 0;
  return h - warm * Math.max(0, dL) * 30;
}

/**
 * An 11-step tonal scale built around `hex`. The input lands unchanged on its
 * nearest step; the other steps follow the target lightness curve, with the
 * offset from that step fading out toward both ends so the scale stays monotonic.
 * Chroma tapers toward the ends, then each step is gamut-mapped into sRGB.
 */
export function buildScale(hex: string): Scale {
  const base = hexToOklch(hex);
  if (!base) throw new Error(`Not a hex color: ${hex}`);
  const k = nearestStep(base.L);
  const delta = base.L - TARGET_L[k];
  const last = STEPS.length - 1;

  const shades = TARGET_L.map((target, i) => {
    if (i === k) return hex.toLowerCase();
    const span = i < k ? k : last - k;
    const fade = span === 0 ? 0 : 1 - Math.abs(i - k) / (span + 1);
    const L = target + delta * fade;
    const f =
      i < k
        ? 0.16 + 0.84 * (i / k) ** 1.35
        : 1 - 0.42 * ((i - k) / (last - k)) ** 1.2;
    const lch: Oklch = { L, C: base.C * f, h: hueDrift(base.h, base.L - L) };
    return oklchToHex(lch);
  });

  return { shades, anchor: k };
}
