import { attr, child, findAll, kids, num } from "./xml";

export interface Shape {
  path: Path2D;
  /** Open shapes (lines) take a stroke but no fill. */
  open?: boolean;
  /** Inner edges that are drawn but never filled, such as a cube's corners. */
  detail?: Path2D;
  /** Freeforms can have holes; presets are drawn so overlaps stay filled. */
  evenOdd?: boolean;
  /** For arrowheads: start and end points with the direction they face. */
  ends?: { start: [number, number, number]; end: [number, number, number] };
}

type Adj = (name: string, fallback: number) => number;

/** Adjust values arrive as fractions of 100000. */
function adjustments(geom: Element | null): Adj {
  const values: Record<string, number> = {};
  for (const gd of kids(child(geom, "avLst"), "gd")) {
    const m = /^val\s+(-?[\d.]+)/.exec(attr(gd, "fmla") ?? "");
    if (m) values[attr(gd, "name") ?? ""] = Number(m[1]);
  }
  return (name, fallback) => (values[name] ?? fallback) / 100000;
}

const poly = (pts: [number, number][]) => {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
};

function regular(n: number, w: number, h: number, start = -Math.PI / 2) {
  return poly(Array.from({ length: n }, (_, i) => {
    const a = start + (i * 2 * Math.PI) / n;
    return [w / 2 + (w / 2) * Math.cos(a), h / 2 + (h / 2) * Math.sin(a)];
  }));
}
function star(n: number, w: number, h: number, inner: number) {
  return poly(Array.from({ length: n * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const k = i % 2 ? inner : 1;
    return [w / 2 + (w / 2) * k * Math.cos(a), h / 2 + (h / 2) * k * Math.sin(a)];
  }));
}
function rounded(w: number, h: number, [tl, tr, br, bl]: number[]) {
  const p = new Path2D();
  p.roundRect(0, 0, w, h, [tl, tr, br, bl].map((r) => Math.max(0, r)));
  return p;
}
const rectPath = (w: number, h: number) => { const p = new Path2D(); p.rect(0, 0, w, h); return p; };

