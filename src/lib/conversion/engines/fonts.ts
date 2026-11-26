import { asset } from "@/config/site";

/** Open fonts whose letter widths match common Office fonts. */
const families: Record<string, { file: string; css: string }> = {
  carlito: { file: "carlito", css: "Convertly Carlito" },
  tinos: { file: "tinos", css: "Convertly Tinos" },
  caladea: { file: "caladea", css: "Convertly Caladea" },
  cousine: { file: "cousine", css: "Convertly Cousine" },
  arimo: { file: "", css: "Convertly Sans" },
};

const ranges: Record<string, string> = {
  latin: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+2215",
  "latin-ext": "U+0100-0130, U+0132-0151, U+0154-02BA, U+1E00-1E9F, U+1EF2-1EFF, U+20A0-20AB, U+20AD-20C0",
  greek: "U+0370-03FF",
};

function match(name: string): keyof typeof families | null {
  const n = name.toLowerCase();
  if (/calibri|carlito|aptos|candara|corbel|segoe|gill sans/.test(n)) return "carlito";
  if (/cambria|caladea|constantia/.test(n)) return "caladea";
  if (/times|tinos|garamond|book antiqua|palatino|century|georgia|bodoni/.test(n)) return "tinos";
  if (/courier|consolas|mono|cousine/.test(n)) return "cousine";
  if (/arial|helvetica|liberation|tahoma|verdana|trebuchet/.test(n)) return "arimo";
  return null;
}

/** The author's font first if it's installed, then the closest match, then whatever covers the script. */
export function fontStack(name: string) {
  const clean = name.replace(/["\;]/g, "");
  const key = match(clean) ?? "arimo";
  const generic = key === "tinos" || key === "caladea" ? "serif" : key === "cousine" ? "monospace" : "sans-serif";
  return `"${clean}", "${families[key].css}", "Noto Sans", ${generic}`;
}

const loaded = new Set<string>();

/** Canvas doesn't wait for web fonts, so load what the deck uses before drawing. */
export async function loadFonts(names: Iterable<string>) {
  const keys = new Set<string>(["arimo"]);
  for (const n of names) { const k = match(n); if (k) keys.add(k); }
  const jobs: Promise<unknown>[] = [];
  for (const key of keys) {
    if (loaded.has(key)) continue;
    loaded.add(key);
    const { file, css } = families[key];
    for (const weight of [400, 700]) for (const style of ["normal", "italic"]) {
      const sources = file
        ? Object.entries(ranges).filter(([r]) => !(file === "caladea" && r === "greek")).map(([r, unicodeRange]) => ({ url: asset(`/vendor/fonts/${file}-${r}-${weight}-${style}.woff2`), unicodeRange }))
        : [{ url: asset(`/vendor/pdfjs/standard_fonts/LiberationSans-${weight === 700 ? (style === "italic" ? "BoldItalic" : "Bold") : style === "italic" ? "Italic" : "Regular"}.ttf`), unicodeRange: undefined }];
      for (const { url, unicodeRange } of sources) {
        const face = new FontFace(css, `url(${url})`, { weight: String(weight), style, unicodeRange });
        document.fonts.add(face);
        // A missing font only changes looks, so it never stops a conversion.
        jobs.push(face.load().catch(() => { loaded.delete(key); document.fonts.delete(face); }));
      }
    }
  }
  await Promise.all(jobs);
}

export type FontKey = keyof typeof families;
export const fontKey = (name: string): FontKey => match(name) ?? "arimo";

/**
 * Line metrics of the original Office fonts (ascent with line gap, descent) as fractions of the size.
 * Word's "single" spacing is their sum: 1.22 for Calibri, 1.15 for Times New Roman and Arial.
 */
const METRICS: Record<FontKey, { ascent: number; descent: number }> = {
  carlito: { ascent: 0.952, descent: 0.269 },
  caladea: { ascent: 0.95, descent: 0.222 },
  tinos: { ascent: 0.933, descent: 0.216 },
  cousine: { ascent: 0.833, descent: 0.3 },
  arimo: { ascent: 0.938, descent: 0.212 },
};
export const fontMetrics = (key: FontKey) => METRICS[key];

/**
 * A stack that measures with the bundled font first, so widths match the fonts embedded in PDFs.
 * Characters the bundled font lacks (Hindi, Arabic…) fall through to the document's or the system's font.
 */
export function measureStack(name: string, complexScriptFont = "") {
  const key = fontKey(name);
  const generic = key === "tinos" || key === "caladea" ? "serif" : key === "cousine" ? "monospace" : "sans-serif";
  const cs = complexScriptFont.replace(/["\;]/g, "");
  return `"${families[key].css}"${cs ? `, "${cs}"` : ""}, "Nirmala UI", "Noto Sans", "Kohinoor Devanagari", "Kohinoor Telugu", ${generic}`;
}

/** TrueType files a PDF can embed for this family and style, one per character range. */
export function pdfFontSources(key: FontKey, bold: boolean, italic: boolean): string[] {
  const weight = bold ? 700 : 400, style = italic ? "italic" : "normal";
  if (key === "arimo") return [asset(`/vendor/pdfjs/standard_fonts/LiberationSans-${bold ? (italic ? "BoldItalic" : "Bold") : italic ? "Italic" : "Regular"}.ttf`)];
  return Object.keys(ranges)
    .filter((r) => !(key === "caladea" && r === "greek"))
    .map((r) => asset(`/vendor/fonts-ttf/${families[key].file}-${r}-${weight}-${style}.ttf`));
}
