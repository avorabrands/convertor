import { readColor, type Palette, type Rgba } from "./color";
import type { Package } from "./package";
import { attr, child, findAll, flag, kids, num, pt } from "./xml";

interface Border { color: Rgba; width: number }
export interface CellLook { fill: Rgba | null; color: Rgba | null; bold: boolean; borders: { left: Border | null; right: Border | null; top: Border | null; bottom: Border | null } }

/** "Medium Style 2" is PowerPoint's default, and files often refer to it without including it. */
const MEDIUM_2: Record<string, string> = {
  "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}": "accent1", "{21E4AEA4-8DFA-4A89-87EB-49C32662AFE0}": "accent2", "{F5AB1C69-6EDB-4FF4-983F-18BD219EF322}": "accent3",
  "{00A15C55-8517-42AA-B614-E9B94910E393}": "accent4", "{7DF18680-E054-41AD-8BC1-D1AEF772440D}": "accent5", "{93296810-A885-4BE3-A3E7-6D5BEEA58F35}": "accent6",
  "{073A0DAA-6AF3-43AB-8588-CEC1D06C72B9}": "dk1",
};
const GRID = "{5940675A-B579-460E-94D1-54222C63F5DA}";

const line = (side: string, clr: string, w: number) => `<${side}><ln w="${w}"><solidFill><schemeClr val="${clr}"/></solidFill></ln></${side}>`;
function builtIn(id: string): Element | null {
  const accent = MEDIUM_2[id];
  let xml = "";
  if (accent) {
    const borders = ["left", "right", "top", "bottom", "insideH", "insideV"].map((s) => line(s, "lt1", 12700)).join("");
    const fill = (tint?: number) => `<fill><solidFill><schemeClr val="${accent}">${tint ? `<tint val="${tint}"/>` : ""}</schemeClr></solidFill></fill>`;
    const strong = (extra = "") => `<tcTxStyle b="on"><schemeClr val="lt1"/></tcTxStyle><tcStyle><tcBdr>${extra}</tcBdr>${fill()}</tcStyle>`;
    xml = `<s><wholeTbl><tcTxStyle><schemeClr val="dk1"/></tcTxStyle><tcStyle><tcBdr>${borders}</tcBdr>${fill(20000)}</tcStyle></wholeTbl>
      <band1H><tcStyle>${fill(40000)}</tcStyle></band1H><band1V><tcStyle>${fill(40000)}</tcStyle></band1V>
      <lastCol>${strong()}</lastCol><firstCol>${strong()}</firstCol>
      <lastRow>${strong(line("top", "lt1", 38100))}</lastRow><firstRow>${strong(line("bottom", "lt1", 38100))}</firstRow></s>`;
  } else if (id === GRID) {
    xml = `<s><wholeTbl><tcStyle><tcBdr>${["left", "right", "top", "bottom", "insideH", "insideV"].map((s) => line(s, "tx1", 12700)).join("")}</tcBdr></tcStyle></wholeTbl></s>`;
  }
  return xml ? new DOMParser().parseFromString(xml, "application/xml").documentElement : null;
}

/** Returns a lookup for how each cell should look before its own formatting. */
export function tableStyle(tbl: Element, pkg: Package, palette: Palette) {
  const pr = child(tbl, "tblPr");
  const id = child(pr, "tableStyleId")?.textContent?.trim() ?? "";
  const style = findAll(pkg.xml("ppt/tableStyles.xml"), "tblStyle").find((s) => attr(s, "styleId") === id) ?? builtIn(id);
  const on = (k: string) => flag(pr, k) === true;

  return (r: number, c: number, rows: number, cols: number): CellLook => {
    const look: CellLook = { fill: null, color: null, bold: false, borders: { left: null, right: null, top: null, bottom: null } };
    if (!style) return look;
    const header = on("firstRow") && r === 0, footer = on("lastRow") && r === rows - 1;
    const first = on("firstCol") && c === 0, last = on("lastCol") && c === cols - 1;
    const row = r - (on("firstRow") ? 1 : 0), col = c - (on("firstCol") ? 1 : 0);
    const parts: { name: string; edge: { l: boolean; r: boolean; t: boolean; b: boolean } }[] = [];
    const whole = { l: c === 0, r: c === cols - 1, t: r === 0, b: r === rows - 1 };
    parts.push({ name: "wholeTbl", edge: whole });
    if (on("bandCol") && !header && !footer && !first && !last) parts.push({ name: col % 2 ? "band2V" : "band1V", edge: { l: true, r: true, t: r === 0, b: r === rows - 1 } });
    if (on("bandRow") && !header && !footer) parts.push({ name: row % 2 ? "band2H" : "band1H", edge: { l: c === 0, r: c === cols - 1, t: true, b: true } });
    if (last) parts.push({ name: "lastCol", edge: { l: true, r: true, t: r === 0, b: r === rows - 1 } });
    if (first) parts.push({ name: "firstCol", edge: { l: true, r: true, t: r === 0, b: r === rows - 1 } });
    if (footer) parts.push({ name: "lastRow", edge: { l: c === 0, r: c === cols - 1, t: true, b: true } });
    if (header) parts.push({ name: "firstRow", edge: { l: c === 0, r: c === cols - 1, t: true, b: true } });

    for (const { name, edge } of parts) {
      const part = child(style, name);
      if (!part) continue;
      const text = child(part, "tcTxStyle");
      if (text) {
        look.color = readColor(text, palette) ?? readColor(child(text, "fontRef"), palette) ?? look.color;
        if (attr(text, "b") === "on") look.bold = true;
      }
      const tc = child(part, "tcStyle");
      const fill = child(tc, "fill");
      if (fill) look.fill = child(fill, "noFill") ? null : readColor(child(fill, "solidFill"), palette) ?? look.fill;
      const ref = child(tc, "fillRef");
      if (ref && (num(ref, "idx") ?? 0) > 0) look.fill = readColor(ref, palette) ?? look.fill;
      const bdr = child(tc, "tcBdr");
      const border = (n: string): Border | null | undefined => {
        const el = child(bdr, n);
        if (!el) return undefined;
        const ln = child(el, "ln");
        if (!ln) { const lr = child(el, "lnRef"); const clr = lr && (num(lr, "idx") ?? 0) > 0 ? readColor(lr, palette) : null; return clr ? { color: clr, width: 0.75 } : null; }
        if (child(ln, "noFill")) return null;
        const color = readColor(child(ln, "solidFill"), palette) ?? readColor(kids(ln)[0], palette);
        return color ? { color, width: Math.max(0.5, pt(num(ln, "w") ?? 12700)) } : null;
      };
      const set = (side: keyof CellLook["borders"], outer: boolean, outerName: string, innerName: string) => {
        const v = border(outer ? outerName : innerName);
        if (v !== undefined) look.borders[side] = v;
      };
      set("left", edge.l, "left", "insideV");
      set("right", edge.r, "right", "insideV");
      set("top", edge.t, "top", "insideH");
      set("bottom", edge.b, "bottom", "insideH");
    }
    return look;
  };
}
