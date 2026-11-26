import { fontKey, fontMetrics, measureStack } from "../fonts";
import type { Block, Border, Cell, ChartSrc, Doc, Float, ImageSrc, Para, PageSetup, RunStyle, Table } from "./model";

/** One drawing instruction in page coordinates (points, y down). */
/** Ops drawn on one line share an id, so a page number's real width can shift what follows it. */
export interface LineRef { id: number; align: string }
export type Op =
  | { t: "text"; x: number; y: number; text: string; style: RunStyle; css: string; size: number; width: number; line?: LineRef }
  | { t: "field"; x: number; y: number; field: "PAGE" | "NUMPAGES" | "SECTIONPAGES"; style: RunStyle; css: string; size: number; width: number; line?: LineRef }
  | { t: "rect"; x: number; y: number; w: number; h: number; fill: string }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { t: "image"; src: ImageSrc; x: number; y: number; w: number; h: number }
  | { t: "chart"; src: ChartSrc; x: number; y: number; w: number; h: number }
  | { t: "missing"; label: string; x: number; y: number; w: number; h: number }
  | { t: "shape"; x: number; y: number; w: number; h: number; fill: string | null; line: Border | null; radius: number; ellipse: boolean }
  | { t: "link"; x: number; y: number; w: number; h: number; url: string };

export interface Page { w: number; h: number; ops: Op[]; under: Op[]; number: number; section: number; sectionPage: number; footnotes: { blocks: Block[]; number: number }[] }

type Measure = CanvasRenderingContext2D;

// ---------- run measurement

interface Piece {
  k: "word" | "space" | "tab" | "image" | "field" | "num";
  text: string;
  style: RunStyle;
  css: string;
  size: number;
  shift: number;
  w: number;
  h?: number;
  src?: ImageSrc | null;
  chart?: ChartSrc;
  field?: "PAGE" | "NUMPAGES" | "SECTIONPAGES";
  note?: { id: string; kind: "footnote" | "endnote" };
  x?: number;
  /** Tabs: the leader to draw across the gap. */
  leader?: string;
}

interface Line {
  pieces: Piece[];
  width: number;
  asc: number;
  desc: number;
  height: number;
  last: boolean;
  pageBreak: boolean;
  notes: { id: string; kind: "footnote" | "endnote" }[];
  floats: Float[];
}

export interface Env {
  m: Measure;
  doc: Doc;
  /** Footnote numbers in order of first reference. */
  notes: Map<string, number>;
  /** The number to show for a note mark inside a footnote being laid out. */
  noteMark?: number;
}

const CJK = /[⺀-鿿가-힯豈-﫿＀-￯]/;

function cssOf(s: RunStyle, size: number) {
  return `${s.italic ? "italic " : ""}${s.bold ? 700 : 400} ${size}px ${measureStack(s.font, s.csFont)}`;
}
function sizeOf(s: RunStyle) { return s.vertAlign === "baseline" ? s.size : s.size * 0.65; }
function shiftOf(s: RunStyle) { return s.vertAlign === "superscript" ? s.size * 0.33 : s.vertAlign === "subscript" ? -s.size * 0.14 : 0; }

const widthCache = new Map<string, number>();
function measure(env: Env, text: string, css: string, spacing: number) {
  const key = `${css}|${spacing}|${text}`;
  let w = widthCache.get(key);
  if (w == null) {
    env.m.font = css;
    w = env.m.measureText(text).width + spacing * [...text].length;
    if (widthCache.size > 20000) widthCache.clear();
    widthCache.set(key, w);
  }
  return w;
}

/** Office line heights come from each font's own metrics, which canvas doesn't report the same way. */
function lineMetrics(env: Env, s: RunStyle, text = "") {
  const size = s.size;
  const m = fontMetrics(fontKey(s.font));
  let asc = m.ascent * size, desc = m.descent * size;
  if (/[^\u0000-ɏͰ-Ͽ -⁯₠-⃏℀-⅏]/.test(text)) {
    // Other scripts fall back to system fonts that often sit taller.
    env.m.font = cssOf(s, size);
    const t = env.m.measureText(text);
    asc = Math.max(asc, Math.min(t.fontBoundingBoxAscent || 0, size * 1.3));
    desc = Math.max(desc, Math.min(t.fontBoundingBoxDescent || 0, size * 0.6));
  }
  return { asc, desc };
}

