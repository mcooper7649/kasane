import { describe, expect, it } from "vitest";
import { formats, hexToOklch, inGamut, oklchToHex, oklchToRgb, parseHex, rgbToHex, toGamut } from "./convert";
import { contrast, rate } from "./contrast";
import { buildPalette, decodeState, encodeState, randomPrimary, type PaletteState } from "./palette";
import { buildScale, STEPS } from "./scale";
import { extractColors, pickPrimary } from "./extract";
import { exportPalette } from "./exporters";

describe("conversions", () => {
  it("parses short and long hex", () => {
    expect(parseHex("#fff")).toEqual({ r: 1, g: 1, b: 1 });
    expect(parseHex("2747A8")).not.toBeNull();
    expect(parseHex("#12345")).toBeNull();
    expect(parseHex("zzzzzz")).toBeNull();
  });

  it("matches reference OKLCH values", () => {
    // Reference values from the CSS Color 4 spec / culori.
    const red = hexToOklch("#ff0000")!;
    expect(red.L).toBeCloseTo(0.628, 3);
    expect(red.C).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
    const white = hexToOklch("#ffffff")!;
    expect(white.L).toBeCloseTo(1, 4);
    expect(white.C).toBeLessThan(1e-4);
  });

  it("round-trips every 17th sRGB color through OKLCH", () => {
    for (let r = 0; r < 256; r += 17)
      for (let g = 0; g < 256; g += 17)
        for (let b = 0; b < 256; b += 17) {
          const hex = rgbToHex({ r: r / 255, g: g / 255, b: b / 255 });
          expect(oklchToHex(hexToOklch(hex)!)).toBe(hex);
        }
  });

  it("gamut-maps out-of-range colors by reducing chroma only", () => {
    const wild = { L: 0.7, C: 0.4, h: 145 };
    expect(inGamut(oklchToRgb(wild))).toBe(false);
    const mapped = toGamut(wild);
    expect(inGamut(oklchToRgb(mapped))).toBe(true);
    expect(mapped.L).toBe(0.7);
    expect(mapped.h).toBe(145);
    expect(mapped.C).toBeLessThan(0.4);
    expect(mapped.C).toBeGreaterThan(0.15);
  });

  it("formats colors for export", () => {
    expect(formats("#ff0000")).toEqual({
      hex: "#ff0000",
      rgb: "rgb(255 0 0)",
      hsl: "hsl(0 100% 50%)",
      oklch: "oklch(62.8% 0.258 29.2)",
    });
  });
});

describe("contrast", () => {
  it("computes WCAG ratios", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrast("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("rates ratios against AA and AAA", () => {
    expect(rate(7.1)).toBe("AAA");
    expect(rate(4.5)).toBe("AA");
    expect(rate(3.2)).toBe("AA large");
    expect(rate(2)).toBe("Fail");
  });
});

describe("scales", () => {
  const samples = ["#2747a8", "#e11d48", "#facc15", "#10b981", "#777777", "#0b1020", "#fdf4ff"];

  it.each(samples)("keeps %s unchanged on its anchor step", (hex) => {
    const { shades, anchor } = buildScale(hex);
    expect(shades).toHaveLength(STEPS.length);
    expect(shades[anchor]).toBe(hex);
  });

  it.each(samples)("gets strictly darker from 50 to 950 for %s", (hex) => {
    const L = buildScale(hex).shades.map((h) => hexToOklch(h)!.L);
    for (let i = 1; i < L.length; i++) expect(L[i]).toBeLessThan(L[i - 1]);
  });

  it("gives white text AA contrast on the 700 step of a mid blue", () => {
    const s = buildScale("#2747a8").shades;
    expect(contrast("#ffffff", s[7])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(s[9], s[0])).toBeGreaterThanOrEqual(7);
  });
});

describe("palette", () => {
  const state: PaletteState = { primary: "#2747a8", harmony: "triadic", pinned: { danger: "#cc0000" } };

  it("builds six roles and honors pinned colors", () => {
    const roles = buildPalette(state);
    expect(roles.map((r) => r.id)).toEqual(["primary", "accent", "neutral", "success", "warning", "danger"]);
    const danger = roles.find((r) => r.id === "danger")!;
    expect(danger.pinned).toBe(true);
    expect(danger.base).toBe("#cc0000");
  });

  it("places the accent at the harmony's hue offset", () => {
    const accent = buildPalette(state).find((r) => r.id === "accent")!;
    const dh = (hexToOklch(accent.base)!.h - hexToOklch(state.primary)!.h + 360) % 360;
    expect(dh).toBeGreaterThan(115);
    expect(dh).toBeLessThan(125);
  });

  it("round-trips through the URL hash", () => {
    expect(decodeState("#" + encodeState(state))).toEqual(state);
    expect(decodeState("#p=nothex")).toBeNull();
  });

  it("generates valid random primaries", () => {
    let seed = 0.1;
    const rand = () => (seed = (seed * 9301 + 0.49297) % 1);
    for (let i = 0; i < 50; i++) expect(parseHex(randomPrimary(rand))).not.toBeNull();
  });
});

describe("image extraction", () => {
  it("finds the vivid color in a mostly grey image", () => {
    const px = new Uint8ClampedArray(100 * 4);
    for (let i = 0; i < 100; i++) {
      const vivid = i < 15;
      px.set(vivid ? [230, 30, 60, 255] : [128, 128, 128, 255], i * 4);
    }
    const clusters = extractColors(px, 3);
    expect(clusters[0].hex).toBe("#808080");
    expect(pickPrimary(clusters)).toBe("#e61e3c");
  });

  it("ignores transparent pixels", () => {
    const px = new Uint8ClampedArray([255, 0, 0, 0, 0, 0, 255, 255]);
    expect(extractColors(px, 2).map((c) => c.hex)).toEqual(["#0000ff"]);
  });
});

describe("exporters", () => {
  const roles = buildPalette({ primary: "#2747a8", harmony: "complementary", pinned: {} });

  it("emits a Tailwind v4 theme with 66 colors", () => {
    const css = exportPalette(roles, "tailwind4");
    expect(css.startsWith("@theme {")).toBe(true);
    expect(css.match(/--color-[a-z]+-\d+: #[0-9a-f]{6};/g)).toHaveLength(66);
    expect(css).toContain("--color-primary-");
  });

  it("emits valid design tokens JSON", () => {
    const json = JSON.parse(exportPalette(roles, "tokens"));
    expect(json.color.primary["500"].$type).toBe("color");
  });

  it("can emit OKLCH values", () => {
    expect(exportPalette(roles, "css", true)).toMatch(/--primary-50: oklch\(/);
  });
});
