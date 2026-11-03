import "server-only";
import sharp from "sharp";

/**
 * Turns a phone photo of a signature or stamp on paper into a clean PNG with a
 * transparent background. The paper's own shading (uneven light, shadows) is
 * measured with a heavy blur and divided out, so only the ink is kept, in its
 * own colour. Images that already have transparency are left as they are.
 */
export async function inkOnly(input: Buffer, opts: { maxSize?: number; darken?: number } = {}): Promise<Buffer> {
  const base = sharp(input, { failOn: "error" }).rotate();
  const meta = await base.metadata();
  const max = opts.maxSize ?? 1400;

  if (meta.hasAlpha) {
    const { data, info } = await base.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 250) transparent++;
    // A real transparent PNG: keep it, only trim and size it.
    if (transparent > (info.width * info.height) / 20) return base.trim({ threshold: 1 }).resize(max, max, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  }

  const img = base.clone().resize(max, max, { fit: "inside", withoutEnlargement: true }).removeAlpha();
  const { data: rgb, info } = await img.clone().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const gray = await img.clone().greyscale().raw().toBuffer();
  // The paper alone: a blur wide enough to wash out the strokes.
  const paper = await sharp(gray, { raw: { width: W, height: H, channels: 1 } }).blur(Math.max(12, Math.round(Math.min(W, H) / 25))).raw().toBuffer();

  const out = Buffer.alloc(W * H * 4);
  const darken = opts.darken ?? 0.4;
  for (let p = 0; p < W * H; p++) {
    const bg = Math.max(40, paper[p]);
    const lum = gray[p];
    // How much darker than the paper this pixel is (0 = paper, 1 = solid ink).
    const depth = (bg - lum) / bg;
    const a = Math.min(1, Math.max(0, (depth - 0.08) / 0.32));
    const o = p * 4;
    for (let c = 0; c < 3; c++) {
      // Divide out the paper colour, then deepen so thin strokes stay legible.
      const flat = Math.min(255, (rgb[p * 3 + c] * 255) / bg);
      out[o + c] = Math.max(0, Math.round(flat * (1 - darken)));
    }
    out[o + 3] = Math.round(a * 255);
  }
  // Crop to the ink itself: strong pixels away from the photo's edges (where
  // shadows and table corners show up), ignoring lone specks.
  const edge = Math.round(Math.min(W, H) * 0.05);
  const rows = new Array(H).fill(0), cols = new Array(W).fill(0);
  for (let y = edge; y < H - edge; y++) for (let x = edge; x < W - edge; x++) if (out[(y * W + x) * 4 + 3] > 170) { rows[y]++; cols[x]++; }
  const span = (a: number[]) => {
    const min = Math.max(2, Math.round(Math.max(...a) * 0.02));
    const first = a.findIndex((v) => v >= min), last = a.length - 1 - [...a].reverse().findIndex((v) => v >= min);
    return first < 0 ? [0, a.length - 1] : [first, last];
  };
  const [y0, y1] = span(rows), [x0, x1] = span(cols);
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
  const left = Math.max(0, x0 - pad), top = Math.max(0, y0 - pad);
  const width = Math.min(W - left, x1 - x0 + 2 * pad), height = Math.min(H - top, y1 - y0 + 2 * pad);
  // Anything outside the crop is dropped; faint haze inside it is cleared.
  for (let p = 0; p < W * H; p++) if (out[p * 4 + 3] < 25) out[p * 4 + 3] = 0;
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).extract({ left, top, width, height }).resize(900, 900, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
}
