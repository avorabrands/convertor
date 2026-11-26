import { PDFName, PDFString, rgb, type PDFDocument, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { hex as hexColor, type Palette } from "../pptx/color";
import { drawChart } from "../pptx/chart";
import type { Package } from "../pptx/package";
import type { LayerLine } from "../raster-pdf";
import { fontKey, pdfFontSources, type FontKey } from "../fonts";
import type { Op, Page } from "./layout";
import type { ImageSrc } from "./model";

const color = (h: string) => {
  const c = hexColor(h.length === 6 ? h : "000000");
  return rgb(c.r / 255, c.g / 255, c.b / 255);
};
const cssColor = (h: string) => `#${h.length === 6 ? h : "000000"}`;

type Face = { font: PDFFont; has: Set<number> };

/** Embeds fonts on demand: one face per family, style and character range. */
export class PdfFonts {
  private cache = new Map<string, Promise<Face[]>>();
  constructor(private doc: PDFDocument) {}

  /** The family's faces, then Liberation Sans for symbols and letters the family lacks. */
  async faces(key: FontKey, bold: boolean, italic: boolean): Promise<Face[]> {
    const own = await this.load(key, bold, italic);
    return key === "arimo" ? own : [...own, ...(await this.load("arimo", bold, italic))];
  }

  private load(key: FontKey, bold: boolean, italic: boolean): Promise<Face[]> {
    const id = `${key}-${bold}-${italic}`;
    let p = this.cache.get(id);
    if (!p) {
      p = Promise.all(pdfFontSources(key, bold, italic).map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        const font = await this.doc.embedFont(await res.arrayBuffer(), { subset: true });
        return { font, has: new Set(font.getCharacterSet()) };
      }));
      this.cache.set(id, p);
    }
    return p;
  }

  /** Whether every character can be written as real text with the bundled fonts. */
  async covers(page: Page) {
    for (const op of [...page.under, ...page.ops]) {
      if (op.t !== "text") continue;
      const faces = await this.faces(fontKey(op.style.font), op.style.bold, op.style.italic);
      for (const ch of op.text) {
        const code = ch.codePointAt(0)!;
        if (code <= 32 || code === 0xa0 || code === 0x200b) continue;
        if (!faces.some((f) => f.has.has(code))) return false;
      }
    }
    return true;
  }
}

/** Resolves page-number fields to text. */
export const fieldText = (op: Extract<Op, { t: "field" }>, page: Page, total: number, sectionTotal: number) =>
  String(op.field === "PAGE" ? page.number : op.field === "NUMPAGES" ? total : sectionTotal);

// ---------- vector pages

/**
 * Page numbers are laid out with room for two digits. Once the real number is known,
 * shift the rest of its line so "Page 2 of 5" has no gap.
 */
function fieldShifts(page: Page, total: number, sectionTotal: number, widthOf: (op: Extract<Op, { t: "field" }>, text: string) => number) {
  const lines = new Map<number, { align: string; fields: { x: number; delta: number }[] }>();
  for (const op of page.ops) {
    if (op.t !== "field" || !op.line) continue;
    const delta = widthOf(op, fieldText(op, page, total, sectionTotal)) - op.width;
    const entry = lines.get(op.line.id) ?? { align: op.line.align, fields: [] };
    entry.fields.push({ x: op.x, delta });
    lines.set(op.line.id, entry);
  }
  return (op: Op) => {
    if ((op.t !== "text" && op.t !== "field") || !op.line) return 0;
    const entry = lines.get(op.line.id);
    if (!entry) return 0;
    const all = entry.fields.reduce((s, f) => s + f.delta, 0);
    const before = entry.fields.filter((f) => f.x < op.x - 0.01).reduce((s, f) => s + f.delta, 0);
    return before - (entry.align === "center" ? all / 2 : entry.align === "right" ? all : 0);
  };
}

