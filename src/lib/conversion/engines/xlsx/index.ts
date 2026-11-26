import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFImage } from "pdf-lib";
import type { Workbook, Worksheet, Cell as XCell, Color, Border as XBorder } from "exceljs";
import { baseOf, extOf } from "@/lib/files";
import { ConversionError, type Engine } from "../../types";
import type { Op, Page } from "../docx/layout";
import type { RunStyle } from "../docx/model";
import { paintRaster, paintVector, PdfFonts, Pictures } from "../docx/paint";
import { fontKey, fontMetrics, loadFonts, measureStack } from "../fonts";
import { hex } from "../pptx/color";
import { hiddenFont, hiddenText, pageCanvas, placeCanvas } from "../raster-pdf";
import { breathe, PDF_MIME, toBlob } from "../util";

const RASTER_SCALE = 200 / 72;
const PAPER: Record<number, [number, number]> = { 1: [612, 792], 5: [612, 1008], 8: [841.89, 1190.55], 9: [595.28, 841.89], 11: [419.53, 595.28] };

interface CellStyle {
  font: string; size: number; bold: boolean; italic: boolean; underline: boolean; strike: boolean; color: string;
  fill: string | null; h: string; v: string; wrap: boolean; indent: number; rotate: number;
  borders: { l?: B; r?: B; t?: B; b?: B };
}
interface B { color: string; width: number }
interface SheetCell { text: string; style: CellStyle; numeric: boolean; link: string | null }
interface Sheet {
  name: string;
  rows: number[]; cols: number[];
  /** Row heights and column widths in points, for the used rows and columns. */
  heights: number[]; widths: number[];
  cells: Map<string, SheetCell>;
  merges: { r1: number; c1: number; r2: number; c2: number }[];
  images: { r: number; c: number; dx: number; dy: number; w: number; h: number; id: number; br: { r: number; c: number; dx: number; dy: number } | null }[];
  charts: { r: number; c: number; dx: number; dy: number; w: number; h: number; path: string; br: { r: number; c: number; dx: number; dy: number } | null }[];
  landscape: boolean | null; paper: [number, number]; margins: { l: number; r: number; t: number; b: number };
  fitWidth: boolean; scale: number; repeatRows: number[]; gridlines: boolean;
}

const key = (r: number, c: number) => `${r}:${c}`;

