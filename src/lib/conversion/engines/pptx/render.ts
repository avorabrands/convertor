import { drawChart } from "./chart";
import { css, hex, readColor, schemeColor, type Palette, type Rgba } from "./color";
import { customShape, presetShape, type Shape } from "./geometry";
import type { Package, Picture } from "./package";
import { tableStyle, type CellLook } from "./tables";
import { layoutText, type LayerLine, type TextEnv, type TextStyle } from "./text";
import { attr, child, findAll, flag, kids, num, pt, rad, relAttr } from "./xml";

type Ctx = CanvasRenderingContext2D;
interface Box { x: number; y: number; w: number; h: number; rot: number; flipH: boolean; flipV: boolean }
/** Where a group's children land: scale then shift. */
interface Frame { sx: number; sy: number; tx: number; ty: number }
type Fill =
  | { kind: "none" }
  | { kind: "solid"; color: Rgba }
  | { kind: "gradient"; stops: [number, Rgba][]; angle: number; radial: boolean }
  | { kind: "picture"; picture: Picture; el: Element; alpha: number };
interface Stroke { color: Rgba; width: number; dash: number[]; head: string; tail: string; cap: CanvasLineCap }

interface Part { path: string; root: Element }
interface Scope {
  /** The part being drawn: its relationships resolve pictures. */
  part: Part;
  layout: Part | null;
  master: Part | null;
  groupFill?: Fill;
}

const IDENTITY: Frame = { sx: 1, sy: 1, tx: 0, ty: 0 };
const DASH: Record<string, number[]> = { dot: [1, 3], sysDot: [1, 1], dash: [4, 3], sysDash: [3, 1], lgDash: [8, 3], dashDot: [4, 3, 1, 3], sysDashDot: [3, 1, 1, 1], lgDashDot: [8, 3, 1, 3], lgDashDotDot: [8, 3, 1, 3, 1, 3] };

export interface DeckInfo { pkg: Package; presentation: Part; width: number; height: number }
export interface Issues { pictures: number; charts: number }

export async function renderSlide(deck: DeckInfo, path: string, number: number, ctx: Ctx, scale: number, issues: Issues): Promise<LayerLine[]> {
  const r = new SlideRenderer(deck, path, number, ctx, scale, issues);
  await r.render();
  return r.env.layer;
}

class SlideRenderer {
  readonly env: TextEnv;
  private slide: Part;
  private layout: Part | null;
  private master: Part | null;
  private theme: Part | null;
  private palette: Palette;

  constructor(private deck: DeckInfo, path: string, number: number, private ctx: Ctx, private scale: number, private issues: Issues) {
    const { pkg } = deck;
    this.slide = { path, root: pkg.xml(path)! };
    const part = (p: string | null): Part | null => { const root = pkg.xml(p); return p && root ? { path: p, root } : null; };
    this.layout = part(pkg.byType(path, "slideLayout"));
    this.master = this.layout ? part(pkg.byType(this.layout.path, "slideMaster")) : null;
    this.theme = this.master ? part(pkg.byType(this.master.path, "theme")) : null;

    const theme: Record<string, string> = {};
    for (const c of kids(child(this.theme?.root, "themeElements", "clrScheme"))) {
      const v = kids(c)[0];
      theme[c.localName] = attr(v, "lastClr") ?? attr(v, "val") ?? "000000";
    }
    const map: Record<string, string> = {};
    const override = [this.slide, this.layout].map((p) => child(p?.root, "clrMapOvr", "overrideClrMapping")).find(Boolean);
    for (const a of (override ?? child(this.master?.root, "clrMap"))?.attributes ?? []) map[a.name] = a.value;
    this.palette = { theme, map };
    const face = (k: string) => attr(child(this.theme?.root, "themeElements", "fontScheme", k, "latin"), "typeface") || "Calibri";
    this.env = { ctx, palette: this.palette, fonts: { major: face("majorFont"), minor: face("minorFont") }, slideNumber: number, layer: [] };
  }

  async render() {
    const { ctx } = this;
    ctx.save();
    ctx.scale(this.scale, this.scale);
    await this.background();
    const show = (p: Part | null) => flag(p?.root, "showMasterSp") !== false;
    if (this.master && this.layout && show(this.slide) && show(this.layout)) await this.tree(this.master, true);
    if (this.layout && show(this.slide)) await this.tree(this.layout, true);
    await this.tree(this.slide, false);
    ctx.restore();
  }

