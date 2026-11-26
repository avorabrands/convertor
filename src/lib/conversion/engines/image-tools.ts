import { baseOf, extOf, formatBytes } from "@/lib/files";
import { ConversionError, type Engine } from "../types";
import { breathe, canvasBlob, canvasOf, openImage } from "./util";

const mimeFor = (ext: string) => (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");
const extFor = (mime: string) => (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg");

function positive(text: unknown, label: string): number | null {
  const t = String(text ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0 || n > 20000) throw new ConversionError(`${label} must be a number of pixels, such as 800.`);
  return Math.round(n);
}

export const resizeImage: Engine = async ({ files: [file], options }, { onProgress }) => {
  onProgress(0.2, "Opening your image");
  const bitmap = await openImage(file, file.name);
  let w: number, h: number;
  if (options.mode === "percent") {
    const k = Number(options.percent ?? 50) / 100;
    w = bitmap.width * k; h = bitmap.height * k;
  } else {
    const tw = positive(options.width, "Width"), th = positive(options.height, "Height");
    if (!tw && !th) throw new ConversionError("Enter a width, a height, or both.");
    if (tw && th && options.keepRatio === false) { w = tw; h = th; }
    else {
      const k = Math.min(tw ? tw / bitmap.width : Infinity, th ? th / bitmap.height : Infinity);
      w = bitmap.width * k; h = bitmap.height * k;
    }
  }
  const { canvas, ctx } = canvasOf(Math.max(1, w), Math.max(1, h));
  const ext = extOf(file.name);
  const mime = options.format && options.format !== "same" ? mimeFor(String(options.format)) : mimeFor(ext === "png" || ext === "webp" ? ext : "jpg");
  if (mime === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  onProgress(0.7, "Saving");
  const blob = await canvasBlob(canvas, mime, 0.92);
  return { files: [{ name: `${baseOf(file.name)}-${canvas.width}x${canvas.height}.${extFor(mime)}`, blob }] };
};

/** Exam and job forms often want a photo under a set size, like 50 KB. */
export const compressImageToSize: Engine = async ({ files: [file], options }, { onProgress, signal }) => {
  const target = Number(String(options.target ?? "100").trim()) * 1024;
  if (!Number.isFinite(target) || target < 5 * 1024) throw new ConversionError("Choose a target of at least 5 KB.");
  onProgress(0.1, "Opening your image");
  const bitmap = await openImage(file, file.name);
  const maxSide = Number(options.maxSide ?? 0);
  let scale = maxSide > 0 ? Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height)) : 1;
  let best: Blob | null = null;
  // Try qualities from high to low; shrink the picture only when quality alone isn't enough.
  for (let round = 0; round < 8 && !best; round++) {
    const { canvas, ctx } = canvasOf(bitmap.width * scale, bitmap.height * scale);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let lo = 0.3, hi = 0.95, found: Blob | null = null;
    const atLow = await canvasBlob(canvas, "image/jpeg", lo);
    if (atLow.size <= target) {
      for (let i = 0; i < 7; i++) {
        await breathe(signal);
        const q = (lo + hi) / 2;
        const b = await canvasBlob(canvas, "image/jpeg", q);
        if (b.size <= target) { found = b; lo = q; } else hi = q;
      }
      best = found ?? atLow;
    } else scale *= Math.max(0.5, Math.sqrt(target / atLow.size) * 0.95);
    onProgress(0.2 + round * 0.09, "Finding the best quality");
  }
  bitmap.close();
  if (!best) throw new ConversionError("We couldn't get this picture that small without ruining it. Try a larger target size.");
  const out = await createImageBitmap(best);
  const dims = `${out.width}×${out.height}`;
  out.close();
  return {
    files: [{ name: `${baseOf(file.name)}-${Math.round(best.size / 1024)}kb.jpg`, blob: best }],
    notes: [`Saved as a ${formatBytes(best.size)} JPG, ${dims} pixels.`],
  };
};
