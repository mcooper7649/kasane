import { parseHex, type RGB } from "./convert";

// WCAG 2.2 relative luminance and contrast ratio.
// https://www.w3.org/TR/WCAG22/#dfn-relative-luminance

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export const luminance = ({ r, g, b }: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

export function contrast(fg: string, bg: string): number {
  const a = luminance(parseHex(fg)!), b = luminance(parseHex(bg)!);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export type Rating = "AAA" | "AA" | "AA large" | "Fail";

/** Rating for body text; "AA large" means it only passes at 24px+ or 18.66px+ bold. */
export function rate(ratio: number): Rating {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA large";
  return "Fail";
}

/** Whichever of the two candidates reads better on `bg`. */
export const bestText = (bg: string, light = "#ffffff", dark = "#000000") =>
  contrast(light, bg) >= contrast(dark, bg) ? light : dark;