function piecesOf(para: Para, env: Env): { pieces: Piece[]; breaks: Set<number>; floats: Map<number, Float[]> } {
  const pieces: Piece[] = [];
  const breaks = new Set<number>();
  const floats = new Map<number, Float[]>();
  const add = (p: Omit<Piece, "css" | "size" | "shift"> & { style: RunStyle }) => {
    const size = sizeOf(p.style);
    pieces.push({ ...p, size, css: cssOf(p.style, size), shift: shiftOf(p.style) });
  };
  for (const inl of para.inlines) {
    switch (inl.t) {
      case "text": {
        const s = inl.style;
        const text = s.caps ? inl.text.toUpperCase() : inl.text;
        for (const part of text.split(/([  ]+)/)) {
          if (!part) continue;
          const size = sizeOf(s), css = cssOf(s, size);
          if (/^[  ]+$/.test(part)) { add({ k: "space", text: part, style: s, w: measure(env, part, css, s.spacing) }); continue; }
          if (CJK.test(part)) {
            for (const ch of part) {
              add({ k: "word", text: ch, style: s, w: measure(env, ch, css, s.spacing) });
              if (CJK.test(ch)) add({ k: "space", text: "", style: s, w: 0 });
            }
          } else add({ k: "word", text: part, style: s, w: measure(env, part, css, s.spacing) });
        }
        break;
      }
      case "tab": add({ k: "tab", text: "", style: inl.style, w: 0 }); break;
      case "br":
        if (inl.kind === "page") breaks.add(-pieces.length - 1);
        else breaks.add(pieces.length);
        break;
      case "image": add({ k: "image", text: "", style: inl.style, w: inl.w, h: inl.h, src: inl.src, chart: inl.chart }); break;
      case "field": {
        const size = sizeOf(inl.style);
        add({ k: "field", text: "", style: inl.style, w: measure(env, inl.field === "PAGE" ? "99" : "999", cssOf(inl.style, size), 0), field: inl.field });
        break;
      }
      case "note": {
        let n = env.notes.get(`${inl.kind}:${inl.id}`);
        if (n == null) { n = [...env.notes.keys()].filter((k) => k.startsWith(inl.kind)).length + 1; env.notes.set(`${inl.kind}:${inl.id}`, n); }
        const size = sizeOf(inl.style);
        add({ k: "word", text: String(n), style: inl.style, w: measure(env, String(n), cssOf(inl.style, size), 0), note: { id: inl.id, kind: inl.kind } });
        break;
      }
      case "noteMark": {
        const text = String(env.noteMark ?? "");
        const size = sizeOf(inl.style);
        add({ k: "word", text, style: inl.style, w: measure(env, text, cssOf(inl.style, size), 0) });
        break;
      }
      case "float": {
        const list = floats.get(pieces.length) ?? [];
        list.push(inl.float);
        floats.set(pieces.length, list);
        break;
      }
    }
  }
  return { pieces, breaks, floats };
}

export interface ParaLayout { para: Para; lines: Line[]; before: number; after: number; left: number; right: number; width: number }

