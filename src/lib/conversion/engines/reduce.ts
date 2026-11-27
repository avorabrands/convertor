import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import type { Zippable } from "fflate";
import { baseOf, extOf } from "@/lib/files";
import { ConversionError, type ConversionHandlers, type Engine, type OutputFile } from "../types";
import { decodeAudio, encodeMp3 } from "./audio";
import { breathe, canvasBlob, canvasOf, drawScaled, openImage, PDF_MIME, toBlob } from "./util";
import { unzipAsync, zipAsync } from "./zip";

const levels = {
  light: { maxSide: 2400, quality: 0.82, kbps: 128 },
  balanced: { maxSide: 1700, quality: 0.68, kbps: 96 },
  strong: { maxSide: 1100, quality: 0.5, kbps: 64 },
} as const;
type Level = { maxSide: number; quality: number; kbps: number };

/** A point on a smooth scale from barely compressed (0) to as small as possible (1). */
const levelAt = (s: number): Level => ({ maxSide: Math.round(3000 - 2400 * s), quality: 0.92 - 0.6 * s, kbps: Math.round(192 - 160 * s) });

/** Reads "2", "1.5", "500" with a KB or MB unit as bytes. */
function targetBytes(value: unknown, unit: unknown) {
  const n = Number(String(value ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) throw new ConversionError("Type the size you need, such as 2 for 2 MB or 500 for 500 KB.");
  const bytes = n * (unit === "KB" ? 1024 : 1024 * 1024);
  if (bytes < 10 * 1024) throw new ConversionError("Choose a target of at least 10 KB.");
  return bytes;
}

async function compressOnce(file: File, ext: string, level: Level, handlers: ConversionHandlers): Promise<{ blob: Blob; ext: string }> {
  if (ext === "pdf") return { blob: await reducePdf(file, level, handlers), ext };
  if (["docx", "pptx", "xlsx"].includes(ext)) return { blob: await reduceOffice(file, level, handlers), ext };
  if (["mp3", "m4a", "wav"].includes(ext)) {
    handlers.onProgress(0.1, "Opening the audio");
    return { blob: await encodeMp3(await decodeAudio(file), level.kbps, false, handlers), ext: "mp3" };
  }
  return { blob: await reduceImage(file, ext, level, handlers), ext };
}

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(n >= 10 * 1024 * 1024 ? 0 : 1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export const reduceFile: Engine = async ({ files: [file], options }, handlers) => {
  const ext = extOf(file.name);
  const notes: string[] = [];
  let out: { blob: Blob; ext: string };

  if (options.level === "target") {
    const target = targetBytes(options.target, options.unit);
    // Repeat the target the way the student typed it.
    const label = `${String(options.target).trim().replace(",", ".")} ${options.unit === "KB" ? "KB" : "MB"}`;
    if (file.size <= target) throw new ConversionError(`This file is already ${kb(file.size)}, which is under your ${label} target.`);
    out = await toTarget(file, ext, target, label, handlers, notes);
  } else {
    const level = levels[(options.level as keyof typeof levels) ?? "balanced"] ?? levels.balanced;
    out = await compressOnce(file, ext, level, handlers);
  }

  if (out.blob.size >= file.size * 0.98) {
    throw new ConversionError(
      ext === "png" ? "This PNG is already as small as we can make it. Converting it to JPG usually gives a smaller file."
        : "This file is already about as small as we can make it at this setting. Try a stronger compression level.",
      ext === "png" ? "image-converter" : undefined,
    );
  }
  const result: OutputFile = { name: `${baseOf(file.name)}-smaller.${out.ext}`, blob: out.blob };
  return { files: [result], notes };
};

/**
 * Finds the lightest compression that fits under the target, so quality stays as high as possible.
 * Tries the strongest setting first: if even that is too big, there's no point searching.
 */
async function toTarget(file: File, ext: string, target: number, label: string, handlers: ConversionHandlers, notes: string[]) {
  const { onProgress, signal } = handlers;
  // Audio size follows bitrate directly, so work it out instead of searching.
  if (["mp3", "m4a", "wav"].includes(ext)) {
    onProgress(0.1, "Opening the audio");
    const audio = await decodeAudio(file);
    const kbps = [320, 256, 192, 160, 128, 112, 96, 80, 64, 56, 48, 40, 32].find((k) => (k * 1000 * audio.duration) / 8 <= target * 0.97) ?? 32;
    const blob = await encodeMp3(audio, kbps, kbps <= 64, handlers);
    if (blob.size > target) notes.push(`The smallest this recording gets is ${kb(blob.size)}, a little over your ${label} target. Trim it to make it smaller.`);
    else notes.push(`Saved at ${kbps} kbps to fit under ${label}.`);
    return { blob, ext: "mp3" };
  }
  const step = (from: number, to: number, label: string): ConversionHandlers => ({
    signal, onProgress: (v) => onProgress(from + (to - from) * Math.min(1, Math.max(0, v)), label),
  });
  const strongest = await compressOnce(file, ext, levelAt(1), step(0.02, 0.3, "Trying the strongest setting"));
  if (strongest.blob.size > target) {
    notes.push(`The smallest we can make this file is ${kb(strongest.blob.size)}, so it's above your ${label} target. Most of what's left is text and layout, which can't be compressed further.`);
    return strongest;
  }
  let lo = 0, hi = 1, best = strongest;
  for (let i = 0; i < 5; i++) {
    await breathe(signal);
    const mid = (lo + hi) / 2;
    const tryOut = await compressOnce(file, ext, levelAt(mid), step(0.3 + i * 0.14, 0.44 + i * 0.14, `Finding the best quality under ${label}`));
    if (tryOut.blob.size <= target) { best = tryOut; hi = mid; } else lo = mid;
  }
  notes.push(`Compressed to ${kb(best.blob.size)}, under your ${label} target, at the best quality that fits.`);
  return best;
}

async function reduceImage(file: File, ext: string, level: Level, { onProgress }: ConversionHandlers) {
  onProgress(0.3, "Opening your image");
  const bitmap = await openImage(file, file.name);
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const canvas = drawScaled(bitmap, level.maxSide);
  bitmap.close();
  onProgress(0.7, "Saving the smaller file");
  return canvasBlob(canvas, type, level.quality);
}

/** Word, PowerPoint and Excel files are ZIPs; their size is mostly the pictures in /media/. */
async function reduceOffice(file: File, level: Level, { onProgress, signal }: ConversionHandlers) {
  onProgress(0.1, "Opening your file");
  const entries = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
  const names = Object.keys(entries);
  const out: Zippable = {};
  for (const [i, name] of names.entries()) {
    let bytes = entries[name];
    const type = /\/media\/[^/]+\.jpe?g$/i.test(name) ? "image/jpeg" : /\/media\/[^/]+\.png$/i.test(name) ? "image/png" : null;
    if (type) {
      onProgress(0.15 + (i / names.length) * 0.7, "Compressing pictures");
      await breathe(signal);
      try {
        const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type }));
        const smaller = await canvasBlob(drawScaled(bitmap, level.maxSide), type, level.quality);
        bitmap.close();
        if (smaller.size < bytes.length) bytes = new Uint8Array(await smaller.arrayBuffer());
      } catch {
        // Leave pictures the browser can't open exactly as they were.
      }
    }
    out[name] = bytes;
  }
  onProgress(0.9, "Saving the smaller file");
  return toBlob(await zipAsync(out, 9), file.type || "application/octet-stream");
}

