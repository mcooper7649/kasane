import { useRef, useState } from "react";
import { extractColors, pickPrimary, type Cluster } from "../color/extract";

type Props = { onPick: (hex: string) => void; onError: (msg: string) => void };

/** Downscale to ~96px so k-means runs instantly, then cluster in OKLab. */
async function readImage(file: File): Promise<Cluster[]> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 96 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return extractColors(ctx.getImageData(0, 0, w, h).data, 6);
}

export function ImageImport({ onPick, onError }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [dragging, setDragging] = useState(false);

  const load = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("That file isn't an image. Use a PNG, JPEG, WebP or GIF.");
      return;
    }
    try {
      const found = await readImage(file);
      if (thumb) URL.revokeObjectURL(thumb);
      setThumb(URL.createObjectURL(file));
      setClusters(found);
      const primary = pickPrimary(found);
      if (primary) onPick(primary);
    } catch {
      onError("Couldn't read that image. Try saving it as PNG or JPEG.");
    }
  };

  return (
    <div
      className={dragging ? "image-import is-dragging" : "image-import"}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        load(e.dataTransfer.files[0]);
      }}
    >
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => load(e.target.files?.[0])} />
      {thumb ? (
        <>
          <img src={thumb} alt="Uploaded" />
          <div className="extracted">
            <span>Build from</span>
            {clusters.map((c) => (
              <button
                key={c.hex}
                type="button"
                style={{ background: c.hex }}
                aria-label={`Use ${c.hex} (${Math.round(c.weight * 100)}% of the image)`}
                title={`${c.hex}, ${Math.round(c.weight * 100)}%`}
                onClick={() => onPick(c.hex)}
              />
            ))}
          </div>
          <button type="button" className="link" onClick={() => input.current?.click()}>
            Replace image
          </button>
        </>
      ) : (
        <button type="button" className="drop" onClick={() => input.current?.click()}>
          <strong>Start from an image</strong>
          <span>Drop a photo, logo or screenshot here, or click to choose one</span>
        </button>
      )}
    </div>
  );
}
