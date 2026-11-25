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

interface Line { text: string; size: number; x: number; y: number; right: number }
interface Para { text: string; size: number }
type Page = Para[];

interface TextItem { str: string; transform: number[]; width: number; height: number; hasEOL: boolean }

async function readPage(doc: PDFDocumentProxy, n: number): Promise<Page> {
  const page = await doc.getPage(n);
  const { items } = await page.getTextContent();
  const lines: Line[] = [];
  let line: Line | null = null;
  for (const raw of items) {
    if (!("str" in raw)) continue;
    const item = raw as TextItem;
    const size = Math.hypot(item.transform[2], item.transform[3]) || item.height || 10;
    const [x, y] = [item.transform[4], item.transform[5]];
    if (!item.str.trim()) {
      if (line && item.str && !line.text.endsWith(" ")) line.text += " ";
      continue;
    }
    if (!line || Math.abs(y - line.y) > Math.max(size, line.size) * 0.5) {
      line = { text: "", size, x, y, right: x };
      lines.push(line);
    } else if (x - line.right > size * 0.22 && !line.text.endsWith(" ")) {
      line.text += x - line.right > size * 2.5 ? "\t" : " ";
    }
    line.text += item.str;
    line.right = x + item.width;
    line.size = Math.max(line.size, size);
  }
  page.cleanup();

  const pageRight = Math.max(0, ...lines.map((l) => l.right));
  const paras: Page = [];
  let prev: Line | null = null;
  for (const l of lines) {
    const text = l.text.replace(/[ ]+$/, "");
    const last = paras.at(-1);
    const gap = prev ? prev.y - l.y : Infinity;
    const joins = prev && last && gap > 0 && gap < l.size * 1.65 && Math.abs(prev.size - l.size) < 1
      && prev.right > pageRight * 0.82 && !text.includes("\t") && !last.text.includes("\t")
      && !/^([•▪◦–*-]|\(?\d{1,3}[.)])\s/.test(text);
    if (joins) last.text = /[a-z]-$/.test(last.text) ? last.text.slice(0, -1) + text : `${last.text} ${text}`;
    else paras.push({ text, size: l.size });
    prev = l;
  }
  return paras;
}

async function readAll(file: File, { onProgress, signal }: ConversionHandlers) {
  onProgress(0.05, "Opening the PDF");
  const doc = await openPdf(file);
  try {
    const pages: Page[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      onProgress(0.08 + (n / doc.numPages) * 0.75, `Reading page ${n} of ${doc.numPages}`);
      await breathe(signal);
      pages.push(await readPage(doc, n));
    }
    if (!pages.some((p) => p.length)) {
      throw new ConversionError("This PDF is made of images, so there's no text to pull out. It's probably a scan. OCR can read it.", "ocr");
    }
    return pages;
  } finally {
    void doc.loadingTask.destroy();
  }
}

const emptyPagesNote = (pages: Page[]) => {
  const n = pages.filter((p) => !p.length).length;
  return n ? [`${n} ${n === 1 ? "page has" : "pages have"} no selectable text, so ${n === 1 ? "it is" : "they are"} blank in the result. OCR can read scanned pages.`] : [];
};

export const pdfToText: Engine = async ({ files: [file] }, handlers) => {
  const pages = await readAll(file, handlers);
  const text = pages.map((p) => p.map((x) => x.text).join("\n\n")).join("\n\n\n");
  return { files: [{ name: `${baseOf(file.name)}.txt`, blob: new Blob([text], { type: "text/plain;charset=utf-8" }) }], notes: emptyPagesNote(pages) };
};

export const pdfToWord: Engine = async ({ files: [file], options }, handlers) => {
  const pages = await readAll(file, handlers);
  handlers.onProgress(0.9, "Writing your Word file");
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");

  // The most common size, by characters, is body text. Anything clearly larger is a heading.
  const weight = new Map<number, number>();
  for (const p of pages.flat()) weight.set(Math.round(p.size), (weight.get(Math.round(p.size)) ?? 0) + p.text.length);
  const body = [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;
  const level = (p: Para) =>
    p.text.length > 140 ? undefined
      : p.size >= body * 1.7 ? HeadingLevel.HEADING_1
        : p.size >= body * 1.35 ? HeadingLevel.HEADING_2
          : p.size >= body * 1.15 ? HeadingLevel.HEADING_3 : undefined;

  const clean = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const children = pages.flatMap((page, i) =>
    (page.length ? page : [{ text: "", size: body }]).map((p, j) => {
      const bullet = /^[•▪◦]\s*/.exec(p.text);
      const heading = level(p);
      const parts = clean(bullet ? p.text.slice(bullet[0].length) : p.text).split("\t");
      return new Paragraph({
        heading,
        bullet: bullet ? { level: 0 } : undefined,
        pageBreakBefore: j === 0 && i > 0 && options.pageBreaks !== false,
        spacing: { after: 120 },
        children: parts.flatMap((t, k) => (k ? [new TextRun({ text: "\t" }), new TextRun(t)] : [new TextRun(t)])),
      });
    }));
  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  return { files: [{ name: `${baseOf(file.name)}.docx`, blob: new Blob([blob], { type: DOCX_MIME }) }], notes: emptyPagesNote(pages) };
};
