import { PDFDocument } from "pdf-lib";
import { baseOf } from "@/lib/files";
import { ConversionError, type Engine } from "../../types";
import { hiddenFont, hiddenText, pageCanvas, placeCanvas, type LayerLine } from "../raster-pdf";
import { breathe, fitScale, PDF_MIME, toBlob } from "../util";
import { loadFonts } from "../fonts";
import { Package } from "./package";
import { renderSlide, type DeckInfo, type Issues } from "./render";
import { child, flag, kids, num, pt, relAttr } from "./xml";

/** Pixels across each slide. */
const widths: Record<string, number> = { small: 1280, standard: 1920, high: 2880 };

export const pptToPdf: Engine = async ({ files: [file], options }, { onProgress, signal }) => {
  onProgress(0.04, "Opening your slides");
  const pkg = await Package.open(file);
  try {
    const path = pkg.byType("", "officeDocument") ?? "ppt/presentation.xml";
    const root = pkg.xml(path);
    if (!root || root.localName !== "presentation") throw new ConversionError("We couldn't find any slides in this file. Open it in PowerPoint or Google Slides and save it as .pptx again.");
    const size = child(root, "sldSz");
    const deck: DeckInfo = { pkg, presentation: { path, root }, width: pt(num(size, "cx")) || 960, height: pt(num(size, "cy")) || 540 };

    const all = kids(child(root, "sldIdLst"), "sldId").map((s) => pkg.target(path, relAttr(s, "id"))).filter((p): p is string => Boolean(p && pkg.xml(p)));
    const numbered = all.map((p, i) => ({ path: p, number: i + (num(root, "firstSlideNum") ?? 1) }));
    const slides = options.hidden === true ? numbered : numbered.filter((s) => flag(pkg.xml(s.path), "show") !== false);
    if (!slides.length) throw new ConversionError(all.length ? "Every slide in this presentation is hidden. Turn on “Include hidden slides” in Advanced settings, then try again." : "This presentation has no slides.");

    onProgress(0.08, "Loading fonts");
    await loadFonts(fontNames(pkg));
    signal.throwIfAborted();

    const doc = await PDFDocument.create();
    const layerFont = await hiddenFont(doc);
    const px = widths[String(options.quality)] ?? widths.standard;
    const scale = (px / deck.width) * fitScale(px, (px * deck.height) / deck.width);
    const issues: Issues = { pictures: 0, charts: 0 };
    let failed = 0;

    for (const [i, slide] of slides.entries()) {
      onProgress(0.12 + (i / slides.length) * 0.82, `Drawing slide ${i + 1} of ${slides.length}`);
      await breathe(signal);
      const { canvas, ctx } = pageCanvas(deck.width * scale, deck.height * scale);
      let lines: LayerLine[] = [];
      try {
        lines = await renderSlide(deck, slide.path, slide.number, ctx, scale, issues);
      } catch (e) {
        console.warn(`Slide ${slide.number} was only partly drawn`, e);
        failed++;
      }
      const page = doc.addPage([deck.width, deck.height]);
      await placeCanvas(doc, page, canvas, deck.width, deck.height);
      hiddenText(page, layerFont, lines, scale, deck.height);
      canvas.width = canvas.height = 0;
    }

    onProgress(0.96, "Saving the PDF");
    const notes: string[] = [];
    const hidden = numbered.length - slides.length;
    if (hidden) notes.push(`${hidden} hidden ${hidden === 1 ? "slide was" : "slides were"} left out. You can include ${hidden === 1 ? "it" : "them"} in Advanced settings.`);
    if (issues.pictures) notes.push(`${issues.pictures} ${issues.pictures === 1 ? "picture is" : "pictures are"} in a format we can't draw, such as EMF or WMF, and ${issues.pictures === 1 ? "shows" : "show"} as a grey box.`);
    if (issues.charts) notes.push(`${issues.charts} ${issues.charts === 1 ? "chart or diagram" : "charts or diagrams"} couldn't be drawn and ${issues.charts === 1 ? "is" : "are"} marked on the slide.`);
    if (failed) notes.push(`${failed} ${failed === 1 ? "slide was" : "slides were"} only partly drawn. Check before submitting.`);
    return { files: [{ name: `${baseOf(file.name)}.pdf`, blob: toBlob(await doc.save(), PDF_MIME) }], notes };
  } finally {
    void pkg.dispose();
  }
};

/** Every typeface named in the deck's themes and slides. */
function fontNames(pkg: Package) {
  const names = new Set<string>();
  for (const path of Object.keys(pkg.files)) {
    if (!/^ppt\/(theme|slides|slideLayouts|slideMasters|diagrams)\/[^/]+\.xml$/.test(path)) continue;
    const text = pkg.text(path) ?? "";
    for (const m of text.matchAll(/<a:latin[^>]*typeface="([^"+][^"]*)"/g)) names.add(m[1]);
  }
  return names;
}
