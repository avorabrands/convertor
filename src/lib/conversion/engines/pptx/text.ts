import { BLACK, css, readColor, schemeColor, type Palette, type Rgba } from "./color";
import { fontStack } from "../fonts";
import { attr, child, findAll, flag, kids, num, pt } from "./xml";

type Ctx = CanvasRenderingContext2D;

export type { LayerLine } from "../raster-pdf";
import type { LayerLine } from "../raster-pdf";

export interface TextEnv {
  ctx: Ctx;
  palette: Palette;
  fonts: { major: string; minor: string };
  slideNumber: number;
  layer: LayerLine[];
  /** Reads cell values for a chart whose file stores only formulas, such as "Sheet1!$B$2:$B$9". */
  resolveRef?: (formula: string) => string[] | null;
}

export interface TextStyle {
  /** List styles from most to least specific: shape, layout, master, master text styles. */
  lists: (Element | null)[];
  /** Presentation-wide defaults, consulted after the shape's own colour. */
  defaults: (Element | null)[];
  color?: Rgba | null;
  /** Overrides for table cells. */
  bold?: boolean;
  font?: string;
}

interface RunStyle {
  font: string; size: number; color: Rgba; underline: boolean; strike: boolean;
  shift: number; spacing: number; caps: boolean; highlight: Rgba | null;
}
interface Piece { text: string; style: RunStyle; width: number; kind: "word" | "space" | "tab" }
interface Line { pieces: Piece[]; x: number; width: number; asc: number; desc: number; lead: number; last: boolean }
interface Para { lines: Line[]; before: number; after: number; align: string; rtl: boolean; bullet: { text: string; style: RunStyle; x: number } | null; available: number; left: number }

export interface LaidOutText { height: number; width: number; draw(x: number, y: number): void }

/** Wingdings and Symbol store bullets as ordinary letters. */
const symbolBullets: Record<string, string> = { "§": "▪", "ü": "✓", "Ø": "➢", q: "❑", v: "❖", l: "●", n: "■", "à": "→", "ð": "⇒", "·": "•", o: "○", u: "◆", "Ÿ": "•" };

const first = <T>(els: (Element | null | undefined)[], read: (el: Element) => T | null | undefined): T | null => {
  for (const el of els) if (el) { const v = read(el); if (v != null) return v; }
  return null;
};

function fontName(raw: string, env: TextEnv) {
  if (raw.startsWith("+mj")) return env.fonts.major;
  if (raw.startsWith("+mn")) return env.fonts.minor;
  return raw;
}

function runStyle(rPr: Element | null, chain: (Element | null)[], style: TextStyle, env: TextEnv, scale: number): RunStyle {
  const strong = [rPr, ...chain.slice(0, style.lists.length).map((p) => child(p, "defRPr"))];
  const weak = chain.slice(style.lists.length).map((p) => child(p, "defRPr"));
  const all = [...strong, ...weak];
  const color = (el: Element): Rgba | null => {
    if (child(el, "noFill")) return { ...BLACK, a: 0 };
    const solid = child(el, "solidFill");
    if (solid) return readColor(solid, env.palette);
    const grad = child(el, "gradFill", "gsLst", "gs");
    return grad ? readColor(grad, env.palette) : null;
  };
  const link = child(rPr, "hlinkClick");
  const baseSize = (first(all, (e) => num(e, "sz")) ?? 1800) / 100;
  const size = baseSize * scale;
  const baseline = (first(all, (e) => num(e, "baseline")) ?? 0) / 100000;
  const bold = first([rPr], (e) => flag(e, "b")) ?? style.bold ?? first(all, (e) => flag(e, "b")) ?? false;
  const italic = first(all, (e) => flag(e, "i")) ?? false;
  const family = fontName(
    first([rPr, ...strong.slice(1)], (e) => attr(child(e, "latin"), "typeface")) ?? style.font ?? first(weak, (e) => attr(child(e, "latin"), "typeface")) ?? "+mn-lt", env);
  const real = baseline ? size * 0.66 : size;
  return {
    font: `${italic ? "italic " : ""}${bold ? "700 " : "400 "}${real}px ${fontStack(family)}`,
    size: real,
    color: (link && !child(rPr, "solidFill") ? schemeColor("hlink", env.palette) : null)
      ?? first(strong, color) ?? style.color ?? first(weak, color) ?? schemeColor("tx1", env.palette),
    underline: Boolean(link) || (first(all, (e) => attr(e, "u")) ?? "none") !== "none",
    strike: (first(all, (e) => attr(e, "strike")) ?? "noStrike") !== "noStrike",
    shift: baseline * size,
    spacing: ((first(all, (e) => num(e, "spc")) ?? 0) / 100) * scale,
    caps: (first(all, (e) => attr(e, "cap")) ?? "none") !== "none",
    highlight: rPr && child(rPr, "highlight") ? readColor(child(rPr, "highlight"), env.palette) : null,
  };
}

