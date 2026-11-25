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
type Level = (typeof levels)[keyof typeof levels];

export const reduceFile: Engine = async ({ files: [file], options }, handlers) => {
  const level = levels[(options.level as keyof typeof levels) ?? "balanced"] ?? levels.balanced;
  const ext = extOf(file.name);
  let blob: Blob;
  let outExt = ext;
  if (ext === "pdf") blob = await reducePdf(file, level, handlers);
  else if (["docx", "pptx", "xlsx"].includes(ext)) blob = await reduceOffice(file, level, handlers);
  else if (["mp3", "m4a", "wav"].includes(ext)) {
    handlers.onProgress(0.1, "Opening the audio");
    blob = await encodeMp3(await decodeAudio(file), level.kbps, false, handlers);
    outExt = "mp3";
  } else blob = await reduceImage(file, ext, level, handlers);

  if (blob.size >= file.size * 0.98) {
    throw new ConversionError(
      ext === "png" ? "This PNG is already as small as we can make it. Converting it to JPG usually gives a smaller file."
        : "This file is already about as small as we can make it at this setting. Try a stronger compression level.",
      ext === "png" ? "image-converter" : undefined,
    );
  }
  const result: OutputFile = { name: `${baseOf(file.name)}-smaller.${outExt}`, blob };
  return { files: [result] };
};

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
