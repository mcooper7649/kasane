import { useState } from "react";
import { parseHex } from "../color/convert";
import { bestText } from "../color/contrast";
import type { Role, RoleId } from "../color/palette";
import { STEPS } from "../color/scale";

type Props = {
  roles: Role[];
  selected: { role: RoleId; step: number };
  onSelect: (role: RoleId, step: number) => void;
  onPin: (role: RoleId, hex: string | null) => void;
};

function HexField({ role, onPin }: { role: Role; onPin: Props["onPin"] }) {
  // Remounted (via key) whenever the base changes, so the draft starts fresh.
  const [draft, setDraft] = useState(role.base);
  const commit = (v: string) => {
    const hex = v.startsWith("#") ? v : `#${v}`;
    if (parseHex(hex) && hex.toLowerCase() !== role.base) onPin(role.id, hex.toLowerCase());
    else setDraft(role.base);
  };
  return (
    <input
      className="hex"
      value={draft}
      spellCheck={false}
      aria-label={`${role.name} hex`}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && commit(e.currentTarget.value)}
    />
  );
}

function BaseInput({ role, onPin }: { role: Role; onPin: Props["onPin"] }) {
  return (
    <div className="base-input">
      <input
        type="color"
        value={role.base}
        aria-label={`${role.name} color picker`}
        onChange={(e) => onPin(role.id, e.target.value)}
      />
      <HexField key={role.base} role={role} onPin={onPin} />
    </div>
  );
}

export function Scales({ roles, selected, onSelect, onPin }: Props) {
  return (
    <div className="scales" role="grid" aria-label="Color scales">
      <div className="scales-head" role="row">
        <span role="columnheader">Role</span>
        {STEPS.map((s) => (
          <span key={s} role="columnheader">
            {s}
          </span>
        ))}
      </div>
      {roles.map((role) => (
        <div className="scale-row" role="row" key={role.id}>
          <div className="role-cell" role="rowheader">
            <span className="role-name">{role.name}</span>
            {role.id === "primary" ? (
              <BaseInput role={role} onPin={onPin} />
            ) : role.pinned ? (
              <div className="role-pin">
                <BaseInput role={role} onPin={onPin} />
                <button type="button" className="link" onClick={() => onPin(role.id, null)}>
                  Reset to derived
                </button>
              </div>
            ) : (
              <div className="role-pin">
                <BaseInput role={role} onPin={onPin} />
                <span className="derived">Derived</span>
              </div>
            )}
          </div>
          {role.scale.shades.map((hex, i) => {
            const isSel = selected.role === role.id && selected.step === i;
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                className={isSel ? "swatch is-selected" : "swatch"}
                style={{ background: hex, color: bestText(hex) }}
                aria-label={`${role.name} ${STEPS[i]} ${hex}${i === role.scale.anchor ? ", base color" : ""}`}
                aria-selected={isSel}
                onClick={() => onSelect(role.id, i)}
              >
                <span className="swatch-hex">{hex.slice(1)}</span>
                {i === role.scale.anchor && <span className="anchor" title="Your base color" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