export async function paintVector(doc: PDFDocument, pdfPage: PDFPage, page: Page, fonts: PdfFonts, pictures: Pictures, total: number, sectionTotal: number) {
  const H = page.h;
  const widths = new Map<Op, number>();
  for (const op of page.ops) {
    if (op.t !== "field") continue;
    const faces = await fonts.faces(fontKey(op.style.font), op.style.bold, op.style.italic);
    widths.set(op, faces[0].font.widthOfTextAtSize(fieldText(op, page, total, sectionTotal), op.size));
  }
  const shift = fieldShifts(page, total, sectionTotal, (op) => widths.get(op) ?? op.width);
  for (const op of [...page.under, ...page.ops]) {
    switch (op.t) {
      case "text": case "field": {
        const text = op.t === "field" ? fieldText(op, page, total, sectionTotal) : op.text;
        const faces = await fonts.faces(fontKey(op.style.font), op.style.bold, op.style.italic);
        let x = op.x + shift(op);
        // Split the text by which embedded face has each character.
        let run = "", face: Face | null = null;
        const flush = () => {
          if (!run || !face) return;
          pdfPage.drawText(run, { x, y: H - op.y, size: op.size, font: face.font, color: color(op.style.color) });
          x += face.font.widthOfTextAtSize(run, op.size);
          run = "";
        };
        for (const ch of text) {
          const code = ch.codePointAt(0)!;
          const f = faces.find((c) => c.has.has(code)) ?? faces[0];
          if (f !== face) { flush(); face = f; }
          run += f.has.has(code) ? ch : " ";
        }
        flush();
        break;
      }
      case "rect": pdfPage.drawRectangle({ x: op.x, y: H - op.y - op.h, width: op.w, height: op.h, color: color(op.fill) }); break;
      case "line": pdfPage.drawLine({ start: { x: op.x1, y: H - op.y1 }, end: { x: op.x2, y: H - op.y2 }, thickness: op.width, color: color(op.color) }); break;
      case "shape": {
        const opts = { borderColor: op.line ? color(op.line.color) : undefined, borderWidth: op.line?.width ?? 0, color: op.fill ? color(op.fill) : undefined };
        if (op.ellipse) pdfPage.drawEllipse({ x: op.x + op.w / 2, y: H - op.y - op.h / 2, xScale: op.w / 2, yScale: op.h / 2, ...opts });
        else if (op.radius) {
          const r = op.radius, w = op.w, h = op.h;
          pdfPage.drawSvgPath(`M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`, { x: op.x, y: H - op.y, ...opts });
        } else pdfPage.drawRectangle({ x: op.x, y: H - op.y - op.h, width: op.w, height: op.h, ...opts });
        break;
      }
      case "image": {
        const img = await pictures.pdfImage(op.src);
        if (img) pdfPage.drawImage(img, { x: op.x, y: H - op.y - op.h, width: op.w, height: op.h });
        else missingVector(pdfPage, op.x, op.y, op.w, op.h, H);
        break;
      }
      case "chart": {
        const img = await pictures.chartImage(op.src.path, op.w, op.h);
        if (img) pdfPage.drawImage(img, { x: op.x, y: H - op.y - op.h, width: op.w, height: op.h });
        else missingVector(pdfPage, op.x, op.y, op.w, op.h, H);
        break;
      }
      case "missing": missingVector(pdfPage, op.x, op.y, op.w, op.h, H); break;
      case "link": addLink(doc, pdfPage, op.x, H - op.y - op.h, op.w, op.h, op.url); break;
    }
  }
}

function missingVector(p: PDFPage, x: number, y: number, w: number, h: number, H: number) {
  p.drawRectangle({ x, y: H - y - h, width: w, height: h, color: rgb(0.95, 0.95, 0.96), borderColor: rgb(0.75, 0.75, 0.8), borderWidth: 0.5 });
}

function addLink(doc: PDFDocument, page: PDFPage, x: number, y: number, w: number, h: number, url: string) {
  if (!/^(https?:|mailto:)/i.test(url)) return;
  const annot = doc.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [x, y, x + w, y + h], Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
  });
  const ref = doc.context.register(annot);
  const annots = page.node.lookup(PDFName.of("Annots"));
  if (annots && "push" in annots) (annots as unknown as { push(v: unknown): void }).push(ref);
  else page.node.set(PDFName.of("Annots"), doc.context.obj([ref]));
}

// ---------- raster pages

export async function paintRaster(ctx: CanvasRenderingContext2D, scale: number, page: Page, pictures: Pictures, total: number, sectionTotal: number): Promise<LayerLine[]> {
  const layer: LayerLine[] = [];
  ctx.save();
  ctx.scale(scale, scale);
  ctx.textBaseline = "alphabetic";
  const shift = fieldShifts(page, total, sectionTotal, (op, text) => { ctx.font = op.css; return ctx.measureText(text).width; });
  for (const op of [...page.under, ...page.ops]) {
    switch (op.t) {
      case "text": case "field": {
        const text = op.t === "field" ? fieldText(op, page, total, sectionTotal) : op.text;
        ctx.font = op.css;
        ctx.fillStyle = cssColor(op.style.color);
        if ("letterSpacing" in ctx) ctx.letterSpacing = `${op.style.spacing}px`;
        const x = op.x + shift(op);
        ctx.fillText(text, x, op.y);
        const m = ctx.getTransform();
        const at = m.transformPoint(new DOMPoint(x, op.y));
        layer.push({ text, size: op.size, width: op.width, m: [m.a, m.b, m.c, m.d, at.x, at.y] });
        break;
      }
      case "rect": ctx.fillStyle = cssColor(op.fill); ctx.fillRect(op.x, op.y, op.w, op.h); break;
      case "line":
        ctx.strokeStyle = cssColor(op.color); ctx.lineWidth = op.width;
        ctx.beginPath(); ctx.moveTo(op.x1, op.y1); ctx.lineTo(op.x2, op.y2); ctx.stroke();
        break;
      case "shape": {
        ctx.beginPath();
        if (op.ellipse) ctx.ellipse(op.x + op.w / 2, op.y + op.h / 2, op.w / 2, op.h / 2, 0, 0, 2 * Math.PI);
        else ctx.roundRect(op.x, op.y, op.w, op.h, op.radius);
        if (op.fill) { ctx.fillStyle = cssColor(op.fill); ctx.fill(); }
        if (op.line) { ctx.strokeStyle = cssColor(op.line.color); ctx.lineWidth = op.line.width; ctx.stroke(); }
        break;
      }
      case "image": {
        const pic = await pictures.bitmap(op.src);
        if (pic) drawCropped(ctx, pic, op.src, op.x, op.y, op.w, op.h);
        else missingRaster(ctx, op.x, op.y, op.w, op.h);
        break;
      }
      case "chart": {
        ctx.save();
        ctx.translate(op.x, op.y);
        const ok = pictures.drawChart(ctx, op.src.path, op.w, op.h, layer);
        ctx.restore();
        if (!ok) missingRaster(ctx, op.x, op.y, op.w, op.h);
        break;
      }
      case "missing": missingRaster(ctx, op.x, op.y, op.w, op.h); break;
    }
  }
  ctx.restore();
  return layer;
}

