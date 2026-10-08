import { contrast, rate } from "../color/contrast";
import type { Role } from "../color/palette";
import { STEPS } from "../color/scale";

/** Every step of one role as text against the backgrounds people actually use. */
export function ContrastPanel({ role }: { role: Role }) {
  const s = role.scale.shades;
  const bgs = [
    { label: "White", hex: "#ffffff" },
    { label: "50", hex: s[0] },
    { label: "100", hex: s[1] },
    { label: "900", hex: s[9] },
    { label: "950", hex: s[10] },
    { label: "Black", hex: "#000000" },
  ];
  const pairs = s.flatMap((fg, i) =>
    s.map((bg, j) => ({ i, j, ratio: contrast(fg, bg) })).filter((p) => p.j < p.i && p.ratio >= 4.5),
  );

  return (
    <div className="contrast">
      <p className="hint">
        WCAG 2.2 contrast for {role.name.toLowerCase()} text. Body text needs 4.5:1 (AA) or 7:1 (AAA);
        3:1 is enough only for large text and UI shapes.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Text</th>
              {bgs.map((b) => (
                <th scope="col" key={b.label}>
                  <span className="th-chip" style={{ background: b.hex }} aria-hidden="true" />
                  on {b.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.map((fg, i) => (
              <tr key={i}>
                <th scope="row">
                  <span className="th-chip" style={{ background: fg }} aria-hidden="true" />
                  {STEPS[i]}
                </th>
                {bgs.map((b) => {
                  const ratio = contrast(fg, b.hex);
                  const r = rate(ratio);
                  return (
                    <td key={b.label} className={`cell-${r === "Fail" ? "fail" : r === "AA large" ? "large" : "pass"}`}>
                      {ratio.toFixed(1)}
                      <small>{r}</small>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Pairs within the scale that pass AA</h3>
      <p className="pairs">
        {pairs.length === 0 && "None. Try a base color with more lightness range."}
        {pairs.slice(0, 18).map(({ i, j, ratio }) => (
          <span key={`${i}-${j}`} className="pair" style={{ background: s[j], color: s[i] }} title={`${ratio.toFixed(2)}:1`}>
            {STEPS[i]} on {STEPS[j]}
          </span>
        ))}
      </p>
    </div>
  );
}
