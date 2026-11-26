import { css, readColor, schemeColor, type Rgba } from "./color";
import { fontStack } from "../fonts";
import type { TextEnv } from "./text";
import { attr, child, findAll, flag, kids, num } from "./xml";

type Ctx = CanvasRenderingContext2D;
interface Series { name: string; cats: string[]; vals: (number | null)[]; xs: (number | null)[]; color: Rgba; points: Map<number, Rgba>; labels: "val" | "pct" | "cat" | null; format: string; line: boolean; marker: boolean }
interface Group { type: string; dir: string; grouping: string; gap: number; overlap: number; hole: number; series: Series[] }

let resolveRef: TextEnv["resolveRef"];

const cache = (el: Element | null) => {
  const c = findAll(el, "strCache")[0] ?? findAll(el, "numCache")[0] ?? findAll(el, "strLit")[0] ?? findAll(el, "numLit")[0] ?? findAll(el, "lvl")[0] ?? null;
  if (!c) {
    const formula = findAll(el, "f")[0]?.textContent;
    const values = formula && resolveRef ? resolveRef(formula) : null;
    if (values) return { values, format: "General" };
  }
  const out: string[] = [];
  for (const p of kids(c, "pt")) out[num(p, "idx") ?? out.length] = child(p, "v")?.textContent ?? "";
  const count = num(child(c, "ptCount"), "val") ?? out.length;
  return { values: Array.from({ length: Math.max(count, out.length) }, (_, i) => out[i]), format: child(c, "formatCode")?.textContent ?? "General" };
};
const numbers = (v: (string | undefined)[]) => v.map((x) => (x == null || x === "" || !Number.isFinite(Number(x)) ? null : Number(x)));

