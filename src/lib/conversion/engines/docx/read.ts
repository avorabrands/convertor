import { ConversionError } from "../../types";
import type { Package } from "../pptx/package";
import { attr, child, findAll, kids, relAttr } from "../pptx/xml";
import type { Block, Border, Cell, CellBorders, ChartSrc, Doc, Float, FloatContent, Inline, PageSetup, Para, ParaStyle, Row, RunStyle, Section, TabStop, Table } from "./model";

/** Twentieths of a point to points; the fallback is in twentieths too. */
const twip = (v: string | null | undefined, fallback = 0) => (v == null || v === "" ? fallback : parseFloat(v) || 0) / 20;
const emu = (v: string | null | undefined) => (parseFloat(v ?? "0") || 0) / 12700;
const val = (el: Element | null | undefined) => attr(el, "w:val") ?? attr(el, "val");
const wattr = (el: Element | null | undefined, name: string) => attr(el, `w:${name}`) ?? attr(el, name);
/** Word's on/off properties: present means on unless the value says otherwise. */
const on = (el: Element | null | undefined): boolean | null => {
  if (!el) return null;
  const v = val(el);
  return v == null || !/^(0|false|off|none)$/i.test(v);
};

const HIGHLIGHT: Record<string, string> = {
  yellow: "FFFF00", green: "00FF00", cyan: "00FFFF", magenta: "FF00FF", blue: "0000FF", red: "FF0000", darkBlue: "000080", darkCyan: "008080",
  darkGreen: "008000", darkMagenta: "800080", darkRed: "800000", darkYellow: "808000", darkGray: "808080", lightGray: "C0C0C0", black: "000000", white: "FFFFFF",
};
/** Symbol and Wingdings store bullets in private-use code points. */
const SYMBOLS: Record<number, string> = { 0xf0b7: "•", 0xf0a7: "▪", 0xf0d8: "➢", 0xf0fc: "✓", 0xf076: "❖", 0xf06c: "●", 0xf06e: "■", 0xf0e0: "→", 0xf0e8: "➔", 0xf0a8: "◆", 0xf071: "❑", 0xf0b2: "◇", 0xf0de: "➢", 0xf0f0: "⇒", 0xf06f: "○" };
export const symbolChar = (text: string) => [...text].map((c) => SYMBOLS[c.codePointAt(0)!] ?? (c.codePointAt(0)! >= 0xf000 && c.codePointAt(0)! <= 0xf0ff ? "•" : c)).join("");

const defaultRun = (): RunStyle => ({
  font: "Times New Roman", csFont: "", size: 10, bold: false, italic: false, underline: false, strike: false, color: "000000",
  highlight: null, shading: null, vertAlign: "baseline", caps: false, spacing: 0, hidden: false, link: null,
});
const defaultPara = (): ParaStyle => ({
  styleId: "", align: "left", left: 0, right: 0, firstLine: 0, before: 0, after: 0, line: 240, lineRule: "auto",
  keepNext: false, keepLines: false, pageBreakBefore: false, contextual: false, widow: true, shading: null, borders: {}, tabs: [], bidi: false,
});

function readBorder(el: Element | null): Border | null | undefined {
  if (!el) return undefined;
  const v = val(el);
  if (!v || v === "nil" || v === "none") return null;
  const sz = parseFloat(wattr(el, "sz") ?? "4") / 8;
  const color = wattr(el, "color");
  return { width: Math.max(0.25, (v === "double" ? sz * 3 : sz) || 0.5), color: !color || color === "auto" ? "000000" : color, space: parseFloat(wattr(el, "space") ?? "0") || 0 };
}
const shadingFill = (el: Element | null) => {
  if (!el) return undefined;
  const fill = wattr(el, "fill");
  if (fill && fill !== "auto") return fill;
  // Solid patterns use the pattern colour instead.
  const pattern = val(el);
  const color = wattr(el, "color");
  if (pattern === "solid" && color && color !== "auto") return color;
  return null;
};

interface Ctx {
  /** The part whose relationships resolve pictures and links. */
  part: string;
  /** Style layers from a table style, which sit under paragraph styles. */
  table?: { pPr: Element[]; rPr: Element[] };
}

/** Reads a .docx into a layout model. */
export class DocxReader {
  private styles = new Map<string, Element>();
  private defaultParaStyle: string | null = null;
  private docRPr: Element | null = null;
  private docPPr: Element | null = null;
  private numbering = { nums: new Map<string, Element>(), abstracts: new Map<string, Element>() };
  private counters = new Map<string, number[]>();
  private started = new Set<string>();
  private fieldStack: { instr: string; result: boolean; replace: Inline | null }[] = [];
  readonly doc: Doc;

  constructor(private pkg: Package, private docPath: string) {
    this.doc = {
      sections: [], footnotes: new Map(), endnotes: new Map(), evenAndOdd: false, defaultTab: 36,
      issues: { pictures: 0, objects: 0, columns: false, equations: 0 }, fonts: new Set(),
      theme: { major: "Calibri Light", minor: "Calibri", colors: {} },
    };
  }

  static read(pkg: Package): Doc {
    const docPath = pkg.byType("", "officeDocument") ?? "word/document.xml";
    const root = pkg.xml(docPath);
    if (!root || root.localName !== "document") throw new ConversionError("We couldn't find the document inside this file. Open it in Word or Google Docs and save it as .docx again.");
    const r = new DocxReader(pkg, docPath);
    r.load();
    r.readBody(root);
    return r.doc;
  }