/** Excel's theme colour order differs from the theme file's. */
const THEME_ORDER = ["lt1", "dk1", "lt2", "dk2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
const INDEXED = ["000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF", "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF", "800000", "008000", "000080", "808000", "800080", "008080", "C0C0C0", "808080", "9999FF", "993366", "FFFFCC", "CCFFFF", "660066", "FF8080", "0066CC", "CCCCFF", "000080", "FF00FF", "FFFF00", "00FFFF", "800080", "800000", "008080", "0000FF", "00CCFF", "CCFFFF", "CCFFCC", "FFFF99", "99CCFF", "FF99CC", "CC99FF", "FFCC99", "3366FF", "33CCCC", "99CC00", "FFCC00", "FF9900", "FF6600", "666699", "969696", "003366", "339966", "003300", "333300", "993300", "993366", "333399", "333333"];

function themeColors(wb: Workbook): string[] {
  const xml = (wb as unknown as { _themes?: Record<string, string> })._themes?.theme1;
  const map: Record<string, string> = {};
  if (xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const scheme = doc.getElementsByTagNameNS("*", "clrScheme")[0];
    for (const c of scheme?.children ?? []) {
      const v = c.children[0];
      map[c.localName] = v?.getAttribute("lastClr") ?? v?.getAttribute("val") ?? "000000";
    }
  }
  const fallback: Record<string, string> = { lt1: "FFFFFF", dk1: "000000", lt2: "E7E6E6", dk2: "44546A", accent1: "4472C4", accent2: "ED7D31", accent3: "A5A5A5", accent4: "FFC000", accent5: "5B9BD5", accent6: "70AD47", hlink: "0563C1", folHlink: "954F72" };
  return THEME_ORDER.map((k) => map[k] ?? fallback[k]);
}

function tint(h: string, t: number) {
  if (!t) return h;
  const c = hex(h);
  const f = (v: number) => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t);
  return [f(c.r), f(c.g), f(c.b)].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function colorOf(c: Partial<Color> | undefined, theme: string[], fallback: string | null): string | null {
  if (!c) return fallback;
  const any = c as { argb?: string; theme?: number; tint?: number; indexed?: number };
  if (any.argb) return any.argb.length === 8 ? any.argb.slice(2) : any.argb;
  if (any.theme != null) return tint(theme[any.theme] ?? "000000", any.tint ?? 0);
  if (any.indexed != null) return any.indexed === 64 ? fallback : INDEXED[any.indexed] ?? fallback;
  return fallback;
}

const BORDER_W: Record<string, number> = { thin: 0.5, hair: 0.25, dotted: 0.5, dashed: 0.5, dashDot: 0.5, dashDotDot: 0.5, medium: 1, mediumDashed: 1, mediumDashDot: 1, mediumDashDotDot: 1, slantDashDot: 1, thick: 1.5, double: 1.5 };

/** Excel serial date numbers count days from 1899-12-30. */
const serial = (d: Date) => d.getTime() / 86400000 + 25569;

async function readWorkbook(file: File, opts: { gridlines: string }) {
  const ExcelJS = (await import("exceljs")).default;
  const XLSX = await import("xlsx");
  const ext = extOf(file.name);
  let wb = new ExcelJS.Workbook();
  let droppedDrawings = false;
  let hasCharts = false;
  let charts = new Map<string, { anchors: Sheet["charts"]; parts: Map<string, Element> }>();
  if (ext === "xlsx") {
    const { unzipAsync, zipAsync } = await import("../zip");
    const files = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
    hasCharts = Object.keys(files).some((n) => /^xl\/charts\/chart\d+\.xml$/.test(n));
    charts = findCharts(files);
    for (const n of Object.keys(files)) if (/^xl\/drawings\/drawing\d+\.xml$/.test(n)) files[n] = new TextEncoder().encode(normalizeDrawing(new TextDecoder().decode(files[n])));
    try {
      await wb.xlsx.load((await zipAsync(files, 0)).buffer as ArrayBuffer);
    } catch {
      // Some drawings trip the reader. Keep the cells, and say the pictures were left out.
      for (const n of Object.keys(files)) if (/^xl\/worksheets\/sheet\d+\.xml$/.test(n)) files[n] = new TextEncoder().encode(new TextDecoder().decode(files[n]).replace(/<drawing\b[^>]*\/>/g, ""));
      wb = new ExcelJS.Workbook();
      await wb.xlsx.load((await zipAsync(files, 0)).buffer as ArrayBuffer);
      droppedDrawings = true;
    }
  } else {
    // CSV and old .xls: read values with SheetJS, then lay them out with default formatting.
    const book = ext === "csv" ? XLSX.read(await file.text(), { type: "string", raw: true }) : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    for (const name of book.SheetNames) {
      const ws = wb.addWorksheet(name.slice(0, 31));
      const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name], { header: 1, raw: false, defval: "", blankrows: true });
      rows.forEach((r) => ws.addRow(r));
    }
  }
  const theme = themeColors(wb);
  const names = ext === "xlsx" ? Object.keys((wb as unknown as { _media?: unknown })._media ?? {}) : [];
  void names;
  const sheets: Sheet[] = [];
  for (const ws of wb.worksheets) {
    if (ws.state && ws.state !== "visible") continue;
    const sheet = readSheet(ws, theme, XLSX.SSF, opts, charts.get(ws.name)?.anchors ?? []);
    if (sheet) sheets.push(sheet);
  }
  const media = new Map<number, { buffer: Uint8Array; ext: string }>();
  (wb.model.media ?? []).forEach((m: { buffer?: ArrayBuffer | Uint8Array; extension?: string }, i: number) => {
    if (m.buffer) media.set(i, { buffer: new Uint8Array(m.buffer as ArrayBuffer), ext: m.extension ?? "png" });
  });
  const chartParts = new Map<string, Element>();
  for (const c of charts.values()) for (const [k, v] of c.parts) chartParts.set(k, v);
  /** Values for "Sheet!$A$1:$A$9" style references, read from the loaded workbook. */
  const resolveRef = (formula: string) => {
    const m = /^'?(.*?)'?!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/i.exec(formula.trim());
    const ws = m ? wb.getWorksheet(m[1].replace(/''/g, "'")) : undefined;
    if (!m || !ws) return null;
    const col = (s: string) => [...s.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    const [c1, r1, c2, r2] = [col(m[2]), Number(m[3]), col(m[4] ?? m[2]), Number(m[5] ?? m[3])];
    const out: string[] = [];
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
      const v = ws.getCell(r, c).value as unknown;
      const raw = v && typeof v === "object" && "result" in (v as object) ? (v as { result: unknown }).result : v;
      out.push(raw == null ? "" : raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw));
    }
    return out;
  };
  return { sheets, media, hasCharts, droppedDrawings, chartParts, theme, resolveRef };
}

