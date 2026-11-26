import type { Worker } from "tesseract.js";
import { asset } from "@/config/site";
import { baseOf, extOf } from "@/lib/files";
import { ConversionError, type Engine } from "../types";
import { breathe, DOCX_MIME, drawScaled, openImage, PDF_MIME, toBlob } from "./util";

export const ocr: Engine = async ({ files: [file], output }, { onProgress, signal }) => {
  onProgress(0.03, "Loading the text reader");
  const { createWorker, OEM } = await import("tesseract.js");
  const base = `${location.origin}${asset("/vendor/tesseract")}`;
  let page = 0;
  let total = 1;
  const worker: Worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: `${base}/worker.min.js`,
    corePath: base,
    langPath: base,
    logger: (m) => {
      if (m.status === "recognizing text") onProgress(0.1 + ((page + m.progress) / total) * 0.83, total > 1 ? `Reading page ${page + 1} of ${total}` : "Reading your page");
    },
  });
  const stop = () => void worker.terminate();
  signal.addEventListener("abort", stop, { once: true });

  try {
    const texts: string[] = [];
    const pdfs: Uint8Array[] = [];
    const read = async (canvas: HTMLCanvasElement) => {
      await breathe(signal);
      const { data } = await worker.recognize(canvas, {}, { text: true, pdf: output === "pdf" });
      texts.push(data.text.trim());
      if (data.pdf) pdfs.push(new Uint8Array(data.pdf));
      page++;
    };

    if (extOf(file.name) === "pdf") {
      const { openPdf, renderPage } = await import("./pdfjs");
      const doc = await openPdf(file);
      total = doc.numPages;
      for (let n = 1; n <= total; n++) await read(await renderPage(doc, n, 200));
      void doc.loadingTask.destroy();
    } else {
      const bitmap = await openImage(file, file.name);
      await read(drawScaled(bitmap, 3500, "#fff"));
      bitmap.close();
    }

    if (!texts.some(Boolean)) {
      throw new ConversionError("We couldn't find any text to read. Try a sharper, well-lit photo taken straight on.");
    }
    onProgress(0.95, "Saving the text");
    const name = baseOf(file.name);

    if (output === "pdf") {
      const { PDFDocument } = await import("pdf-lib");
      const out = await PDFDocument.create();
      for (const bytes of pdfs) {
        const src = await PDFDocument.load(bytes);
        (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
      }
      return { files: [{ name: `${name}-searchable.pdf`, blob: toBlob(await out.save(), PDF_MIME) }] };
    }
    if (output === "docx") {
      const { Document, Packer, Paragraph } = await import("docx");
      const children = texts.flatMap((t, i) =>
        (t || " ").split(/\n{2,}/).map((p, j) => new Paragraph({ text: p.replace(/\n/g, " "), pageBreakBefore: i > 0 && j === 0, spacing: { after: 160 } })));
      const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
      return { files: [{ name: `${name}.docx`, blob: new Blob([blob], { type: DOCX_MIME }) }] };
    }
    return { files: [{ name: `${name}.txt`, blob: new Blob([texts.join("\n\n\n")], { type: "text/plain;charset=utf-8" }) }] };
  } finally {
    signal.removeEventListener("abort", stop);
    void worker.terminate();
  }
};
