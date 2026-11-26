/** Reference formatting for APA 7, MLA 9 and Harvard (Cite Them Right). Italic parts are wrapped in *asterisks*. */
export type SourceType = "website" | "book" | "journal";
export type Style = "apa" | "mla" | "harvard";
export interface Source {
  type: SourceType; authors: string; title: string; year: string; month: string; day: string;
  container: string; publisher: string; volume: string; issue: string; pages: string; edition: string; url: string; accessed: string; place: string;
}
interface Name { first: string[]; last: string }

export function parseAuthors(text: string): Name[] {
  return text.split(/\n|;/).map((s) => s.trim()).filter(Boolean).map((s) => {
    if (s.includes(",")) { const [last, rest] = s.split(",", 2); return { last: last.trim(), first: rest.trim().split(/\s+/).filter(Boolean) }; }
    const parts = s.split(/\s+/);
    return { last: parts.pop() ?? "", first: parts };
  });
}

const initials = (n: Name, dots = true) => n.first.map((f) => f.split("-").map((p) => p[0]?.toUpperCase() + (dots ? "." : "")).join("-")).join(" ");
const clean = (s: string) => s.trim().replace(/\s+/g, " ");
const end = (s: string) => (/[.?!]$/.test(s) ? s : `${s}.`);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MLA_MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
const month = (m: string, list = MONTHS) => { const i = Number(m); return i >= 1 && i <= 12 ? list[i - 1] : clean(m); };
const SMALL = new Set("a an and as at but by for from in into nor of on or per so the to up via vs with yet".split(" "));
/** MLA capitalises the main words of titles. Words already in capitals, like DNA, are left alone. */
const titleCase = (t: string) => t.replace(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu, (w, i: number) => {
  if (w !== w.toLowerCase()) return w;
  const afterColon = /[:?!.]\s*$/.test(t.slice(0, i));
  return i > 0 && !afterColon && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1);
});
const sentenceCase = (t: string) => t.replace(/(^|[:?!.]\s+)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

function accessedDate(iso: string, style: Style) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return iso;
  return style === "mla" ? `${d.getDate()} ${MLA_MONTHS[d.getMonth()]} ${d.getFullYear()}` : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function apaAuthors(names: Name[]) {
  const f = names.map((n) => (n.first.length ? `${n.last}, ${initials(n)}` : n.last));
  if (f.length <= 1) return f[0] ?? "";
  if (f.length <= 20) return `${f.slice(0, -1).join(", ")}, & ${f.at(-1)}`;
  return `${f.slice(0, 19).join(", ")}, . . . ${f.at(-1)}`;
}
function mlaAuthors(names: Name[]) {
  const full = (n: Name) => [...n.first, n.last].join(" ");
  if (!names.length) return "";
  const first = names[0].first.length ? `${names[0].last}, ${names[0].first.join(" ")}` : names[0].last;
  if (names.length === 1) return first;
  if (names.length === 2) return `${first}, and ${full(names[1])}`;
  return `${first}, et al`;
}
function harvardAuthors(names: Name[]) {
  const f = names.map((n) => (n.first.length ? `${n.last}, ${initials(n)}` : n.last));
  if (f.length <= 1) return f[0] ?? "";
  if (f.length > 3) return `${f[0]} et al.`;
  return `${f.slice(0, -1).join(", ")} and ${f.at(-1)}`;
}

export function formatCitation(s: Source, style: Style): string {
  const names = parseAuthors(s.authors);
  const title = clean(s.title);
  const year = clean(s.year) || "n.d.";
  const url = clean(s.url);
  const doi = /^10\.\d{4,}\//.test(url) ? `https://doi.org/${url}` : url;
  const pages = clean(s.pages).replace(/-/g, "–");
  if (style === "apa") {
    const who = apaAuthors(names);
    const date = s.type === "website" && s.month ? `${year}, ${month(s.month)}${s.day ? ` ${Number(s.day)}` : ""}` : year;
    const lead = who ? `${end(who)} (${date}).` : "";
    if (s.type === "book") {
      const ed = s.edition ? ` (${clean(s.edition)} ed.)` : "";
      return [who ? `${lead} *${sentenceCase(title)}*${ed}.` : `*${sentenceCase(title)}*${ed}. (${date}).`, clean(s.publisher) && end(clean(s.publisher)), doi].filter(Boolean).join(" ");
    }
    if (s.type === "journal") {
      const vol = clean(s.volume) ? `, *${clean(s.volume)}*` : "";
      const iss = clean(s.issue) ? `(${clean(s.issue)})` : "";
      return [`${lead} ${end(sentenceCase(title))}`, `*${clean(s.container)}*${vol}${iss}${pages ? `, ${pages}` : ""}.`, doi].filter(Boolean).join(" ");
    }
    const site = clean(s.container) && clean(s.container) !== who ? ` ${end(clean(s.container))}` : "";
    return `${who ? `${lead} *${sentenceCase(title)}*.` : `*${sentenceCase(title)}*. (${date}).`}${site}${doi ? ` ${doi}` : ""}`;
  }
  if (style === "mla") {
    const who = mlaAuthors(names);
    const title = titleCase(clean(s.title));
    const lead = who ? `${end(who)} ` : "";
    if (s.type === "book") {
      const ed = s.edition ? ` ${clean(s.edition)} ed.,` : "";
      return `${lead}*${title}*.${ed} ${[clean(s.publisher), clean(s.year)].filter(Boolean).join(", ")}.`.replace(/\s+\./g, ".");
    }
    if (s.type === "journal") {
      const parts = [`*${clean(s.container)}*`, s.volume && `vol. ${clean(s.volume)}`, s.issue && `no. ${clean(s.issue)}`, clean(s.year), pages && `pp. ${pages}`, doi].filter(Boolean);
      return `${lead}“${end(title)}” ${parts.join(", ")}.`;
    }
    const date = s.year ? [s.day && Number(s.day), s.month && month(s.month, MLA_MONTHS), clean(s.year)].filter(Boolean).join(" ") : "";
    const parts = [clean(s.container) && `*${clean(s.container)}*`, date, doi.replace(/^https?:\/\//, "")].filter(Boolean);
    return `${lead}“${end(title)}” ${parts.join(", ")}. Accessed ${accessedDate(s.accessed, "mla")}.`;
  }
  const who = harvardAuthors(names);
  const lead = `${who || `*${title}*`} (${year})`;
  if (s.type === "book") {
    const ed = s.edition ? ` ${clean(s.edition)} edn.` : "";
    const pub = [clean(s.place), clean(s.publisher)].filter(Boolean).join(": ");
    return `${lead} ${who ? `*${title}*.` : ""}${ed}${pub ? ` ${pub}.` : ""}`.replace(/\s+/g, " ").trim();
  }
  if (s.type === "journal") {
    const vol = [clean(s.volume), clean(s.issue) && `(${clean(s.issue)})`].filter(Boolean).join("");
    return `${lead} ‘${title}’, *${clean(s.container)}*${vol ? `, ${vol}` : ""}${pages ? `, pp. ${pages}` : ""}.${doi ? ` Available at: ${doi}.` : ""}`;
  }
  return `${lead} ${who ? `*${title}*.` : ""}${doi ? ` Available at: ${doi}` : ""} (Accessed: ${accessedDate(s.accessed, "harvard")}).`.replace(/\s+/g, " ").trim();
}
