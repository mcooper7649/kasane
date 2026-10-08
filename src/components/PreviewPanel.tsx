import { useState, type CSSProperties } from "react";
import { bestText } from "../color/contrast";
import type { Role, RoleId } from "../color/palette";

/** A small product screen painted with the palette, to judge it in context. */
export function PreviewPanel({ roles }: { roles: Role[] }) {
  const [dark, setDark] = useState(false);
  const s = (id: RoleId, step: number) => roles.find((r) => r.id === id)!.scale.shades[step];
  const pick = (light: number, darkStep: number) => (dark ? darkStep : light);

  const primary = s("primary", pick(6, 4));
  const accent = s("accent", pick(6, 4));
  const vars = {
    "--p-bg": s("neutral", pick(0, 10)),
    "--p-surface": dark ? s("neutral", 9) : "#ffffff",
    "--p-text": s("neutral", pick(9, 0)),
    "--p-muted": s("neutral", pick(6, 4)),
    "--p-border": s("neutral", pick(2, 8)),
    "--p-primary": primary,
    "--p-on-primary": bestText(primary, "#ffffff", s("primary", 10)),
    "--p-primary-soft": s("primary", pick(1, 9)),
    "--p-primary-ink": s("primary", pick(7, 2)),
    "--p-accent": accent,
    "--p-on-accent": bestText(accent, "#ffffff", s("accent", 10)),
    ...Object.fromEntries(
      (["success", "warning", "danger"] as const).flatMap((id) => [
        [`--p-${id}-bg`, s(id, pick(0, 9))],
        [`--p-${id}-border`, s(id, pick(3, 7))],
        [`--p-${id}-ink`, s(id, pick(8, 2))],
      ]),
    ),
  } as CSSProperties;

  return (
    <div className="preview-wrap">
      <div className="segmented" role="radiogroup" aria-label="Preview theme">
        {(["Light", "Dark"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={dark === (m === "Dark")}
            onClick={() => setDark(m === "Dark")}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="preview" style={vars}>
        <header className="pv-bar">
          <strong>Ledgerly</strong>
          <nav>
            <span className="pv-active">Invoices</span>
            <span>Clients</span>
            <span>Reports</span>
          </nav>
          <span className="pv-avatar" aria-hidden="true">
            MC
          </span>
        </header>
        <div className="pv-body">
          <section className="pv-card">
            <div className="pv-card-head">
              <div>
                <h4>Invoice #1042</h4>
                <p>Harbor & Pine Studio, due Oct 30</p>
              </div>
              <span className="pv-badge">Sent</span>
            </div>
            <p className="pv-amount">$4,280.00</p>
            <label className="pv-field">
              Note to client
              <input defaultValue="Thanks for the quick turnaround." />
            </label>
            <div className="pv-actions">
              <button type="button" className="pv-btn pv-btn-primary">
                Send reminder
              </button>
              <button type="button" className="pv-btn pv-btn-ghost">
                Download PDF
              </button>
              <button type="button" className="pv-btn pv-btn-accent">
                Upgrade plan
              </button>
            </div>
          </section>
          <div className="pv-alerts">
            <p className="pv-alert pv-success">Payment of $1,200 received from Northwind.</p>
            <p className="pv-alert pv-warning">Two invoices are due this week.</p>
            <p className="pv-alert pv-danger">Card ending 4421 was declined.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