function setFont(ctx: Ctx, s: RunStyle) {
  ctx.font = s.font;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${s.spacing}px`;
}
function measure(ctx: Ctx, text: string, s: RunStyle) { setFont(ctx, s); return ctx.measureText(text).width; }
function metrics(ctx: Ctx, s: RunStyle) {
  setFont(ctx, s);
  const m = ctx.measureText("Hg");
  // Fallback fonts can report very tall boxes; keep close to Office line heights.
  const asc = Math.min(m.fontBoundingBoxAscent || s.size * 0.95, s.size * 1.05);
  const desc = Math.min(m.fontBoundingBoxDescent || s.size * 0.25, s.size * 0.35);
  return { asc, desc };
}

const CJK = /[⺀-鿿가-힯豈-﫿＀-￯]/;

function pieces(text: string, style: RunStyle, ctx: Ctx): Piece[] {
  const t = style.caps ? text.toUpperCase() : text;
  const out: Piece[] = [];
  for (const part of t.split(/(\t|[  ]+)/)) {
    if (!part) continue;
    if (part === "\t") out.push({ text: "\t", style, width: 0, kind: "tab" });
    else if (/^ +$/.test(part)) out.push({ text: part, style, width: measure(ctx, part, style), kind: "space" });
    else if (CJK.test(part)) {
      // Lines can break between these characters; mark that with a zero-width space piece.
      for (const ch of part) {
        out.push({ text: ch, style, width: measure(ctx, ch, style), kind: "word" });
        if (CJK.test(ch)) out.push({ text: "", style, width: 0, kind: "space" });
      }
    } else out.push({ text: part, style, width: measure(ctx, part, style), kind: "word" });
  }
  return out;
}

const roman = (n: number) => {
  let out = "";
  for (const [v, s] of [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]] as const) while (n >= v) { out += s; n -= v; }
  return out;
};
function autoNumber(type: string, n: number) {
  let s = String(n);
  if (type.startsWith("alpha")) s = String.fromCharCode(97 + ((n - 1) % 26)).repeat(Math.ceil(n / 26));
  if (type.startsWith("roman")) s = roman(n);
  if (/Uc/.test(type)) s = s.toUpperCase();
  return type.endsWith("ParenBoth") ? `(${s})` : type.endsWith("ParenR") ? `${s})` : type.endsWith("Plain") ? s : `${s}.`;
}

function layoutParagraphs(body: Element, width: number, wrap: boolean, style: TextStyle, env: TextEnv, scale: number, lineCut: number): Para[] {
  const { ctx } = env;
  const counters: { type: string; n: number }[] = [];
  return kids(body, "p").map((p): Para => {
    const pPr = child(p, "pPr");
    const lvl = num(pPr, "lvl") ?? 0;
    const rtl = flag(pPr, "rtl") ?? false;
    const levels = [...style.lists, ...style.defaults].map((l) => child(l, `lvl${lvl + 1}pPr`));
    // The paragraph's own settings count as part of the specific styles.
    const chain = levels;
    const props = [pPr, ...levels];
    const marL = pt(first(props, (e) => num(e, "marL")));
    const indent = pt(first(props, (e) => num(e, "indent")));
    const left = marL;
    const available = Math.max(1, width - left - pt(first(props, (e) => num(e, "marR"))));

    const all: Piece[][] = [[]];
    for (const r of kids(p)) {
      const rs = () => runStyle(child(r, "rPr"), chain, style, env, scale);
      if (r.localName === "r") all.at(-1)!.push(...pieces(child(r, "t")?.textContent ?? "", rs(), ctx));
      else if (r.localName === "br") all.push([]);
      else if (r.localName === "fld") {
        const text = attr(r, "type") === "slidenum" ? String(env.slideNumber) : child(r, "t")?.textContent ?? "";
        all.at(-1)!.push(...pieces(text, rs(), ctx));
      } else if (r.localName === "m" || r.localName === "oMath" || r.localName === "AlternateContent") {
        // Equations: keep the characters in reading order when there's no picture of them.
        const text = findAll(r, "t").map((t) => t.textContent).join("");
        if (text) all.at(-1)!.push(...pieces(text, runStyle(null, chain, style, env, scale), ctx));
      }
    }
    const hasText = all.some((l) => l.some((x) => x.kind === "word"));
    const endStyle = runStyle(child(p, "endParaRPr") ?? child(kids(p, "r").at(-1), "rPr"), chain, style, env, scale);
    const firstRun = all.flat().find((x) => x.kind === "word")?.style ?? endStyle;

    // Bullets
    const bulletEl = first(props, (e) => kids(e).find((k) => ["buNone", "buChar", "buAutoNum", "buBlip"].includes(k.localName)));
    let bullet: Para["bullet"] = null;
    if (bulletEl && bulletEl.localName !== "buNone" && hasText) {
      const face = first(props, (e) => attr(child(e, "buFont"), "typeface")) ?? "";
      let text = "•";
      if (bulletEl.localName === "buChar") {
        const c = attr(bulletEl, "char") ?? "•";
        text = /wingdings|symbol|webdings/i.test(face) ? symbolBullets[c] ?? (c.charCodeAt(0) >= 0xf000 ? "•" : c) : c;
      } else if (bulletEl.localName === "buAutoNum") {
        const type = attr(bulletEl, "type") ?? "arabicPeriod";
        const prev = counters[lvl];
        const n = prev?.type === type ? prev.n + 1 : num(bulletEl, "startAt") ?? 1;
        counters[lvl] = { type, n };
        text = autoNumber(type, n);
      }
      const pct = first(props, (e) => num(child(e, "buSzPct"), "val"));
      const fixed = first(props, (e) => num(child(e, "buSzPts"), "val"));
      const size = fixed ? (fixed / 100) * scale : firstRun.size * (pct ? pct / 100000 : 1);
      const color = first(props, (e) => readColor(child(e, "buClr"), env.palette)) ?? firstRun.color;
      const bs = { ...firstRun, font: firstRun.font.replace(/[\d.]+px/, `${size}px`), size, color, underline: false, strike: false, highlight: null, spacing: 0 };
      bullet = { text, style: bs, x: marL + indent };
    }
    counters.length = Math.min(counters.length, lvl + 1);
    if (bulletEl?.localName !== "buAutoNum" && hasText) counters.length = Math.min(counters.length, lvl);

    let firstOffset = bullet ? 0 : indent;
    if (bullet) {
      const end = bullet.x + measure(ctx, `${bullet.text} `, bullet.style);
      if (end > left) firstOffset = end - left;
    }

    // Break into lines
    const tabs = kids(first(props, (e) => child(e, "tabLst")), "tab").map((t) => pt(num(t, "pos"))).sort((a, b) => a - b);
    const lines: Line[] = [];
    let started = false;
    for (const source of all) {
      let cur: Piece[] = [];
      let x = started ? 0 : firstOffset;
      const start = () => (lines.length ? 0 : firstOffset);
      const push = (last: boolean) => { lines.push(makeLine(cur, start(), last, endStyle, env)); cur = []; x = 0; };
      let i = 0;
      while (i < source.length) {
        const pc = source[i];
        if (pc.kind === "tab") {
          const abs = left + x;
          const stop = tabs.find((t) => t > abs + 0.5) ?? (Math.floor(abs / 72 + 0.001) + 1) * 72;
          cur.push({ ...pc, width: stop - abs });
          x += stop - abs;
          i++;
          continue;
        }
        if (pc.kind === "space") { cur.push(pc); x += pc.width; i++; continue; }
        // A word can span several runs.
        let j = i, w = 0;
        while (j < source.length && source[j].kind === "word") w += source[j++].width;
        const hasWord = cur.some((c) => c.kind === "word");
        if (wrap && x + w > available + 0.5 && hasWord) { push(false); continue; }
        if (wrap && w > available + 0.5) {
          // Longer than a whole line: break inside the word.
          for (; i < j; i++) {
            let text = source[i].text;
            while (text) {
              let n = text.length;
              while (n > 1 && x + measure(ctx, text.slice(0, n), source[i].style) > available) n--;
              const part = text.slice(0, n);
              const pw = measure(ctx, part, source[i].style);
              cur.push({ ...source[i], text: part, width: pw });
              x += pw;
              text = text.slice(n);
              if (text) push(false);
            }
          }
          continue;
        }
        for (; i < j; i++) { cur.push(source[i]); x += source[i].width; }
      }
      push(true);
      started = true;
    }

    const spacing = (name: string, size: number) => {
      const el = first(props, (e) => child(e, name));
      const pctV = num(child(el, "spcPct"), "val");
      if (pctV != null) return { pct: pctV / 100000, pts: null as number | null, size };
      const ptsV = num(child(el, "spcPts"), "val");
      return { pct: null as number | null, pts: ptsV != null ? ptsV / 100 : null, size };
    };
    const ln = spacing("lnSpc", 0);
    for (const l of lines) {
      const natural = l.asc + l.desc;
      l.lead = ln.pts != null ? ln.pts * scale : natural * Math.max(0.5, (ln.pct ?? 1) - lineCut);
    }
    const edge = (name: string) => {
      const s = spacing(name, 0);
      return s.pts != null ? s.pts * scale : (s.pct ?? 0) * firstRun.size * 1.2;
    };
    return { lines, before: edge("spcBef"), after: edge("spcAft"), align: first(props, (e) => attr(e, "algn")) ?? (rtl ? "r" : "l"), rtl, bullet, available, left };
  });
}

function makeLine(list: Piece[], x: number, last: boolean, fallback: RunStyle, env: TextEnv): Line {
  let end = list.length;
  while (end && list[end - 1].kind === "space") end--;
  const visible = list.slice(0, end);
  let asc = 0, desc = 0;
  for (const s of new Set(visible.length ? visible.map((p) => p.style) : [fallback])) {
    const m = metrics(env.ctx, s);
    asc = Math.max(asc, m.asc + Math.max(0, s.shift * 0.4));
    desc = Math.max(desc, m.desc);
  }
  return { pieces: visible, x, width: visible.reduce((s, p) => s + p.width, 0), asc, desc, lead: asc + desc, last };
}

export interface LayoutOptions { wrap?: boolean; /** Shrink to this height when the slide asks for it. */ fitHeight?: number; fontScale?: number; lineCut?: number }

export function layoutText(body: Element, width: number, style: TextStyle, env: TextEnv, o: LayoutOptions = {}): LaidOutText {
  let scale = o.fontScale ?? 1;
  const wrap = o.wrap !== false;
  const heightOf = (ps: Para[]) => ps.reduce((h, p, i) => h + (i ? p.before : 0) + p.lines.reduce((s, l) => s + l.lead, 0) + (i < ps.length - 1 ? p.after : 0), 0);
  let paras = layoutParagraphs(body, width, wrap, style, env, scale, o.lineCut ?? 0);
  let height = heightOf(paras);
  // Substitute fonts can run larger than the original; stay inside the box if the author chose shrink-to-fit.
  while (o.fitHeight && height > o.fitHeight + 1 && scale > 0.4) {
    scale *= 0.95;
    paras = layoutParagraphs(body, width, wrap, style, env, scale, o.lineCut ?? 0);
    height = heightOf(paras);
  }
  const widest = Math.max(0, ...paras.flatMap((p) => p.lines.map((l) => p.left + l.x + l.width)));

  return {
    height, width: widest,
    draw(x0, y0) {
      const { ctx, layer } = env;
      let y = y0;
      paras.forEach((p, pi) => {
        if (pi) y += p.before;
        p.lines.forEach((line, li) => {
          // Extra leading goes above the text, as Office does.
          const baseline = y + line.asc + (line.lead - line.asc - line.desc) * (line.lead < line.asc + line.desc ? 0.8 : 1);
          const free = p.available - line.x - line.width;
          const spaces = line.pieces.filter((q) => q.kind === "space" && q.text).length;
          const justify = p.align === "just" && !line.last && spaces ? Math.max(0, free) / spaces : 0;
          const shift = p.align === "ctr" ? free / 2 : p.align === "r" ? free : 0;
          let x = x0 + p.left + line.x + shift;
          if (li === 0 && p.bullet) {
            setFont(ctx, p.bullet.style);
            ctx.fillStyle = css(p.bullet.style.color);
            ctx.fillText(p.bullet.text, x0 + p.bullet.x + shift, baseline);
          }
          const startX = x;
          let text = "";
          // Draw neighbouring pieces with one style together, so the browser can order and join scripts properly.
          const segments: { style: RunStyle; text: string; width: number; tab: boolean }[] = [];
          for (const q of line.pieces) {
            const width = q.width + (q.kind === "space" && q.text ? justify : 0);
            const prev = segments.at(-1);
            if (prev && prev.style === q.style && !prev.tab && q.kind !== "tab" && !(justify && q.kind === "space") && !(justify && / $/.test(prev.text))) {
              prev.text += q.text;
              prev.width += width;
            } else segments.push({ style: q.style, text: q.kind === "tab" ? "" : q.text, width, tab: q.kind === "tab" });
            text += q.kind === "tab" ? " " : q.text;
          }
          ctx.textAlign = "left";
          ctx.direction = p.rtl ? "rtl" : "ltr";
          for (const seg of p.rtl ? segments.reverse() : segments) {
            const s = seg.style, w = seg.width;
            if (s.highlight) { ctx.fillStyle = css(s.highlight); ctx.fillRect(x, baseline - line.asc, w, line.asc + line.desc); }
            ctx.fillStyle = css(s.color);
            if (seg.text.trim()) { setFont(ctx, s); ctx.fillText(seg.text, x, baseline - s.shift); }
            if ((s.underline || s.strike) && !seg.tab) {
              const t = Math.max(0.5, s.size / 16);
              if (s.underline) ctx.fillRect(x, baseline - s.shift + s.size * 0.1, w, t);
              if (s.strike) ctx.fillRect(x, baseline - s.shift - s.size * 0.28, w, t);
            }
            x += w;
          }
          ctx.direction = "ltr";
          if (text.trim()) {
            const m = ctx.getTransform();
            const o2 = m.transformPoint(new DOMPoint(startX, baseline));
            const size = Math.max(...line.pieces.map((q) => q.style.size));
            layer.push({ text: (li === 0 && p.bullet ? `${p.bullet.text} ` : "") + text, size, width: x - startX, m: [m.a, m.b, m.c, m.d, o2.x, o2.y] });
          }
          y += line.lead;
        });
        y += p.after;
      });
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    },
  };
}
