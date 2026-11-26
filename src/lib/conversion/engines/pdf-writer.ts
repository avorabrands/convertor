import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { asset } from "@/config/site";
import { ConversionError } from "../types";

export interface Run { text: string; bold?: boolean; italic?: boolean }
interface Word { text: string; font: PDFFont; width: number; spaceBefore: boolean }

const INK = rgb(0.1, 0.1, 0.12);
const RULE = rgb(0.75, 0.76, 0.8);
const sizes: Record<string, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };

/** A small flowing-text layout engine on top of pdf-lib: paragraphs, lists, tables, images. */
export class PdfWriter {
  private page!: PDFPage;
  private y = 0;
  private missing = new Set<string>();
  private total = 0;
  private missingCount = 0;
  private charsets = new Map<PDFFont, Set<number>>();

  private constructor(
    readonly doc: PDFDocument,
    private fonts: Record<"r" | "b" | "i" | "bi", PDFFont>,
    readonly width: number, readonly height: number, readonly margin: number,
  ) {
    this.newPage();
  }

  static async create(pageSize = "a4", landscape = false, margin = 62) {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const load = async (style: string) => {
      const res = await fetch(asset(`/vendor/pdfjs/standard_fonts/LiberationSans-${style}.ttf`));
      if (!res.ok) throw new Error("Failed to fetch font");
      return doc.embedFont(await res.arrayBuffer(), { subset: true });
    };
    const [r, b, i, bi] = await Promise.all([load("Regular"), load("Bold"), load("Italic"), load("BoldItalic")]);
    let [w, h] = sizes[pageSize] ?? sizes.a4;
    if (landscape) [w, h] = [h, w];
    return new PdfWriter(doc, { r, b, i, bi }, w, h, margin);
  }

  get contentWidth() { return this.width - this.margin * 2; }
  newPage() { this.page = this.doc.addPage([this.width, this.height]); this.y = this.height - this.margin; }
  space(points: number) { this.y -= points; }
  private ensure(height: number) { if (this.y - height < this.margin && this.y < this.height - this.margin) this.newPage(); }

  private font(run: Run) { return this.fonts[run.bold ? (run.italic ? "bi" : "b") : run.italic ? "i" : "r"]; }

  private clean(text: string, font: PDFFont) {
    let set = this.charsets.get(font);
    if (!set) this.charsets.set(font, (set = new Set(font.getCharacterSet())));
    let out = "";
    for (const ch of text.normalize("NFC")) {
      const code = ch.codePointAt(0)!;
      if (code === 0xa0 || code === 0x202f) { out += " "; continue; }
      if (code < 32 || (code >= 0x200b && code <= 0x200f) || code === 0xfeff || code === 0xad) continue;
      this.total++;
      if (set.has(code)) out += ch;
      else { this.missing.add(ch); this.missingCount++; out += "?"; }
    }
    return out;
  }

  private wrap(runs: Run[], size: number, width: number): Word[][] {
    const lines: Word[][] = [[]];
    let x = 0;
    let pendingSpace = false;
    for (const run of runs) {
      const font = this.font(run);
      for (const piece of run.text.split(/(\n|[ \t\r]+)/)) {
        if (!piece) continue;
        if (piece === "\n") { lines.push([]); x = 0; pendingSpace = false; continue; }
        if (/^[ \t\r]+$/.test(piece)) { pendingSpace = true; continue; }
        let text = this.clean(piece, font);
        while (text) {
          const space = pendingSpace && lines.at(-1)!.length ? font.widthOfTextAtSize(" ", size) : 0;
          const w = font.widthOfTextAtSize(text, size);
          if (x + space + w <= width) {
            lines.at(-1)!.push({ text, font, width: w, spaceBefore: space > 0 });
            x += space + w;
            text = "";
          } else if (lines.at(-1)!.length) {
            lines.push([]); x = 0;
          } else {
            // A single word wider than the line: break it.
            let cut = text.length;
            while (cut > 1 && font.widthOfTextAtSize(text.slice(0, cut), size) > width) cut--;
            lines.at(-1)!.push({ text: text.slice(0, cut), font, width: font.widthOfTextAtSize(text.slice(0, cut), size), spaceBefore: false });
            text = text.slice(cut);
            lines.push([]); x = 0;
          }
          pendingSpace = false;
        }
      }
    }
    if (lines.length > 1 && !lines.at(-1)!.length) lines.pop();
    return lines;
  }

  private drawLine(words: Word[], x: number, y: number, size: number) {
    for (const w of words) {
      if (w.spaceBefore) x += w.font.widthOfTextAtSize(" ", size);
      this.page.drawText(w.text, { x, y, size, font: w.font, color: INK });
      x += w.width;
    }
  }

