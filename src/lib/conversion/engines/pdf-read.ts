import type { PDFDocumentProxy } from "pdfjs-dist";
import { baseOf } from "@/lib/files";
import { ConversionError, type ConversionHandlers, type Engine, type OutputFile } from "../types";
import { openPdf, renderPage } from "./pdfjs";
import { breathe, canvasBlob, DOCX_MIME } from "./util";

export const pdfToImages: Engine = async ({ files: [file], output, options }, { onProgress, signal }) => {
  onProgress(0.05, "Opening the PDF");
  const doc = await openPdf(file);
  try {
    const type = output === "png" ? "image/png" : "image/jpeg";
    const results: OutputFile[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      onProgress(0.08 + ((n - 1) / doc.numPages) * 0.9, `Drawing page ${n} of ${doc.numPages}`);
      await breathe(signal);
      const canvas = await renderPage(doc, n, Number(options.dpi ?? 150));
      const blob = await canvasBlob(canvas, type, Number(options.quality ?? 85) / 100);
      canvas.width = canvas.height = 0; // frees memory early on phones
      const suffix = doc.numPages > 1 ? `-${String(n).padStart(String(doc.numPages).length, "0")}` : "";
      results.push({ name: `${baseOf(file.name)}${suffix}.${output}`, blob });
    }
    return { files: results };
  } finally {
    void doc.loadingTask.destroy();
  }
};

interface Run { text: string; size: number; bold: boolean; italic: boolean }
interface Line { runs: Run[]; size: number; x: number; y: number; right: number }
interface Para { kind: "text"; runs: Run[]; size: number; align: "left" | "center" | "right"; y: number; /** Position down the page, 0 to 1. */ yr: number }
interface Picture { kind: "image"; png: Blob; jpeg: boolean; w: number; h: number; y: number }
type Block = Para | Picture;
type Page = Block[];

const textOf = (p: Para) => p.runs.map((r) => r.text).join("");

interface TextItem { str: string; transform: number[]; width: number; height: number; hasEOL: boolean; fontName: string }

/** Real font flags come from the font objects pdf.js loads while preparing to draw. */
function fontFlags(page: { commonObjs: { has(id: string): boolean; get(id: string): unknown } }, id: string) {
  try {
    if (!page.commonObjs.has(id)) return { bold: false, italic: false };
    const f = page.commonObjs.get(id) as { name?: string; bold?: boolean; black?: boolean; italic?: boolean };
    const name = f?.name ?? "";
    return { bold: !!(f?.bold || f?.black) || /bold|black|heavy|semibold|demi/i.test(name), italic: !!f?.italic || /italic|oblique/i.test(name) };
  } catch {
    return { bold: false, italic: false };
  }
}