/** Finds each sheet's charts and where they're anchored, from the raw workbook parts. */
function findCharts(files: Record<string, Uint8Array>) {
  const out = new Map<string, { anchors: Sheet["charts"]; parts: Map<string, Element> }>();
  const text = (p: string) => (files[p] ? new TextDecoder().decode(files[p]) : null);
  const xml = (p: string) => { const t = text(p); return t ? new DOMParser().parseFromString(t, "application/xml").documentElement : null; };
  const all = (el: Element | null, name: string) => (el ? [...el.getElementsByTagNameNS("*", name)] : []);
  const one = (el: Element | null | undefined, name: string) => (el ? el.getElementsByTagNameNS("*", name)[0] ?? null : null);
  const rels = (part: string) => {
    const dir = part.slice(0, part.lastIndexOf("/") + 1);
    const map = new Map<string, string>();
    for (const r of all(xml(`${dir}_rels/${part.slice(dir.length)}.rels`), "Relationship")) {
      const t = r.getAttribute("Target") ?? "";
      const parts = (t.startsWith("/") ? t.slice(1) : dir + t).split("/");
      const norm: string[] = [];
      for (const x of parts) { if (x === "..") norm.pop(); else if (x && x !== ".") norm.push(x); }
      map.set(r.getAttribute("Id") ?? "", norm.join("/"));
    }
    return map;
  };
  const rid = (el: Element | null) => { for (const a of el?.attributes ?? []) if (a.localName === "id" && a.prefix) return a.value; return null; };
  const book = xml("xl/workbook.xml");
  const bookRels = rels("xl/workbook.xml");
  for (const sh of all(book, "sheet")) {
    const sheetPath = bookRels.get(rid(sh) ?? "");
    if (!sheetPath) continue;
    const drawingPath = rels(sheetPath).get(rid(one(xml(sheetPath), "drawing")) ?? "");
    if (!drawingPath) continue;
    const dRels = rels(drawingPath);
    const anchors: Sheet["charts"] = [];
    const parts = new Map<string, Element>();
    for (const a of [...all(xml(drawingPath), "twoCellAnchor"), ...all(xml(drawingPath), "oneCellAnchor")]) {
      const chartRef = one(a, "chart");
      if (!chartRef) continue;
      const chartPath = dRels.get(rid(chartRef) ?? "");
      const root = chartPath ? xml(chartPath) : null;
      if (!chartPath || !root) continue;
      parts.set(`xlsx-chart:${chartPath}`, root);
      const pos = (el: Element | null) => el ? {
        c: Number(one(el, "col")?.textContent ?? 0) + 1, r: Number(one(el, "row")?.textContent ?? 0) + 1,
        dx: Number(one(el, "colOff")?.textContent ?? 0) / 12700, dy: Number(one(el, "rowOff")?.textContent ?? 0) / 12700,
      } : null;
      const from = pos(one(a, "from"))!;
      const ext = [...a.children].find((c) => c.localName === "ext");
      anchors.push({ ...from, w: ext ? Number(ext.getAttribute("cx")) / 12700 : 0, h: ext ? Number(ext.getAttribute("cy")) / 12700 : 0, path: `xlsx-chart:${chartPath}`, br: pos(one(a, "to")) });
    }
    out.set(sh.getAttribute("name") ?? "", { anchors, parts });
  }
  return out;
}

const DRAWING_TAGS = "wsDr|oneCellAnchor|twoCellAnchor|absoluteAnchor|from|to|col|colOff|row|rowOff|ext|pos|pic|nvPicPr|cNvPr|cNvPicPr|blipFill|spPr|clientData|graphicFrame|nvGraphicFramePr|cNvGraphicFramePr|xfrm|sp|nvSpPr|cNvSpPr|txBody|grpSp|nvGrpSpPr|cNvGrpSpPr|grpSpPr|cxnSp|nvCxnSpPr|cNvCxnSpPr|style";

/**
 * The spreadsheet reader expects drawings written the way Excel writes them:
 * with the "xdr:" prefix and without chart frames. Rewrite other tools' output to match.
 */
function normalizeDrawing(xml: string) {
  let out = xml;
  if (!/<xdr:wsDr\b/.test(out) && /<wsDr\b/.test(out)) {
    out = out.replace(new RegExp(`<(\\/?)(${DRAWING_TAGS})(?=[\\s>/])`, "g"), "<$1xdr:$2")
      .replace(/<xdr:wsDr([^>]*?)\sxmlns="([^"]+)"/, '<xdr:wsDr$1 xmlns:xdr="$2"');
  }
  // Chart frames: the pictures and cells convert; charts are reported in the notes.
  return out.replace(/<xdr:(twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[^>]*>(?:(?!<\/xdr:\1>)[\s\S])*?<xdr:graphicFrame[\s\S]*?<\/xdr:\1>/g, "");
}