export function formatNumber(v: number, code: string) {
  const main = code.split(";")[0].replace(/\[[^\]]*\]|"[^"]*"|\\./g, "");
  const decimals = /0\.(0+)/.exec(main)?.[1].length;
  const prefix = /[$€£₹]/.exec(code)?.[0] ?? "";
  if (main.includes("%")) return `${(v * 100).toFixed(decimals ?? 0)}%`;
  const group = main.includes(",");
  if (main === "General" || main === "" || decimals == null) {
    const rounded = main === "General" || main === "" ? Number(v.toPrecision(6)) : Math.round(v);
    return prefix + rounded.toLocaleString("en-US", { useGrouping: group, maximumFractionDigits: 6 });
  }
  return prefix + v.toLocaleString("en-US", { useGrouping: group, minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function niceScale(min: number, max: number, fixedMin: number | null, fixedMax: number | null, unit: number | null) {
  let lo = fixedMin ?? Math.min(0, min);
  if (fixedMin == null && min > 0 && (max - min) / max < 0.1667) lo = min - (max - min) / 2;
  let hi = fixedMax ?? (max > 0 ? max + (max - Math.min(lo, 0)) * 0.05 : 0);
  if (hi <= lo) hi = lo + 1;
  const raw = (hi - lo) / 6;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = unit ?? [1, 2, 5, 10].map((k) => k * mag).find((s) => s >= raw)!;
  if (fixedMin == null) lo = Math.floor(lo / step) * step;
  if (fixedMax == null) hi = Math.ceil(hi / step - 1e-9) * step;
  return { lo, hi, step };
}

/** Draws the common chart kinds from the values stored in the file. Returns false for kinds it can't draw. */
export function drawChart(root: Element, w: number, h: number, env: TextEnv): boolean {
  resolveRef = env.resolveRef;
  const { ctx, palette } = env;
  const chart = child(root, "chart");
  const plot = child(chart, "plotArea");
  if (!plot) return false;
  const accents = [1, 2, 3, 4, 5, 6].map((i) => schemeColor(`accent${i}`, palette));
  const accent = (i: number): Rgba => {
    const base = accents[i % 6];
    const k = Math.floor(i / 6) ? 0.6 : 1;
    return { r: base.r * k, g: base.g * k, b: base.b * k, a: 1 };
  };
  const ink = schemeColor("tx1", palette);
  const soft: Rgba = { ...ink, a: 0.75 };
  const rule: Rgba = { ...ink, a: 0.18 };

  const groups: Group[] = [];
  for (const el of kids(plot)) {
    if (!el.localName.endsWith("Chart")) continue;
    const type = el.localName.replace(/3?D?Chart$/, "").replace("ofPie", "pie");
    if (!["bar", "line", "pie", "doughnut", "area", "scatter"].includes(type)) return false;
    const groupLabels = child(el, "dLbls");
    const series = kids(el, "ser").map((s): Series => {
      const idx = num(child(s, "idx"), "val") ?? 0;
      const spPr = child(s, "spPr");
      const fill = readColor(child(spPr, "solidFill"), palette) ?? readColor(child(spPr, "gradFill", "gsLst", "gs"), palette);
      const stroke = readColor(child(spPr, "ln", "solidFill"), palette);
      const points = new Map<number, Rgba>();
      for (const d of kids(s, "dPt")) {
        const c = readColor(child(d, "spPr", "solidFill"), palette);
        if (c) points.set(num(child(d, "idx"), "val") ?? 0, c);
      }
      const lbl = child(s, "dLbls") ?? groupLabels;
      const on = (n: string) => flag(child(lbl, n), "val") === true;
      const cat = cache(child(s, "cat") ?? child(s, "xVal"));
      const val = cache(child(s, "val") ?? child(s, "yVal"));
      const fmt = child(lbl, "numFmt");
      return {
        name: cache(child(s, "tx")).values[0] ?? child(s, "tx", "v")?.textContent ?? `Series ${idx + 1}`,
        cats: cat.values.map((v) => v ?? ""), xs: numbers(cat.values), vals: numbers(val.values),
        color: (type === "line" || type === "scatter" ? stroke ?? fill : fill ?? stroke) ?? accent(idx), points,
        labels: on("showPercent") ? "pct" : on("showVal") ? "val" : on("showCatName") ? "cat" : null,
        format: fmt && flag(fmt, "sourceLinked") !== true ? attr(fmt, "formatCode") ?? val.format : val.format,
        line: !child(spPr, "ln", "noFill"), marker: attr(child(s, "marker", "symbol"), "val") !== "none",
      };
    });
    groups.push({
      type, series, dir: attr(child(el, "barDir"), "val") ?? "col",
      grouping: attr(child(el, "grouping"), "val") ?? "standard",
      gap: (num(child(el, "gapWidth"), "val") ?? 150) / 100, overlap: (num(child(el, "overlap"), "val") ?? 0) / 100,
      hole: (num(child(el, "holeSize"), "val") ?? 50) / 100,
    });
  }
  const series = groups.flatMap((g) => g.series);
  if (!series.length) return false;

  const baseSize = (num(child(root, "txPr", "p", "pPr", "defRPr"), "sz") ?? 0) / 100 || Math.max(8, Math.min(14, Math.min(w, h) / 24));
  const font = (size: number, bold = false) => `${bold ? 700 : 400} ${size}px ${fontStack(env.fonts.minor)}`;
  const write = (text: string, x: number, y: number, size: number, align: CanvasTextAlign, o: { color?: Rgba; bold?: boolean; base?: CanvasTextBaseline; rotate?: number } = {}) => {
    ctx.save();
    ctx.font = font(size, o.bold);
    ctx.fillStyle = css(o.color ?? soft);
    ctx.textAlign = align;
    ctx.textBaseline = o.base ?? "middle";
    ctx.translate(x, y);
    if (o.rotate) ctx.rotate(o.rotate);
    ctx.fillText(text, 0, 0);
    const m = ctx.getTransform();
    const tw = ctx.measureText(text).width;
    const p = m.transformPoint(new DOMPoint(align === "center" ? -tw / 2 : align === "right" ? -tw : 0, size * 0.35));
    if (text.trim()) env.layer.push({ text, size, width: tw, m: [m.a, m.b, m.c, m.d, p.x, p.y] });
    ctx.restore();
  };
  const widthOf = (text: string, size: number) => { ctx.font = font(size); return ctx.measureText(text).width; };
  const plain = (el: Element | null) => findAll(el, "t").map((t) => t.textContent).join("");

  let top = 8, bottom = h - 8, left = 10, right = w - 10;

  // Title
  const titleEl = child(chart, "title");
  const single = series.length === 1;
  const title = plain(titleEl) || (single && titleEl && flag(child(chart, "autoTitleDeleted"), "val") !== true ? series[0].name : "");
  if (title) {
    const size = (num(findAll(titleEl, "rPr")[0] ?? findAll(titleEl, "defRPr")[0] ?? null, "sz") ?? baseSize * 130) / 100;
    write(title, w / 2, top + size * 0.6, size, "center", { color: ink, bold: flag(findAll(titleEl, "defRPr")[0], "b") ?? false });
    top += size * 1.5;
  }

  // Legend
  const round = groups[0].type === "pie" || groups[0].type === "doughnut";
  const legendEl = child(chart, "legend");
  if (legendEl) {
    const items = round
      ? series[0].cats.map((c, i) => ({ name: c, color: series[0].points.get(i) ?? accent(i) }))
      : series.map((s) => ({ name: s.name, color: s.color }));
    const pos = attr(child(legendEl, "legendPos"), "val") ?? "r";
    const box = baseSize * 0.6;
    const widths = items.map((i) => box + 5 + widthOf(i.name, baseSize) + 14);
    const put = (item: { name: string; color: Rgba }, x: number, y: number) => {
      ctx.fillStyle = css(item.color);
      ctx.fillRect(x, y - box / 2, box, box);
      write(item.name, x + box + 5, y, baseSize, "left");
    };
    if (pos === "b" || pos === "t") {
      const rows: number[][] = [[]];
      let x = 0;
      widths.forEach((iw, i) => { if (x + iw > right - left && rows.at(-1)!.length) { rows.push([]); x = 0; } rows.at(-1)!.push(i); x += iw; });
      const lh = baseSize * 1.5;
      const y0 = pos === "b" ? bottom - rows.length * lh : top;
      rows.forEach((row, r) => {
        let rx = (left + right - row.reduce((s, i) => s + widths[i], 0)) / 2;
        for (const i of row) { put(items[i], rx, y0 + r * lh + lh / 2); rx += widths[i]; }
      });
      if (pos === "b") bottom = y0 - 6; else top = y0 + rows.length * lh + 6;
    } else {
      const lw = Math.min(w * 0.4, Math.max(...widths));
      const lh = baseSize * 1.6;
      const x = pos === "l" ? left : right - lw + 8;
      const y0 = (top + bottom) / 2 - (items.length * lh) / 2;
      items.forEach((it, i) => put(it, x, y0 + i * lh + lh / 2));
      if (pos === "l") left += lw; else right -= lw;
    }
  }

  if (round) {
    const g = groups[0], s = g.series[0];
    const vals = s.vals.map((v) => Math.max(0, v ?? 0));
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const r = Math.min(right - left, bottom - top) / 2 - 4;
    const cx = (left + right) / 2, cy = (top + bottom) / 2;
    let a = -Math.PI / 2 + (((num(findAll(plot, "firstSliceAng")[0], "val") ?? 0) * Math.PI) / 180);
    vals.forEach((v, i) => {
      const b = a + (v / total) * 2 * Math.PI;
      ctx.beginPath();
      if (g.type === "doughnut") { ctx.arc(cx, cy, r, a, b); ctx.arc(cx, cy, r * g.hole, b, a, true); }
      else { ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a, b); }
      ctx.closePath();
      ctx.fillStyle = css(s.points.get(i) ?? accent(i));
      ctx.fill();
      ctx.strokeStyle = css(schemeColor("bg1", palette));
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (s.labels && v / total > 0.03) {
        const mid = (a + b) / 2, lr = g.type === "doughnut" ? (r * (1 + g.hole)) / 2 : r * 0.65;
        write(s.labels === "pct" ? `${Math.round((v / total) * 100)}%` : s.labels === "cat" ? s.cats[i] : formatNumber(v, s.format), cx + Math.cos(mid) * lr, cy + Math.sin(mid) * lr, baseSize, "center", { color: schemeColor("bg1", palette), bold: true });
      }
      a = b;
    });
    return true;
  }

  // Axes
  const axes = kids(plot).filter((e) => /^(cat|val|date|ser)Ax$/.test(e.localName));
  const valAx = axes.find((e) => e.localName === "valAx") ?? null;
  const scatter = groups[0].type === "scatter";
  const catAx = scatter ? axes.filter((e) => e.localName === "valAx")[0] : axes.find((e) => /^(cat|date)Ax$/.test(e.localName)) ?? null;
  const yAx = scatter ? axes.filter((e) => e.localName === "valAx")[1] ?? valAx : valAx;
  const hidden = (ax: Element | null) => flag(child(ax, "delete"), "val") === true;
  const horizontal = groups.some((g) => g.type === "bar" && g.dir === "bar");
  const count = Math.max(1, ...series.map((s) => s.vals.length));
  const cats = series.reduce<string[]>((best, s) => (s.cats.length > best.length ? s.cats : best), []);
  const percent = groups.some((g) => g.grouping === "percentStacked");
  const stacked = (g: Group) => g.grouping === "stacked" || g.grouping === "percentStacked";

  let min = Infinity, max = -Infinity;
  for (const g of groups) {
    for (let i = 0; i < count; i++) {
      if (stacked(g)) {
        const pos = g.series.reduce((s, x) => s + Math.max(0, x.vals[i] ?? 0), 0), neg = g.series.reduce((s, x) => s + Math.min(0, x.vals[i] ?? 0), 0);
        max = Math.max(max, percent ? 1 : pos); min = Math.min(min, percent ? 0 : neg);
      } else for (const s of g.series) { const v = s.vals[i]; if (v != null) { max = Math.max(max, v); min = Math.min(min, v); } }
    }
  }
  if (!Number.isFinite(min)) return false;
  const scaling = child(yAx, "scaling");
  const sc = niceScale(groups.some((g) => g.type === "bar" || g.type === "area") ? Math.min(0, min) : min, max,
    num(child(scaling, "min"), "val"), percent ? 1 : num(child(scaling, "max"), "val"), percent ? 0.2 : num(child(yAx, "majorUnit"), "val"));
  const fmtEl = child(yAx, "numFmt");
  const code = percent ? "0%" : flag(fmtEl, "sourceLinked") === true ? series[0].format : attr(fmtEl, "formatCode") ?? series[0].format;
  const ticks: number[] = [];
  for (let v = sc.lo; v <= sc.hi + sc.step * 0.001 && ticks.length < 60; v += sc.step) ticks.push(Number(v.toPrecision(12)));
  const tickText = ticks.map((t) => formatNumber(t, code));
  const valWidth = hidden(yAx) ? 0 : Math.max(...tickText.map((t) => widthOf(t, baseSize))) + 8;
  const catWidth = Math.min(w * 0.35, Math.max(0, ...cats.map((c) => widthOf(c, baseSize))) + 8);
  const axisTitle = (ax: Element | null) => plain(child(ax, "title"));
  const xTitle = axisTitle(horizontal ? yAx : catAx), yTitle = axisTitle(horizontal ? catAx : yAx);
  if (xTitle) { write(xTitle, (left + right) / 2, bottom - baseSize * 0.6, baseSize, "center"); bottom -= baseSize * 1.7; }
  if (yTitle) { write(yTitle, left + baseSize * 0.6, (top + bottom) / 2, baseSize, "center", { rotate: -Math.PI / 2 }); left += baseSize * 1.7; }
  left += horizontal ? (hidden(catAx) ? 0 : catWidth) : valWidth;
  top += baseSize * 0.5;
  bottom -= hidden(horizontal ? yAx : catAx) ? 0 : baseSize * 1.8;
  right -= 6;
  const pw = right - left, ph = bottom - top;
  if (pw < 10 || ph < 10) return false;
  const along = (v: number) => (v - sc.lo) / (sc.hi - sc.lo);
  const Y = (v: number) => bottom - along(v) * ph;
  const XV = (v: number) => left + along(v) * pw;

  // Gridlines and value labels
  ctx.lineWidth = 0.75;
  ticks.forEach((t, i) => {
    if (child(yAx, "majorGridlines")) {
      ctx.strokeStyle = css(rule);
      ctx.beginPath();
      if (horizontal) { ctx.moveTo(XV(t), top); ctx.lineTo(XV(t), bottom); } else { ctx.moveTo(left, Y(t)); ctx.lineTo(right, Y(t)); }
      ctx.stroke();
    }
    if (!hidden(yAx)) horizontal ? write(tickText[i], XV(t), bottom + baseSize, baseSize, "center") : write(tickText[i], left - 6, Y(t), baseSize, "right");
  });
  const zero = Math.min(Math.max(0, sc.lo), sc.hi);
  ctx.strokeStyle = css({ ...ink, a: 0.4 });
  ctx.beginPath();
  if (horizontal) { ctx.moveTo(XV(zero), top); ctx.lineTo(XV(zero), bottom); } else { ctx.moveTo(left, Y(zero)); ctx.lineTo(right, Y(zero)); }
  ctx.stroke();

  const clipText = (t: string, room: number) => {
    if (widthOf(t, baseSize) <= room) return t;
    let n = t.length;
    while (n > 1 && widthOf(`${t.slice(0, n)}…`, baseSize) > room) n--;
    return `${t.slice(0, n)}…`;
  };

  if (scatter) {
    const xs = series.flatMap((s) => s.xs.map((x, i) => x ?? i + 1));
    const sx = niceScale(Math.min(...xs), Math.max(...xs), num(child(catAx, "scaling", "min"), "val"), num(child(catAx, "scaling", "max"), "val"), num(child(catAx, "majorUnit"), "val"));
    const X = (v: number) => left + ((v - sx.lo) / (sx.hi - sx.lo)) * pw;
    for (let v = sx.lo, n = 0; v <= sx.hi + sx.step * 0.001 && n < 60; v += sx.step, n++) if (!hidden(catAx)) write(formatNumber(Number(v.toPrecision(12)), "General"), X(v), bottom + baseSize, baseSize, "center");
    const style = attr(findAll(plot, "scatterStyle")[0], "val") ?? "lineMarker";
    for (const s of series) {
      ctx.strokeStyle = ctx.fillStyle = css(s.color);
      ctx.lineWidth = 2;
      if (s.line && style !== "marker") {
        ctx.beginPath();
        s.vals.forEach((v, i) => { if (v != null) ctx.lineTo(X(s.xs[i] ?? i + 1), Y(v)); });
        ctx.stroke();
      }
      if (s.marker) s.vals.forEach((v, i) => { if (v != null) { ctx.beginPath(); ctx.arc(X(s.xs[i] ?? i + 1), Y(v), 3.2, 0, 7); ctx.fill(); } });
    }
    return true;
  }

  const slot = (horizontal ? ph : pw) / count;
  const reversed = attr(child(catAx, "scaling", "orientation"), "val") === "maxMin";
  const centre = (i: number) => (horizontal ? (reversed ? top + slot * (i + 0.5) : bottom - slot * (i + 0.5)) : left + slot * (i + 0.5));
  if (!hidden(catAx)) {
    const every = horizontal ? 1 : Math.max(1, Math.ceil((baseSize * 1.6) / slot));
    cats.forEach((c, i) => {
      if (i % every) return;
      if (horizontal) write(clipText(c, catWidth - 6), left - 6, centre(i), baseSize, "right");
      else write(clipText(c, slot * every - 3), centre(i), bottom + baseSize, baseSize, "center");
    });
  }

  for (const g of groups) {
    const n = g.series.length;
    const totals = Array.from({ length: count }, (_, i) => g.series.reduce((s, x) => s + Math.abs(x.vals[i] ?? 0), 0) || 1);
    const upper = new Array<number>(count).fill(0), lower = new Array<number>(count).fill(0);
    g.series.forEach((s, si) => {
      const bounds = Array.from({ length: count }, (_, i): [number, number] | null => {
        const raw = s.vals[i];
        if (raw == null) return g.type === "bar" ? null : stacked(g) ? [upper[i], upper[i]] : null;
        const v = percent ? raw / totals[i] : raw;
        if (!stacked(g)) return [zero, v];
        const acc = v >= 0 ? upper : lower;
        const from = acc[i];
        acc[i] += v;
        return [from, acc[i]];
      });
      if (g.type === "bar") {
        const overlap = stacked(g) ? 1 : g.overlap;
        const bar = slot / (stacked(g) ? 1 + g.gap : n - overlap * (n - 1) + g.gap);
        const groupW = stacked(g) ? bar : bar * (n - overlap * (n - 1));
        bounds.forEach((b, i) => {
          if (!b) return;
          const order = horizontal && !reversed ? n - 1 - si : si;
          const offset = -groupW / 2 + (stacked(g) ? 0 : (horizontal ? n - 1 - order : si) * bar * (1 - overlap));
          ctx.fillStyle = css(s.points.get(i) ?? s.color);
          const c = centre(i) + (horizontal && !reversed ? -offset - bar : offset);
          if (horizontal) ctx.fillRect(Math.min(XV(b[0]), XV(b[1])), c, Math.abs(XV(b[1]) - XV(b[0])), bar);
          else ctx.fillRect(c, Math.min(Y(b[0]), Y(b[1])), bar, Math.abs(Y(b[1]) - Y(b[0])));
          if (s.labels) {
            const text = s.labels === "cat" ? cats[i] : formatNumber(s.vals[i]!, s.format);
            const mid = (b[0] + b[1]) / 2;
            if (horizontal) stacked(g) ? write(text, XV(mid), c + bar / 2, baseSize, "center") : write(text, XV(b[1]) + 4, c + bar / 2, baseSize, "left");
            else write(text, c + bar / 2, stacked(g) ? Y(mid) : Y(b[1]) - baseSize * 0.7, baseSize, "center");
          }
        });
        return;
      }
      const pts = bounds.map((b, i) => (b ? ([centre(i), Y(b[1]), Y(b[0])] as const) : null));
      if (g.type === "area") {
        const ok = pts.filter((p) => p != null);
        ctx.beginPath();
        ok.forEach((p) => ctx.lineTo(p[0], p[1]));
        [...ok].reverse().forEach((p) => ctx.lineTo(p[0], p[2]));
        ctx.closePath();
        ctx.fillStyle = css(s.color);
        ctx.fill();
        return;
      }
      ctx.strokeStyle = ctx.fillStyle = css(s.color);
      ctx.lineWidth = 2.25;
      ctx.lineJoin = "round";
      ctx.beginPath();
      let pen = false;
      pts.forEach((p) => { if (!p) { pen = false; return; } pen ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen = true; });
      ctx.stroke();
      pts.forEach((p, i) => {
        if (!p) return;
        if (s.marker && count <= 40) { ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 7); ctx.fill(); }
        if (s.labels === "val") write(formatNumber(s.vals[i]!, s.format), p[0], p[1] - baseSize * 0.9, baseSize, "center");
      });
    });
  }
  return true;
}
