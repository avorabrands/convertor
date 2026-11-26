import {
  beginText, concatTransformationMatrix, drawObject, endText, PDFDocument, PDFRawStream, popGraphicsState, pushGraphicsState, setCharacterSqueeze, setFontAndSize, setTextMatrix,
  setTextRenderingMode, showText, TextRenderingMode, type PDFFont, type PDFPage,
} from "pdf-lib";
import { asset } from "@/config/site";
import { canvasBlob } from "./util";

/** One drawn line of text, kept so a picture of a page can still be searched and copied from. */
export interface LayerLine { text: string; size: number; width: number; m: [number, number, number, number, number, number] }

export function pageCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new RangeError("canvas allocation failed");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

/** PNG keeps flat pages crisp; JPG is far smaller once there are photos. */
export async function placeCanvas(doc: PDFDocument, page: PDFPage, canvas: HTMLCanvasElement, width: number, height: number) {
  const png = await canvasBlob(canvas, "image/png", undefined, true);
  const jpg = png.size < 350_000 ? null : await canvasBlob(canvas, "image/jpeg", 0.9);
  const usePng = !jpg || png.size < jpg.size * 1.4;
  const bytes = new Uint8Array(await (usePng ? png : jpg!).arrayBuffer());
  const direct = usePng ? pngStream(doc, bytes) : null;
  if (direct) {
    const name = page.node.newXObject("Raster", direct);
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(width, 0, 0, height, 0, 0), drawObject(name), popGraphicsState());
    return;
  }
  const image = usePng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  page.drawImage(image, { x: 0, y: 0, width, height });
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

export type LayerFont = { font: PDFFont; has: Set<number> } | null;

export async function hiddenFont(doc: PDFDocument): Promise<LayerFont> {
  try {
    const { default: fontkit } = await import("@pdf-lib/fontkit");
    doc.registerFontkit(fontkit);
    const res = await fetch(asset("/vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf"));
    if (!res.ok) return null;
    const font = await doc.embedFont(await res.arrayBuffer(), { subset: true });
    return { font, has: new Set(font.getCharacterSet()) };
  } catch {
    return null; // Pages still look right; they just can't be searched.
  }
}

/** Invisible text over the picture, so the PDF can be searched and copied from. */
export function hiddenText(page: PDFPage, layer: LayerFont, lines: LayerLine[], scale: number, height: number) {
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