function readSheet(ws: Worksheet, theme: string[], SSF: { format(fmt: string, v: unknown): string }, opts: { gridlines: string }, charts: Sheet["charts"]): Sheet | null {
  const cells = new Map<string, SheetCell>();
  let maxR = 0, maxC = 0, minR = Infinity, minC = Infinity;
  const defaultFont: Partial<import("exceljs").Font> = { name: "Calibri", size: 11 };
  ws.eachRow({ includeEmpty: false }, (row, r) => {
    row.eachCell({ includeEmpty: true }, (cell: XCell, c) => {
      const s = cell.style ?? {};
      const fill = s.fill && s.fill.type === "pattern" && s.fill.pattern && s.fill.pattern !== "none" ? colorOf(s.fill.fgColor, theme, null) : null;
      const hasBorder = s.border && Object.values(s.border).some((b) => (b as Partial<XBorder> | undefined)?.style);
      const text = cellText(cell, SSF);
      if (!text && !fill && !hasBorder) return;
      const f = s.font ?? defaultFont;
      const borders: CellStyle["borders"] = {};
      for (const [k, side] of [["left", "l"], ["right", "r"], ["top", "t"], ["bottom", "b"]] as const) {
        const b = (s.border as Record<string, Partial<XBorder> | undefined> | undefined)?.[k];
        if (b?.style) borders[side] = { color: colorOf(b.color, theme, "000000") ?? "000000", width: BORDER_W[b.style] ?? 0.5 };
      }
      const v = cell.value as unknown;
      const numeric = typeof v === "number" || v instanceof Date || (typeof v === "object" && v !== null && typeof (v as { result?: unknown }).result === "number");
      const link = typeof v === "object" && v && "hyperlink" in (v as object) ? String((v as { hyperlink: string }).hyperlink) : null;
      cells.set(key(r, c), {
        text, numeric, link,
        style: {
          font: f.name ?? "Calibri", size: f.size ?? 11, bold: !!f.bold, italic: !!f.italic, underline: !!f.underline, strike: !!f.strike,
          color: colorOf(f.color, theme, "000000") ?? "000000",
          fill, h: s.alignment?.horizontal ?? "general", v: s.alignment?.vertical ?? "bottom",
          wrap: !!s.alignment?.wrapText, indent: s.alignment?.indent ?? 0, rotate: typeof s.alignment?.textRotation === "number" ? s.alignment.textRotation : 0,
          borders,
        },
      });
      maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); minR = Math.min(minR, r); minC = Math.min(minC, c);
    });
  });
  const images = ws.getImages().map((img) => {
    const tl = img.range.tl as unknown as { nativeRow: number; nativeCol: number; nativeRowOff: number; nativeColOff: number };
    const br = img.range.br as unknown as { nativeRow: number; nativeCol: number; nativeRowOff: number; nativeColOff: number } | undefined;
    const ext = (img.range as unknown as { ext?: { width: number; height: number } }).ext;
    maxR = Math.max(maxR, (br?.nativeRow ?? tl.nativeRow) + 1);
    maxC = Math.max(maxC, (br?.nativeCol ?? tl.nativeCol) + 1);
    minR = Math.min(minR, tl.nativeRow + 1);
    minC = Math.min(minC, tl.nativeCol + 1);
    return { r: tl.nativeRow + 1, c: tl.nativeCol + 1, dx: tl.nativeColOff / 12700, dy: tl.nativeRowOff / 12700, w: ext ? ext.width * 0.75 : 0, h: ext ? ext.height * 0.75 : 0, id: Number(img.imageId), br: br ? { r: br.nativeRow + 1, c: br.nativeCol + 1, dx: br.nativeColOff / 12700, dy: br.nativeRowOff / 12700 } : null };
  });
  for (const ch of charts) {
    maxR = Math.max(maxR, ch.br?.r ?? ch.r); maxC = Math.max(maxC, ch.br?.c ?? ch.c);
    minR = Math.min(minR, ch.r); minC = Math.min(minC, ch.c);
  }
  if (!cells.size && !images.length && !charts.length) return null;

  // Print area, when the file sets one.
  const ps = ws.pageSetup ?? {};
  const area = typeof ps.printArea === "string" ? /^\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/i.exec(ps.printArea.split(",")[0]) : null;
  const colNum = (s: string) => [...s.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  if (area) { minC = colNum(area[1]); minR = Number(area[2]); maxC = colNum(area[3]); maxR = Number(area[4]); }
  minR = Math.min(minR, 1) === 1 && minR > 1 ? 1 : minR;
  minC = minC > 1 && minC !== Infinity ? 1 : minC;

  const rows: number[] = [], cols: number[] = [];
  for (let r = minR; r <= maxR; r++) if (!ws.getRow(r).hidden) rows.push(r);
  for (let c = minC; c <= maxC; c++) if (!ws.getColumn(c).hidden) cols.push(c);
  const defW = ws.properties?.defaultColWidth ?? 8.43;
  const defH = ws.properties?.defaultRowHeight ?? 15;
  // Column widths are in characters of the default font: about 7 px each plus 5 px padding.
  const widths = cols.map((c) => { const w = ws.getColumn(c).width ?? defW; return Math.max(2, Math.round(w * 7 + 5) * 0.75); });
  const heights = rows.map((r) => ws.getRow(r).height ?? defH);

  const merges = ((ws.model as unknown as { merges?: string[] }).merges ?? []).map((m) => {
    const x = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i.exec(m);
    return x ? { c1: colNum(x[1]), r1: Number(x[2]), c2: colNum(x[3]), r2: Number(x[4]) } : null;
  }).filter((m): m is Sheet["merges"][number] => !!m);

  const titles = typeof ps.printTitlesRow === "string" ? /^\$?(\d+):\$?(\d+)$/.exec(ps.printTitlesRow) : null;
  const repeatRows = titles ? rows.filter((r) => r >= Number(titles[1]) && r <= Number(titles[2])) : [];
  const margins = ps.margins ?? { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75 };
  const anyBorders = [...cells.values()].some((c) => Object.keys(c.style.borders).length);
  const printGrid = (ws as unknown as { properties?: { showGridLines?: boolean } }).properties?.showGridLines;
  void printGrid;
  return {
    name: ws.name, rows, cols, heights, widths, cells, merges, images, charts,
    landscape: ps.orientation === "landscape" ? true : ps.orientation === "portrait" ? false : null,
    paper: PAPER[ps.paperSize ?? 9] ?? PAPER[9],
    margins: { l: (margins.left ?? 0.7) * 72, r: (margins.right ?? 0.7) * 72, t: (margins.top ?? 0.75) * 72, b: (margins.bottom ?? 0.75) * 72 },
    fitWidth: !!ps.fitToPage && (ps.fitToWidth ?? 1) >= 1,
    scale: ps.scale && ps.scale !== 100 ? ps.scale / 100 : 1,
    repeatRows,
    // Excel doesn't print gridlines by default, but a sheet with no borders is hard to read without them.
    gridlines: opts.gridlines === "on" || (opts.gridlines === "auto" && !anyBorders),
  };
}

