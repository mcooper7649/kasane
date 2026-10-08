import { hexToOklch, oklchToHex, parseHex } from "./convert";
import { buildScale, type Scale } from "./scale";

export type Harmony = "complementary" | "analogous" | "triadic" | "split";
export const HARMONIES: { id: Harmony; label: string; offset: number }[] = [
  { id: "complementary", label: "Complementary", offset: 180 },
  { id: "analogous", label: "Analogous", offset: 35 },
  { id: "triadic", label: "Triadic", offset: 120 },
  { id: "split", label: "Split complementary", offset: 150 },
];

export type RoleId = "primary" | "accent" | "neutral" | "success" | "warning" | "danger";
export const ROLES: { id: RoleId; name: string }[] = [
  { id: "primary", name: "Primary" },
  { id: "accent", name: "Accent" },
  { id: "neutral", name: "Neutral" },
  { id: "success", name: "Success" },
  { id: "warning", name: "Warning" },
  { id: "danger", name: "Danger" },
];

/** What the user chose. Everything else is derived. */
export type PaletteState = {
  primary: string;
  harmony: Harmony;
  /** Roles the user pinned to their own hex instead of the derived one. */
  pinned: Partial<Record<RoleId, string>>;
};

export type Role = { id: RoleId; name: string; base: string; pinned: boolean; scale: Scale };

// Semantic hues are fixed so "danger" always reads as red, but they borrow a
// little of the primary's chroma so they sit in the same family.
const SEMANTIC = {
  success: { h: 150, L: 0.6 },
  warning: { h: 75, L: 0.76 },
  danger: { h: 27, L: 0.58 },
} as const;

export function deriveBase(id: RoleId, state: PaletteState): string {
  const p = hexToOklch(state.primary)!;
  switch (id) {
    case "primary":
      return state.primary.toLowerCase();
    case "accent": {
      const offset = HARMONIES.find((x) => x.id === state.harmony)!.offset;
      const h = (p.h + offset) % 360;
      // Keep the accent in the hue's sweet spot: dark yellows turn olive and
      // very light blues wash out, so lightness is clamped per hue band.
      const yellowish = h > 70 && h < 115;
      const L = yellowish ? 0.8 : Math.min(0.7, Math.max(0.55, p.L));
      return oklchToHex({ L, C: Math.max(p.C, 0.12), h });
    }
    case "neutral":
      return oklchToHex({ L: 0.6, C: Math.min(p.C * 0.12, 0.018), h: p.h });
    default: {
      const s = SEMANTIC[id];
      return oklchToHex({ L: s.L, C: 0.12 + Math.min(p.C, 0.2) * 0.25, h: s.h });
    }
  }
}

export function buildPalette(state: PaletteState): Role[] {
  return ROLES.map(({ id, name }) => {
    const pin = state.pinned[id];
    const base = pin && parseHex(pin) ? pin.toLowerCase() : deriveBase(id, state);
    return { id, name, base, pinned: Boolean(pin), scale: buildScale(base) };
  });
}

/** A random primary that is saturated enough to be worth building a system on. */
export function randomPrimary(rand = Math.random): string {
  return oklchToHex({ L: 0.5 + rand() * 0.2, C: 0.11 + rand() * 0.09, h: rand() * 360 });
}

// URL hash format: #p=2747a8&h=triadic&accent=ff8800
export function encodeState(s: PaletteState): string {
  const q = new URLSearchParams({ p: s.primary.replace("#", ""), h: s.harmony });
  for (const [k, v] of Object.entries(s.pinned)) if (v) q.set(k, v.replace("#", ""));
  return q.toString();
}

export function decodeState(hash: string): PaletteState | null {
  const q = new URLSearchParams(hash.replace(/^#/, ""));
  const p = q.get("p");
  if (!p || !parseHex(p)) return null;
  const h = q.get("h") as Harmony;
  const pinned: PaletteState["pinned"] = {};
  for (const { id } of ROLES) {
    const v = q.get(id);
    if (id !== "primary" && v && parseHex(v)) pinned[id] = `#${v.toLowerCase()}`;
  }
  return {
    primary: `#${p.toLowerCase()}`,
    harmony: HARMONIES.some((x) => x.id === h) ? h : "complementary",
    pinned,
  };
}
