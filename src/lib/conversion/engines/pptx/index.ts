import {
  beginText, concatTransformationMatrix, drawObject, endText, PDFDocument, PDFRawStream, popGraphicsState, pushGraphicsState, setCharacterSqueeze, setFontAndSize, setTextMatrix,
  setTextRenderingMode, showText, TextRenderingMode, type PDFFont, type PDFPage,
} from "pdf-lib";
import { baseOf } from "@/lib/files";
import { ConversionError, type Engine } from "../../types";
import { breathe, canvasBlob, fitScale, PDF_MIME, toBlob } from "../util";
import { loadFonts } from "./fonts";
import { Package } from "./package";
import { renderSlide, type DeckInfo, type Issues } from "./render";
import type { LayerLine } from "./text";
import { child, flag, kids, num, pt, relAttr } from "./xml";

/** Pixels across each slide. */
const widths: Record<string, number> = { small: 1280, standard: 1920, high: 2880 };

export const pptToPdf: Engine = async ({ files: [file], options }, { onProgress, signal }) => {
  onProgress(0.04, "Opening your slides");
  const pkg = await Package.open(file);
  try {
    const path = pkg.byType("", "officeDocument") ?? "ppt/presentation.xml";
    const root = pkg.xml(path);
    if (!root || root.localName !== "presentation") throw new ConversionError("We couldn't find any slides in this file. Open it in PowerPoint or Google Slides and save it as .pptx again.");
    const size = child(root, "sldSz");
    const deck: DeckInfo = { pkg, presentation: { path, root }, width: pt(num(size, "cx")) || 960, height: pt(num(size, "cy")) || 540 };

    const all = kids(child(root, "sldIdLst"), "sldId").map((s) => pkg.target(path, relAttr(s, "id"))).filter((p): p is string => Boolean(p && pkg.xml(p)));
    const numbered = all.map((p, i) => ({ path: p, number: i + (num(root, "firstSlideNum") ?? 1) }));
    const slides = options.hidden === true ? numbered : numbered.filter((s) => flag(pkg.xml(s.path), "show") !== false);
    if (!slides.length) throw new ConversionError(all.length ? "Every slide in this presentation is hidden. Turn on “Include hidden slides” in Advanced settings, then try again." : "This presentation has no slides.");

    onProgress(0.08, "Loading fonts");
    await loadFonts(fontNames(pkg));
    signal.throwIfAborted();

    const doc = await PDFDocument.create();
    const layerFont = await hiddenFont(doc);
    const px = widths[String(options.quality)] ?? widths.standard;
    const scale = (px / deck.width) * fitScale(px, (px * deck.height) / deck.width);
    const issues: Issues = { pictures: 0, charts: 0 };
    let failed = 0;

    for (const [i, slide] of slides.entries()) {
      onProgress(0.12 + (i / slides.length) * 0.82, `Drawing slide ${i + 1} of ${slides.length}`);
      await breathe(signal);
      const canvas = slideCanvas(deck.width * scale, deck.height * scale);
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new RangeError("canvas allocation failed");
      let lines: LayerLine[] = [];
      try {
        lines = await renderSlide(deck, slide.path, slide.number, ctx, scale, issues);
      } catch (e) {
        console.warn(`Slide ${slide.number} was only partly drawn`, e);
        failed++;
      }
      const page = doc.addPage([deck.width, deck.height]);
      await placeImage(doc, page, canvas, deck);
      hiddenText(page, layerFont, lines, scale, deck.height);
      canvas.width = canvas.height = 0;
    }

    onProgress(0.96, "Saving the PDF");
    const notes: string[] = [];
    const hidden = numbered.length - slides.length;
    if (hidden) notes.push(`${hidden} hidden ${hidden === 1 ? "slide was" : "slides were"} left out. You can include ${hidden === 1 ? "it" : "them"} in Advanced settings.`);
    if (issues.pictures) notes.push(`${issues.pictures} ${issues.pictures === 1 ? "picture is" : "pictures are"} in a format we can't draw, such as EMF or WMF, and ${issues.pictures === 1 ? "shows" : "show"} as a grey box.`);
    if (issues.charts) notes.push(`${issues.charts} ${issues.charts === 1 ? "chart or diagram" : "charts or diagrams"} couldn't be drawn and ${issues.charts === 1 ? "is" : "are"} marked on the slide.`);
    if (failed) notes.push(`${failed} ${failed === 1 ? "slide was" : "slides were"} only partly drawn. Check before submitting.`);
    return { files: [{ name: `${baseOf(file.name)}.pdf`, blob: toBlob(await doc.save(), PDF_MIME) }], notes };
  } finally {
    void pkg.dispose();
  }
};