  private load() {
    const { pkg, docPath } = this;
    const theme = pkg.xml(pkg.byType(docPath, "theme"));
    const scheme = child(theme, "themeElements", "fontScheme");
    this.doc.theme.major = attr(child(scheme, "majorFont", "latin"), "typeface") || "Calibri Light";
    this.doc.theme.minor = attr(child(scheme, "minorFont", "latin"), "typeface") || "Calibri";
    for (const c of kids(child(theme, "themeElements", "clrScheme"))) {
      const v = kids(c)[0];
      this.doc.theme.colors[c.localName] = attr(v, "lastClr") ?? attr(v, "val") ?? "000000";
    }

    const styles = pkg.xml(pkg.byType(docPath, "styles"));
    const defaults = child(styles, "docDefaults");
    this.docRPr = child(defaults, "rPrDefault", "rPr");
    this.docPPr = child(defaults, "pPrDefault", "pPr");
    for (const s of kids(styles, "style")) {
      const id = wattr(s, "styleId") ?? "";
      this.styles.set(id, s);
      if (wattr(s, "type") === "paragraph" && /^(1|true|on)$/.test(wattr(s, "default") ?? "")) this.defaultParaStyle = id;
    }

    const numbering = pkg.xml(pkg.byType(docPath, "numbering"));
    for (const a of kids(numbering, "abstractNum")) this.numbering.abstracts.set(wattr(a, "abstractNumId") ?? "", a);
    for (const n of kids(numbering, "num")) this.numbering.nums.set(wattr(n, "numId") ?? "", n);

    const settings = pkg.xml(pkg.byType(docPath, "settings"));
    this.doc.evenAndOdd = on(child(settings, "evenAndOddHeaders")) ?? false;
    this.doc.defaultTab = twip(val(child(settings, "defaultTabStop")), 36 * 20) || 36;

    for (const [type, map] of [["footnotes", this.doc.footnotes], ["endnotes", this.doc.endnotes]] as const) {
      const path = pkg.byType(docPath, type);
      const root = pkg.xml(path);
      for (const n of kids(root, type === "footnotes" ? "footnote" : "endnote")) {
        if (wattr(n, "type") && wattr(n, "type") !== "normal") continue;
        map.set(wattr(n, "id") ?? "", this.blocks(n, { part: path! }));
      }
    }
  }

  // ---------- styles

  private chain(id: string | null): Element[] {
    const out: Element[] = [];
    const seen = new Set<string>();
    for (let cur = id; cur && !seen.has(cur); cur = val(child(this.styles.get(cur), "basedOn"))) {
      seen.add(cur);
      const s = this.styles.get(cur);
      if (!s) break;
      out.unshift(s);
    }
    return out;
  }

  private font(rFonts: Element | null, cs = false): string | null {
    if (!rFonts) return null;
    const theme = wattr(rFonts, cs ? "cstheme" : "asciiTheme") ?? (cs ? null : wattr(rFonts, "hAnsiTheme"));
    if (theme) return theme.startsWith("major") ? this.doc.theme.major : this.doc.theme.minor;
    return wattr(rFonts, cs ? "cs" : "ascii") ?? (cs ? null : wattr(rFonts, "hAnsi") ?? wattr(rFonts, "eastAsia"));
  }

  private applyRPr(s: RunStyle, rPr: Element | null) {
    if (!rPr) return;
    const f = this.font(child(rPr, "rFonts"));
    if (f) s.font = f;
    const cs = this.font(child(rPr, "rFonts"), true);
    if (cs) s.csFont = cs;
    const sz = val(child(rPr, "sz"));
    if (sz) s.size = parseFloat(sz) / 2 || s.size;
    for (const [k, prop] of [["b", "bold"], ["i", "italic"], ["strike", "strike"], ["dstrike", "strike"], ["caps", "caps"], ["smallCaps", "caps"], ["vanish", "hidden"]] as const) {
      const v = on(child(rPr, k));
      if (v != null) s[prop] = v;
    }
    const u = child(rPr, "u");
    if (u) s.underline = !/^(none|0)$/.test(val(u) ?? "single");
    const color = val(child(rPr, "color"));
    if (color) s.color = color === "auto" ? "000000" : color;
    const hl = val(child(rPr, "highlight"));
    if (hl) s.highlight = hl === "none" ? null : HIGHLIGHT[hl] ?? null;
    const shd = shadingFill(child(rPr, "shd"));
    if (shd !== undefined) s.shading = shd;
    const va = val(child(rPr, "vertAlign"));
    if (va) s.vertAlign = va === "superscript" || va === "subscript" ? va : "baseline";
    const spc = val(child(rPr, "spacing"));
    if (spc) s.spacing = twip(spc);
  }

