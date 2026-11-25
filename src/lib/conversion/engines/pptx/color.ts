import { kids, num } from "./xml";

export interface Rgba { r: number; g: number; b: number; a: number }
export interface Palette {
  /** Theme slots: dk1, lt1, accent1… as hex. */
  theme: Record<string, string>;
  /** The master's mapping, such as bg1 to lt1. */
  map: Record<string, string>;
}

export const css = (c: Rgba) => `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${c.a})`;
export const hex = (h: string): Rgba => ({
  r: parseInt(h.slice(0, 2), 16) || 0, g: parseInt(h.slice(2, 4), 16) || 0, b: parseInt(h.slice(4, 6), 16) || 0, a: 1,
});
export const BLACK = hex("000000");

const preset: Record<string, string> = {
  black: "000000", white: "FFFFFF", red: "FF0000", green: "008000", blue: "0000FF", yellow: "FFFF00", cyan: "00FFFF", magenta: "FF00FF",
  gray: "808080", grey: "808080", ltGray: "D3D3D3", lightGray: "D3D3D3", dkGray: "A9A9A9", darkGray: "A9A9A9", silver: "C0C0C0",
  orange: "FFA500", purple: "800080", brown: "A52A2A", pink: "FFC0CB", navy: "000080", teal: "008080", lime: "00FF00", maroon: "800000",
  olive: "808000", gold: "FFD700", indigo: "4B0082", violet: "EE82EE", coral: "FF7F50", crimson: "DC143C", tomato: "FF6347",
};

export function schemeColor(name: string, p: Palette): Rgba {
  const slot = p.map[name] ?? ({ bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2" } as Record<string, string>)[name] ?? name;
  return hex(p.theme[slot] ?? (slot.startsWith("lt") ? "FFFFFF" : "000000"));
}

const COLORS = new Set(["srgbClr", "schemeClr", "sysClr", "prstClr", "scrgbClr", "hslClr"]);

/** Accepts a colour element, or anything that directly holds one (solidFill, fontRef, gs…). */
export function readColor(el: Element | null | undefined, p: Palette, placeholder?: Rgba): Rgba | null {
  if (!el) return null;
  const c = COLORS.has(el.localName) ? el : kids(el).find((k) => COLORS.has(k.localName));
  if (!c) return null;
  const val = c.getAttribute("val") ?? "";
  let out: Rgba;
  switch (c.localName) {
    case "srgbClr": out = hex(val); break;
    case "schemeClr": out = val === "phClr" ? { ...(placeholder ?? BLACK) } : schemeColor(val, p); break;
    case "sysClr": out = hex(c.getAttribute("lastClr") ?? (val === "window" ? "FFFFFF" : "000000")); break;
    case "scrgbClr": out = { r: toSrgb((num(c, "r") ?? 0) / 1e5), g: toSrgb((num(c, "g") ?? 0) / 1e5), b: toSrgb((num(c, "b") ?? 0) / 1e5), a: 1 }; break;
    case "hslClr": out = fromHsl((num(c, "hue") ?? 0) / 21600000, (num(c, "sat") ?? 0) / 1e5, (num(c, "lum") ?? 0) / 1e5, 1); break;
    default: out = hex(preset[val] ?? "808080");
  }
  for (const t of kids(c)) out = transform(out, t.localName, (num(t, "val") ?? 1e5) / 1e5);
  return out;
}

function transform(c: Rgba, op: string, v: number): Rgba {
  switch (op) {
    case "alpha": return { ...c, a: v };
    case "alphaMod": return { ...c, a: c.a * v };
    case "shade": return linear(c, (x) => x * v);
    case "tint": return linear(c, (x) => x * v + (1 - v));
    case "gray": { const y = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b; return { r: y, g: y, b: y, a: c.a }; }
    case "inv": return { r: 255 - c.r, g: 255 - c.g, b: 255 - c.b, a: c.a };
  }
  if (!/^(lum|sat|hue)(Mod|Off)?$/.test(op)) return c;
  let [h, s, l] = toHsl(c);
  if (op === "lum") l = v;
  if (op === "lumMod") l *= v;
  if (op === "lumOff") l += v;
  if (op === "sat") s = v;
  if (op === "satMod") s *= v;
  if (op === "satOff") s += v;
  if (op === "hueMod") h *= v;
  if (op === "hueOff") h += (v * 1e5) / 21600000;
  return fromHsl(((h % 1) + 1) % 1, clamp(s), clamp(l), c.a);
}

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const toLinear = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const toSrgb = (x: number) => { const v = clamp(x); return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055); };
const linear = (c: Rgba, f: (x: number) => number): Rgba => ({ r: toSrgb(f(toLinear(c.r))), g: toSrgb(f(toLinear(c.g))), b: toSrgb(f(toLinear(c.b))), a: c.a });

function toHsl({ r, g, b }: Rgba): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl(h: number, s: number, l: number, a: number): Rgba {
  const f = (n: number) => { const k = (n + h * 12) % 12; return 255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
  return { r: f(0), g: f(8), b: f(4), a };
}
