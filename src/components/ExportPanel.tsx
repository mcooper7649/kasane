import { useState } from "react";
import { EXPORTS, exportPalette, type ExportFormat } from "../color/exporters";
import type { Role } from "../color/palette";

type Props = { roles: Role[]; onCopy: (text: string, label: string) => void };

export function ExportPanel({ roles, onCopy }: Props) {
  const [format, setFormat] = useState<ExportFormat>("tailwind4");
  const [oklch, setOklch] = useState(false);
  const meta = EXPORTS.find((e) => e.id === format)!;
  const code = exportPalette(roles, format, oklch);

  const download = () => {
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: meta.file });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export">
      <div className="export-controls">
        <div className="segmented" role="radiogroup" aria-label="Export format">
          {EXPORTS.map((e) => (
            <button key={e.id} type="button" role="radio" aria-checked={format === e.id} onClick={() => setFormat(e.id)}>
              {e.label}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={oklch} onChange={(e) => setOklch(e.target.checked)} />
          Write values as OKLCH
        </label>
      </div>
      <div className="code">
        <div className="code-head">
          <span>{meta.file}</span>
          <div>
            <button type="button" onClick={() => onCopy(code, meta.file)}>
              Copy
            </button>
            <button type="button" onClick={download}>
              Download
            </button>
          </div>
        </div>
        <pre tabIndex={0}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
