import { baseOf } from "@/lib/files";
import { ConversionError, type Engine } from "../types";
import { PdfWriter, type Run } from "./pdf-writer";
import { PDF_MIME, toBlob } from "./util";

async function readDocx(file: File) {
  const mammoth = (await import("mammoth/mammoth.browser.js")).default;
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: ["u => u"] });
  return { html: value, text: async () => (await mammoth.extractRawText({ arrayBuffer })).value };
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export const wordToText: Engine = async ({ files: [file], output }, { onProgress }) => {
  onProgress(0.2, "Opening your document");
  const doc = await readDocx(file);
  const name = baseOf(file.name);
  if (output === "html") {
    // A document can carry hostile links; keep only ordinary ones.
    const dom = new DOMParser().parseFromString(doc.html, "text/html");
    dom.querySelectorAll("a[href]").forEach((a) => { if (!/^(https?:|mailto:|#)/i.test(a.getAttribute("href")!)) a.removeAttribute("href"); });
    const page = `<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<title>${escapeHtml(name)}</title>\n<body>\n${dom.body.innerHTML}\n</body>\n</html>\n`;
    return { files: [{ name: `${name}.html`, blob: new Blob([page], { type: "text/html;charset=utf-8" }) }] };
  }
  const text = (await doc.text()).replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new ConversionError("We couldn't find any text in this document.");
  return { files: [{ name: `${name}.txt`, blob: new Blob([text], { type: "text/plain;charset=utf-8" }) }] };
};

const headings: Record<string, { size: number; before: number; after: number; keepWithNext: number }> = {
  H1: { size: 21, before: 10, after: 8, keepWithNext: 30 },
  H2: { size: 16, before: 9, after: 6, keepWithNext: 26 },
  H3: { size: 13, before: 7, after: 5, keepWithNext: 24 },
  H4: { size: 11.5, before: 5, after: 4, keepWithNext: 22 },
  H5: { size: 11, before: 4, after: 4, keepWithNext: 20 },
  H6: { size: 11, before: 4, after: 4, keepWithNext: 20 },
};

function runsOf(node: Node, style: Omit<Run, "text"> = {}): Run[] {
  if (node.nodeType === Node.TEXT_NODE) return [{ text: (node.textContent ?? "").replace(/\n/g, " "), ...style }];
  if (!(node instanceof Element)) return [];
  if (node.tagName === "BR") return [{ text: "\n", ...style }];
  if (["UL", "OL", "TABLE", "IMG"].includes(node.tagName)) return [];
  const next = {
    bold: style.bold || ["STRONG", "B", "TH"].includes(node.tagName),
    italic: style.italic || ["EM", "I"].includes(node.tagName),
  };
  return [...node.childNodes].flatMap((c) => runsOf(c, next));
}

const cellRuns = (cell: Element): Run[] => {
  const blocks = [...cell.querySelectorAll("p, li")];
  if (!blocks.length) return runsOf(cell);
  return blocks.flatMap((b, i) => [...(i ? [{ text: "\n" }] : []), ...(b.tagName === "LI" ? [{ text: "• " }] : []), ...runsOf(b, { bold: cell.tagName === "TH" })]);
};

export const wordToPdf: Engine = async ({ files: [file], options }, { onProgress, signal }) => {
  onProgress(0.1, "Opening your document");
  const { html } = await readDocx(file);
  signal.throwIfAborted();
  if (!html.trim()) throw new ConversionError("This document looks empty, so there's nothing to put in a PDF.");
  onProgress(0.4, "Laying out the pages");
  const writer = await PdfWriter.create(String(options.pageSize ?? "a4"));
  const body = new DOMParser().parseFromString(html, "text/html").body;
  let skipped = 0;

  const block = async (el: Element, depth = 0): Promise<void> => {
    signal.throwIfAborted();
    const tag = el.tagName;
    if (headings[tag]) {
      writer.paragraph(runsOf(el, { bold: true }), { ...headings[tag], leading: 1.25 });
    } else if (tag === "UL" || tag === "OL") {
      let n = 1;
      for (const li of el.children) {
        const runs = runsOf(li);
        if (runs.some((r) => r.text.trim())) writer.paragraph(runs, { indent: 20 + depth * 18, after: 3, marker: tag === "OL" ? `${n}.` : depth % 2 ? "–" : "•" });
        n++;
        for (const child of li.children) if (["UL", "OL", "TABLE"].includes(child.tagName)) await block(child, depth + 1);
      }
      if (!depth) writer.space(5);
    } else if (tag === "TABLE") {
      const rows = [...el.querySelectorAll("tr")].map((tr) => [...tr.children].map(cellRuns));
      writer.table(rows, { header: Boolean(el.querySelector("thead")) });
    } else if (tag !== "IMG") {
      const runs = runsOf(el);
      if (runs.some((r) => r.text.trim())) writer.paragraph(runs);
    }
    if (tag !== "TABLE" && tag !== "UL" && tag !== "OL") {
      for (const img of tag === "IMG" ? [el] : el.querySelectorAll("img")) {
        try { await writer.image((img as HTMLImageElement).src); } catch { skipped++; }
      }
    }
  };
  for (const el of body.children) await block(el);
  onProgress(0.9, "Saving the PDF");
  const { bytes, notes } = await writer.finish();
  if (skipped) notes.push(`${skipped} ${skipped === 1 ? "picture was" : "pictures were"} in a format we couldn't place.`);
  return { files: [{ name: `${baseOf(file.name)}.pdf`, blob: toBlob(bytes, PDF_MIME) }], notes };
};
