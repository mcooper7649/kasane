import { formats } from "./convert";
import type { Role } from "./palette";
import { STEPS } from "./scale";

export type ExportFormat = "tailwind4" | "css" | "tailwind3" | "tokens" | "scss";
export const EXPORTS: { id: ExportFormat; label: string; file: string }[] = [
  { id: "tailwind4", label: "Tailwind v4", file: "theme.css" },
  { id: "css", label: "CSS variables", file: "palette.css" },
  { id: "tailwind3", label: "Tailwind v3", file: "tailwind.config.js" },
  { id: "tokens", label: "Design tokens", file: "palette.tokens.json" },
  { id: "scss", label: "SCSS", file: "_palette.scss" },
];

const each = (roles: Role[], fn: (role: Role, step: number, hex: string) => string) =>
  roles.map((r) => r.scale.shades.map((hex, i) => fn(r, STEPS[i], hex)).join("\n")).join("\n\n");

export function exportPalette(roles: Role[], format: ExportFormat, useOklch = false): string {
  const v = (hex: string) => (useOklch ? formats(hex).oklch : hex);
  switch (format) {
    case "tailwind4":
      return `@theme {\n${each(roles, (r, s, hex) => `  --color-${r.id}-${s}: ${v(hex)};`)}\n}\n`;
    case "css":
      return `:root {\n${each(roles, (r, s, hex) => `  --${r.id}-${s}: ${v(hex)};`)}\n}\n`;
    case "scss":
      return each(roles, (r, s, hex) => `$${r.id}-${s}: ${v(hex)};`) + "\n";
    case "tailwind3": {
      const body = roles
        .map((r) => {
          const lines = r.scale.shades.map((hex, i) => `          ${STEPS[i]}: "${v(hex)}",`).join("\n");
          return `        ${r.id}: {\n${lines}\n        },`;
        })
        .join("\n");
      return `/** @type {import('tailwindcss').Config} */\nexport default {\n  theme: {\n    extend: {\n      colors: {\n${body}\n      },\n    },\n  },\n};\n`;
    }
    case "tokens": {
      // W3C Design Tokens Community Group format.
      const tree: Record<string, Record<string, unknown>> = {};
      for (const r of roles) {
        tree[r.id] = {};
        r.scale.shades.forEach((hex, i) => {
          tree[r.id][STEPS[i]] = { $type: "color", $value: v(hex) };
        });
      }
      return JSON.stringify({ color: tree }, null, 2) + "\n";
    }
  }
}