/** Breaks a paragraph into lines that fit `width` (the space between the page margins or cell edges). */
export function layoutPara(para: Para, width: number, env: Env): ParaLayout {
  const st = para.style;
  const left = st.left, right = st.right;
  const avail = Math.max(10, width - left - right);
  const { pieces, breaks, floats } = piecesOf(para, env);
  const lines: Line[] = [];
  let cur: Piece[] = [];
  let curFloats: Float[] = [];
  let x = 0;
  const firstStart = st.firstLine;
  let lineStart = firstStart;

  const tabStops = st.tabs.filter((t) => t.align !== "clear").map((t) => ({ ...t, pos: t.pos - left }));
  const nextTab = (at: number) => {
    const custom = tabStops.find((t) => t.pos > at + 0.5);
    // A hanging indent acts as a tab stop at the indent.
    const hang = st.firstLine < 0 && at < -0.5 ? 0 : null;
    const def = env.doc.defaultTab;
    const fallback = { pos: (Math.floor((at + left) / def + 0.001) + 1) * def - left, align: "left" as const, leader: "none" };
    if (hang != null && (!custom || custom.pos > hang)) return { pos: hang, align: "left" as const, leader: "none" };
    return custom ?? fallback;
  };

  if (para.num) {
    const n = para.num;
    const size = sizeOf(n.style), css = cssOf(n.style, size);
    const w = measure(env, n.text, css, 0);
    cur.push({ k: "num", text: n.text, style: n.style, css, size, shift: 0, w, x: firstStart });
    x = firstStart + w;
    if (n.suffix === "tab") {
      const stop = nextTab(x);
      x = Math.max(stop.pos, x + 2);
    } else if (n.suffix === "space") x += measure(env, " ", css, 0);
  } else x = firstStart;

  const finish = (last: boolean, pageBreak: boolean) => {
    let end = cur.length;
    while (end && cur[end - 1].k === "space") end--;
    const visible = cur.slice(0, end);
    let asc = 0, desc = 0, imgH = 0;
    const textStyles = visible.filter((p) => p.k !== "image");
    for (const p of textStyles.length ? textStyles : [{ style: para.mark, text: "" } as Piece]) {
      const m = lineMetrics(env, p.k === "num" ? { ...p.style } : p.style, p.text);
      asc = Math.max(asc, m.asc + Math.max(0, p.shift ?? 0));
      desc = Math.max(desc, m.desc);
    }
    for (const p of visible) if (p.k === "image") imgH = Math.max(imgH, p.h ?? 0);
    const natural = asc + desc;
    let height: number;
    if (st.lineRule === "exact") height = st.line / 20;
    else if (st.lineRule === "atLeast") height = Math.max(natural, imgH + desc, st.line / 20);
    else height = Math.max(natural * (st.line / 240), imgH + desc);
    if (imgH > asc) asc = imgH;
    const lastX = visible.length ? (visible.at(-1)!.x ?? 0) + visible.at(-1)!.w : lineStart;
    lines.push({ pieces: visible, width: lastX - (lines.length ? 0 : Math.min(0, firstStart)), asc, desc, height, last, pageBreak, notes: visible.filter((p) => p.note).map((p) => p.note!), floats: curFloats });
    cur = [];
    curFloats = [];
    lineStart = 0;
    x = 0;
  };

  for (let i = 0; i <= pieces.length; i++) {
    if (floats.has(i)) curFloats.push(...floats.get(i)!);
    if (breaks.has(-i - 1)) { finish(true, true); }
    if (i === pieces.length) break;
    if (breaks.has(i) && i > 0) finish(false, false);
    const p = pieces[i];
    if (p.k === "tab") {
      const stop = nextTab(x);
      let target = stop.pos;
      if (stop.align === "right" || stop.align === "center" || stop.align === "decimal") {
        let seg = 0;
        for (let j = i + 1; j < pieces.length && pieces[j].k !== "tab" && !breaks.has(j); j++) seg += pieces[j].w;
        target = stop.align === "center" ? stop.pos - seg / 2 : stop.pos - seg;
      }
      if (target <= x + 0.5 || stop.pos > avail + right + 1) {
        // No room for the stop: Word moves to the next default stop or wraps.
        target = (Math.floor((x + left) / env.doc.defaultTab + 0.001) + 1) * env.doc.defaultTab - left;
        if (target > avail) { finish(false, false); target = 0; }
      }
      cur.push({ ...p, x, w: target - x, leader: stop.leader });
      x = target;
      continue;
    }
    if (p.k === "space") { cur.push({ ...p, x }); x += p.w; continue; }
    // Words can span several runs; keep them together.
    let j = i, w = 0;
    while (j < pieces.length && (pieces[j].k === "word" || pieces[j].k === "field") && !breaks.has(j) && !(j > i && breaks.has(-j - 1))) w += pieces[j++].w;
    if (j === i) { j = i + 1; w = p.w; }
    const hasContent = cur.some((c) => c.k !== "space" && c.k !== "num");
    if (x + w > avail + 0.3 && hasContent) finish(false, false);
    if (x + w > avail + 0.3 && p.k === "word" && j === i + 1 && p.text.length > 1) {
      // A single word wider than the line: break it by characters.
      let text = p.text;
      while (text) {
        let n = text.length;
        while (n > 1 && x + measure(env, text.slice(0, n), p.css, p.style.spacing) > avail) n--;
        const part = text.slice(0, n);
        const pw = measure(env, part, p.css, p.style.spacing);
        cur.push({ ...p, text: part, w: pw, x });
        x += pw;
        text = text.slice(n);
        if (text) finish(false, false);
      }
      continue;
    }
    for (let k = i; k < j; k++) { cur.push({ ...pieces[k], x }); x += pieces[k].w; }
    i = j - 1;
  }
  finish(true, false);
  if (lines.length > 1 && !lines.at(-1)!.pieces.length && !lines.at(-1)!.floats.length && lines.at(-2)!.pageBreak) lines.pop();
  return { para, lines, before: st.before, after: st.after, left, right, width };
}

// ---------- drawing lines

const LEADERS: Record<string, string> = { dot: ".", hyphen: "-", underscore: "_", middleDot: "·", heavy: "_" };

let lineIds = 0;