async function readPage(doc: PDFDocumentProxy, n: number, withImages: boolean): Promise<Page> {
  const page = await doc.getPage(n);
  const view = page.view;
  const pageW = view[2] - view[0], pageH = view[3] - view[1];
  const ops = await page.getOperatorList();
  const { items } = await page.getTextContent();
  // Group pieces into lines by baseline, then read each line left to right.
  type Piece = { str: string; x: number; y: number; size: number; w: number; flags: { bold: boolean; italic: boolean } };
  const rows: Piece[][] = [];
  for (const raw of items) {
    if (!("str" in raw)) continue;
    const item = raw as TextItem;
    if (!item.str) continue;
    const size = Math.hypot(item.transform[2], item.transform[3]) || item.height || 10;
    const piece: Piece = { str: item.str, x: item.transform[4], y: item.transform[5], size, w: item.width, flags: fontFlags(page as never, item.fontName) };
    const row = rows.find((r) => Math.abs(r[0].y - piece.y) <= Math.max(r[0].size, size) * 0.5);
    if (row) row.push(piece); else rows.push([piece]);
  }
  rows.sort((a, b) => b[0].y - a[0].y);
  const lines: Line[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    const visible = row.filter((p) => p.str.trim());
    if (!visible.length) continue;
    const line: Line = { runs: [], size: Math.max(...visible.map((p) => p.size)), x: visible[0].x, y: visible[0].y, right: visible[0].x };
    const add = (text: string, size: number, flags: { bold: boolean; italic: boolean }) => {
      const last = line.runs.at(-1);
      if (last && last.bold === flags.bold && last.italic === flags.italic && Math.abs(last.size - size) < 0.6) last.text += text;
      else line.runs.push({ text, size, ...flags });
    };
    for (const p of visible) {
      const gap = p.x - line.right;
      if (line.runs.length && gap > p.size * 0.12 && !textOfLine(line).endsWith(" ")) add(gap > p.size * 2.5 ? "\t" : " ", p.size, p.flags);
      // Tab leaders such as dotted contents lines become a tab.
      if (/^[.·_\-\s]{6,}$/.test(p.str)) { if (!textOfLine(line).endsWith("\t")) add("\t", p.size, p.flags); line.right = p.x + p.w; continue; }
      add(p.str, p.size, p.flags);
      line.right = Math.max(line.right, p.x + p.w);
    }
    lines.push(line);
  }

  const left = Math.min(...lines.map((l) => l.x), pageW);
  const pageRight = Math.max(0, ...lines.map((l) => l.right));
  const blocks: Page = [];
  let prev: Line | null = null;
  let prevGap: number | null = null;
  for (const l of lines) {
    const text = textOfLine(l).replace(/[ ]+$/, "");
    const last = blocks.at(-1);
    const gap = prev ? prev.y - l.y : Infinity;
    const centre = (l.x + l.right) / 2;
    const narrow = l.right - l.x < (pageRight - left) * 0.8;
    const align: Para["align"] = narrow && l.x > left + 20 && Math.abs(centre - (left + pageRight) / 2) < 12 ? "center"
      : narrow && l.x > left + 40 && Math.abs(l.right - pageRight) < 6 ? "right" : "left";
    // Up to double line spacing still continues a paragraph, as long as the spacing stays the same.
    const joins = prev && last?.kind === "text" && gap > 0 && gap < l.size * 2.6 && (prevGap == null || Math.abs(gap - prevGap) < 1.5) && Math.abs(prev.size - l.size) < 1
      && prev.right > pageRight * 0.82 && !text.includes("\t") && !textOf(last).includes("\t") && last.align === "left" && align === "left"
      && !/^([•▪◦–*-]|\(?\d{1,3}[.)])\s/.test(text);
    if (joins) {
      const tail = last.runs.at(-1)!;
      if (/[a-z]-$/.test(tail.text)) tail.text = tail.text.slice(0, -1);
      else tail.text += " ";
      for (const r of l.runs) last.runs.push({ ...r });
      prevGap = gap;
    } else { blocks.push({ kind: "text", runs: l.runs.map((r) => ({ ...r })), size: l.size, align, y: pageH - l.y, yr: (pageH - l.y) / pageH }); prevGap = null; }
    const tail = (blocks.at(-1) as Para).runs.at(-1);
    if (tail) tail.text = tail.text.replace(/[ ]+$/, "");
    prev = l;
  }

  if (withImages) {
    for (const img of await pageImages(page as never, ops, pageH)) blocks.push(img);
    blocks.sort((a, b) => a.y - b.y);
  }
  page.cleanup();
  return blocks;
}

const textOfLine = (l: Line) => l.runs.map((r) => r.text).join("");

type OpList = { fnArray: number[]; argsArray: unknown[][] };

/** Finds pictures drawn on the page, with their size and position, by replaying the drawing transforms. */
async function pageImages(page: { objs: { get(id: string, cb?: (v: unknown) => void): unknown; has(id: string): boolean } }, ops: OpList, pageH: number): Promise<Picture[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const OPS = pdfjs.OPS as Record<string, number>;
  const out: Picture[] = [];
  const stack: number[][] = [];
  let m = [1, 0, 0, 1, 0, 0];
  const mul = (a: number[], b: number[]) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  for (let i = 0; i < ops.fnArray.length && out.length < 60; i++) {
    const fn = ops.fnArray[i], args = ops.argsArray[i];
    if (fn === OPS.save) stack.push(m);
    else if (fn === OPS.restore) m = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) m = mul(m, args as number[]);
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
      const w = Math.hypot(m[0], m[1]), h = Math.hypot(m[2], m[3]);
      if (w < 24 || h < 24) continue; // icons and rules
      const data = fn === OPS.paintInlineImageXObject ? args[0] : await new Promise<unknown>((resolve) => {
        const id = args[0] as string;
        try { if (page.objs.has(id)) resolve(page.objs.get(id)); else page.objs.get(id, resolve); } catch { resolve(null); }
        setTimeout(() => resolve(null), 3000);
      });
      const img = await imageToBlob(data);
      if (img) out.push({ kind: "image", png: img.blob, jpeg: img.jpeg, w, h, y: pageH - (m[5] + h) });
    }
  }
  return out;
}

