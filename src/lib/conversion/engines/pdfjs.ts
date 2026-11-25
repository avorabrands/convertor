import type { PDFDocumentProxy } from "pdfjs-dist";

export async function openPdf(file: Blob): Promise<PDFDocumentProxy> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const base = `${location.origin}/vendor/pdfjs`;
  pdfjs.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.mjs`;
  return pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${base}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}/standard_fonts/`,
    wasmUrl: `${base}/wasm/`,
  }).promise as unknown as Promise<PDFDocumentProxy>;
}

export async function renderPage(doc: PDFDocumentProxy, pageNumber: number, dpi: number) {
  const { canvasOf, fitScale } = await import("./util");
  const page = await doc.getPage(pageNumber);
  const full = page.getViewport({ scale: dpi / 72 });
  const viewport = page.getViewport({ scale: (dpi / 72) * fitScale(full.width, full.height) });
  const { canvas } = canvasOf(viewport.width, viewport.height);
  // Print mode doesn't wait for animation frames, which stop in background tabs.
  await page.render({ canvas, viewport, background: "#fff", intent: "print" }).promise;
  page.cleanup();
  return canvas;
}