export function drawLine(ops: Op[], pl: ParaLayout, line: Line, x0: number, top: number, env: Env) {
  const st = pl.para.style;
  const ref: LineRef = { id: ++lineIds, align: st.align };
  const avail = pl.width - pl.left - pl.right;
  const free = avail - line.width;
  const spaces = line.pieces.filter((p) => p.k === "space" && p.text).length;
  const justify = st.align === "both" && !line.last && !line.pageBreak && spaces && free > 0 && free < avail * 0.5 ? free / spaces : 0;
  const shift = st.align === "center" ? free / 2 : st.align === "right" ? free : 0;
  const baseline = top + line.height - line.desc;
  let extra = 0;
  // Merge neighbouring pieces with one style, so the browser shapes and orders scripts properly.
  type Seg = { x: number; text: string; w: number; p: Piece };
  const segs: Seg[] = [];
  for (const p of line.pieces) {
    const x = x0 + pl.left + (p.x ?? 0) + shift + extra;
    if (p.k === "space" && justify && p.text) extra += justify;
    const w = p.w + (p.k === "space" && justify && p.text ? justify : 0);
    if (p.k === "image") {
      if (p.chart) ops.push({ t: "chart", src: p.chart, x, y: baseline - (p.h ?? 0), w: p.w, h: p.h ?? 0 });
      else if (p.src) ops.push({ t: "image", src: p.src, x, y: baseline - (p.h ?? 0), w: p.w, h: p.h ?? 0 });
      else ops.push({ t: "missing", label: "Picture", x, y: baseline - (p.h ?? 0), w: p.w, h: p.h ?? 0 });
      continue;
    }
    if (p.k === "tab") {
      const ch = LEADERS[p.leader ?? ""];
      if (ch && w > 4) {
        const dw = measure(env, ch, p.css, 0);
        const n = Math.floor((w - 4) / dw);
        if (n > 0) ops.push({ t: "text", x: x + w - n * dw - 2, y: baseline, text: ch.repeat(n), style: p.style, css: p.css, size: p.size, width: n * dw });
      }
      if (p.style.underline) ops.push({ t: "line", x1: x, y1: baseline + p.size * 0.12, x2: x + w, y2: baseline + p.size * 0.12, color: p.style.color, width: Math.max(0.5, p.size / 16) });
      continue;
    }
    if (p.k === "field") {
      ops.push({ t: "field", x, y: baseline - p.shift, field: p.field!, style: p.style, css: p.css, size: p.size, width: p.w, line: ref });
      continue;
    }
    const prev = segs.at(-1);
    if (prev && p.k === "space" && !justify && prev.p.k !== "num" && Math.abs(prev.x + prev.w - x) < 0.01 && !p.style.underline) {
      prev.text += p.text;
      prev.w += w;
      continue;
    }
    if (prev && prev.p.style === p.style && prev.p.k !== "num" && p.k !== "num" && !justify && Math.abs(prev.x + prev.w - x) < 0.01) {
      prev.text += p.text;
      prev.w += w;
    } else segs.push({ x, text: p.text, w, p });
  }
  for (const s of segs) {
    const st2 = s.p.style;
    const y = baseline - s.p.shift;
    if (st2.shading) ops.push({ t: "rect", x: s.x, y: top + (line.height - line.asc - line.desc), w: s.w, h: line.asc + line.desc, fill: st2.shading });
    if (st2.highlight) ops.push({ t: "rect", x: s.x, y: baseline - s.p.size * 0.95, w: s.w, h: s.p.size * 1.2, fill: st2.highlight });
    if (s.text.trim()) ops.push({ t: "text", x: s.x, y, text: s.text, style: st2, css: s.p.css, size: s.p.size, width: s.w, line: ref });
    const t = Math.max(0.5, s.p.size / 16);
    if (st2.underline && s.text.trim() && s.p.k !== "num") ops.push({ t: "line", x1: s.x, y1: y + s.p.size * 0.12, x2: s.x + s.w, y2: y + s.p.size * 0.12, color: st2.color, width: t });
    if (st2.strike && s.text.trim()) ops.push({ t: "line", x1: s.x, y1: y - s.p.size * 0.27, x2: s.x + s.w, y2: y - s.p.size * 0.27, color: st2.color, width: t });
    if (st2.link && st2.link !== "#" && s.text.trim()) ops.push({ t: "link", x: s.x, y: baseline - s.p.size, w: s.w, h: s.p.size * 1.25, url: st2.link });
  }
}

// ---------- tables

interface CellLayout { cell: Cell; x: number; w: number; items: Item[]; contentH: number; rowSpan: number }
interface RowLayout { row: { height: number; exact: boolean; header: boolean; cantSplit: boolean }; cells: CellLayout[]; height: number }
export interface TableLayout { table: Table; x: number; widths: number[]; rows: RowLayout[] }

/** A flat, unbreakable piece of content inside a cell or text box. */
interface Item { h: number; draw(ops: Op[], x: number, y: number): void }

function flatItems(blocks: Block[], width: number, env: Env): Item[] {
  const items: Item[] = [];
  let prevAfter = 0;
  let prevStyle = "";
  blocks.forEach((b, bi) => {
    if (b.t === "p") {
      const pl = layoutPara(b, width, env);
      const contextual = b.style.contextual && prevStyle === b.style.styleId;
      const before = bi === 0 ? 0 : contextual ? 0 : pl.before + prevAfter;
      if (before) items.push({ h: before, draw() {} });
      pl.lines.forEach((line) => items.push({ h: line.height, draw: (ops, x, y) => drawLine(ops, pl, line, x, y, env) }));
      prevAfter = b.style.contextual && blocks[bi + 1]?.t === "p" && (blocks[bi + 1] as Para).style.styleId === b.style.styleId ? 0 : pl.after;
      prevStyle = b.style.styleId;
    } else {
      const tl = layoutTable(b, width, env);
      if (prevAfter) items.push({ h: prevAfter, draw() {} });
      for (const r of tl.rows) items.push({ h: r.height, draw: (ops, x, y) => drawRow(ops, tl, r, x, y, r.height, null) });
      prevAfter = 0;
      prevStyle = "";
    }
  });
  return items;
}