function cellText(cell: XCell, SSF: { format(fmt: string, v: unknown): string }): string {
  let v = cell.value as unknown;
  if (v == null) return "";
  if (typeof v === "object" && v !== null) {
    const o = v as { result?: unknown; richText?: { text: string }[]; text?: unknown; error?: string; formula?: string; sharedFormula?: string };
    if (o.richText) return o.richText.map((t) => t.text).join("");
    if ("error" in o && o.error) return String(o.error);
    if ("result" in o || o.formula || o.sharedFormula) v = o.result ?? "";
    else if ("text" in o) return String(o.text ?? "");
  }
  const fmt = cell.numFmt;
  try {
    if (v instanceof Date) return SSF.format(fmt || "yyyy-mm-dd", serial(v));
    if (typeof v === "number") return fmt && fmt !== "General" ? SSF.format(fmt, v) : Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(11)));
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  } catch { /* unusual format: fall back to the raw value */ }
  return String(v);
}

// ---------- layout

const runStyle = (s: CellStyle, link: string | null): RunStyle => ({
  font: s.font, csFont: "", size: s.size, bold: s.bold, italic: s.italic, underline: s.underline || !!link, strike: s.strike,
  color: link && s.color === "000000" ? "0563C1" : s.color, highlight: null, shading: null, vertAlign: "baseline", caps: false, spacing: 0, hidden: false, link,
});

