import { formats } from "../color/convert";
import { bestText, contrast, rate } from "../color/contrast";
import type { Role } from "../color/palette";
import { STEPS } from "../color/scale";

type Props = { role: Role; step: number; onCopy: (text: string) => void };

export function Inspector({ role, step, onCopy }: Props) {
  const hex = role.scale.shades[step];
  const f = formats(hex);
  const against = [
    { label: "White", bg: "#ffffff" },
    { label: "Black", bg: "#000000" },
    { label: `${role.name} 50`, bg: role.scale.shades[0] },
    { label: `${role.name} 950`, bg: role.scale.shades[10] },
  ];

  return (
    <aside className="inspector" aria-label="Selected color">
      <div className="chip" style={{ background: hex, color: bestText(hex) }}>
        <span>
          {role.name} {STEPS[step]}
        </span>
        {step === role.scale.anchor && <small>Your base color</small>}
      </div>
      <dl className="formats">
        {(Object.keys(f) as (keyof typeof f)[]).map((k) => (
          <div key={k}>
            <dt>{k.toUpperCase()}</dt>
            <dd>
              <button type="button" onClick={() => onCopy(f[k])} title="Copy">
                {f[k]}
              </button>
            </dd>
          </div>
        ))}
      </dl>
      <h3>As text on</h3>
      <ul className="against">
        {against.map(({ label, bg }) => {
          const ratio = contrast(hex, bg);
          const r = rate(ratio);
          return (
            <li key={label}>
              <span className="sample" style={{ background: bg, color: hex }}>
                Aa
              </span>
              <span>{label}</span>
              <span className="ratio">{ratio.toFixed(2)}</span>
              <span className={`rating rating-${r === "Fail" ? "fail" : r === "AA large" ? "large" : "pass"}`}>{r}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
