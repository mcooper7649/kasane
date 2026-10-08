import { useCallback, useEffect, useMemo, useState } from "react";
import { HARMONIES, buildPalette, decodeState, encodeState, randomPrimary, type PaletteState, type RoleId } from "./color/palette";
import { Layers } from "./components/Layers";
import { Scales } from "./components/Scales";
import { Inspector } from "./components/Inspector";
import { ContrastPanel } from "./components/ContrastPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { ExportPanel } from "./components/ExportPanel";
import { ImageImport } from "./components/ImageImport";
import { useCopy } from "./useCopy";

const DEFAULT: PaletteState = { primary: "#2747a8", harmony: "complementary", pinned: {} };
type Tab = "contrast" | "preview" | "export";

export default function App() {
  const [state, setState] = useState<PaletteState>(() => decodeState(location.hash) ?? DEFAULT);
  const [sel, setSel] = useState<{ role: RoleId; step: number }>({ role: "primary", step: 5 });
  const [tab, setTab] = useState<Tab>("contrast");
  const { copy, flash, message } = useCopy();
  const roles = useMemo(() => buildPalette(state), [state]);
  const role = roles.find((r) => r.id === sel.role)!;

  // Keep the URL shareable without filling the back button with every tweak.
  useEffect(() => {
    history.replaceState(null, "", `#${encodeState(state)}`);
  }, [state]);

  useEffect(() => {
    const onHash = () => {
      const s = decodeState(location.hash);
      if (s) setState(s);
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const shuffle = useCallback(() => setState((s) => ({ ...s, primary: randomPrimary() })), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.code !== "Space" || e.repeat || t.closest("input, textarea, button, [role=button], pre")) return;
      e.preventDefault();
      shuffle();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [shuffle]);

  const pin = (id: RoleId, hex: string | null) =>
    setState((s) => {
      if (id === "primary") return hex ? { ...s, primary: hex } : s;
      const pinned = { ...s.pinned };
      if (hex) pinned[id] = hex;
      else delete pinned[id];
      return { ...s, pinned };
    });

  const selectRole = (id: RoleId) => {
    const r = roles.find((x) => x.id === id)!;
    setSel({ role: id, step: r.scale.anchor });
  };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>Kasane</h1>
          <p>Accessible color scales for design systems, built in OKLCH.</p>
        </div>
        <div className="top-actions">
          <button type="button" onClick={shuffle} title="Or press the space bar">
            Shuffle <kbd>Space</kbd>
          </button>
          <button type="button" onClick={() => copy(location.href, "link to this palette")}>
            Copy link
          </button>
        </div>
      </header>

      <section className="stage">
        <Layers roles={roles} selected={sel.role} onSelect={selectRole} />
        <div className="controls">
          <label className="primary-field">
            <span>Primary</span>
            <input type="color" value={state.primary} onChange={(e) => pin("primary", e.target.value)} />
            <code>{state.primary}</code>
          </label>
          <fieldset className="harmony">
            <legend>Accent harmony</legend>
            <div className="segmented" role="radiogroup" aria-label="Accent harmony">
              {HARMONIES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  role="radio"
                  aria-checked={state.harmony === h.id}
                  onClick={() => setState((s) => ({ ...s, harmony: h.id }))}
                >
                  {h.label}
                </button>
              ))}
            </div>
            {state.pinned.accent && <small>Accent is set by hand, so harmony won't change it.</small>}
          </fieldset>
          <ImageImport onPick={(hex) => pin("primary", hex)} onError={flash} />
        </div>
      </section>

      <main className="work">
        <Scales roles={roles} selected={sel} onSelect={(r, step) => setSel({ role: r, step })} onPin={pin} />
        <Inspector role={role} step={sel.step} onCopy={(t) => copy(t)} />
      </main>

      <section className="panels">
        <div className="tabs" role="tablist" aria-label="Tools">
          {(
            [
              ["contrast", `Contrast: ${role.name}`],
              ["preview", "Preview"],
              ["export", "Export"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="panel">
          {tab === "contrast" && <ContrastPanel role={role} />}
          {tab === "preview" && <PreviewPanel roles={roles} />}
          {tab === "export" && <ExportPanel roles={roles} onCopy={copy} />}
        </div>
      </section>

      <footer className="foot">
        <p>
          Named for <i>kasane no irome</i>, the Heian-court practice of layering robes so each color is read against
          the next. Built by <a href="https://www.mycodedojo.com">Michael Cooper</a>.{" "}
          <a href="https://github.com/mcooper7649/kasane">Source on GitHub</a>
        </p>
      </footer>

      <div className="toast" role="status" aria-live="polite">
        {message}
      </div>
    </div>
  );
}