function layoutSheet(sheet: Sheet, opts: { orientation: string; fit: boolean }, m: CanvasRenderingContext2D, pages: Page[]) {
  const tableW = sheet.widths.reduce((a, b) => a + b, 0);
  let [pw, ph] = sheet.paper;
  const landscape = opts.orientation === "landscape" ? true : opts.orientation === "portrait" ? false
    : sheet.landscape ?? tableW > pw - sheet.margins.l - sheet.margins.r;
  if (landscape) [pw, ph] = [ph, pw];
  const availW = pw - sheet.margins.l - sheet.margins.r;
  const availH = ph - sheet.margins.t - sheet.margins.b;
  const k = Math.max(0.3, (opts.fit || sheet.fitWidth) && tableW > availW ? availW / tableW : sheet.scale);

  // Column groups: one when fitting to width, otherwise as many page-widths as needed.
  const groups: number[][] = [];
  let acc = 0, cur: number[] = [];
  sheet.cols.forEach((_, i) => {
    const w = sheet.widths[i] * k;
    if (cur.length && acc + w > availW + 0.5) { groups.push(cur); cur = []; acc = 0; }
    cur.push(i); acc += w;
  });
  if (cur.length) groups.push(cur);

  const rowIndex = new Map(sheet.rows.map((r, i) => [r, i]));
  const colIndex = new Map(sheet.cols.map((c, i) => [c, i]));
  const mergeAt = new Map<string, Sheet["merges"][number]>();
  const covered = new Set<string>();
  for (const mg of sheet.merges) {
    mergeAt.set(key(mg.r1, mg.c1), mg);
    for (let r = mg.r1; r <= mg.r2; r++) for (let c = mg.c1; c <= mg.c2; c++) if (r !== mg.r1 || c !== mg.c1) covered.add(key(r, c));
  }

  for (const group of groups) {
    const xs: number[] = [];
    let x = sheet.margins.l;
    for (const i of group) { xs.push(x); x += sheet.widths[i] * k; }
    const right = x;
    // Rows into pages, repeating title rows.
    let ri = 0;
    while (ri < sheet.rows.length) {
      const page: Page = { w: pw, h: ph, ops: [], under: [], number: pages.length + 1, section: 0, sectionPage: pages.length + 1, footnotes: [] };
      pages.push(page);
      let y = sheet.margins.t;
      const placed: { row: number; y: number; h: number }[] = [];
      const repeat = ri > 0 ? sheet.repeatRows.filter((r) => rowIndex.has(r) && rowIndex.get(r)! < ri) : [];
      for (const r of repeat) { const h = sheet.heights[rowIndex.get(r)!] * k; placed.push({ row: r, y, h }); y += h; }
      do {
        const h = sheet.heights[ri] * k;
        if (y + h > sheet.margins.t + availH && placed.length > repeat.length) break;
        placed.push({ row: sheet.rows[ri], y, h });
        y += h;
        ri++;
      } while (ri < sheet.rows.length);
      const rowY = new Map(placed.map((p) => [p.row, p]));

      const colX = (c: number) => { const gi = group.indexOf(colIndex.get(c) ?? -1); return gi >= 0 ? xs[gi] : null; };
      const spanW = (c1: number, c2: number) => sheet.cols.filter((c) => c >= c1 && c <= c2 && group.includes(colIndex.get(c)!)).reduce((s, c) => s + sheet.widths[colIndex.get(c)!] * k, 0);
      const spanH = (r1: number, r2: number) => placed.filter((p) => p.row >= r1 && p.row <= r2).reduce((s, p) => s + p.h, 0);

      if (sheet.gridlines) {
        const top = placed[0]?.y ?? y, bottom = y;
        for (const p of placed) page.under.push({ t: "line", x1: xs[0], y1: p.y, x2: right, y2: p.y, color: "D0D0D0", width: 0.4 });
        page.under.push({ t: "line", x1: xs[0], y1: bottom, x2: right, y2: bottom, color: "D0D0D0", width: 0.4 });
        for (const gx of [...xs, right]) page.under.push({ t: "line", x1: gx, y1: top, x2: gx, y2: bottom, color: "D0D0D0", width: 0.4 });
      }

      const borders: Op[] = [];
      for (const p of placed) {
        for (const c of sheet.cols) {
          const cx = colX(c);
          if (cx == null || covered.has(key(p.row, c))) continue;
          const cell = sheet.cells.get(key(p.row, c));
          const mg = mergeAt.get(key(p.row, c));
          const w = mg ? spanW(mg.c1, mg.c2) : sheet.widths[colIndex.get(c)!] * k;
          const h = mg ? spanH(mg.r1, mg.r2) : p.h;
          if (!cell) continue;
          const s = cell.style;
          if (s.fill) page.under.push({ t: "rect", x: cx, y: p.y, w, h, fill: s.fill });
          const b = s.borders;
          if (b.t) borders.push({ t: "line", x1: cx, y1: p.y, x2: cx + w, y2: p.y, color: b.t.color, width: b.t.width });
          if (b.b) borders.push({ t: "line", x1: cx, y1: p.y + h, x2: cx + w, y2: p.y + h, color: b.b.color, width: b.b.width });
          if (b.l) borders.push({ t: "line", x1: cx, y1: p.y, x2: cx, y2: p.y + h, color: b.l.color, width: b.l.width });
          if (b.r) borders.push({ t: "line", x1: cx + w, y1: p.y, x2: cx + w, y2: p.y + h, color: b.r.color, width: b.r.width });
          if (!cell.text) continue;
          drawCellText(page.ops, cell, cx, p.y, w, h, k, m, (c2) => {
            // Text can spill into empty neighbours, as in Excel.
            const next = sheet.cells.get(key(p.row, c2));
            return !next?.text && !covered.has(key(p.row, c2)) ? (colX(c2) != null ? sheet.widths[colIndex.get(c2)!] * k : null) : null;
          }, c, sheet.cols);
        }
      }
      page.ops.push(...borders);
      for (const ch of sheet.charts) {
        const p = rowY.get(ch.r);
        const cx = colX(ch.c);
        if (!p || cx == null) continue;
        const between = (from: number, to: number, list: number[], sizes: number[]) => list.reduce((s, v, i) => (v >= from && v < to ? s + sizes[i] : s), 0);
        const w = ch.br ? (between(ch.c, ch.br.c, sheet.cols, sheet.widths) + ch.br.dx - ch.dx) * k : ch.w * k;
        const h = ch.br ? (between(ch.r, ch.br.r, sheet.rows, sheet.heights) + ch.br.dy - ch.dy) * k : ch.h * k;
        if (w > 4 && h > 4) page.ops.push({ t: "chart", src: { part: "", path: ch.path }, x: cx + ch.dx * k, y: p.y + ch.dy * k, w, h });
      }
      for (const img of sheet.images) {
        const p = rowY.get(img.r);
        const cx = colX(img.c);
        if (!p || cx == null) continue;
        // Two-cell anchors size the picture by the cells it covers.
        const between = (from: number, to: number, list: number[], sizes: number[]) => list.reduce((s, v, i) => (v >= from && v < to ? s + sizes[i] : s), 0);
        const w = img.w > 0 ? img.w * k : img.br ? (between(img.c, img.br.c, sheet.cols, sheet.widths) + img.br.dx - img.dx) * k : 120 * k;
        const h = img.h > 0 ? img.h * k : img.br ? (between(img.r, img.br.r, sheet.rows, sheet.heights) + img.br.dy - img.dy) * k : 90 * k;
        page.ops.push({ t: "image", src: { part: "", path: `xlsx-media:${img.id}` }, x: cx + img.dx * k, y: p.y + img.dy * k, w: Math.max(1, w), h: Math.max(1, h) });
      }
    }
  }
  return k;
}