export function layoutTable(t: Table, width: number, env: Env): TableLayout {
  let widths = t.grid.length ? [...t.grid] : [width];
  const total = widths.reduce((a, b) => a + b, 0) || 1;
  const wanted = t.width?.pct ? (width * t.width.value) / 100 : t.width?.value ?? total;
  const target = Math.min(width - Math.max(0, t.indent), Math.max(total, t.width?.pct ? wanted : 0));
  if (Math.abs(target - total) > 0.5) widths = widths.map((w) => (w / total) * target);
  const tableW = widths.reduce((a, b) => a + b, 0);
  const x = t.align === "center" ? (width - tableW) / 2 : t.align === "right" ? width - tableW : t.indent;
  const starts = widths.reduce<number[]>((a, w) => [...a, a.at(-1)! + w], [0]);

  const rows: RowLayout[] = t.rows.map((row) => ({
    row,
    height: row.height,
    cells: row.cells.map((cell) => {
      const cx = starts[Math.min(cell.col, widths.length - 1)] ?? 0;
      const cw = (starts[Math.min(cell.col + cell.span, widths.length)] ?? tableW) - cx;
      const items = cell.vMerge === "continue" ? [] : flatItems(cell.blocks, Math.max(5, cw - cell.margin.l - cell.margin.r), env);
      const contentH = items.reduce((s, i) => s + i.h, 0);
      return { cell, x: cx, w: cw, items, contentH, rowSpan: 1 };
    }),
  }));
  // Vertically merged cells: count how many rows each spans.
  rows.forEach((r, ri) => r.cells.forEach((c) => {
    if (c.cell.vMerge !== "restart") return;
    let n = 1;
    while (ri + n < rows.length && rows[ri + n].cells.some((o) => o.cell.col === c.cell.col && o.cell.vMerge === "continue")) n++;
    c.rowSpan = n;
  }));
  for (const r of rows) {
    const content = Math.max(0, ...r.cells.filter((c) => c.rowSpan === 1 && c.cell.vMerge !== "continue").map((c) => c.contentH + c.cell.margin.t + c.cell.margin.b));
    r.height = r.row.exact ? r.row.height : Math.max(r.row.height, content, 4);
  }
  rows.forEach((r, ri) => r.cells.forEach((c) => {
    if (c.rowSpan < 2) return;
    const span = rows.slice(ri, ri + c.rowSpan);
    const have = span.reduce((s, x) => s + x.height, 0);
    const need = c.contentH + c.cell.margin.t + c.cell.margin.b;
    if (need > have) span.at(-1)!.height += need - have;
  }));
  return { table: t, x, widths, rows };
}

/** Draws one row. `slice` limits content to a window when a row is split across pages. */
function drawRow(ops: Op[], tl: TableLayout, r: RowLayout, x0: number, y: number, h: number, slice: { from: number; to: number } | null) {
  const ri = tl.rows.indexOf(r);
  for (const c of r.cells) {
    const x = x0 + tl.x + c.x;
    let cellH = h;
    if (c.rowSpan > 1 && !slice) cellH = tl.rows.slice(ri, ri + c.rowSpan).reduce((s, x2) => s + x2.height, 0);
    const isContinue = c.cell.vMerge === "continue";
    if (c.cell.shading && !isContinue) ops.push({ t: "rect", x, y, w: c.w, h: cellH, fill: c.cell.shading });
    if (c.cell.shading && isContinue) {
      // The merged cell above already painted this area when the rows share a page.
    }
    const b = c.cell.borders;
    const mergedBelow = c.rowSpan > 1 && !slice;
    const edge = (bd: Border | null | undefined, x1: number, y1: number, x2: number, y2: number) => { if (bd) ops.push({ t: "line", x1, y1, x2, y2, color: bd.color, width: bd.width }); };
    if (!isContinue) edge(b.top, x, y, x + c.w, y);
    edge(b.left, x, y, x, y + (isContinue ? h : cellH));
    edge(b.right, x + c.w, y, x + c.w, y + (isContinue ? h : cellH));
    if (!mergedBelow && !isContinue) edge(b.bottom, x, y + h, x + c.w, y + h);
    if (isContinue) {
      const nextRow = tl.rows[ri + 1];
      const continues = nextRow?.cells.some((o) => o.cell.col === c.cell.col && o.cell.vMerge === "continue");
      if (!continues) edge(b.bottom, x, y + h, x + c.w, y + h);
    }
    if (isContinue) continue;
    const items = slice ? c.items.slice(slice.from, slice.to) : c.items;
    const used = items.reduce((s, i) => s + i.h, 0);
    const room = cellH - c.cell.margin.t - c.cell.margin.b;
    let cy = y + c.cell.margin.t + (slice ? 0 : c.cell.vAlign === "center" ? Math.max(0, (room - used) / 2) : c.cell.vAlign === "bottom" ? Math.max(0, room - used) : 0);
    for (const item of items) { item.draw(ops, x + c.cell.margin.l, cy); cy += item.h; }
  }
}