  private applyPPr(p: ParaStyle, pPr: Element | null) {
    if (!pPr) return;
    const jc = val(child(pPr, "jc"));
    if (jc) p.align = jc === "center" ? "center" : jc === "right" || jc === "end" ? "right" : /both|distribute|justify/.test(jc) ? "both" : "left";
    const ind = child(pPr, "ind");
    if (ind) {
      const left = wattr(ind, "left") ?? wattr(ind, "start");
      const right = wattr(ind, "right") ?? wattr(ind, "end");
      if (left != null) p.left = twip(left);
      if (right != null) p.right = twip(right);
      if (wattr(ind, "hanging") != null) p.firstLine = -twip(wattr(ind, "hanging"));
      else if (wattr(ind, "firstLine") != null) p.firstLine = twip(wattr(ind, "firstLine"));
    }
    const sp = child(pPr, "spacing");
    if (sp) {
      if (/^(1|true|on)$/.test(wattr(sp, "beforeAutospacing") ?? "")) p.before = 14;
      else if (wattr(sp, "before") != null) p.before = twip(wattr(sp, "before"));
      if (/^(1|true|on)$/.test(wattr(sp, "afterAutospacing") ?? "")) p.after = 14;
      else if (wattr(sp, "after") != null) p.after = twip(wattr(sp, "after"));
      if (wattr(sp, "line") != null) {
        p.line = parseFloat(wattr(sp, "line")!) || 240;
        const rule = wattr(sp, "lineRule");
        p.lineRule = rule === "exact" ? "exact" : rule === "atLeast" ? "atLeast" : "auto";
      }
    }
    for (const [k, prop] of [["keepNext", "keepNext"], ["keepLines", "keepLines"], ["pageBreakBefore", "pageBreakBefore"], ["contextualSpacing", "contextual"], ["widowControl", "widow"], ["bidi", "bidi"]] as const) {
      const v = on(child(pPr, k));
      if (v != null) p[prop] = v;
    }
    const shd = shadingFill(child(pPr, "shd"));
    if (shd !== undefined) p.shading = shd;
    const bdr = child(pPr, "pBdr");
    if (bdr) {
      p.borders = { ...p.borders };
      for (const side of ["top", "bottom", "left", "right"] as const) {
        const b = readBorder(child(bdr, side));
        if (b !== undefined) { if (b) p.borders[side] = b; else delete p.borders[side]; }
      }
    }
    const tabs = child(pPr, "tabs");
    if (tabs) {
      const list = [...p.tabs];
      for (const t of kids(tabs, "tab")) {
        const pos = twip(wattr(t, "pos"));
        const kind = val(t) ?? "left";
        const at = list.findIndex((x) => Math.abs(x.pos - pos) < 0.5);
        if (at >= 0) list.splice(at, 1);
        if (kind !== "clear") list.push({ pos, align: kind === "center" ? "center" : kind === "right" || kind === "end" ? "right" : kind === "decimal" ? "decimal" : "left", leader: wattr(t, "leader") ?? "none" });
      }
      p.tabs = list.sort((a, b) => a.pos - b.pos);
    }
  }

  private paraStyle(pPr: Element | null, ctx: Ctx): { style: ParaStyle; styles: Element[] } {
    const id = val(child(pPr, "pStyle")) ?? this.defaultParaStyle;
    const styles = this.chain(id);
    const style = defaultPara();
    style.styleId = id ?? "";
    this.applyPPr(style, this.docPPr);
    for (const p of ctx.table?.pPr ?? []) this.applyPPr(style, p);
    for (const s of styles) this.applyPPr(style, child(s, "pPr"));
    const level = this.numLevel(pPr, styles);
    if (level) this.applyPPr(style, child(level.lvl, "pPr"));
    this.applyPPr(style, pPr);
    return { style, styles };
  }

  private runStyle(paraStyles: Element[], rPr: Element | null, ctx: Ctx, extra: Element[] = []): RunStyle {
    const s = defaultRun();
    this.applyRPr(s, this.docRPr);
    for (const r of ctx.table?.rPr ?? []) this.applyRPr(s, r);
    for (const p of paraStyles) this.applyRPr(s, child(p, "rPr"));
    for (const c of this.chain(val(child(rPr, "rStyle")))) this.applyRPr(s, child(c, "rPr"));
    for (const e of extra) this.applyRPr(s, e);
    this.applyRPr(s, rPr);
    this.doc.fonts.add(s.font);
    return s;
  }

  // ---------- numbering

  private numLevel(pPr: Element | null, styles: Element[]) {
    let numPr = child(pPr, "numPr");
    if (!numPr) for (const s of styles) numPr = child(s, "pPr", "numPr") ?? numPr;
    if (!numPr) return null;
    const numId = val(child(numPr, "numId"));
    if (!numId || numId === "0") return null;
    let ilvl = val(child(numPr, "ilvl"));
    if (ilvl == null) {
      // Heading styles name their level in the abstract numbering.
      ilvl = "0";
      for (const s of styles) { const v = val(child(s, "pPr", "numPr", "ilvl")); if (v) ilvl = v; }
    }
    const num = this.numbering.nums.get(numId);
    const absId = val(child(num, "abstractNumId")) ?? "";
    let abs = this.numbering.abstracts.get(absId);
    const link = val(child(abs, "numStyleLink"));
    if (link) {
      const linkedNum = val(child(this.styles.get(link), "pPr", "numPr", "numId"));
      abs = this.numbering.abstracts.get(val(child(this.numbering.nums.get(linkedNum ?? ""), "abstractNumId")) ?? "") ?? abs;
    }
    const level = Number(ilvl) || 0;
    const override = kids(num, "lvlOverride").find((o) => wattr(o, "ilvl") === String(level));
    const lvl = child(override, "lvl") ?? kids(abs, "lvl").find((l) => wattr(l, "ilvl") === String(level)) ?? null;
    if (!lvl) return null;
    return { numId, absId, level, lvl, abs: abs ?? null, override: override ?? null, num: num ?? null };
  }