function drawCellText(ops: Op[], cell: SheetCell, x: number, y: number, w: number, h: number, k: number, m: CanvasRenderingContext2D, free: (c: number) => number | null, col: number, cols: number[]) {
  const s = cell.style;
  const size = s.size * k;
  const style = runStyle({ ...s, size }, cell.link);
  const css = `${s.italic ? "italic " : ""}${s.bold ? 700 : 400} ${size}px ${measureStack(s.font)}`;
  m.font = css;
  const pad = 2 * k + s.indent * 9 * k;
  const align = s.h === "general" ? (cell.numeric ? "right" : "left") : s.h === "centerContinuous" ? "center" : s.h;
  const metrics = fontMetrics(fontKey(s.font));
  const lineH = (metrics.ascent + metrics.descent) * size;
  let lines = [cell.text];
  if (s.wrap) {
    lines = [];
    for (const para of cell.text.split(/\r?\n/)) {
      let cur = "";
      for (const word of para.split(/(\s+)/)) {
        const next = cur + word;
        if (cur && m.measureText(next.trimEnd()).width > w - pad * 2) { lines.push(cur.trimEnd()); cur = word.trimStart(); }
        else cur = next;
      }
      lines.push(cur);
    }
  } else if (cell.text.includes("\n")) lines = cell.text.split(/\r?\n/);
  const totalH = lines.length * lineH;
  let ty = s.v === "top" ? y + 1 : s.v === "center" || s.v === "middle" ? y + (h - totalH) / 2 : y + h - totalH - 1;
  // Numbers that don't fit show as #### in Excel.
  let room = w - pad * 2;
  if (!s.wrap && align === "left") {
    const i = cols.indexOf(col);
    for (let j = i + 1; j < cols.length && m.measureText(lines[0]).width > room; j++) { const fw = free(cols[j]); if (fw == null) break; room += fw; }
  }
  for (const text0 of lines) {
    let text = text0;
    let tw = m.measureText(text).width;
    if (cell.numeric && !s.wrap && tw > w - pad * 2 + 0.5) {
      const hash = Math.max(1, Math.floor((w - pad * 2) / m.measureText("#").width));
      text = "#".repeat(hash);
      tw = m.measureText(text).width;
    } else if (!s.wrap && tw > room + 0.5) {
      // Clip text that would run into a filled neighbour.
      while (text.length > 1 && m.measureText(text).width > room) text = text.slice(0, -1);
      tw = m.measureText(text).width;
    }
    const tx = align === "right" ? x + w - pad - tw : align === "center" ? x + (w - tw) / 2 : x + pad;
    const base = ty + metrics.ascent * size;
    if (text.trim()) ops.push({ t: "text", x: tx, y: base, text, style, css, size, width: tw });
    if (style.underline && text.trim()) ops.push({ t: "line", x1: tx, y1: base + size * 0.12, x2: tx + tw, y2: base + size * 0.12, color: style.color, width: Math.max(0.4, size / 16) });
    if (cell.link && text.trim()) ops.push({ t: "link", x: tx, y: base - size, w: tw, h: size * 1.25, url: cell.link });
    ty += lineH;
  }
}