function missingRaster(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#f2f2f4"; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#c0c0cc"; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, w, h);
}

function drawCropped(ctx: CanvasRenderingContext2D, pic: CanvasImageSource & { width: number; height: number }, src: ImageSrc, x: number, y: number, w: number, h: number) {
  const c = src.crop;
  if (!c) { ctx.drawImage(pic, x, y, w, h); return; }
  const sx = pic.width * c.l, sy = pic.height * c.t;
  const sw = pic.width * (1 - c.l - c.r), sh = pic.height * (1 - c.t - c.b);
  ctx.drawImage(pic, sx, sy, Math.max(1, sw), Math.max(1, sh), x, y, w, h);
}

// ---------- pictures

/** Loads pictures once and shares them between vector and raster pages. */
export class Pictures {
  private pdfCache = new Map<string, Promise<PDFImage | null>>();
  private chartCache = new Map<string, Promise<PDFImage | null>>();
  /** Optional: reads cell values for charts that store only formulas. */
  resolveRef?: (formula: string) => string[] | null;
  constructor(private pkg: Package, private doc: PDFDocument, private palette: Palette, private fonts: { major: string; minor: string }) {}

  bitmap(src: ImageSrc) { return this.pkg.picture(src.path); }

  pdfImage(src: ImageSrc): Promise<PDFImage | null> {
    const key = `${src.path}|${JSON.stringify(src.crop ?? null)}`;
    let p = this.pdfCache.get(key);
    if (!p) {
      p = (async () => {
        const bytes = this.pkg.files[src.path];
        if (!bytes) return null;
        // Embed JPEG and PNG files as they are; anything else, or anything cropped, goes through a canvas.
        if (!src.crop && /\.jpe?g$/i.test(src.path)) return this.doc.embedJpg(bytes).catch(() => this.viaCanvas(src));
        if (!src.crop && /\.png$/i.test(src.path)) return this.doc.embedPng(bytes).catch(() => this.viaCanvas(src));
        return this.viaCanvas(src);
      })();
      this.pdfCache.set(key, p);
    }
    return p;
  }

  private async viaCanvas(src: ImageSrc) {
    const pic = await this.pkg.picture(src.path);
    if (!pic) return null;
    const c = src.crop ?? { l: 0, t: 0, r: 0, b: 0 };
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(pic.width * (1 - c.l - c.r)));
    canvas.height = Math.max(1, Math.round(pic.height * (1 - c.t - c.b)));
    canvas.getContext("2d")!.drawImage(pic, -pic.width * c.l, -pic.height * c.t);
    const { canvasBlob } = await import("../util");
    const blob = await canvasBlob(canvas, "image/png");
    return this.doc.embedPng(new Uint8Array(await blob.arrayBuffer()));
  }

  drawChart(ctx: CanvasRenderingContext2D, path: string, w: number, h: number, layer: LayerLine[]) {
    const root = this.pkg.xml(path);
    if (!root) return false;
    return drawChart(root, w, h, { ctx, palette: this.palette, fonts: this.fonts, slideNumber: 0, layer, resolveRef: this.resolveRef });
  }

  /** Charts are drawn once at twice the size and placed as a picture. */
  chartImage(path: string, w: number, h: number): Promise<PDFImage | null> {
    const key = `${path}|${w}|${h}`;
    let p = this.chartCache.get(key);
    if (!p) {
      p = (async () => {
        const k = 3;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(k, k);
        if (!this.drawChart(ctx, path, w, h, [])) return null;
        const { canvasBlob } = await import("../util");
        return this.doc.embedPng(new Uint8Array(await (await canvasBlob(canvas, "image/png")).arrayBuffer()));
      })();
      this.chartCache.set(key, p);
    }
    return p;
  }
}