  paragraph(runs: Run[], { size = 11, indent = 0, before = 0, after = 7, marker = "", leading = 1.42, keepWithNext = 0 } = {}) {
    this.y -= before;
    const lines = this.wrap(runs, size, this.contentWidth - indent);
    this.ensure(Math.min(2, lines.length) * size * leading + keepWithNext);
    lines.forEach((words, i) => {
      this.ensure(size * leading);
      const baseline = this.y - size;
      if (i === 0 && marker) {
        const m = this.clean(marker, this.fonts.r);
        this.page.drawText(m, { x: this.margin + indent - this.fonts.r.widthOfTextAtSize(m, size) - 6, y: baseline, size, font: this.fonts.r, color: INK });
      }
      this.drawLine(words, this.margin + indent, baseline, size);
      this.y -= size * leading;
    });
    this.y -= after;
  }

  async image(dataUrl: string) {
    const blob = await (await fetch(dataUrl)).blob();
    const bytes = await blob.arrayBuffer();
    const img = blob.type === "image/png" ? await this.doc.embedPng(bytes) : await this.doc.embedJpg(bytes);
    const scale = Math.min(0.75, this.contentWidth / img.width, (this.height - this.margin * 2) / img.height);
    this.ensure(img.height * scale);
    this.page.drawImage(img, { x: this.margin, y: this.y - img.height * scale, width: img.width * scale, height: img.height * scale });
    this.y -= img.height * scale + 10;
  }

  /** Draws a grid that repeats its header row. Column widths follow content. */
  table(rows: Run[][][], { size = 9.5, header = true } = {}) {
    const cols = Math.max(0, ...rows.map((r) => r.length));
    if (!cols) return;
    const pad = 5;
    const natural = Array.from({ length: cols }, (_, c) =>
      Math.min(260, Math.max(24, ...rows.slice(0, 300).map((r) => (r[c] ?? []).reduce((w, run) => w + this.font(run).widthOfTextAtSize(this.measureSafe(run), size), 0) + pad * 2 + 1))));
    const sum = natural.reduce((a, b) => a + b, 0);
    const widths = sum > this.contentWidth ? this.shrink(natural) : natural;

    const draw = (row: Run[][]) => {
      const cells = widths.map((w, c) => this.wrap(row[c] ?? [], size, w - pad * 2));
      const lineHeight = size * 1.3;
      const maxLines = Math.floor((this.height - this.margin * 2 - pad * 2) / lineHeight);
      const tall = Math.min(maxLines, Math.max(1, ...cells.map((l) => l.length)));
      const h = tall * lineHeight + pad * 2;
      if (this.y - h < this.margin && this.y < this.height - this.margin) {
        this.newPage();
        if (header && row !== rows[0]) draw(rows[0]);
      }
      let x = this.margin;
      widths.forEach((w, c) => {
        this.page.drawRectangle({ x, y: this.y - h, width: w, height: h, borderColor: RULE, borderWidth: 0.6, color: header && row === rows[0] ? rgb(0.95, 0.95, 0.98) : undefined });
        cells[c].slice(0, tall).forEach((words, i) => this.drawLine(words, x + pad, this.y - pad - size - i * lineHeight, size));
        x += w;
      });
      this.y -= h;
    };
    rows.forEach(draw);
    this.y -= 12;
  }

  /** Narrow columns keep their width; only wide ones give way. */
  private shrink(natural: number[]) {
    let cap = Math.max(...natural);
    while (natural.reduce((s, w) => s + Math.min(w, cap), 0) > this.contentWidth && cap > 20) cap -= 2;
    const widths = natural.map((w) => Math.min(w, cap));
    const total = widths.reduce((a, b) => a + b, 0);
    return total > this.contentWidth ? widths.map((w) => (w / total) * this.contentWidth) : widths;
  }

  private measureSafe(run: Run) {
    const font = this.font(run);
    const [t, m] = [this.total, this.missingCount];
    const seen = new Set(this.missing);
    const text = this.clean(run.text.slice(0, 120), font);
    this.total = t; this.missingCount = m; this.missing = seen;
    return text;
  }

  async finish(): Promise<{ bytes: Uint8Array; notes: string[] }> {
    if (this.total && this.missingCount / this.total > 0.03) {
      throw new ConversionError("This document uses a script we can't lay out yet, such as Hindi, Telugu, Arabic or Chinese. To keep it readable, export to PDF from Word or Google Docs.");
    }
    const notes = this.missingCount
      ? [`${this.missingCount} ${this.missingCount === 1 ? "character" : "characters"} couldn't be drawn and ${this.missingCount === 1 ? "shows" : "show"} as "?" (${[...this.missing].slice(0, 6).join(" ")}). Check before submitting.`]
      : [];
    return { bytes: await this.doc.save(), notes };
  }
}