  private async background() {
    const { width: w, height: h } = this.deck;
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, w, h);
    for (const p of [this.slide, this.layout, this.master]) {
      const bg = child(p?.root, "cSld", "bg");
      if (!bg || !p) continue;
      const props = child(bg, "bgPr");
      const ref = child(bg, "bgRef");
      const fill = props ? await this.readFill(props, p.path)
        : ref ? await this.themeFill(num(ref, "idx") ?? 0, readColor(ref, this.palette)) : null;
      if (fill) {
        const path = new Path2D();
        path.rect(0, 0, w, h);
        this.paint({ path }, fill, w, h);
      }
      return;
    }
  }

  private async tree(part: Part, skipPlaceholders: boolean) {
    const scope: Scope = { part, layout: this.layout, master: this.master };
    await this.children(child(part.root, "cSld", "spTree"), scope, IDENTITY, skipPlaceholders);
  }

  private async children(parent: Element | null, scope: Scope, frame: Frame, skipPlaceholders: boolean) {
    for (const el of kids(parent)) {
      if (flag(findAll(kids(el)[0], "cNvPr")[0], "hidden")) continue;
      switch (el.localName) {
        case "sp": case "cxnSp":
          if (!(skipPlaceholders && placeholder(el))) await this.shape(el, scope, frame);
          break;
        case "pic": if (!(skipPlaceholders && placeholder(el))) await this.pic(el, scope, frame); break;
        case "grpSp": await this.group(el, scope, frame, skipPlaceholders); break;
        case "graphicFrame": await this.graphicFrame(el, scope, frame); break;
        case "AlternateContent": {
          // The fallback is the version every viewer can draw.
          const fb = child(el, "Fallback");
          await this.children(fb && fb.children.length ? fb : child(el, "Choice"), scope, frame, skipPlaceholders);
          break;
        }
      }
    }
  }

  // ---------- geometry

  private box(xfrm: Element | null, frame: Frame): Box | null {
    const off = child(xfrm, "off"), ext = child(xfrm, "ext");
    if (!off || !ext) return null;
    return {
      x: pt(num(off, "x")) * frame.sx + frame.tx, y: pt(num(off, "y")) * frame.sy + frame.ty,
      w: Math.abs(pt(num(ext, "cx")) * frame.sx), h: Math.abs(pt(num(ext, "cy")) * frame.sy),
      rot: rad(num(xfrm, "rot")), flipH: flag(xfrm, "flipH") ?? false, flipV: flag(xfrm, "flipV") ?? false,
    };
  }

  /** Runs with the origin at the box's top left, rotated about its centre. */
  private async within(b: Box, draw: () => void | Promise<void>, flip = false) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    if (b.rot) ctx.rotate(b.rot);
    if (flip) ctx.scale(b.flipH ? -1 : 1, b.flipV ? -1 : 1);
    ctx.translate(-b.w / 2, -b.h / 2);
    try { await draw(); } finally { ctx.restore(); }
  }

  private async group(el: Element, scope: Scope, frame: Frame, skip: boolean) {
    const pr = child(el, "grpSpPr");
    const xfrm = child(pr, "xfrm");
    const b = this.box(xfrm, frame);
    const fill = pr ? await this.readFill(pr, scope.part.path, undefined, scope) : null;
    const next: Scope = fill ? { ...scope, groupFill: fill } : scope;
    if (!b) return this.children(el, next, frame, skip);
    const chOff = child(xfrm, "chOff"), chExt = child(xfrm, "chExt");
    const cw = pt(num(chExt, "cx")) || b.w || 1, ch = pt(num(chExt, "cy")) || b.h || 1;
    const sx = b.w / cw, sy = b.h / ch;
    const inner: Frame = { sx, sy, tx: b.x - pt(num(chOff, "x")) * sx, ty: b.y - pt(num(chOff, "y")) * sy };
    if (!b.rot && !b.flipH && !b.flipV) return this.children(el, next, inner, skip);
    const { ctx } = this;
    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    ctx.rotate(b.rot);
    ctx.scale(b.flipH ? -1 : 1, b.flipV ? -1 : 1);
    ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
    await this.children(el, next, inner, skip);
    ctx.restore();
  }

  // ---------- placeholders

  private inherited(el: Element, scope: Scope): Element[] {
    const ph = placeholder(el);
    if (!ph || scope.part.path !== this.slide.path) return [];
    const type = attr(ph, "type") ?? "obj";
    const idx = attr(ph, "idx");
    const out: Element[] = [];
    const inLayout = findPlaceholder(scope.layout?.root, type, idx);
    if (inLayout) out.push(inLayout);
    const masterType = inLayout ? attr(placeholder(inLayout), "type") ?? type : type;
    const inMaster = findPlaceholder(scope.master?.root, masterType, null);
    if (inMaster) out.push(inMaster);
    return out;
  }

  private textStyle(el: Element, parents: Element[], body: Element | null): TextStyle {
    const ph = placeholder(el);
    const lists = [child(body, "lstStyle"), ...parents.map((p) => child(p, "txBody", "lstStyle"))];
    const styles = child(this.master?.root, "txStyles");
    const fallback = child(this.deck.presentation.root, "defaultTextStyle");
    const fontRef = child(el, "style", "fontRef");
    if (ph) {
      const t = mainType(parents.map((p) => attr(placeholder(p), "type")).find(Boolean) ?? attr(ph, "type") ?? "obj");
      lists.push(child(styles, t === "title" ? "titleStyle" : t === "body" ? "bodyStyle" : "otherStyle"));
    }
    const objectDefault = ph ? null : child(this.theme?.root, "objectDefaults", flag(child(el, "nvSpPr", "cNvSpPr"), "txBox") ? "txDef" : "spDef", "lstStyle");
    return {
      lists, defaults: [objectDefault, fallback],
      color: fontRef ? readColor(fontRef, this.palette) : null,
      font: fontRef ? (attr(fontRef, "idx") === "major" ? "+mj-lt" : "+mn-lt") : undefined,
    };
  }

  // ---------- fills and lines

  private async readFill(el: Element, partPath: string, ph?: Rgba, scope?: Scope): Promise<Fill | null> {
    for (const f of kids(el)) {
      switch (f.localName) {
        case "noFill": return { kind: "none" };
        case "solidFill": { const color = readColor(f, this.palette, ph); return color ? { kind: "solid", color } : null; }
        case "gradFill": return this.gradient(f, ph);
        case "pattFill": { const color = readColor(child(f, "fgClr"), this.palette, ph); return color ? { kind: "solid", color: { ...color, a: color.a * 0.5 } } : null; }
        case "blipFill": return this.pictureFill(f, partPath);
        case "grpFill": return scope?.groupFill ?? null;
      }
    }
    return null;
  }

  private gradient(f: Element, ph?: Rgba): Fill | null {
    const stops = kids(child(f, "gsLst"), "gs")
      .map((g): [number, Rgba] => [Math.min(1, Math.max(0, (num(g, "pos") ?? 0) / 100000)), readColor(g, this.palette, ph) ?? hex("FFFFFF")])
      .sort((a, b) => a[0] - b[0]);
    if (!stops.length) return null;
    return { kind: "gradient", stops, angle: rad(num(child(f, "lin"), "ang")), radial: Boolean(child(f, "path")) };
  }

  private async pictureFill(f: Element, partPath: string): Promise<Fill | null> {
    const blip = child(f, "blip");
    const picture = await this.load(blip, partPath);
    if (!picture) return null;
    const alpha = num(child(blip, "alphaModFix"), "amt");
    return { kind: "picture", picture, el: f, alpha: alpha == null ? 1 : alpha / 100000 };
  }

  private async load(blip: Element | null, partPath: string): Promise<Picture | null> {
    const { pkg } = this.deck;
    const main = pkg.target(partPath, relAttr(blip, "embed"));
    const svg = pkg.target(partPath, relAttr(findAll(blip, "svgBlip")[0], "embed"));
    const picture = (main && (await pkg.picture(main))) || (svg && (await pkg.picture(svg))) || null;
    if (!picture && (main || svg)) this.issues.pictures++;
    return picture;
  }

  private async themeFill(idx: number, color: Rgba | null): Promise<Fill | null> {
    if (!idx || idx === 1000) return null;
    const scheme = child(this.theme?.root, "themeElements", "fmtScheme");
    const list = kids(child(scheme, idx > 1000 ? "bgFillStyleLst" : "fillStyleLst"));
    const el = list[(idx > 1000 ? idx - 1001 : idx - 1)];
    if (!el || !this.theme) return color ? { kind: "solid", color } : null;
    const holder = el.ownerDocument.createElement("holder");
    holder.append(el.cloneNode(true));
    return this.readFill(holder, this.theme.path, color ?? undefined);
  }

  private stroke(ln: Element | null, styleEl: Element | null, inheritedLn: Element | null = null): Stroke | null {
    const ref = child(styleEl, "lnRef");
    const idx = num(ref, "idx") ?? 0;
    const themeLn = idx ? kids(child(this.theme?.root, "themeElements", "fmtScheme", "lnStyleLst"))[idx - 1] ?? null : null;
    const refColor = ref ? readColor(ref, this.palette) : null;
    const sources = [ln, inheritedLn, themeLn];
    let color: Rgba | null = null;
    for (const s of sources) {
      if (!s) continue;
      if (child(s, "noFill")) return null;
      const f = child(s, "solidFill") ?? child(s, "gradFill", "gsLst", "gs") ?? child(s, "pattFill", "fgClr");
      if (f) { color = readColor(f, this.palette, refColor ?? undefined); break; }
    }
    if (!color) return null;
    const get = <T>(read: (e: Element) => T | null) => { for (const s of sources) if (s) { const v = read(s); if (v != null) return v; } return null; };
    const width = Math.max(0.25, pt(get((e) => num(e, "w")) ?? 9525));
    const dash = get((e) => attr(child(e, "prstDash"), "val")) ?? "solid";
    const end = (n: string) => get((e) => attr(child(e, n), "type")) ?? "none";
    return { color, width, dash: (DASH[dash] ?? []).map((d) => d * width), head: end("headEnd"), tail: end("tailEnd"), cap: get((e) => attr(e, "cap")) === "rnd" ? "round" : "butt" };
  }

  private paint(shape: Shape, fill: Fill, w: number, h: number, effects: Element | null = null) {
    const { ctx } = this;
    if (fill.kind === "none" || shape.open) return;
    const rule: CanvasFillRule = shape.evenOdd ? "evenodd" : "nonzero";
    ctx.save();
    const shadow = child(effects, "outerShdw");
    if (shadow) {
      const color = readColor(shadow, this.palette);
      const dist = pt(num(shadow, "dist")) * this.scale, dir = rad(num(shadow, "dir"));
      if (color) {
        // Canvas shadows ignore the transform, so offsets are in device pixels.
        ctx.shadowColor = css(color);
        ctx.shadowBlur = pt(num(shadow, "blurRad")) * this.scale;
        ctx.shadowOffsetX = Math.cos(dir) * dist;
        ctx.shadowOffsetY = Math.sin(dir) * dist;
      }
    }
    if (fill.kind === "solid") { ctx.fillStyle = css(fill.color); ctx.fill(shape.path, rule); }
    else if (fill.kind === "gradient") {
      let g: CanvasGradient;
      if (fill.radial) g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
      else {
        const [dx, dy] = [Math.cos(fill.angle), Math.sin(fill.angle)];
        const len = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
        g = ctx.createLinearGradient(w / 2 - dx * len, h / 2 - dy * len, w / 2 + dx * len, h / 2 + dy * len);
      }
      for (const [p, c] of fill.stops) g.addColorStop(p, css(c));
      ctx.fillStyle = g;
      ctx.fill(shape.path, rule);
    } else {
      if (shadow) { ctx.fillStyle = "#fff"; ctx.fill(shape.path, rule); ctx.shadowColor = "transparent"; }
      ctx.clip(shape.path, rule);
      ctx.globalAlpha = fill.alpha;
      this.placePicture(fill.picture, fill.el, w, h);
    }
    ctx.restore();
  }

  private placePicture(picture: Picture, blipFill: Element, w: number, h: number) {
    const { ctx } = this;
    const edge = (el: Element | null, k: string) => (num(el, k) ?? 0) / 100000;
    ctx.imageSmoothingQuality = "high";
    const tile = child(blipFill, "tile");
    if (tile) {
      const tw = picture.width * 0.75 * ((num(tile, "sx") ?? 100000) / 100000), th = picture.height * 0.75 * ((num(tile, "sy") ?? 100000) / 100000);
      if (tw > 1 && th > 1 && (w / tw) * (h / th) < 4000) {
        for (let y = 0; y < h; y += th) for (let x = 0; x < w; x += tw) ctx.drawImage(picture, x, y, tw, th);
        return;
      }
    }
    const src = child(blipFill, "srcRect"), dst = child(blipFill, "stretch", "fillRect");
    const dx = w * edge(dst, "l"), dy = h * edge(dst, "t");
    const dw = w - dx - w * edge(dst, "r"), dh = h - dy - h * edge(dst, "b");
    const l = edge(src, "l"), t = edge(src, "t");
    const fw = dw / Math.max(0.01, 1 - l - edge(src, "r")), fh = dh / Math.max(0.01, 1 - t - edge(src, "b"));
    ctx.drawImage(picture, dx - l * fw, dy - t * fh, fw, fh);
  }

  private outline(shape: Shape, s: Stroke | null) {
    if (!s) return;
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = css(s.color);
    ctx.lineWidth = s.width;
    ctx.lineCap = s.cap;
    ctx.setLineDash(s.dash);
    ctx.stroke(shape.path);
    if (shape.detail) ctx.stroke(shape.detail);
    ctx.setLineDash([]);
    if (shape.ends) {
      for (const [type, [x, y, a]] of [[s.head, shape.ends.start], [s.tail, shape.ends.end]] as const) {
        if (type === "none") continue;
        const len = Math.max(5, s.width * 3.2), half = len * 0.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.beginPath();
        if (type === "oval") { ctx.arc(0, 0, half * 0.8, 0, 7); ctx.fill(); }
        else if (type === "diamond") { ctx.moveTo(half, 0); ctx.lineTo(0, half); ctx.lineTo(-half, 0); ctx.lineTo(0, -half); ctx.fill(); }
        else if (type === "arrow") { ctx.moveTo(-len, -half); ctx.lineTo(0, 0); ctx.lineTo(-len, half); ctx.stroke(); }
        else { ctx.moveTo(s.width * 0.6, 0); ctx.lineTo(-len, -half); ctx.lineTo(type === "stealth" ? -len * 0.7 : -len, 0); ctx.lineTo(-len, half); ctx.fill(); }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private geometry(pr: (Element | null)[], w: number, h: number): { shape: Shape; name: string } {
    for (const p of pr) {
      const custom = child(p, "custGeom");
      if (custom) return { shape: customShape(custom, w, h), name: "custom" };
      const preset = child(p, "prstGeom");
      if (preset) { const name = attr(preset, "prst") ?? "rect"; return { shape: presetShape(name, preset, w, h), name }; }
    }
    return { shape: presetShape("rect", null, w, h), name: "rect" };
  }

  // ---------- shapes

  private async shape(el: Element, scope: Scope, frame: Frame) {
    const parents = this.inherited(el, scope);
    const props = [child(el, "spPr"), ...parents.map((p) => child(p, "spPr"))];
    const b = props.map((p) => this.box(child(p, "xfrm"), frame)).find(Boolean);
    if (!b) return;
    const { shape, name } = this.geometry(props, b.w, b.h);
    const styleEl = child(el, "style");
    let fill: Fill | null = null;
    for (let i = 0; i < props.length && !fill; i++) {
      // A layout's picture fill lives in the layout's own relationships.
      const path = i === 0 ? scope.part.path : [scope.layout, scope.master].find((p) => p && p.root.contains(props[i]))?.path ?? scope.part.path;
      if (props[i]) fill = await this.readFill(props[i]!, path, undefined, scope);
    }
    if (!fill && styleEl) { const ref = child(styleEl, "fillRef"); fill = await this.themeFill(num(ref, "idx") ?? 0, readColor(ref, this.palette)); }
    const line = this.stroke(child(props[0], "ln"), styleEl, props.slice(1).map((p) => child(p, "ln")).find(Boolean) ?? null);
    await this.within(b, () => {
      if (fill) this.paint(shape, fill, b.w, b.h, child(props[0], "effectLst"));
      this.outline(shape, line);
    }, true);

    const body = child(el, "txBody");
    if (!body || !findAll(body, "t").some((t) => t.textContent)) return;
    // SmartArt stores a separate rectangle for its text.
    const tx = this.box(child(el, "txXfrm"), frame) ?? b;
    const rect = tx === b ? textRect(name, b.w, b.h) : { x: 0, y: 0, w: tx.w, h: tx.h };
    const bodies = [child(body, "bodyPr"), ...parents.map((p) => child(p, "txBody", "bodyPr"))];
    await this.within({ ...tx, rot: tx.rot + (b.flipV && tx === b ? Math.PI : 0) }, () => this.text(body, bodies, rect, this.textStyle(el, parents, body)));
  }

  private text(body: Element, bodies: (Element | null)[], rect: { x: number; y: number; w: number; h: number }, style: TextStyle) {
    const { ctx } = this;
    const get = <T>(read: (e: Element) => T | null) => { for (const e of bodies) if (e) { const v = read(e); if (v != null) return v; } return null; };
    const inset = (k: string, d: number) => pt(get((e) => num(e, k)) ?? d);
    const [l, t, r, bt] = [inset("lIns", 91440), inset("tIns", 45720), inset("rIns", 91440), inset("bIns", 45720)];
    const vert = get((e) => attr(e, "vert")) ?? "horz";
    const turned = vert !== "horz" && vert !== "wordArtVert";
    ctx.save();
    ctx.translate(rect.x, rect.y);
    let [w, h] = [rect.w, rect.h];
    if (turned) {
      if (vert === "vert270") { ctx.translate(0, h); ctx.rotate(-Math.PI / 2); } else { ctx.translate(w, 0); ctx.rotate(Math.PI / 2); }
      [w, h] = [h, w];
    }
    const wrap = get((e) => attr(e, "wrap")) !== "none";
    const fit = get((e) => kids(e).find((k) => /Autofit$|AutoFit$/.test(k.localName)) ?? null);
    const normal = fit?.localName === "normAutofit";
    const availableW = Math.max(1, w - l - r), availableH = h - t - bt;
    const laid = layoutText(body, availableW, style, this.env, {
      wrap, fontScale: normal ? (num(fit, "fontScale") ?? 100000) / 100000 : 1,
      lineCut: normal ? (num(fit, "lnSpcReduction") ?? 0) / 100000 : 0,
      fitHeight: normal && availableH > 10 ? availableH : undefined,
    });
    const anchor = get((e) => attr(e, "anchor")) ?? "t";
    const free = availableH - laid.height;
    const y = t + (anchor === "ctr" ? free / 2 : anchor === "b" ? free : 0);
    let x = l;
    if (get((e) => flag(e, "anchorCtr")) && laid.width < availableW) x += (availableW - laid.width) / 2;
    laid.draw(x, y);
    ctx.restore();
  }

  private async pic(el: Element, scope: Scope, frame: Frame) {
    const parents = this.inherited(el, scope);
    const props = [child(el, "spPr"), ...parents.map((p) => child(p, "spPr"))];
    const b = props.map((p) => this.box(child(p, "xfrm"), frame)).find(Boolean);
    const blipFill = child(el, "blipFill");
    if (!b || !blipFill) return;
    const { shape } = this.geometry(props, b.w, b.h);
    const closed = { ...shape, open: false };
    const back = props[0] ? await this.readFill(props[0], scope.part.path, undefined, scope) : null;
    const fill = await this.pictureFill(blipFill, scope.part.path);
    await this.within(b, () => {
      if (back && back.kind !== "picture") this.paint(closed, back, b.w, b.h);
      if (fill) this.paint(closed, fill, b.w, b.h);
      else {
        this.ctx.fillStyle = css({ ...schemeColor("tx1", this.palette), a: 0.08 });
        this.ctx.fill(closed.path);
      }
      this.outline(closed, this.stroke(child(props[0], "ln"), child(el, "style")));
    }, true);
  }

  // ---------- tables, charts, SmartArt

  private async graphicFrame(el: Element, scope: Scope, frame: Frame) {
    const b = this.box(child(el, "xfrm"), frame) ?? this.inherited(el, scope).map((p) => this.box(child(p, "spPr", "xfrm"), frame)).find(Boolean);
    const data = child(el, "graphic", "graphicData");
    if (!b || !data) return;
    const { pkg } = this.deck;

    const tbl = child(data, "tbl");
    if (tbl) return this.within(b, () => this.table(tbl, scope));

    const chartRef = child(data, "chart");
    if (chartRef) {
      const root = pkg.xml(pkg.target(scope.part.path, relAttr(chartRef, "id")));
      let ok = false;
      if (root) await this.within(b, async () => {
        const back = child(root, "spPr") ? await this.readFill(child(root, "spPr")!, scope.part.path) : null;
        const path = new Path2D();
        path.rect(0, 0, b.w, b.h);
        if (back) this.paint({ path }, back, b.w, b.h);
        ok = drawChart(root, b.w, b.h, this.env);
      });
      if (!ok) { this.issues.charts++; await this.missing(b, "Chart"); }
      return;
    }

    const relIds = child(data, "relIds");
    if (relIds) {
      const dataPart = pkg.target(scope.part.path, relAttr(relIds, "dm"));
      const drawingId = attr(findAll(pkg.xml(dataPart), "dataModelExt")[0], "relId");
      const drawing = pkg.target(scope.part.path, drawingId) ?? pkg.byType(scope.part.path, "diagramDrawing");
      const root = pkg.xml(drawing);
      const treeEl = child(root, "spTree");
      if (!root || !treeEl || !drawing) { this.issues.charts++; return this.missing(b, "Diagram"); }
      return this.children(treeEl, { ...scope, part: { path: drawing, root } }, { sx: 1, sy: 1, tx: b.x, ty: b.y }, false);
    }

    const pic = findAll(data, "pic").at(-1);
    if (pic) return this.pic(pic, scope, frame);
    this.issues.charts++;
    await this.missing(b, "Object");
  }

  private missing(b: Box, label: string) {
    return this.within(b, () => {
      const { ctx } = this;
      const ink = schemeColor("tx1", this.palette);
      ctx.strokeStyle = css({ ...ink, a: 0.3 });
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(0.5, 0.5, b.w - 1, b.h - 1);
      ctx.setLineDash([]);
      ctx.fillStyle = css({ ...ink, a: 0.6 });
      ctx.font = `12px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${label} not shown`, b.w / 2, b.h / 2);
      ctx.textAlign = "left";
    });
  }

  private async table(tbl: Element, scope: Scope) {
    const { ctx } = this;
    const cols = kids(child(tbl, "tblGrid"), "gridCol").map((c) => pt(num(c, "w")));
    const rows = kids(tbl, "tr");
    const look = tableStyle(tbl, this.deck.pkg, this.palette);
    interface Cell { el: Element; r: number; c: number; w: number; span: number; rows: number; look: CellLook; layout: ReturnType<typeof layoutText>; pad: number[]; anchor: string }
    const cells: Cell[] = [];
    const heights = rows.map((r) => pt(num(r, "h")));
    const base = child(this.deck.presentation.root, "defaultTextStyle");
    rows.forEach((row, r) => kids(row, "tc").forEach((tc, c) => {
      if (flag(tc, "hMerge") || flag(tc, "vMerge")) return;
      const span = num(tc, "gridSpan") ?? 1, rowSpan = num(tc, "rowSpan") ?? 1;
      const w = cols.slice(c, c + span).reduce((a, x) => a + x, 0);
      const pr = child(tc, "tcPr");
      const pad = ([["marL", 91440], ["marT", 45720], ["marR", 91440], ["marB", 45720]] as const).map(([k, d]) => pt(num(pr, k) ?? d));
      const cellLook = look(r, c, rows.length, cols.length);
      const body = child(tc, "txBody");
      const layout = body
        ? layoutText(body, Math.max(1, w - pad[0] - pad[2]), { lists: [child(body, "lstStyle")], defaults: [base], color: cellLook.color, bold: cellLook.bold || undefined }, this.env)
        : { height: 0, width: 0, draw() {} };
      if (rowSpan === 1) heights[r] = Math.max(heights[r], layout.height + pad[1] + pad[3]);
      cells.push({ el: tc, r, c, w, span, rows: rowSpan, look: cellLook, layout, pad, anchor: attr(pr, "anchor") ?? "t" });
    }));
    const xs = cols.reduce((a, w) => [...a, a.at(-1)! + w], [0]);
    const ys = heights.reduce((a, h) => [...a, a.at(-1)! + h], [0]);
    const place = (cell: Cell) => ({ x: xs[cell.c], y: ys[cell.r], w: cell.w, h: ys[Math.min(rows.length, cell.r + cell.rows)] - ys[cell.r] });

    for (const cell of cells) {
      const { x, y, w, h } = place(cell);
      const pr = child(cell.el, "tcPr");
      const own = pr ? await this.readFill(pr, scope.part.path) : null;
      const fill: Fill | null = own ?? (cell.look.fill ? { kind: "solid", color: cell.look.fill } : null);
      if (!fill) continue;
      ctx.save();
      ctx.translate(x, y);
      const path = new Path2D();
      path.rect(0, 0, w, h);
      this.paint({ path }, fill, w, h);
      ctx.restore();
    }
    for (const cell of cells) {
      const { x, y, w, h } = place(cell);
      const pr = child(cell.el, "tcPr");
      const edges = [["lnL", "left", x, y, x, y + h], ["lnR", "right", x + w, y, x + w, y + h], ["lnT", "top", x, y, x + w, y], ["lnB", "bottom", x, y + h, x + w, y + h]] as const;
      for (const [tag, side, x1, y1, x2, y2] of edges) {
        const own = child(pr, tag);
        const s = own && own.children.length ? this.stroke(own, null) : cell.look.borders[side];
        if (!s) continue;
        ctx.strokeStyle = css(s.color);
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      const free = h - cell.pad[1] - cell.pad[3] - cell.layout.height;
      cell.layout.draw(x + cell.pad[0], y + cell.pad[1] + (cell.anchor === "ctr" ? free / 2 : cell.anchor === "b" ? free : 0));
    }
  }
}

const placeholder = (el: Element) => child(kids(el)[0], "nvPr", "ph");

function mainType(type: string): string {
  if (type === "title" || type === "ctrTitle") return "title";
  if (type === "dt" || type === "ftr" || type === "sldNum") return type;
  return "body";
}

function findPlaceholder(root: Element | null | undefined, type: string, idx: string | null): Element | null {
  const all = kids(child(root, "cSld", "spTree")).filter((e) => placeholder(e));
  const typeOf = (e: Element) => attr(placeholder(e), "type") ?? "obj";
  if (idx != null && mainType(type) !== "title") {
    const byIdx = all.find((e) => attr(placeholder(e), "idx") === idx && (mainType(typeOf(e)) === mainType(type) || typeOf(e) === type));
    if (byIdx) return byIdx;
  }
  return all.find((e) => typeOf(e) === type) ?? all.find((e) => mainType(typeOf(e)) === mainType(type)) ?? null;
}

/** Where text sits inside non-rectangular shapes. */
function textRect(name: string, w: number, h: number) {
  const inset = (x: number, y: number) => ({ x: w * x, y: h * y, w: w * (1 - 2 * x), h: h * (1 - 2 * y) });
  switch (name) {
    case "ellipse": case "flowChartConnector": case "donut": case "wedgeEllipseCallout": return inset(0.146, 0.146);
    case "diamond": case "flowChartDecision": return inset(0.25, 0.25);
    case "triangle": return { x: w * 0.25, y: h * 0.5, w: w * 0.5, h: h * 0.5 };
    case "rtTriangle": return { x: w * 0.08, y: h * 0.58, w: w * 0.5, h: h * 0.34 };
    case "roundRect": { const r = Math.min(w, h) * 0.0488; return { x: r, y: r, w: w - 2 * r, h: h - 2 * r }; }
    case "hexagon": case "octagon": case "parallelogram": return inset(0.12, 0.08);
    case "rightArrow": case "homePlate": return { x: 0, y: name === "rightArrow" ? h * 0.25 : 0, w: w * 0.9, h: name === "rightArrow" ? h * 0.5 : h };
    case "leftArrow": return { x: w * 0.1, y: h * 0.25, w: w * 0.9, h: h * 0.5 };
    case "chevron": { const d = Math.min(Math.min(w, h) * 0.5, w * 0.3); return { x: d, y: 0, w: w - 2 * d, h }; }
    case "star5": return inset(0.31, 0.38);
    case "can": case "flowChartMagneticDisk": return { x: 0, y: h * 0.25, w, h: h * 0.7 };
    case "cloud": case "cloudCallout": return inset(0.14, 0.2);
    default: return { x: 0, y: 0, w, h };
  }
}