export function presetShape(name: string, geom: Element | null, w: number, h: number): Shape {
  const adj = adjustments(geom);
  const s = Math.min(w, h);
  const closed = (path: Path2D): Shape => ({ path });
  const line = (pts: [number, number][]): Shape => {
    const path = new Path2D();
    pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
    const [a, b] = pts;
    const [y, z] = pts.slice(-2);
    return { path, open: true, ends: { start: [...a, Math.atan2(a[1] - b[1], a[0] - b[0])], end: [...z, Math.atan2(z[1] - y[1], z[0] - y[0])] } };
  };

  switch (name) {
    case "line": case "straightConnector1": return line([[0, 0], [w, h]]);
    case "bentConnector2": return line([[0, 0], [w, 0], [w, h]]);
    case "bentConnector3": { const x = w * adj("adj1", 50000); return line([[0, 0], [x, 0], [x, h], [w, h]]); }
    case "bentConnector4": { const x = w * adj("adj1", 50000), y = h * adj("adj2", 50000); return line([[0, 0], [x, 0], [x, y], [w, y], [w, h]]); }
    case "curvedConnector2": case "curvedConnector3": case "curvedConnector4": {
      const path = new Path2D();
      path.moveTo(0, 0);
      path.bezierCurveTo(w / 2, 0, w / 2, h, w, h);
      return { path, open: true, ends: { start: [0, 0, Math.PI], end: [w, h, 0] } };
    }
    case "ellipse": case "flowChartConnector": { const p = new Path2D(); p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI); return closed(p); }
    case "roundRect": case "flowChartAlternateProcess": { const r = s * Math.min(0.5, adj("adj", 16667)); return closed(rounded(w, h, [r, r, r, r])); }
    case "flowChartTerminator": { const r = s / 2; return closed(rounded(w, h, [r, r, r, r])); }
    case "round1Rect": { const r = s * adj("adj", 16667); return closed(rounded(w, h, [0, r, 0, 0])); }
    case "round2SameRect": { const a = s * adj("adj1", 16667), b = s * adj("adj2", 0); return closed(rounded(w, h, [a, a, b, b])); }
    case "round2DiagRect": { const a = s * adj("adj1", 16667), b = s * adj("adj2", 0); return closed(rounded(w, h, [a, b, a, b])); }
    case "snip1Rect": { const c = s * adj("adj", 16667); return closed(poly([[0, 0], [w - c, 0], [w, c], [w, h], [0, h]])); }
    case "snip2SameRect": { const c = s * adj("adj1", 16667); return closed(poly([[c, 0], [w - c, 0], [w, c], [w, h], [0, h], [0, c]])); }
    case "snip2DiagRect": { const c = s * adj("adj2", 16667); return closed(poly([[0, 0], [w - c, 0], [w, c], [w, h], [c, h], [0, h - c]])); }
    case "triangle": case "flowChartExtract": { const x = w * adj("adj", 50000); return closed(poly([[x, 0], [w, h], [0, h]])); }
    case "flowChartMerge": return closed(poly([[0, 0], [w, 0], [w / 2, h]]));
    case "rtTriangle": return closed(poly([[0, 0], [w, h], [0, h]]));
    case "diamond": case "flowChartDecision": return closed(poly([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]));
    case "parallelogram": case "flowChartInputOutput": { const x = name === "parallelogram" ? s * adj("adj", 25000) : w / 5; return closed(poly([[x, 0], [w, 0], [w - x, h], [0, h]])); }
    case "trapezoid": { const x = s * adj("adj", 25000); return closed(poly([[x, 0], [w - x, 0], [w, h], [0, h]])); }
    case "flowChartManualOperation": return closed(poly([[0, 0], [w, 0], [w * 0.8, h], [w * 0.2, h]]));
    case "hexagon": case "flowChartPreparation": { const x = name === "hexagon" ? s * adj("adj", 25000) : w / 5; return closed(poly([[x, 0], [w - x, 0], [w, h / 2], [w - x, h], [x, h], [0, h / 2]])); }
    case "octagon": { const c = s * adj("adj", 29289); return closed(poly([[c, 0], [w - c, 0], [w, c], [w, h - c], [w - c, h], [c, h], [0, h - c], [0, c]])); }
    case "pentagon": return closed(regular(5, w, h));
    case "heptagon": return closed(regular(7, w, h));
    case "decagon": return closed(regular(10, w, h, 0));
    case "dodecagon": return closed(regular(12, w, h));
    case "star4": return closed(star(4, w, h, adj("adj", 12500) * 2));
    case "star5": return closed(star(5, w, h, adj("adj", 19098) * 2));
    case "star6": return closed(star(6, w, h, adj("adj", 28868) * 2));
    case "star8": return closed(star(8, w, h, adj("adj", 37500) * 2));
    case "star10": case "star12": case "star16": case "star24": case "star32":
      return closed(star(Number(name.slice(4)), w, h, adj("adj", 37500) * 2));
    case "irregularSeal1": case "irregularSeal2": return closed(star(12, w, h, 0.65));
    case "plus": case "mathPlus": {
      if (name === "mathPlus") {
        const t = (s * adj("adj1", 23520)) / 2, r = s * 0.37, cx = w / 2, cy = h / 2;
        return closed(poly([[cx - t, cy - r], [cx + t, cy - r], [cx + t, cy - t], [cx + r, cy - t], [cx + r, cy + t], [cx + t, cy + t], [cx + t, cy + r], [cx - t, cy + r], [cx - t, cy + t], [cx - r, cy + t], [cx - r, cy - t], [cx - t, cy - t]]));
      }
      const c = s * adj("adj", 25000);
      return closed(poly([[c, 0], [w - c, 0], [w - c, c], [w, c], [w, h - c], [w - c, h - c], [w - c, h], [c, h], [c, h - c], [0, h - c], [0, c], [c, c]]));
    }
    case "mathMinus": { const t = (h * adj("adj1", 23520)) / 2, x = w * 0.13; return closed(poly([[x, h / 2 - t], [w - x, h / 2 - t], [w - x, h / 2 + t], [x, h / 2 + t]])); }
    case "mathEqual": {
      const t = h * 0.2352, g = h * 0.0588, x = w * 0.13, p = rectPath(0, 0);
      p.rect(x, h / 2 - g - t, w - 2 * x, t); p.rect(x, h / 2 + g, w - 2 * x, t);
      return closed(p);
    }
    case "rightArrow": case "notchedRightArrow": { const t = (h * (1 - adj("adj1", 50000))) / 2, x = w - s * adj("adj2", 50000); return closed(poly([[0, t], [x, t], [x, 0], [w, h / 2], [x, h], [x, h - t], [0, h - t], ...(name === "notchedRightArrow" ? [[(h - 2 * t) / 2 * ((w - x) / (h / 2)), h / 2] as [number, number]] : [])])); }
    case "leftArrow": { const t = (h * (1 - adj("adj1", 50000))) / 2, x = s * adj("adj2", 50000); return closed(poly([[w, t], [x, t], [x, 0], [0, h / 2], [x, h], [x, h - t], [w, h - t]])); }
    case "upArrow": { const t = (w * (1 - adj("adj1", 50000))) / 2, y = s * adj("adj2", 50000); return closed(poly([[t, h], [t, y], [0, y], [w / 2, 0], [w, y], [w - t, y], [w - t, h]])); }
    case "downArrow": { const t = (w * (1 - adj("adj1", 50000))) / 2, y = h - s * adj("adj2", 50000); return closed(poly([[t, 0], [t, y], [0, y], [w / 2, h], [w, y], [w - t, y], [w - t, 0]])); }
    case "leftRightArrow": { const t = (h * (1 - adj("adj1", 50000))) / 2, x = s * adj("adj2", 50000); return closed(poly([[0, h / 2], [x, 0], [x, t], [w - x, t], [w - x, 0], [w, h / 2], [w - x, h], [w - x, h - t], [x, h - t], [x, h]])); }
    case "upDownArrow": { const t = (w * (1 - adj("adj1", 50000))) / 2, y = s * adj("adj2", 50000); return closed(poly([[w / 2, 0], [w, y], [w - t, y], [w - t, h - y], [w, h - y], [w / 2, h], [0, h - y], [t, h - y], [t, y], [0, y]])); }
    case "homePlate": { const x = w - s * adj("adj", 50000); return closed(poly([[0, 0], [x, 0], [w, h / 2], [x, h], [0, h]])); }
    case "chevron": { const d = s * adj("adj", 50000); return closed(poly([[0, 0], [w - d, 0], [w, h / 2], [w - d, h], [0, h], [d, h / 2]])); }
    case "wedgeRectCallout": case "wedgeRoundRectCallout": {
      const [tx, ty] = [w / 2 + w * adj("adj1", -20833), h / 2 + h * adj("adj2", 62500)];
      const r = name === "wedgeRectCallout" ? 0 : s * adj("adj3", 16667);
      const p = new Path2D();
      const vertical = Math.abs((ty - h / 2) / h) >= Math.abs((tx - w / 2) / w);
      // The tail leaves from the half of the edge nearest the tip.
      const nearX = tx < w / 2 ? w * 0.17 : w * 0.58, nearY = ty < h / 2 ? h * 0.17 : h * 0.58;
      const tail = (a: [number, number], b: [number, number]) => { p.lineTo(...a); p.lineTo(tx, ty); p.lineTo(...b); };
      p.moveTo(r, 0);
      if (vertical && ty < 0) tail([nearX, 0], [nearX + w * 0.25, 0]);
      p.lineTo(w - r, 0); p.arcTo(w, 0, w, r, r);
      if (!vertical && tx > w) tail([w, nearY], [w, nearY + h * 0.25]);
      p.lineTo(w, h - r); p.arcTo(w, h, w - r, h, r);
      if (vertical && ty > h) tail([nearX + w * 0.25, h], [nearX, h]);
      p.lineTo(r, h); p.arcTo(0, h, 0, h - r, r);
      if (!vertical && tx < 0) tail([0, nearY + h * 0.25], [0, nearY]);
      p.lineTo(0, r); p.arcTo(0, 0, r, 0, r);
      p.closePath();
      return closed(p);
    }
    case "wedgeEllipseCallout": {
      const [dx, dy] = [w * adj("adj1", -20833), h * adj("adj2", 62500)];
      const a = Math.atan2(dy / h, dx / w), p = new Path2D();
      p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, a + 0.2, a - 0.2 + 2 * Math.PI);
      p.lineTo(w / 2 + dx, h / 2 + dy);
      p.closePath();
      return closed(p);
    }
    case "donut": {
      const d = s * adj("adj", 25000), p = new Path2D();
      p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
      p.moveTo(w - d, h / 2);
      p.ellipse(w / 2, h / 2, Math.max(0, w / 2 - d), Math.max(0, h / 2 - d), 0, 0, -2 * Math.PI, true);
      return closed(p);
    }
    case "frame": {
      const d = s * adj("adj1", 12500), p = rectPath(w, h);
      p.moveTo(d, d); p.lineTo(d, h - d); p.lineTo(w - d, h - d); p.lineTo(w - d, d); p.closePath();
      return closed(p);
    }
    case "pie": case "chord": case "arc": case "blockArc": {
      // Angles use the same 60000ths, stored unscaled, so undo the fraction.
      const a = (adj("adj1", name === "arc" ? 16200000 : 0) * 100000 / 60000) * Math.PI / 180;
      const b = (adj("adj2", name === "arc" ? 0 : 16200000) * 100000 / 60000) * Math.PI / 180;
      const p = new Path2D();
      if (name === "blockArc") {
        const t = s * adj("adj3", 25000), start = (adj("adj1", 10800000) * 100000 / 60000) * Math.PI / 180, end = (adj("adj2", 0) * 100000 / 60000) * Math.PI / 180;
        p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, start, end);
        p.ellipse(w / 2, h / 2, Math.max(0, w / 2 - t), Math.max(0, h / 2 - t), 0, end, start, true);
        p.closePath();
        return closed(p);
      }
      if (name === "pie") p.moveTo(w / 2, h / 2);
      p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, a, b);
      if (name !== "arc") p.closePath();
      return { path: p, open: name === "arc" };
    }
    case "can": case "flowChartMagneticDisk": {
      const r = name === "can" ? (s * adj("adj", 25000)) / 2 : h / 6, p = new Path2D();
      p.moveTo(0, r); p.ellipse(w / 2, r, w / 2, r, 0, Math.PI, 2 * Math.PI);
      p.lineTo(w, h - r); p.ellipse(w / 2, h - r, w / 2, r, 0, 0, Math.PI); p.closePath();
      p.moveTo(w, r); p.ellipse(w / 2, r, w / 2, r, 0, 0, Math.PI);
      return closed(p);
    }
    case "cube": {
      const d = s * adj("adj", 25000), p = new Path2D();
      p.moveTo(0, d); p.lineTo(w - d, d); p.lineTo(w, 0); p.moveTo(w - d, d); p.lineTo(w - d, h);
      return { path: poly([[0, d], [d, 0], [w, 0], [w, h - d], [w - d, h], [0, h]]), detail: p };
    }
    case "heart": {
      const p = new Path2D();
      p.moveTo(w / 2, h / 4);
      p.bezierCurveTo(w * 0.71, -h * 0.33, w * 1.51, h / 4, w / 2, h);
      p.bezierCurveTo(-w * 0.51, h / 4, w * 0.29, -h * 0.33, w / 2, h / 4);
      return closed(p);
    }
    case "teardrop": { const p = new Path2D(); p.moveTo(0, h / 2); p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, Math.PI, 0, true); p.lineTo(w, 0); p.lineTo(w / 2, 0); p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, -Math.PI / 2, Math.PI, true); p.closePath(); return closed(p); }
    case "cloud": case "cloudCallout": {
      // Bumps of slightly uneven size around an ellipse.
      const p = new Path2D(), n = 11;
      const at = (i: number): [number, number] => {
        const a = -Math.PI * 0.8 + ((i + (i % 2 ? 0.16 : 0)) * 2 * Math.PI) / n;
        return [w / 2 + w * 0.42 * Math.cos(a), h / 2 + h * 0.41 * Math.sin(a)];
      };
      p.moveTo(...at(0));
      for (let i = 0; i < n; i++) {
        const [x1, y1] = at(i), [x2, y2] = at((i + 1) % n);
        const out = ([x, y]: [number, number]): [number, number] => [x + (x - w / 2) * 0.36, y + (y - h / 2) * 0.36];
        const [c1, c2] = [out([x1 * 0.85 + x2 * 0.15, y1 * 0.85 + y2 * 0.15]), out([x1 * 0.15 + x2 * 0.85, y1 * 0.15 + y2 * 0.85])];
        p.bezierCurveTo(...c1, ...c2, x2, y2);
      }
      p.closePath();
      if (name === "cloudCallout") {
        const [tx, ty] = [w / 2 + w * adj("adj1", -20833), h / 2 + h * adj("adj2", 62500)];
        for (const [k, r] of [[0.75, 0.05], [0.9, 0.035], [1, 0.022]]) {
          const [x, y] = [w / 2 + (tx - w / 2) * k, h / 2 + (ty - h / 2) * k];
          p.moveTo(x + s * r, y); p.arc(x, y, s * r, 0, 2 * Math.PI);
        }
      }
      return closed(p);
    }
    case "flowChartDocument": { const p = new Path2D(); p.moveTo(0, 0); p.lineTo(w, 0); p.lineTo(w, h * 0.8); p.bezierCurveTo(w / 2, h * 0.8, w / 2, h * 1.1, 0, h * 0.93); p.closePath(); return closed(p); }
    case "flowChartPredefinedProcess": { const p = new Path2D(); p.moveTo(w / 8, 0); p.lineTo(w / 8, h); p.moveTo(w * 7 / 8, 0); p.lineTo(w * 7 / 8, h); return { path: rectPath(w, h), detail: p }; }
    case "leftBracket": { const r = Math.min(s * adj("adj", 8333), h / 2), p = new Path2D(); p.moveTo(w, 0); p.quadraticCurveTo(0, 0, 0, r); p.lineTo(0, h - r); p.quadraticCurveTo(0, h, w, h); return { path: p, open: true }; }
    case "rightBracket": { const r = Math.min(s * adj("adj", 8333), h / 2), p = new Path2D(); p.moveTo(0, 0); p.quadraticCurveTo(w, 0, w, r); p.lineTo(w, h - r); p.quadraticCurveTo(w, h, 0, h); return { path: p, open: true }; }
    case "leftBrace": case "rightBrace": {
      const r = Math.min(s * adj("adj1", 8333), h / 4), m = h * adj("adj2", 50000), p = new Path2D();
      const X = (x: number) => (name === "leftBrace" ? w - x : x);
      p.moveTo(X(0), 0); p.quadraticCurveTo(X(w / 2), 0, X(w / 2), r); p.lineTo(X(w / 2), m - r); p.quadraticCurveTo(X(w / 2), m, X(w), m);
      p.quadraticCurveTo(X(w / 2), m, X(w / 2), m + r); p.lineTo(X(w / 2), h - r); p.quadraticCurveTo(X(w / 2), h, X(0), h);
      return { path: p, open: true };
    }
    default: return closed(rectPath(w, h));
  }
}