/** Photos become JPEG and anything with transparency PNG, to keep the Word file small. */
async function imageToBlob(data: unknown): Promise<{ blob: Blob; jpeg: boolean } | null> {
  const img = data as { bitmap?: ImageBitmap; data?: Uint8ClampedArray | Uint8Array; width: number; height: number; kind?: number } | null;
  if (!img?.width || !img.height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  if (img.bitmap) ctx.drawImage(img.bitmap, 0, 0);
  else if (img.data) {
    const px = ctx.createImageData(img.width, img.height);
    const n = img.width * img.height;
    // pdf.js kinds: 1 grayscale (1 bit), 2 RGB, 3 RGBA.
    if (img.kind === 3 && img.data.length >= n * 4) px.data.set(img.data.subarray(0, n * 4));
    else if (img.kind === 2 && img.data.length >= n * 3) for (let p = 0; p < n; p++) { px.data[p * 4] = img.data[p * 3]; px.data[p * 4 + 1] = img.data[p * 3 + 1]; px.data[p * 4 + 2] = img.data[p * 3 + 2]; px.data[p * 4 + 3] = 255; }
    else return null;
    ctx.putImageData(px, 0, 0);
  } else return null;
  const opaque = img.kind !== 3;
  try { return opaque ? { blob: await canvasBlob(canvas, "image/jpeg", 0.88), jpeg: true } : { blob: await canvasBlob(canvas, "image/png"), jpeg: false }; } catch { return null; }
}

async function readAll(file: File, { onProgress, signal }: ConversionHandlers, withImages = false) {
  onProgress(0.05, "Opening the PDF");
  const doc = await openPdf(file);
  try {
    const pages: Page[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      onProgress(0.08 + (n / doc.numPages) * 0.75, `Reading page ${n} of ${doc.numPages}`);
      await breathe(signal);
      pages.push(await readPage(doc, n, withImages));
    }
    dropRunningText(pages);
    if (!pages.some((p) => p.some((b) => b.kind === "text"))) {
      throw new ConversionError("This PDF is made of images, so there's no text to pull out. It's probably a scan. OCR can read it.", "image-to-text");
    }
    return pages;
  } finally {
    void doc.loadingTask.destroy();
  }
}

/**
 * Headers, footers and page numbers repeat at the same place on most pages.
 * They belong to the page, not the text, so leave them out of documents built from it.
 */
function dropRunningText(pages: Page[]) {
  if (pages.length < 3) return;
  // Only small text in the top or bottom margin counts; headings that start each page stay.
  const sizes = pages.flat().filter((b): b is Para => b.kind === "text").map((b) => b.size).sort((a, b) => a - b);
  const body = sizes[Math.floor(sizes.length / 2)] ?? 11;
  const marginal = (b: Para) => (b.yr < 0.1 || b.yr > 0.9) && b.size <= body * 1.1;
  const key = (b: Para) => (marginal(b) ? `${Math.round(b.y / 6)}|${textOf(b).replace(/\d+/g, "#").replace(/\s+/g, " ").trim()}` : `body|${Math.random()}`);
  const counts = new Map<string, number>();
  for (const p of pages) for (const k of new Set(p.filter((b): b is Para => b.kind === "text").map(key))) counts.set(k, (counts.get(k) ?? 0) + 1);
  const repeated = new Set([...counts].filter(([k, n]) => n >= Math.max(2, pages.length * 0.5) && k.split("|")[1].length < 120).map(([k]) => k));
  for (const [i, p] of pages.entries()) pages[i] = p.filter((b) => b.kind !== "text" || !repeated.has(key(b)));
}

/** Pictures on one page, for Extract Images. */
export async function pageImagesFor(doc: PDFDocumentProxy, n: number) {
  const page = await doc.getPage(n);
  const view = page.view;
  const ops = await page.getOperatorList();
  const images = await pageImages(page as never, ops, view[3] - view[1]);
  page.cleanup();
  return images;
}

const emptyPagesNote = (pages: Page[]) => {
  const n = pages.filter((p) => !p.some((b) => b.kind === "text")).length;
  return n ? [`${n} ${n === 1 ? "page has" : "pages have"} no selectable text, so ${n === 1 ? "it is" : "they are"} blank in the result. OCR can read scanned pages.`] : [];
};

/** Plain text of a PDF, for the word counter. */
export async function pdfPlainText(file: File) {
  const pages = await readAll(file, { onProgress() {}, signal: new AbortController().signal });
  return pages.map((p) => p.flatMap((x) => (x.kind === "text" ? [textOf(x)] : [])).join("\n\n")).join("\n\n");
}

export const pdfToText: Engine = async ({ files: [file] }, handlers) => {
  const pages = await readAll(file, handlers);
  const text = pages.map((p) => p.flatMap((x) => (x.kind === "text" ? [textOf(x)] : [])).join("\n\n")).join("\n\n\n");
  return { files: [{ name: `${baseOf(file.name)}.txt`, blob: new Blob([text], { type: "text/plain;charset=utf-8" }) }], notes: emptyPagesNote(pages) };
};

export const pdfToWord: Engine = async ({ files: [file], options }, handlers) => {
  const pages = await readAll(file, handlers, true);
  handlers.onProgress(0.9, "Writing your Word file");
  const { AlignmentType, Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } = await import("docx");

  // The most common size, by characters, is body text. Anything clearly larger is a heading.
  const weight = new Map<number, number>();
  for (const p of pages.flat()) if (p.kind === "text") weight.set(Math.round(p.size), (weight.get(Math.round(p.size)) ?? 0) + textOf(p).length);
  const body = [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;
  const level = (p: Para) => {
    const len = textOf(p).length;
    return len > 140 ? undefined
      : p.size >= body * 1.7 ? HeadingLevel.HEADING_1
        : p.size >= body * 1.35 ? HeadingLevel.HEADING_2
          : p.size >= body * 1.15 ? HeadingLevel.HEADING_3 : undefined;
  };
  const clean = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const alignment = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT };
  const maxW = 6.3 * 96; // the text width of an A4 page, in the pixels Word images use

  let images = 0;
  const children = [];
  for (const [i, page] of pages.entries()) {
    const blocks = page.length ? page : [{ kind: "text", runs: [{ text: "", size: body, bold: false, italic: false }], size: body, align: "left", y: 0, yr: 0 } as Para];
    for (const [j, b] of blocks.entries()) {
      const pageBreakBefore = j === 0 && i > 0 && options.pageBreaks !== false;
      if (b.kind === "image") {
        const scale = Math.min(1, maxW / (b.w * 96 / 72));
        children.push(new Paragraph({
          pageBreakBefore, alignment: AlignmentType.CENTER, spacing: { after: 120 },
          children: [new ImageRun({ type: b.jpeg ? "jpg" : "png", data: new Uint8Array(await b.png.arrayBuffer()), transformation: { width: Math.round((b.w * 96) / 72 * scale), height: Math.round((b.h * 96) / 72 * scale) } })],
        }));
        images++;
        continue;
      }
      const text = textOf(b);
      const bullet = /^[•▪◦]\s*/.exec(text);
      const heading = level(b);
      let skip = bullet ? bullet[0].length : 0;
      const runs = b.runs.flatMap((r) => {
        let t = r.text;
        if (skip) { const cut = Math.min(skip, t.length); t = t.slice(cut); skip -= cut; }
        if (!t) return [];
        return clean(t).split("\t").flatMap((part, k) => {
          const opts = { bold: heading ? undefined : r.bold || undefined, italics: r.italic || undefined, size: heading ? undefined : Math.round(r.size * 2) };
          return k ? [new TextRun({ text: "\t", ...opts }), new TextRun({ text: part, ...opts })] : [new TextRun({ text: part, ...opts })];
        });
      });
      children.push(new Paragraph({
        heading, bullet: bullet ? { level: 0 } : undefined, pageBreakBefore,
        alignment: alignment[b.align], spacing: { after: 120 }, children: runs,
      }));
    }
  }
  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  const notes = emptyPagesNote(pages);
  if (images) notes.push(`${images} ${images === 1 ? "picture was" : "pictures were"} placed in reading order. Text that wrapped around pictures now sits above or below them.`);
  return { files: [{ name: `${baseOf(file.name)}.docx`, blob: new Blob([blob], { type: DOCX_MIME }) }], notes };
};
