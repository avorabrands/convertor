import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import { baseOf } from "@/lib/files";
import { ConversionError, type Engine } from "../../types";
import { loadFonts } from "../fonts";
import { Package } from "../pptx/package";
import { hiddenFont, hiddenText, pageCanvas, placeCanvas } from "../raster-pdf";
import { breathe, PDF_MIME, toBlob } from "../util";
import { paginate, type Env } from "./layout";
import { paintRaster, paintVector, Pictures, PdfFonts } from "./paint";
import { DocxReader } from "./read";

/** Pixels per point for pages drawn as pictures (about 200 dpi). */
const RASTER_SCALE = 200 / 72;

export const wordToPdf: Engine = async ({ files: [file] }, { onProgress, signal }) => {
  onProgress(0.04, "Opening your document");
  const pkg = await Package.open(file);
  try {
    const doc = DocxReader.read(pkg);
    if (!doc.sections.some((s) => s.blocks.length)) throw new ConversionError("This document looks empty, so there's nothing to put in a PDF.");
    signal.throwIfAborted();

    onProgress(0.12, "Loading fonts");
    await loadFonts([...doc.fonts, doc.theme.major, doc.theme.minor]);
    signal.throwIfAborted();

    onProgress(0.2, "Laying out the pages");
    await breathe(signal);
    const measure = document.createElement("canvas").getContext("2d")!;
    const env: Env = { m: measure, doc, notes: new Map() };
    const { pages } = paginate(doc, env);
    if (!pages.length) throw new ConversionError("This document looks empty, so there's nothing to put in a PDF.");

    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const fonts = new PdfFonts(pdf);
    const pictures = new Pictures(pkg, pdf, { theme: doc.theme.colors, map: {} }, { major: doc.theme.major, minor: doc.theme.minor });
    const layer = await hiddenFont(pdf);
    const sectionTotals = new Map<number, number>();
    for (const p of pages) sectionTotals.set(p.section, (sectionTotals.get(p.section) ?? 0) + 1);
    let rasterPages = 0;

    for (const [i, page] of pages.entries()) {
      onProgress(0.3 + (i / pages.length) * 0.65, `Writing page ${i + 1} of ${pages.length}`);
      await breathe(signal);
      const pdfPage = pdf.addPage([page.w, page.h]);
      const total = pages.length, sectionTotal = sectionTotals.get(page.section) ?? total;
      if (await fonts.covers(page)) {
        await paintVector(pdf, pdfPage, page, fonts, pictures, total, sectionTotal);
      } else {
        // Scripts the bundled fonts can't write, such as Hindi: draw the page as a picture with searchable text.
        rasterPages++;
        const { canvas, ctx } = pageCanvas(page.w * RASTER_SCALE, page.h * RASTER_SCALE);
        const lines = await paintRaster(ctx, RASTER_SCALE, page, pictures, total, sectionTotal);
        await placeCanvas(pdf, pdfPage, canvas, page.w, page.h);
        hiddenText(pdfPage, layer, lines, RASTER_SCALE, page.h);
        canvas.width = canvas.height = 0;
      }
    }

    onProgress(0.97, "Saving the PDF");
    const notes: string[] = [];
    const { issues } = doc;
    if (issues.pictures) notes.push(`${issues.pictures} ${issues.pictures === 1 ? "picture is" : "pictures are"} in a format we can't draw, such as EMF or WMF, and ${issues.pictures === 1 ? "shows" : "show"} as a grey box.`);
    if (issues.objects) notes.push(`${issues.objects} ${issues.objects === 1 ? "drawing or diagram" : "drawings or diagrams"} couldn't be drawn and ${issues.objects === 1 ? "shows" : "show"} as a grey box.`);
    if (issues.columns) notes.push("Text set in columns is shown in a single column.");
    if (issues.equations) notes.push("Equations are shown as plain text. Check them before you submit.");
    if (rasterPages) notes.push(`${rasterPages} ${rasterPages === 1 ? "page uses" : "pages use"} a script such as Hindi or Telugu, so ${rasterPages === 1 ? "it is" : "they are"} saved as a high-resolution picture with searchable English text.`);
    return { files: [{ name: `${baseOf(file.name)}.pdf`, blob: toBlob(await pdf.save(), PDF_MIME) }], notes };
  } finally {
    void pkg.dispose();
  }
};
