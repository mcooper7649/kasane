import type { Role, RoleId } from "../color/palette";

type Props = { roles: Role[]; selected: RoleId; onSelect: (id: RoleId) => void };

/**
 * The palette as layered robe collars (kasane no irome): each role is one
 * V-shaped band, outermost first, so every color is seen against its neighbors.
 * The innermost band is the neutral's lightest step, like the white under-robe.
 */
export function Layers({ roles, selected, onSelect }: Props) {
  const W = 640, H = 220, band = 22, cx = W / 2;
  // Outer to inner: the primary is the outer robe, the one that shows most.
  const order = roles;
  const inner = roles.find((r) => r.id === "neutral")!.scale.shades[0];

  const collar = (i: number) => {
    const inset = i * band;
    const top = 0, depth = H - 20 - inset * 0.9;
    const x0 = 40 + inset * 1.6, x1 = W - 40 - inset * 1.6;
    return `M ${x0} ${top} L ${cx} ${depth} L ${x1} ${top} Z`;
  };

  return (
    <figure className="layers">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Palette shown as layered collars">
        {order.map((role, i) => (
          <path
            key={role.id}
            d={collar(i)}
            fill={role.base}
            className={role.id === selected ? "layer is-selected" : "layer"}
            tabIndex={0}
            role="button"
            aria-label={`${role.name} ${role.base}`}
            aria-pressed={role.id === selected}
            onClick={() => onSelect(role.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(role.id);
              }
            }}
          />
        ))}
        <path d={collar(order.length)} fill={inner} pointerEvents="none" />
      </svg>
      <figcaption>
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            className={r.id === selected ? "legend is-selected" : "legend"}
            onClick={() => onSelect(r.id)}
          >
            <span style={{ background: r.base }} aria-hidden="true" />
            {r.name}
          </button>
        ))}
      </figcaption>
    </figure>
  );
}