/** Freeform shapes: paths whose numbers can be formulas over named guides. */
export function customShape(geom: Element, w: number, h: number): Shape {
  const path = new Path2D();
  let open = true;
  const emuW = w * 12700, emuH = h * 12700;
  const guides = evaluateGuides(geom, emuW, emuH);
  for (const p of findAll(child(geom, "pathLst"), "path")) {
    const sx = w / (num(p, "w") || emuW || 1);
    const sy = h / (num(p, "h") || emuH || 1);
    const val = (s: string | null) => (s == null ? 0 : guides[s] ?? (Number(s) || 0));
    const points = (el: Element) => kids(el, "pt").map((q): [number, number] => [val(attr(q, "x")) * sx, val(attr(q, "y")) * sy]);
    let cur: [number, number] = [0, 0];
    for (const cmd of kids(p)) {
      const q = points(cmd);
      switch (cmd.localName) {
        case "moveTo": if (q[0]) path.moveTo(...(cur = q[0])); break;
        case "lnTo": if (q[0]) path.lineTo(...(cur = q[0])); break;
        case "cubicBezTo": if (q[2]) { path.bezierCurveTo(...q[0], ...q[1], ...q[2]); cur = q[2]; } break;
        case "quadBezTo": if (q[1]) { path.quadraticCurveTo(...q[0], ...q[1]); cur = q[1]; } break;
        case "arcTo": {
          const rx = Math.abs(val(attr(cmd, "wR")) * sx), ry = Math.abs(val(attr(cmd, "hR")) * sy);
          const st = ((val(attr(cmd, "stAng")) / 60000) * Math.PI) / 180, sw = ((val(attr(cmd, "swAng")) / 60000) * Math.PI) / 180;
          const cx = cur[0] - rx * Math.cos(st), cy = cur[1] - ry * Math.sin(st);
          path.ellipse(cx, cy, rx, ry, 0, st, st + sw, sw < 0);
          cur = [cx + rx * Math.cos(st + sw), cy + ry * Math.sin(st + sw)];
          break;
        }
        case "close": path.closePath(); open = false; break;
      }
    }
    // Filled freeforms don't always end with a close command.
    if (attr(p, "fill") !== "none") open = false;
  }
  return { path, open, evenOdd: true };
}