// ---------- engine

export const excelToPdf: Engine = async ({ files: [file], options }, { onProgress, signal }) => {
  onProgress(0.05, "Reading the sheets");
  const { sheets, media, droppedDrawings, chartParts, theme, resolveRef } = await readWorkbook(file, { gridlines: String(options.gridlines ?? "auto") });
  if (!sheets.length) throw new ConversionError("This spreadsheet has no values in it.");
  signal.throwIfAborted();
  onProgress(0.15, "Loading fonts");
  await loadFonts(new Set(sheets.flatMap((s) => [...s.cells.values()].map((c) => c.style.font))));

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonts = new PdfFonts(pdf);
  // Charts use the same drawing code as slides; give it the workbook's theme colours.
  const palette = { theme: Object.fromEntries(THEME_ORDER.map((k, i) => [k, theme[i]])), map: {} };
  const pictures = new Pictures({ files: {}, picture: async () => null, xml: (p: string) => chartParts.get(p) ?? null } as never, pdf, palette, { major: "Calibri", minor: "Calibri" });
  pictures.resolveRef = resolveRef;
  const measure = document.createElement("canvas").getContext("2d")!;
  const pages: Page[] = [];
  const notes: string[] = [];
  const embedded = new Map<number, PDFImage | null>();

  for (const [i, sheet] of sheets.entries()) {
    onProgress(0.2 + (i / sheets.length) * 0.3, `Laying out ${sheet.name}`);
    await breathe(signal);
    const k = layoutSheet(sheet, { orientation: String(options.orientation ?? "auto"), fit: options.fit !== false }, measure, pages);
    if (k < 0.55) notes.push(`"${sheet.name}" is very wide, so its text is printed small. Turn off “Fit columns to the page width” to spread it over more pages.`);
  }

  // Images come from the workbook rather than a package, so embed them here.
  pictures.pdfImage = async (src) => {
    const id = Number(src.path.split(":")[1]);
    if (!embedded.has(id)) {
      const m = media.get(id);
      let img: PDFImage | null = null;
      try { img = m ? (/jpe?g/i.test(m.ext) ? await pdf.embedJpg(m.buffer) : await pdf.embedPng(m.buffer)) : null; } catch { img = null; }
      embedded.set(id, img);
    }
    return embedded.get(id)!;
  };
  pictures.bitmap = async (src) => {
    const m = media.get(Number(src.path.split(":")[1]));
    return m ? createImageBitmap(new Blob([m.buffer as BlobPart])).catch(() => null) : null;
  };

  const layer = await hiddenFont(pdf);
  let raster = 0;
  for (const [i, page] of pages.entries()) {
    onProgress(0.5 + (i / pages.length) * 0.46, `Writing page ${i + 1} of ${pages.length}`);
    await breathe(signal);
    const p = pdf.addPage([page.w, page.h]);
    if (await fonts.covers(page)) await paintVector(pdf, p, page, fonts, pictures, pages.length, pages.length);
    else {
      raster++;
      const { canvas, ctx } = pageCanvas(page.w * RASTER_SCALE, page.h * RASTER_SCALE);
      const lines = await paintRaster(ctx, RASTER_SCALE, page, pictures, pages.length, pages.length);
      await placeCanvas(pdf, p, canvas, page.w, page.h);
      hiddenText(p, layer, lines, RASTER_SCALE, page.h);
      canvas.width = canvas.height = 0;
    }
  }
  if (droppedDrawings) notes.push("Pictures in this workbook couldn't be read, so the PDF shows the cells only.");
  if (raster) notes.push(`${raster} ${raster === 1 ? "page uses" : "pages use"} a script such as Hindi or Tamil, so ${raster === 1 ? "it is" : "they are"} saved as a high-resolution picture.`);
  return { files: [{ name: `${baseOf(file.name)}.pdf`, blob: toBlob(await pdf.save(), PDF_MIME) }], notes };
};