  private numberText(pPr: Element | null, styles: Element[], mark: RunStyle, ctx: Ctx): Para["num"] {
    const n = this.numLevel(pPr, styles);
    if (!n) return null;
    const fmtOf = (lvl: Element | null | undefined) => val(child(lvl, "numFmt")) ?? "decimal";
    if (fmtOf(n.lvl) === "none" && !val(child(n.lvl, "lvlText"))) return null;
    const key = n.absId;
    let counts = this.counters.get(key);
    if (!counts) this.counters.set(key, (counts = []));
    const levels = kids(n.abs, "lvl");
    const startOf = (i: number) => {
      const o = kids(n.num, "lvlOverride").find((x) => wattr(x, "ilvl") === String(i));
      const so = val(child(o, "startOverride"));
      if (so != null) return Number(so);
      return Number(val(child(levels.find((l) => wattr(l, "ilvl") === String(i)), "start")) ?? 1);
    };
    // A list instance with its own start value restarts the shared counter the first time it's used.
    if (!this.started.has(n.numId)) {
      this.started.add(n.numId);
      for (const o of kids(n.num, "lvlOverride")) if (child(o, "startOverride")) counts[Number(wattr(o, "ilvl"))] = undefined as unknown as number;
    }
    counts[n.level] = counts[n.level] == null ? startOf(n.level) : counts[n.level] + 1;
    counts.length = n.level + 1;
    const text = (val(child(n.lvl, "lvlText")) ?? "").replace(/%(\d)/g, (_, d: string) => {
      const i = Number(d) - 1;
      const lvl = levels.find((l) => wattr(l, "ilvl") === String(i));
      const value = counts![i] ?? startOf(i);
      return formatNumber(value, i === n.level ? fmtOf(n.lvl) : fmtOf(lvl), on(child(n.lvl, "isLgl")) === true);
    });
    const style = this.runStyle(styles, null, ctx, [child(pPr, "rPr"), child(n.lvl, "rPr")].filter(Boolean) as Element[]);
    style.underline = false;
    const bullet = fmtOf(n.lvl) === "bullet";
    const suffix = (val(child(n.lvl, "suff")) ?? "tab") as "tab" | "space" | "nothing";
    void mark;
    return { text: bullet ? symbolChar(text) : text, style, suffix };
  }

  // ---------- body

  private readBody(root: Element) {
    const body = child(root, "body");
    let blocks: Block[] = [];
    const ctx: Ctx = { part: this.docPath };
    const flush = (sectPr: Element | null) => {
      this.doc.sections.push({ blocks, page: this.pageSetup(sectPr) });
      blocks = [];
    };
    for (const el of kids(body)) {
      if (el.localName === "sectPr") continue;
      blocks.push(...this.block(el, ctx));
      const sectPr = el.localName === "p" ? child(el, "pPr", "sectPr") : null;
      if (sectPr) flush(sectPr);
    }
    flush(child(body, "sectPr"));
    // Headers and footers carry over from the previous section when a section doesn't set its own.
    for (let i = 1; i < this.doc.sections.length; i++) {
      const prev = this.doc.sections[i - 1].page, cur = this.doc.sections[i].page;
      cur.headers = { ...prev.headers, ...cur.headers };
      cur.footers = { ...prev.footers, ...cur.footers };
    }
  }

  private pageSetup(sectPr: Element | null): PageSetup {
    const sz = child(sectPr, "pgSz"), mar = child(sectPr, "pgMar");
    let w = twip(wattr(sz, "w"), 11906), h = twip(wattr(sz, "h"), 16838);
    if (wattr(sz, "orient") === "landscape" && h > w) [w, h] = [h, w];
    const page: PageSetup = {
      w, h,
      top: Math.abs(twip(wattr(mar, "top"), 1440)), bottom: Math.abs(twip(wattr(mar, "bottom"), 1440)),
      left: twip(wattr(mar, "left") ?? wattr(mar, "start"), 1440) + twip(wattr(mar, "gutter")), right: twip(wattr(mar, "right") ?? wattr(mar, "end"), 1440),
      header: twip(wattr(mar, "header"), 708), footer: twip(wattr(mar, "footer"), 708),
      headers: {}, footers: {}, titlePg: on(child(sectPr, "titlePg")) ?? false,
      startNumber: wattr(child(sectPr, "pgNumType"), "start") != null ? Number(wattr(child(sectPr, "pgNumType"), "start")) : null,
      continuous: val(child(sectPr, "type")) === "continuous",
      columns: Number(wattr(child(sectPr, "cols"), "num") ?? 1) || 1,
    };
    if (page.columns > 1) this.doc.issues.columns = true;
    for (const ref of kids(sectPr)) {
      if (ref.localName !== "headerReference" && ref.localName !== "footerReference") continue;
      const path = this.pkg.target(this.docPath, relAttr(ref, "id"));
      const root = this.pkg.xml(path);
      if (!root || !path) continue;
      const type = (wattr(ref, "type") ?? "default") as "default" | "first" | "even";
      (ref.localName === "headerReference" ? page.headers : page.footers)[type] = this.blocks(root, { part: path });
    }
    return page;
  }

