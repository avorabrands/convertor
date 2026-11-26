/** A Word document reduced to what layout needs. All lengths are in points. */

export interface Border { width: number; color: string; space: number }

export interface RunStyle {
  font: string;
  /** Font for complex scripts such as Hindi or Arabic. */
  csFont: string;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: string;
  highlight: string | null;
  shading: string | null;
  vertAlign: "baseline" | "superscript" | "subscript";
  caps: boolean;
  spacing: number;
  hidden: boolean;
  link: string | null;
}

export interface TabStop { pos: number; align: "left" | "center" | "right" | "decimal" | "clear"; leader: string }

export interface ParaStyle {
  styleId: string;
  align: "left" | "center" | "right" | "both";
  left: number;
  right: number;
  /** Positive indents the first line, negative hangs it. */
  firstLine: number;
  before: number;
  after: number;
  line: number;
  lineRule: "auto" | "exact" | "atLeast";
  keepNext: boolean;
  keepLines: boolean;
  pageBreakBefore: boolean;
  contextual: boolean;
  widow: boolean;
  shading: string | null;
  borders: { top?: Border; bottom?: Border; left?: Border; right?: Border };
  tabs: TabStop[];
  bidi: boolean;
}

export interface ImageSrc { part: string; path: string; crop?: { l: number; t: number; r: number; b: number } }

export interface ChartSrc { part: string; path: string }

/** A drawing that floats over the page instead of sitting in a line of text. */
export interface Float {
  w: number;
  h: number;
  /** Horizontal position: an offset from the reference edge, or an alignment within it. */
  x: { from: "page" | "margin" | "column"; offset?: number; align?: "left" | "center" | "right" };
  y: { from: "page" | "margin" | "paragraph"; offset?: number; align?: "top" | "center" | "bottom" };
  /** Square and top-and-bottom wrapping push text aside; drawn here as a block in the text. */
  inFlow: boolean;
  content: FloatContent;
}

export type FloatContent =
  | { kind: "image"; src: ImageSrc }
  | { kind: "chart"; src: ChartSrc }
  | { kind: "shape"; fill: string | null; line: Border | null; radius: number; ellipse: boolean; blocks: Block[]; inset: { l: number; t: number; r: number; b: number }; anchor: "t" | "ctr" | "b" }
  | { kind: "missing"; label: string };

export type Inline =
  | { t: "text"; text: string; style: RunStyle }
  | { t: "tab"; style: RunStyle }
  | { t: "br"; kind: "line" | "page" | "column"; style: RunStyle }
  | { t: "image"; src: ImageSrc | null; chart?: ChartSrc; w: number; h: number; style: RunStyle }
  | { t: "field"; field: "PAGE" | "NUMPAGES" | "SECTIONPAGES"; style: RunStyle }
  | { t: "note"; id: string; kind: "footnote" | "endnote"; style: RunStyle }
  /** The number inside a footnote that matches its reference. */
  | { t: "noteMark"; style: RunStyle }
  | { t: "float"; float: Float };

export interface Para {
  t: "p";
  style: ParaStyle;
  inlines: Inline[];
  /** List number or bullet, already formatted. */
  num: { text: string; style: RunStyle; suffix: "tab" | "space" | "nothing" } | null;
  /** Style of the paragraph mark, which sets the height of an empty paragraph. */
  mark: RunStyle;
}

export interface CellBorders { top?: Border | null; bottom?: Border | null; left?: Border | null; right?: Border | null }

export interface Cell {
  blocks: Block[];
  col: number;
  span: number;
  vMerge: "restart" | "continue" | null;
  shading: string | null;
  borders: CellBorders;
  vAlign: "top" | "center" | "bottom";
  margin: { l: number; r: number; t: number; b: number };
  width: number | null;
}

export interface Row { cells: Cell[]; height: number; exact: boolean; header: boolean; cantSplit: boolean }

export interface Table {
  t: "tbl";
  grid: number[];
  rows: Row[];
  width: { value: number; pct: boolean } | null;
  align: "left" | "center" | "right";
  indent: number;
}

export type Block = Para | Table;

export interface PageSetup {
  w: number;
  h: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  header: number;
  footer: number;
  headers: { default?: Block[]; first?: Block[]; even?: Block[] };
  footers: { default?: Block[]; first?: Block[]; even?: Block[] };
  titlePg: boolean;
  startNumber: number | null;
  continuous: boolean;
  columns: number;
}

export interface Section { blocks: Block[]; page: PageSetup }

export interface Doc {
  sections: Section[];
  footnotes: Map<string, Block[]>;
  endnotes: Map<string, Block[]>;
  evenAndOdd: boolean;
  defaultTab: number;
  /** Things that couldn't be drawn, for the notes shown with the result. */
  issues: { pictures: number; objects: number; columns: boolean; equations: number };
  fonts: Set<string>;
  theme: { major: string; minor: string; colors: Record<string, string> };
}