// ---------- pages

export interface Layout { pages: Page[] }

export function paginate(doc: Doc, env: Env): Layout {
  const pages: Page[] = [];
  let page: Page | null = null;
  let y = 0, bottom = 0;
  let setup: PageSetup = doc.sections[0].page;
  let sectionIndex = 0, sectionPage = 0, pageNumber = 0;
  let noteReserve = 0;
  const contentW = () => setup.w - setup.left - setup.right;

  const hf = (kind: "headers" | "footers", n: number) => {
    const set = setup[kind];
    if (setup.titlePg && n === 1) return set.first ?? [];
    if (doc.evenAndOdd && pageNumber % 2 === 0) return set.even ?? set.default ?? [];
    return set.default ?? [];
  };

  const newPage = () => {
    sectionPage++;
    pageNumber = sectionPage === 1 && setup.startNumber != null ? setup.startNumber : pageNumber + 1;
    page = { w: setup.w, h: setup.h, ops: [], under: [], number: pageNumber, section: sectionIndex, sectionPage, footnotes: [] };
    pages.push(page);
    // Header and footer, which can push the body down or up.
    const header = flatItems(hf("headers", sectionPage), contentW(), env);
    let hy = setup.header;
    for (const it of header) { it.draw(page.ops, setup.left, hy); hy += it.h; }
    const footer = flatItems(hf("footers", sectionPage), contentW(), env);
    const fh = footer.reduce((s, i) => s + i.h, 0);
    let fy = setup.h - setup.footer - fh;
    for (const it of footer) { it.draw(page.ops, setup.left, fy); fy += it.h; }
    y = Math.max(setup.top, hy + (header.length ? 6 : 0));
    bottom = Math.min(setup.h - setup.bottom, setup.h - setup.footer - fh - (footer.length ? 6 : 0));
    noteReserve = 0;
  };
  const top = () => (page ? y <= Math.max(setup.top, 0) + 0.01 : true);
  const atTop = () => page !== null && pageTopY === y;
  let pageTopY = 0;
  const startPage = () => { newPage(); pageTopY = y; };

  /** Height footnotes on the current page would need if these were added. */
  const noteHeight = (refs: { id: string; kind: string }[]) => {
    let h = 0;
    for (const r of refs) {
      if (r.kind !== "footnote") continue;
      const blocks = doc.footnotes.get(r.id);
      if (!blocks) continue;
      env.noteMark = env.notes.get(`footnote:${r.id}`);
      h += flatItems(blocks, contentW(), env).reduce((s, i) => s + i.h, 0);
    }
    return h && !page!.footnotes.length ? h + 10 : h;
  };
  const addNotes = (refs: { id: string; kind: string }[]) => {
    for (const r of refs) if (r.kind === "footnote" && doc.footnotes.has(r.id)) page!.footnotes.push({ blocks: doc.footnotes.get(r.id)!, number: env.notes.get(`footnote:${r.id}`) ?? 0 });
  };

  const placeFloat = (f: Float, paraTop: number) => {
    const p = page!;
    const area = f.x.from === "page" ? { x: 0, w: setup.w } : { x: setup.left, w: contentW() };
    const fx = f.x.offset != null ? area.x + f.x.offset : f.x.align === "center" ? area.x + (area.w - f.w) / 2 : f.x.align === "right" ? area.x + area.w - f.w : area.x;
    const vArea = f.y.from === "page" ? { y: 0, h: setup.h } : f.y.from === "margin" ? { y: setup.top, h: setup.h - setup.top - setup.bottom } : { y: paraTop, h: 0 };
    const fy = f.y.offset != null ? vArea.y + f.y.offset : f.y.align === "center" ? vArea.y + (vArea.h - f.h) / 2 : f.y.align === "bottom" ? vArea.y + vArea.h - f.h : vArea.y;
    drawFloat(f, fx, fy, f.content.kind === "shape" ? p.under : p.ops, env);
  };

  let prevAfter = 0;
  let prevStyle = "";
  const flowBlocks = (blocks: Block[]) => {
    for (let bi = 0; bi < blocks.length; bi++) {
      const b = blocks[bi];
      if (b.t === "tbl") { placeTable(b); prevAfter = 0; prevStyle = ""; continue; }
      const pl = layoutPara(b, contentW(), env);
      const st = b.style;
      if (st.pageBreakBefore && !atTop()) startPage();
      const contextual = st.contextual && prevStyle === st.styleId;
      let gap = contextual ? 0 : prevAfter + pl.before;
      if (atTop()) gap = 0;
      // In-flow floats become their own lines before the text.
      const inFlow = pl.lines.flatMap((l) => l.floats.filter((f) => f.inFlow));
      for (const f of inFlow) {
        if (y + gap + f.h > bottom && !atTop()) { startPage(); gap = 0; }
        y += gap; gap = 0;
        const area = { x: setup.left, w: contentW() };
        const fx = f.x.align === "center" ? area.x + (area.w - f.w) / 2 : f.x.align === "right" ? area.x + area.w - f.w : f.x.offset != null && f.x.from !== "page" ? area.x + Math.max(0, Math.min(f.x.offset, area.w - f.w)) : area.x;
        drawFloat(f, fx, y, page!.ops, env);
        y += f.h + 4;
      }
      const lines = pl.lines;
      const total = lines.reduce((s, l) => s + l.height, 0);
      // Keep-with-next: the next paragraph's first line must fit too.
      let need = gap + (st.keepLines ? total : lines[0]?.height ?? 0);
      if (st.keepNext && blocks[bi + 1]?.t === "p") {
        need = gap + total + (layoutPara(blocks[bi + 1] as Para, contentW(), env).lines[0]?.height ?? 0);
      }
      if (y + need + noteReserve > bottom && !atTop() && need <= bottom - pageTopY) { startPage(); gap = 0; }
      y += gap;
      let paraTop = y;
      let chunkStart = 0;
      const decorate = (from: number, to: number, isEnd: boolean) => {
        if (to <= from) return;
        const x1 = setup.left + pl.left, x2 = setup.left + contentW() - pl.right;
        const h = lines.slice(from, to).reduce((s, l) => s + l.height, 0);
        if (st.shading) page!.under.push({ t: "rect", x: x1, y: paraTop, w: x2 - x1, h, fill: st.shading });
        const bd = st.borders;
        if (bd.top && from === 0) page!.ops.push({ t: "line", x1, y1: paraTop - bd.top.space, x2, y2: paraTop - bd.top.space, color: bd.top.color, width: bd.top.width });
        if (bd.bottom && isEnd) page!.ops.push({ t: "line", x1, y1: paraTop + h + bd.bottom.space + 1, x2, y2: paraTop + h + bd.bottom.space + 1, color: bd.bottom.color, width: bd.bottom.width });
      };
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const notesH = noteHeight(line.notes);
        const remaining = lines.length - li;
        let breakHere = y + line.height + noteReserve + notesH > bottom && !atTop();
        // Widow and orphan control: never leave a single line behind or alone.
        if (!breakHere && st.widow && lines.length > 1 && li === lines.length - 2 && li > 0) {
          const nextFits = y + line.height + lines[li + 1].height + noteReserve <= bottom;
          if (!nextFits && li > 1) breakHere = true;
        }
        if (!breakHere && st.widow && li === 0 && remaining > 1 && y + line.height + lines[1].height + noteReserve > bottom && !atTop()) breakHere = true;
        if (breakHere) {
          decorate(chunkStart, li, false);
          startPage();
          paraTop = y;
          chunkStart = li;
        }
        for (const f of line.floats) if (!f.inFlow) placeFloat(f, paraTop);
        drawLine(page!.ops, pl, line, setup.left, y, env);
        addNotes(line.notes);
        noteReserve += notesH;
        y += line.height;
        if (line.pageBreak && li < lines.length - 1) { decorate(chunkStart, li + 1, false); startPage(); paraTop = y; chunkStart = li + 1; }
        else if (line.pageBreak) { decorate(chunkStart, li + 1, true); startPage(); chunkStart = lines.length; prevAfter = 0; }
      }
      if (chunkStart < lines.length) decorate(chunkStart, lines.length, true);
      if (!(lines.at(-1)?.pageBreak)) prevAfter = st.contextual && blocks[bi + 1]?.t === "p" && (blocks[bi + 1] as Para).style.styleId === st.styleId ? 0 : pl.after;
      prevStyle = st.styleId;
      // A trailing page break leaves the next paragraph at the very top.
      if (lines.at(-1)?.pageBreak) { pageTopY = y; prevAfter = 0; }
    }
  };

  const placeTable = (t: Table) => {
    const tl = layoutTable(t, contentW(), env);
    if (prevAfter && !atTop()) y += prevAfter;
    const headers = tl.rows.filter((r, i) => r.row.header && tl.rows.slice(0, i).every((p) => p.row.header));
    for (let ri = 0; ri < tl.rows.length; ri++) {
      const r = tl.rows[ri];
      const span = Math.max(1, ...r.cells.map((c) => c.rowSpan));
      const needed = span > 1 ? tl.rows.slice(ri, ri + span).reduce((s, x) => s + x.height, 0) : r.height;
      const fitsEmpty = needed <= bottom - pageTopY - headers.reduce((s, h) => s + h.height, 0);
      if (y + Math.min(needed, fitsEmpty ? needed : r.height) > bottom && !atTop() && (fitsEmpty || r.row.cantSplit || span > 1 || y + 24 > bottom)) {
        startPage();
        if (!headers.includes(r)) for (const h of headers) { drawRow(page!.ops, tl, h, setup.left, y, h.height, null); y += h.height; }
      }
      if (y + r.height <= bottom || r.row.exact || span > 1) {
        drawRow(page!.ops, tl, r, setup.left, y, r.height, null);
        y += r.height;
        continue;
      }
      // Split a tall row across pages, a whole line at a time.
      const cursor = r.cells.map(() => 0);
      while (cursor.some((c, i) => c < r.cells[i].items.length)) {
        const room = bottom - y - Math.max(...r.cells.map((c) => c.cell.margin.t + c.cell.margin.b));
        const ends = r.cells.map((c, i) => {
          let h = 0, e = cursor[i];
          while (e < c.items.length && h + c.items[e].h <= room) h += c.items[e++].h;
          if (e === cursor[i] && atTop() && e < c.items.length) e++;
          return e;
        });
        const part = Math.max(...r.cells.map((c, i) => c.items.slice(cursor[i], ends[i]).reduce((s, it) => s + it.h, 0) + c.cell.margin.t + c.cell.margin.b));
        const partRow: RowLayout = { ...r, cells: r.cells.map((c, i) => ({ ...c, items: c.items.slice(cursor[i], ends[i]) })), height: part };
        drawRow(page!.ops, { ...tl, rows: [partRow] }, partRow, setup.left, y, part, null);
        y += part;
        r.cells.forEach((_, i) => (cursor[i] = ends[i]));
        if (cursor.some((c, i) => c < r.cells[i].items.length)) {
          startPage();
          for (const h of headers) { drawRow(page!.ops, tl, h, setup.left, y, h.height, null); y += h.height; }
        }
      }
    }
    prevAfter = 0;
  };

  doc.sections.forEach((section, si) => {
    const continuous = si > 0 && section.page.continuous && page && Math.abs(section.page.w - setup.w) < 1;
    setup = section.page;
    sectionIndex = si;
    if (!continuous) {
      sectionPage = 0;
      if (si > 0 && section.page.startNumber == null) { /* numbering continues */ }
      startPage();
    }
    flowBlocks(section.blocks);
  });

  // Endnotes follow the text, as in Word.
  const endnoteRefs = [...env.notes.keys()].filter((k) => k.startsWith("endnote:"));
  if (endnoteRefs.length) {
    if (y + 30 > bottom) startPage();
    y += 12;
    page!.ops.push({ t: "line", x1: setup.left, y1: y, x2: setup.left + contentW() / 3, y2: y, color: "000000", width: 0.5 });
    y += 6;
    for (const key of endnoteRefs) {
      env.noteMark = env.notes.get(key);
      const blocks = doc.endnotes.get(key.slice(8));
      if (blocks) flowBlocks(blocks);
    }
  }

  // Footnotes sit at the bottom of the page that refers to them.
  for (const p of pages) {
    if (!p.footnotes.length) continue;
    const s = doc.sections[p.section].page;
    const w = s.w - s.left - s.right;
    const items = p.footnotes.flatMap((n) => { env.noteMark = n.number; return flatItems(n.blocks, w, env); });
    const h = items.reduce((sum, i) => sum + i.h, 0);
    let fy = s.h - s.bottom - h;
    p.ops.push({ t: "line", x1: s.left, y1: fy - 5, x2: s.left + w / 3, y2: fy - 5, color: "000000", width: 0.5 });
    for (const it of items) { it.draw(p.ops, s.left, fy); fy += it.h; }
  }
  void top;
  return { pages };
}

function drawFloat(f: Float, x: number, y: number, ops: Op[], env: Env) {
  const c = f.content;
  if (c.kind === "image") ops.push({ t: "image", src: c.src, x, y, w: f.w, h: f.h });
  else if (c.kind === "chart") ops.push({ t: "chart", src: c.src, x, y, w: f.w, h: f.h });
  else if (c.kind === "missing") ops.push({ t: "missing", label: c.label, x, y, w: f.w, h: f.h });
  else {
    ops.push({ t: "shape", x, y, w: f.w, h: f.h, fill: c.fill, line: c.line, radius: c.radius, ellipse: c.ellipse });
    const items = flatItems(c.blocks, Math.max(5, f.w - c.inset.l - c.inset.r), env);
    const used = items.reduce((s, i) => s + i.h, 0);
    const room = f.h - c.inset.t - c.inset.b;
    let cy = y + c.inset.t + (c.anchor === "ctr" ? Math.max(0, (room - used) / 2) : c.anchor === "b" ? Math.max(0, room - used) : 0);
    for (const it of items) { it.draw(ops, x + c.inset.l, cy); cy += it.h; }
  }
}