  blocks(parent: Element, ctx: Ctx): Block[] {
    return kids(parent).flatMap((el) => this.block(el, ctx));
  }

  private block(el: Element, ctx: Ctx): Block[] {
    switch (el.localName) {
      case "p": return [this.para(el, ctx)];
      case "tbl": return [this.table(el, ctx)];
      case "sdt": return this.blocks(child(el, "sdtContent") ?? el, ctx);
      case "customXml": case "ins": case "moveTo": return this.blocks(el, ctx);
      case "AlternateContent": return this.blocks(child(el, "Choice") ?? child(el, "Fallback") ?? el, ctx);
      default: return [];
    }
  }

  private para(el: Element, ctx: Ctx): Para {
    const pPr = child(el, "pPr");
    const { style, styles } = this.paraStyle(pPr, ctx);
    const mark = this.runStyle(styles, child(pPr, "rPr"), ctx);
    const inlines: Inline[] = [];
    this.inlines(el, styles, ctx, inlines, null);
    const num = this.numberText(pPr, styles, mark, ctx);
    return { t: "p", style, inlines, num, mark };
  }

  private inlines(parent: Element, styles: Element[], ctx: Ctx, out: Inline[], link: string | null) {
    for (const el of kids(parent)) {
      switch (el.localName) {
        case "r": this.run(el, styles, ctx, out, link); break;
        case "hyperlink": {
          const target = this.pkg.rels(ctx.part).get(relAttr(el, "id") ?? "");
          this.inlines(el, styles, ctx, out, target?.target ?? link ?? (wattr(el, "anchor") ? "#" : null));
          break;
        }
        case "ins": case "moveTo": case "smartTag": case "customXml": case "dir": case "bdo": this.inlines(el, styles, ctx, out, link); break;
        case "sdt": this.inlines(child(el, "sdtContent") ?? el, styles, ctx, out, link); break;
        case "fldSimple": {
          const field = fieldName(wattr(el, "instr") ?? "");
          if (field) out.push({ t: "field", field, style: this.runStyle(styles, child(kids(el, "r")[0], "rPr"), ctx) });
          else this.inlines(el, styles, ctx, out, link);
          break;
        }
        case "AlternateContent": {
          const choice = child(el, "Choice");
          const supported = choice && /wps|wpg|a14|w14/.test(attr(choice, "Requires") ?? "") && findAll(choice, "drawing").length;
          this.inlines(supported ? choice : child(el, "Fallback") ?? choice ?? el, styles, ctx, out, link);
          break;
        }
        case "oMath": case "oMathPara": {
          this.doc.issues.equations++;
          const text = findAll(el, "t").map((t) => t.textContent).join("");
          if (text) out.push({ t: "text", text, style: { ...this.runStyle(styles, null, ctx), italic: true, font: "Cambria Math" } });
          break;
        }
      }
    }
  }

  private run(r: Element, styles: Element[], ctx: Ctx, out: Inline[], link: string | null) {
    const rPr = child(r, "rPr");
    const style = this.runStyle(styles, rPr, ctx);
    if (link) { style.link = link; }
    const field = this.fieldStack.at(-1);
    for (const el of this.runChildren(r)) {
      if (el.localName === "fldChar") {
        const type = wattr(el, "fldCharType");
        if (type === "begin") this.fieldStack.push({ instr: "", result: false, replace: null });
        else if (type === "separate" && this.fieldStack.length) {
          const f = this.fieldStack.at(-1)!;
          f.result = true;
          const name = fieldName(f.instr);
          if (name) { f.replace = { t: "field", field: name, style }; out.push(f.replace); }
        } else if (type === "end") {
          const f = this.fieldStack.pop();
          const name = f && !f.result ? fieldName(f.instr) : null;
          if (name) out.push({ t: "field", field: name, style });
        }
        continue;
      }
      if (el.localName === "instrText") { if (field && !field.result) field.instr += el.textContent ?? ""; continue; }
      // Inside a field's code, or a replaced field's old result: skip.
      const top = this.fieldStack.at(-1);
      if (top && (!top.result || top.replace)) continue;
      if (style.hidden) continue;
      switch (el.localName) {
        case "t": if (el.textContent) out.push({ t: "text", text: el.textContent, style }); break;
        case "tab": case "ptab": out.push({ t: "tab", style }); break;
        case "br": {
          const type = wattr(el, "type");
          out.push({ t: "br", kind: type === "page" ? "page" : type === "column" ? "column" : "line", style });
          break;
        }
        case "cr": out.push({ t: "br", kind: "line", style }); break;
        case "noBreakHyphen": out.push({ t: "text", text: "‑", style }); break;
        case "sym": {
          const code = parseInt(wattr(el, "char") ?? "", 16);
          if (code) out.push({ t: "text", text: symbolChar(String.fromCodePoint(code < 0xf000 && /symbol|wingdings/i.test(wattr(el, "font") ?? "") ? code + 0xf000 : code)), style });
          break;
        }
        case "footnoteReference": case "endnoteReference":
          out.push({ t: "note", id: wattr(el, "id") ?? "", kind: el.localName === "footnoteReference" ? "footnote" : "endnote", style: { ...style, vertAlign: "superscript" } });
          break;
        case "footnoteRef": case "endnoteRef": out.push({ t: "noteMark", style: { ...style, vertAlign: "superscript" } }); break;
        case "drawing": this.drawing(el, style, ctx, out); break;
        case "pict": case "object": this.vml(el, style, ctx, out); break;
      }
    }
  }