/** Every typeface named in the deck's themes and slides. */
function fontNames(pkg: Package) {
  const names = new Set<string>();
  for (const path of Object.keys(pkg.files)) {
    if (!/^ppt\/(theme|slides|slideLayouts|slideMasters|diagrams)\/[^/]+\.xml$/.test(path)) continue;
    const text = pkg.text(path) ?? "";
    for (const m of text.matchAll(/<a:latin[^>]*typeface="([^"+][^"]*)"/g)) names.add(m[1]);
  }
  return names;
}

function slideCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/** PNG keeps flat slides crisp; JPG is far smaller once there are photos. */
async function placeImage(doc: PDFDocument, page: PDFPage, canvas: HTMLCanvasElement, deck: DeckInfo) {
  const png = await canvasBlob(canvas, "image/png", undefined, true);
  const jpg = png.size < 350_000 ? null : await canvasBlob(canvas, "image/jpeg", 0.9);
  const usePng = !jpg || png.size < jpg.size * 1.4;
  const bytes = new Uint8Array(await (usePng ? png : jpg).arrayBuffer());
  const direct = usePng ? pngStream(doc, bytes) : null;
  if (direct) {
    const name = page.node.newXObject("Slide", direct);
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(deck.width, 0, 0, deck.height, 0, 0), drawObject(name), popGraphicsState());
    return;
  }
  const image = usePng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  page.drawImage(image, { x: 0, y: 0, width: deck.width, height: deck.height });
}

/** A plain RGB PNG's compressed data is valid inside a PDF as is, which skips a slow decode and re-encode. */
function pngStream(doc: PDFDocument, png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const [width, height] = [view.getUint32(16), view.getUint32(20)];
  if (png[24] !== 8 || png[25] !== 2 || png[28] !== 0) return null;
  const parts: Uint8Array[] = [];
  for (let at = 8; at + 12 <= png.length;) {
    const length = view.getUint32(at);
    if (String.fromCharCode(...png.subarray(at + 4, at + 8)) === "IDAT") parts.push(png.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  const data = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let offset = 0;
  for (const p of parts) { data.set(p, offset); offset += p.length; }
  const dict = doc.context.obj({
    Type: "XObject", Subtype: "Image", Width: width, Height: height, ColorSpace: "DeviceRGB", BitsPerComponent: 8, Filter: "FlateDecode",
    DecodeParms: { Predictor: 15, Colors: 3, BitsPerComponent: 8, Columns: width }, Length: data.length,
  });
  return doc.context.register(PDFRawStream.of(dict, data));
}

async function hiddenFont(doc: PDFDocument): Promise<{ font: PDFFont; has: Set<number> } | null> {
  try {
    const { default: fontkit } = await import("@pdf-lib/fontkit");
    doc.registerFontkit(fontkit);
    const res = await fetch("/vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf");
    if (!res.ok) return null;
    const font = await doc.embedFont(await res.arrayBuffer(), { subset: true });
    return { font, has: new Set(font.getCharacterSet()) };
  } catch {
    return null; // Slides still look right; they just can't be searched.
  }
}

/** Invisible text over the picture, so the PDF can be searched and copied from. */
function hiddenText(page: PDFPage, layer: Awaited<ReturnType<typeof hiddenFont>>, lines: LayerLine[], scale: number, height: number) {
  if (!layer || !lines.length) return;
  const { font, has } = layer;
  const key = page.node.newFontDictionary(font.name, font.ref);
  const ops = [pushGraphicsState(), beginText(), setTextRenderingMode(TextRenderingMode.Invisible)];
  let drawn = 0;
  for (const line of lines) {
    const letters = [...line.text].filter((c) => c !== " ");
    const text = [...line.text.replace(/\s+/g, " ")].filter((c) => has.has(c.codePointAt(0)!)).join("").trim();
    // Skip scripts the layer's font can't write rather than store fragments.
    if (!text || letters.filter((c) => has.has(c.codePointAt(0)!)).length < letters.length * 0.6) continue;
    const natural = font.widthOfTextAtSize(text, line.size) || 1;
    const [a, b, c, d, e, f] = line.m.map((v) => v / scale);
    ops.push(
      setFontAndSize(key, line.size),
      setCharacterSqueeze(Math.min(400, Math.max(20, (line.width / natural) * 100))),
      // Canvas y runs down the page and PDF y runs up.
      setTextMatrix(a, -b, -c, d, e, height - f),
      showText(font.encodeText(text)),
    );
    drawn++;
  }
  if (drawn) page.pushOperators(...ops, endText(), popGraphicsState());
}