const N = (s: string) => PDFName.of(s);

/** Re-encodes images inside the PDF and leaves text and drawing untouched. */
async function reducePdf(file: File, level: Level, { onProgress, signal }: ConversionHandlers) {
  onProgress(0.05, "Opening the PDF");
  const doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  const images = doc.context.enumerateIndirectObjects().filter(
    ([, o]) => o instanceof PDFRawStream && o.dict.get(N("Subtype")) === N("Image"));

  for (const [i, [ref, obj]] of images.entries()) {
    onProgress(0.1 + (i / images.length) * 0.8, `Compressing image ${i + 1} of ${images.length}`);
    await breathe(signal);
    try {
      const smaller = await reencode(obj as PDFRawStream, doc, level);
      if (smaller) doc.context.assign(ref, smaller);
    } catch {
      // Unusual image encoding: keep the original.
    }
  }
  onProgress(0.93, "Saving the smaller file");
  return toBlob(await doc.save({ useObjectStreams: true }), PDF_MIME);
}

async function reencode(stream: PDFRawStream, doc: PDFDocument, level: Level): Promise<PDFRawStream | null> {
  const { dict } = stream;
  const ctx = doc.context;
  if (stream.contents.length < 8_000) return null;
  if (dict.get(N("ImageMask")) || dict.get(N("Decode")) || dict.get(N("Mask"))) return null;

  const width = dict.lookup(N("Width"), PDFNumber).asNumber();
  const height = dict.lookup(N("Height"), PDFNumber).asNumber();
  let filter = dict.lookup(N("Filter"));
  if (filter instanceof PDFArray) {
    if (filter.size() !== 1) return null;
    filter = filter.lookup(0);
  }

  let space = dict.lookup(N("ColorSpace"));
  let components = 0;
  if (space === N("DeviceRGB")) components = 3;
  else if (space === N("DeviceGray")) components = 1;
  else if (space instanceof PDFArray && space.lookup(0) === N("ICCBased")) {
    const profile = space.lookup(1);
    const n = profile instanceof PDFRawStream ? profile.dict.lookup(N("N")) : undefined;
    components = n instanceof PDFNumber ? n.asNumber() : 0;
  } else if (space instanceof PDFArray && space.lookup(0) === N("CalRGB")) components = 3;
  if (components !== 1 && components !== 3) return null; // CMYK and indexed colour stay as they are

  let source: ImageBitmap;
  if (filter === N("DCTDecode")) {
    source = await createImageBitmap(new Blob([stream.contents as BlobPart], { type: "image/jpeg" }), { imageOrientation: "none" });
  } else if (filter === N("FlateDecode")) {
    const bits = dict.lookup(N("BitsPerComponent"));
    if (!(bits instanceof PDFNumber) || bits.asNumber() !== 8) return null;
    const parms = dict.lookup(N("DecodeParms"));
    let predictor = 1;
    if (parms instanceof PDFDict) {
      const p = parms.lookup(N("Predictor"));
      predictor = p instanceof PDFNumber ? p.asNumber() : 1;
    } else if (parms) return null;
    const raw = decodePDFRawStream(stream).decode();
    const pixels = predictor === 1 ? raw : predictor >= 10 ? undoPng(raw, width, height, components) : null;
    if (!pixels || pixels.length < width * height * components) return null;
    const rgba = new ImageData(width, height);
    for (let p = 0; p < width * height; p++) {
      const s = p * components;
      rgba.data[p * 4] = pixels[s];
      rgba.data[p * 4 + 1] = pixels[components === 3 ? s + 1 : s];
      rgba.data[p * 4 + 2] = pixels[components === 3 ? s + 2 : s];
      rgba.data[p * 4 + 3] = 255;
    }
    source = await createImageBitmap(rgba);
  } else return null;

  const scale = Math.min(1, level.maxSide / Math.max(source.width, source.height));
  const { canvas, ctx: g } = canvasOf(source.width * scale, source.height * scale);
  g.imageSmoothingQuality = "high";
  g.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  const jpg = new Uint8Array(await (await canvasBlob(canvas, "image/jpeg", level.quality)).arrayBuffer());
  if (jpg.length >= stream.contents.length * 0.95) return null;

  const next = dict.clone(ctx);
  next.set(N("Width"), PDFNumber.of(canvas.width));
  next.set(N("Height"), PDFNumber.of(canvas.height));
  next.set(N("ColorSpace"), N("DeviceRGB"));
  next.set(N("BitsPerComponent"), PDFNumber.of(8));
  next.set(N("Filter"), N("DCTDecode"));
  next.set(N("Length"), PDFNumber.of(jpg.length));
  next.delete(N("DecodeParms"));
  return PDFRawStream.of(next, jpg);
}

/** Reverses PNG row filters, which most PDF writers apply before deflating. */
function undoPng(raw: Uint8Array, width: number, height: number, bpp: number) {
  const row = width * bpp;
  if (raw.length < (row + 1) * height) return null;
  const out = new Uint8Array(row * height);
  for (let y = 0; y < height; y++) {
    const type = raw[y * (row + 1)];
    for (let x = 0; x < row; x++) {
      const value = raw[y * (row + 1) + 1 + x];
      const a = x >= bpp ? out[y * row + x - bpp] : 0;
      const b = y ? out[(y - 1) * row + x] : 0;
      const c = y && x >= bpp ? out[(y - 1) * row + x - bpp] : 0;
      let add = 0;
      if (type === 1) add = a;
      else if (type === 2) add = b;
      else if (type === 3) add = (a + b) >> 1;
      else if (type === 4) {
        const p = a + b - c;
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * row + x] = value + add;
    }
  }
  return out;
}
