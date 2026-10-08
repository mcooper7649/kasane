import { oklabToRgb, rgbToHex, rgbToOklab, type Oklab } from "./convert";

export type Cluster = { hex: string; weight: number; chroma: number };

/**
 * Dominant colors of an image via k-means in OKLab, where Euclidean distance
 * roughly matches perceived difference. `pixels` is RGBA bytes (ImageData.data).
 * Seeding is k-means++ with a seeded PRNG, so the same image always gives the
 * same palette.
 */
export function extractColors(pixels: Uint8ClampedArray, k = 6, iterations = 12): Cluster[] {
  const pts: Oklab[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue; // skip transparent pixels
    pts.push(rgbToOklab({ r: pixels[i] / 255, g: pixels[i + 1] / 255, b: pixels[i + 2] / 255 }));
  }
  if (pts.length === 0) return [];
  k = Math.min(k, pts.length);

  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const d2 = (p: Oklab, q: Oklab) => (p.L - q.L) ** 2 + (p.a - q.a) ** 2 + (p.b - q.b) ** 2;

  const centers: Oklab[] = [pts[Math.floor(rand() * pts.length)]];
  while (centers.length < k) {
    const dist = pts.map((p) => Math.min(...centers.map((c) => d2(p, c))));
    const total = dist.reduce((a, b) => a + b, 0);
    if (total === 0) break;
    let r = rand() * total, i = 0;
    while ((r -= dist[i]) > 0 && i < pts.length - 1) i++;
    centers.push(pts[i]);
  }

  const assign = new Array<number>(pts.length).fill(0);
  for (let it = 0; it < iterations; it++) {
    pts.forEach((p, i) => {
      let best = 0;
      for (let c = 1; c < centers.length; c++) if (d2(p, centers[c]) < d2(p, centers[best])) best = c;
      assign[i] = best;
    });
    const sums = centers.map(() => ({ L: 0, a: 0, b: 0, n: 0 }));
    pts.forEach((p, i) => {
      const s = sums[assign[i]];
      s.L += p.L; s.a += p.a; s.b += p.b; s.n++;
    });
    sums.forEach((s, c) => {
      if (s.n) centers[c] = { L: s.L / s.n, a: s.a / s.n, b: s.b / s.n };
    });
  }

  const counts = centers.map(() => 0);
  assign.forEach((c) => counts[c]++);
  return centers
    .map((c, i) => ({
      hex: rgbToHex(oklabToRgb(c)),
      weight: counts[i] / pts.length,
      chroma: Math.hypot(c.a, c.b),
    }))
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}

/**
 * The cluster to build a palette on: the one with the most visual pull,
 * scoring chroma against coverage so a small vivid area can beat a big grey one.
 */
export function pickPrimary(clusters: Cluster[]): string | null {
  if (clusters.length === 0) return null;
  const score = (c: Cluster) => c.chroma * Math.sqrt(c.weight);
  return [...clusters].sort((a, b) => score(b) - score(a))[0].hex;
}