  /** A run's content, with compatibility wrappers resolved to the version this reader draws best. */
  private runChildren(r: Element): Element[] {
    return kids(r).flatMap((el) => {
      if (el.localName !== "AlternateContent") return [el];
      const choice = child(el, "Choice");
      const use = choice && findAll(choice, "drawing").length ? choice : child(el, "Fallback") ?? choice;
      return use ? kids(use) : [];
    });
  }

  // ---------- drawings

  private drawing(el: Element, style: RunStyle, ctx: Ctx, out: Inline[]) {
    const wrap = kids(el)[0];
    if (!wrap) return;
    const ext = child(wrap, "extent");
    const w = emu(attr(ext, "cx")), h = emu(attr(ext, "cy"));
    const data = child(wrap, "graphic", "graphicData");
    const content = this.graphic(data, w, h, ctx);
    if (wrap.localName === "inline") {
      if (content.kind === "image") out.push({ t: "image", src: content.src, w, h, style });
      else if (content.kind === "chart") out.push({ t: "image", src: null, chart: content.src, w, h, style });
      else out.push({ t: "float", float: { w, h, x: { from: "column", align: "left" }, y: { from: "paragraph", offset: 0 }, inFlow: true, content } });
      return;
    }
    const ph = child(wrap, "positionH"), pv = child(wrap, "positionV");
    const hFrom = attr(ph, "relativeFrom") ?? "column", vFrom = attr(pv, "relativeFrom") ?? "paragraph";
    const hAlign = child(ph, "align")?.textContent ?? null, vAlign = child(pv, "align")?.textContent ?? null;
    const behind = /^(1|true)$/.test(attr(wrap, "behindDoc") ?? "0");
    const pushesText = !behind && kids(wrap).some((k) => /^wrap(Square|Tight|Through|TopAndBottom)$/.test(k.localName));
    const float: Float = {
      w, h,
      x: { from: hFrom === "page" ? "page" : /margin/i.test(hFrom) ? "margin" : "column", offset: hAlign ? undefined : emu(child(ph, "posOffset")?.textContent), align: hAlign === "center" ? "center" : hAlign === "right" || hAlign === "outside" ? "right" : hAlign ? "left" : undefined },
      y: { from: vFrom === "page" ? "page" : /margin/i.test(vFrom) ? "margin" : "paragraph", offset: vAlign ? undefined : emu(child(pv, "posOffset")?.textContent), align: vAlign === "center" ? "center" : vAlign === "bottom" ? "bottom" : vAlign ? "top" : undefined },
      inFlow: pushesText && content.kind !== "shape",
      content,
    };
    out.push({ t: "float", float });
  }