function evaluateGuides(geom: Element, w: number, h: number) {
  const s = Math.min(w, h);
  const g: Record<string, number> = {
    w, h, l: 0, t: 0, r: w, b: h, hc: w / 2, vc: h / 2, ss: s, ls: Math.max(w, h),
    cd2: 10800000, cd4: 5400000, cd8: 2700000, "3cd4": 16200000, "3cd8": 8100000, "5cd8": 13500000, "7cd8": 18900000,
  };
  for (const n of [2, 3, 4, 5, 6, 8, 10, 12, 16, 32]) { g[`wd${n}`] = w / n; g[`hd${n}`] = h / n; g[`ssd${n}`] = s / n; }
  const ang = (x: number) => ((x / 60000) * Math.PI) / 180;
  const back = (x: number) => ((x * 180) / Math.PI) * 60000;
  for (const gd of [...kids(child(geom, "avLst"), "gd"), ...kids(child(geom, "gdLst"), "gd")]) {
    const [op, ...rest] = (attr(gd, "fmla") ?? "").trim().split(/\s+/);
    const [x = 0, y = 0, z = 0] = rest.map((v) => g[v] ?? (Number(v) || 0));
    const ops: Record<string, () => number> = {
      val: () => x, "*/": () => (z ? (x * y) / z : 0), "+-": () => x + y - z, "+/": () => (z ? (x + y) / z : 0),
      "?:": () => (x > 0 ? y : z), abs: () => Math.abs(x), at2: () => back(Math.atan2(y, x)),
      cat2: () => x * Math.cos(Math.atan2(z, y)), sat2: () => x * Math.sin(Math.atan2(z, y)),
      cos: () => x * Math.cos(ang(y)), sin: () => x * Math.sin(ang(y)), tan: () => x * Math.tan(ang(y)),
      max: () => Math.max(x, y), min: () => Math.min(x, y), mod: () => Math.hypot(x, y, z), pin: () => Math.min(Math.max(x, y), z), sqrt: () => Math.sqrt(Math.max(0, x)),
    };
    g[attr(gd, "name") ?? ""] = ops[op]?.() ?? 0;
  }
  return g;
}
