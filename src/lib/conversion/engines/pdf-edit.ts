import { degrees, PDFDocument } from "pdf-lib";
import { baseOf } from "@/lib/files";
import { ConversionError, type Engine } from "../types";
import { breathe, canvasBlob, drawScaled, openImage, PDF_MIME, toBlob } from "./util";

const open = async (file: File) => PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });

export const mergePdf: Engine = async ({ files }, { onProgress, signal }) => {
  const out = await PDFDocument.create();
  for (const [i, file] of files.entries()) {
    onProgress(0.05 + (i / files.length) * 0.85, `Adding ${file.name}`);
    await breathe(signal);
    let src: PDFDocument;
    try {
      src = await open(file);
    } catch (e) {
      const locked = /encrypt/i.test(String(e));
      throw new ConversionError(locked ? `"${file.name}" is password protected. Remove the password, then merge again.` : `"${file.name}" couldn't be opened. Remove it or export it again, then retry.`);
    }
    (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
  }
  onProgress(0.95, "Saving the PDF");
  return { files: [{ name: `${baseOf(files[0].name)}-merged.pdf`, blob: toBlob(await out.save(), PDF_MIME) }] };
};

export function parseRanges(input: string, pageCount: number): { label: string; pages: number[] }[] {
  const parts = input.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new ConversionError("Enter the pages you want, for example 1-3, 5.");
  return parts.map((part) => {
    const m = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(part);
    if (!m) throw new ConversionError(`"${part}" isn't a page range. Use numbers like 1-3, 5, 8-10.`);
    const from = Number(m[1]);
    const to = Number(m[2] ?? m[1]);
    if (from < 1 || to > pageCount || from > pageCount) {
      throw new ConversionError(`This PDF has ${pageCount} ${pageCount === 1 ? "page" : "pages"}, so "${part}" is out of range.`);
    }
    const step = to >= from ? 1 : -1;
    const pages = Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from - 1 + i * step);
    return { label: from === to ? `page-${from}` : `pages-${from}-${to}`, pages };
  });
}

export const splitPdf: Engine = async ({ files: [file], options }, { onProgress, signal }) => {
  onProgress(0.05, "Opening the PDF");
  const src = await open(file);
  const count = src.getPageCount();
  const groups = options.mode === "every"
    ? Array.from({ length: count }, (_, i) => ({ label: `page-${String(i + 1).padStart(String(count).length, "0")}`, pages: [i] }))
    : parseRanges(String(options.ranges ?? ""), count);
  const results = [];
  for (const [i, g] of groups.entries()) {
    onProgress(0.1 + (i / groups.length) * 0.88, "Separating the pages");
    await breathe(signal);
    const out = await PDFDocument.create();
    (await out.copyPages(src, g.pages)).forEach((p) => out.addPage(p));
    results.push({ name: `${baseOf(file.name)}-${g.label}.pdf`, blob: toBlob(await out.save(), PDF_MIME) });
  }
  return { files: results };
};

export const rotatePdf: Engine = async ({ files: [file], options }, { onProgress }) => {
  onProgress(0.2, "Opening the PDF");
  const doc = await open(file);
  const angle = Number(options.angle);
  doc.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + angle) % 360)));
  onProgress(0.8, "Saving");
  return { files: [{ name: `${baseOf(file.name)}-rotated.pdf`, blob: toBlob(await doc.save(), PDF_MIME) }] };
};

const pageSizes: Record<string, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };
const margins: Record<string, number> = { none: 0, small: 24, large: 56 };

export const imagesToPdf: Engine = async ({ files, options }, { onProgress, signal }) => {
  const doc = await PDFDocument.create();
  const margin = margins[String(options.margin)] ?? 24;
  for (const [i, file] of files.entries()) {
    onProgress(0.05 + (i / files.length) * 0.85, `Placing ${file.name}`);
    await breathe(signal);
    const bitmap = await openImage(file, file.name);
    const canvas = drawScaled(bitmap, 3200, "#fff");
    bitmap.close();
    const jpg = await canvasBlob(canvas, "image/jpeg", Number(options.quality ?? 85) / 100);
    const image = await doc.embedJpg(await jpg.arrayBuffer());
    const fixed = pageSizes[String(options.pageSize)];
    let [w, h] = fixed ?? [image.width * 0.75 + margin * 2, image.height * 0.75 + margin * 2];
    if (fixed && image.width > image.height) [w, h] = [h, w];
    const scale = Math.min((w - margin * 2) / image.width, (h - margin * 2) / image.height);
    const page = doc.addPage([w, h]);
    page.drawImage(image, { x: (w - image.width * scale) / 2, y: (h - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
  }
  onProgress(0.95, "Saving the PDF");
  const name = files.length === 1 ? `${baseOf(files[0].name)}.pdf` : `${baseOf(files[0].name)}-and-${files.length - 1}-more.pdf`;
  return { files: [{ name, blob: toBlob(await doc.save(), PDF_MIME) }] };
};