  private graphic(data: Element | null, w: number, h: number, ctx: Ctx): FloatContent {
    const pic = child(data, "pic");
    if (pic) {
      const blipFill = child(pic, "blipFill");
      const blip = child(blipFill, "blip");
      const path = this.pkg.target(ctx.part, relAttr(blip, "embed"));
      if (!path || !/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(path)) {
        this.doc.issues.pictures++;
        return { kind: "missing", label: "Picture" };
      }
      const src = child(blipFill, "srcRect");
      const crop = src ? { l: num(src, "l"), t: num(src, "t"), r: num(src, "r"), b: num(src, "b") } : undefined;
      return { kind: "image", src: { part: ctx.part, path, crop: crop && Object.values(crop).some(Boolean) ? crop : undefined } };
    }
    const chart = child(data, "chart");
    if (chart) {
      const path = this.pkg.target(ctx.part, relAttr(chart, "id"));
      if (path) return { kind: "chart", src: { part: ctx.part, path } as ChartSrc };
    }
    const shape = child(data, "wsp");
    if (shape) {
      const spPr = child(shape, "spPr");
      const fillEl = child(spPr, "solidFill");
      const lineEl = child(spPr, "ln");
      const color = (el: Element | null) => {
        const c = kids(el)[0];
        if (!c) return null;
        if (c.localName === "srgbClr") return attr(c, "val");
        if (c.localName === "schemeClr") {
          const key = ({ tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" } as Record<string, string>)[attr(c, "val") ?? ""] ?? attr(c, "val") ?? "";
          return this.doc.theme.colors[key] ?? null;
        }
        return null;
      };
      const noLine = child(lineEl, "noFill");
      const lineColor = noLine ? null : color(child(lineEl, "solidFill"));
      const geom = attr(child(spPr, "prstGeom"), "prst") ?? "rect";
      const body = child(shape, "bodyPr");
      const txbx = child(shape, "txbx", "txbxContent");
      return {
        kind: "shape",
        fill: child(spPr, "noFill") ? null : color(fillEl),
        line: lineColor ? { color: lineColor, width: emu(attr(lineEl, "w") ?? "9525"), space: 0 } : null,
        radius: geom === "roundRect" ? Math.min(w, h) * 0.16 : 0,
        ellipse: geom === "ellipse",
        blocks: txbx ? this.blocks(txbx, ctx) : [],
        inset: { l: emu(attr(body, "lIns") ?? "91440"), t: emu(attr(body, "tIns") ?? "45720"), r: emu(attr(body, "rIns") ?? "91440"), b: emu(attr(body, "bIns") ?? "45720") },
        anchor: (attr(body, "anchor") as "t" | "ctr" | "b") ?? "t",
      };
    }
    this.doc.issues.objects++;
    return { kind: "missing", label: child(data, "wgp") || child(data, "relIds") ? "Diagram" : "Object" };
  }

  /** Older documents and equation objects use VML pictures. */
  private vml(el: Element, style: RunStyle, ctx: Ctx, out: Inline[]) {
    const shape = findAll(el, "shape")[0];
    const imagedata = findAll(el, "imagedata")[0];
    if (!shape || !imagedata) return;
    const css = Object.fromEntries((attr(shape, "style") ?? "").split(";").map((p) => p.split(":").map((s) => s.trim())));
    const size = (v: string | undefined) => {
      const m = /^([\d.]+)(pt|in|px|cm|mm)?$/.exec(v ?? "");
      if (!m) return 0;
      const n = parseFloat(m[1]);
      return m[2] === "in" ? n * 72 : m[2] === "px" ? n * 0.75 : m[2] === "cm" ? (n * 72) / 2.54 : m[2] === "mm" ? (n * 72) / 25.4 : n;
    };
    const path = this.pkg.target(ctx.part, relAttr(imagedata, "id"));
    const w = size(css.width), h = size(css.height);
    if (!w || !h) return;
    if (!path || !/\.(png|jpe?g|gif|bmp|webp)$/i.test(path)) {
      this.doc.issues.pictures++;
      out.push({ t: "image", src: null, w, h, style });
      return;
    }
    out.push({ t: "image", src: { part: ctx.part, path }, w, h, style });
  }

  // ---------- tables

  private table(el: Element, ctx: Ctx): Table {
    const tblPr = child(el, "tblPr");
    const styleId = val(child(tblPr, "tblStyle"));
    const styles = this.chain(styleId);
    // Table-wide properties, from style to direct formatting.
    const prs = [...styles.map((s) => child(s, "tblPr")), tblPr].filter(Boolean) as Element[];
    const pick = (name: string) => prs.map((p) => child(p, name)).filter(Boolean).at(-1) ?? null;
    const borders: CellBorders & { insideH?: Border | null; insideV?: Border | null } = {};
    for (const p of prs) {
      const b = child(p, "tblBorders");
      for (const side of ["top", "bottom", "left", "right", "insideH", "insideV"] as const) {
        const v = readBorder(child(b, side) ?? child(b, side === "left" ? "start" : side === "right" ? "end" : side));
        if (v !== undefined) borders[side] = v;
      }
    }
    const marEl = pick("tblCellMar");
    const margin = {
      l: twip(wattr(child(marEl, "left") ?? child(marEl, "start"), "w"), 108), r: twip(wattr(child(marEl, "right") ?? child(marEl, "end"), "w"), 108),
      t: twip(wattr(child(marEl, "top"), "w"), 0), b: twip(wattr(child(marEl, "bottom"), "w"), 0),
    };
    const look = child(tblPr, "tblLook");
    const lookVal = parseInt(val(look) ?? "04A0", 16);
    const flagOf = (name: string, bit: number) => { const v = wattr(look, name); return v != null ? v === "1" || v === "true" : (lookVal & bit) !== 0; };
    const lookFlags = { firstRow: flagOf("firstRow", 0x20), lastRow: flagOf("lastRow", 0x40), firstCol: flagOf("firstColumn", 0x80), lastCol: flagOf("lastColumn", 0x100), hBand: !flagOf("noHBand", 0x200), vBand: !flagOf("noVBand", 0x400) };
    const conditional = (type: string) => styles.map((s) => kids(s, "tblStylePr").find((c) => wattr(c, "type") === type)).filter(Boolean) as Element[];
    const baseTcPr = styles.map((s) => child(s, "tcPr")).filter(Boolean) as Element[];

    const grid = kids(child(el, "tblGrid"), "gridCol").map((c) => twip(wattr(c, "w")));
    const rowsEl = kids(el).flatMap((r) => (r.localName === "tr" ? [r] : r.localName === "sdt" ? kids(child(r, "sdtContent"), "tr") : []));
    const rows: Row[] = rowsEl.map((tr, ri) => {
      const trPr = child(tr, "trPr");
      const hEl = child(trPr, "trHeight");
      let col = Number(val(child(trPr, "gridBefore")) ?? 0) || 0;
      const cellsEl = kids(tr).flatMap((c) => (c.localName === "tc" ? [c] : c.localName === "sdt" ? kids(child(c, "sdtContent"), "tc") : []));
      const cells: Cell[] = cellsEl.map((tc, ci) => {
        const tcPr = child(tc, "tcPr");
        const span = Number(val(child(tcPr, "gridSpan")) ?? 1) || 1;
        // Conditional formats that apply to this cell, weakest first.
        const types: string[] = [];
        const bandIndex = ri - (lookFlags.firstRow ? 1 : 0);
        if (lookFlags.hBand && !(lookFlags.firstRow && ri === 0) && !(lookFlags.lastRow && ri === rowsEl.length - 1)) types.push(bandIndex % 2 ? "band2Horz" : "band1Horz");
        if (lookFlags.vBand) types.push(col % 2 ? "band2Vert" : "band1Vert");
        if (lookFlags.firstCol && col === 0) types.push("firstCol");
        if (lookFlags.lastCol && ci === cellsEl.length - 1) types.push("lastCol");
        if (lookFlags.lastRow && ri === rowsEl.length - 1) types.push("lastRow");
        if (lookFlags.firstRow && ri === 0) types.push("firstRow");
        const conds = types.flatMap(conditional);
        const tcPrs = [...baseTcPr, ...conds.map((c) => child(c, "tcPr")), tcPr].filter(Boolean) as Element[];
        let shading: string | null = null;
        const cellBorders: CellBorders = {};
        for (const p of tcPrs) {
          const s = shadingFill(child(p, "shd"));
          if (s !== undefined) shading = s;
          const b = child(p, "tcBorders");
          for (const side of ["top", "bottom", "left", "right"] as const) {
            const v = readBorder(child(b, side) ?? child(b, side === "left" ? "start" : side === "right" ? "end" : side));
            if (v !== undefined) cellBorders[side] = v;
          }
        }
        const cm = child(tcPr, "tcMar");
        const cellCtx: Ctx = {
          part: ctx.part,
          table: {
            pPr: [...styles.map((s) => child(s, "pPr")), ...conds.map((c) => child(c, "pPr"))].filter(Boolean) as Element[],
            rPr: [...styles.map((s) => child(s, "rPr")), ...conds.map((c) => child(c, "rPr"))].filter(Boolean) as Element[],
          },
        };
        const vm = child(tcPr, "vMerge");
        const cell: Cell = {
          blocks: this.blocks(tc, cellCtx),
          col, span,
          vMerge: vm ? (val(vm) === "restart" ? "restart" : "continue") : null,
          shading,
          borders: cellBorders,
          vAlign: (val(child(tcPr, "vAlign")) as Cell["vAlign"]) ?? "top",
          margin: {
            l: cm && child(cm, "left") ? twip(wattr(child(cm, "left"), "w")) : margin.l, r: cm && child(cm, "right") ? twip(wattr(child(cm, "right"), "w")) : margin.r,
            t: cm && child(cm, "top") ? twip(wattr(child(cm, "top"), "w")) : margin.t, b: cm && child(cm, "bottom") ? twip(wattr(child(cm, "bottom"), "w")) : margin.b,
          },
          width: wattr(child(tcPr, "tcW"), "type") === "dxa" ? twip(wattr(child(tcPr, "tcW"), "w")) : null,
        };
        // Outer borders vs inside borders from the table, unless the cell sets its own.
        const lastCol = col + span >= grid.length;
        for (const [side, outer, inside] of [["top", ri === 0, "insideH"], ["bottom", ri === rowsEl.length - 1, "insideH"], ["left", col === 0, "insideV"], ["right", lastCol, "insideV"]] as const) {
          if (cell.borders[side] === undefined) cell.borders[side] = (outer ? borders[side] : borders[inside]) ?? null;
        }
        if (cell.shading === "auto") cell.shading = null;
        col += span;
        return cell;
      });
      return {
        cells, height: twip(val(hEl) ?? wattr(hEl, "val")), exact: wattr(hEl, "hRule") === "exact",
        header: on(child(trPr, "tblHeader")) ?? false, cantSplit: on(child(trPr, "cantSplit")) ?? false,
      };
    });
    const wEl = pick("tblW");
    const wType = wattr(wEl, "type");
    const jc = val(pick("jc"));
    return {
      t: "tbl", grid, rows,
      width: wType === "pct" ? { value: parseFloat(wattr(wEl, "w") ?? "0") / (String(wattr(wEl, "w")).endsWith("%") ? 1 : 50), pct: true } : wType === "dxa" ? { value: twip(wattr(wEl, "w")), pct: false } : null,
      align: jc === "center" ? "center" : jc === "right" || jc === "end" ? "right" : "left",
      indent: twip(wattr(pick("tblInd"), "w")),
    };
  }
}

const num = (el: Element | null, name: string) => (parseFloat(attr(el, name) ?? "0") || 0) / 100000;

function fieldName(instr: string): "PAGE" | "NUMPAGES" | "SECTIONPAGES" | null {
  const word = instr.trim().split(/\s+/)[0]?.toUpperCase();
  return word === "PAGE" || word === "NUMPAGES" || word === "SECTIONPAGES" ? word : null;
}

const ROMAN = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]] as const;

export function formatNumber(n: number, fmt: string, legal = false): string {
  if (legal) return String(n);
  switch (fmt) {
    case "lowerLetter": case "upperLetter": {
      const s = String.fromCharCode(97 + ((n - 1) % 26)).repeat(Math.floor((n - 1) / 26) + 1);
      return fmt === "upperLetter" ? s.toUpperCase() : s;
    }
    case "lowerRoman": case "upperRoman": {
      let out = "", v = n;
      for (const [k, s] of ROMAN) while (v >= k) { out += s; v -= k; }
      return fmt === "upperRoman" ? out.toUpperCase() : out;
    }
    case "decimalZero": return n < 10 ? `0${n}` : String(n);
    case "ordinal": return `${n}${["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;
    case "bullet": case "none": return "";
    default: return String(n);
  }
}

export type { Section, TabStop };
