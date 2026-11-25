/** Namespace-agnostic XML helpers. Office files mix prefixes, so everything matches on local names. */
export const kids = (el: Element | null | undefined, name?: string): Element[] => {
  if (!el) return [];
  const out: Element[] = [];
  for (const c of el.children) if (!name || c.localName === name) out.push(c);
  return out;
};

export function child(el: Element | null | undefined, ...path: string[]): Element | null {
  let cur: Element | null = el ?? null;
  for (const name of path) {
    let next: Element | null = null;
    for (const c of cur?.children ?? []) if (c.localName === name) { next = c; break; }
    if (!next) return null;
    cur = next;
  }
  return cur;
}

export const attr = (el: Element | null | undefined, name: string) => el?.getAttribute(name) ?? null;
export function num(el: Element | null | undefined, name: string): number | null {
  const v = attr(el, name);
  if (v == null || v === "") return null;
  const n = v.endsWith("%") ? parseFloat(v) * 1000 : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
export const flag = (el: Element | null | undefined, name: string): boolean | null => {
  const v = attr(el, name);
  return v == null ? null : v === "1" || v === "true" || v === "on";
};
/** Relationship ids carry a namespace prefix that can vary. */
export function relAttr(el: Element | null | undefined, name: string): string | null {
  for (const a of el?.attributes ?? []) if (a.localName === name && a.prefix) return a.value;
  return null;
}
export const findAll = (el: Element | Document | null | undefined, name: string) => (el ? [...el.getElementsByTagNameNS("*", name)] : []);

/** English Metric Units to points. Everything is drawn in points. */
export const pt = (emu: number | null | undefined) => (emu ?? 0) / 12700;
export const rad = (angle60k: number | null | undefined) => (((angle60k ?? 0) / 60000) * Math.PI) / 180;
