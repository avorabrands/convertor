import { getTool } from "@/lib/tools/registry";
import type { ConversionProvider, Engine } from "./types";
import { ConversionError } from "./types";

type Loader = () => Promise<Engine>;

/** Each engine loads only when someone uses its tool, so pages stay light. */
const engines: Record<string, Loader> = {
  "pdf-to-word": () => import("./engines/pdf-read").then((m) => m.pdfToWord),
  "pdf-to-text": () => import("./engines/pdf-read").then((m) => m.pdfToText),
  "pdf-to-jpg": () => import("./engines/pdf-read").then((m) => m.pdfToImages),
  "merge-pdf": () => import("./engines/pdf-edit").then((m) => m.mergePdf),
  "split-pdf": () => import("./engines/pdf-edit").then((m) => m.splitPdf),
  "rotate-pdf": () => import("./engines/pdf-edit").then((m) => m.rotatePdf),
  "jpg-to-pdf": () => import("./engines/pdf-edit").then((m) => m.imagesToPdf),
  "compress-pdf": () => import("./engines/reduce").then((m) => m.reduceFile),
  "file-size-reducer": () => import("./engines/reduce").then((m) => m.reduceFile),
  "ppt-to-pdf": () => import("./engines/pptx").then((m) => m.pptToPdf),
  "word-to-pdf": () => import("./engines/docx").then((m) => m.wordToPdf),
  "word-to-text": () => import("./engines/word").then((m) => m.wordToText),
  "excel-to-pdf": () => import("./engines/xlsx").then((m) => m.excelToPdf),
  "spreadsheet-converter": () => import("./engines/sheets").then((m) => m.convertSheet),
  "image-to-text": () => import("./engines/ocr").then((m) => m.ocr),
  "image-converter": () => import("./engines/images").then((m) => m.convertImage),
  "audio-converter": () => import("./engines/audio").then((m) => m.convertAudio),
  "video-converter": () => import("./engines/video").then((m) => m.convertVideo),
  "compress-video": () => import("./engines/video").then((m) => m.compressVideo),
  "video-to-gif": () => import("./engines/video").then((m) => m.videoToGif),
  "trim-video": () => import("./engines/video").then((m) => m.trimVideo),
  "trim-audio": () => import("./engines/audio").then((m) => m.trimAudio),
  "add-page-numbers": () => import("./engines/pdf-tools").then((m) => m.addPageNumbers),
  "watermark-pdf": () => import("./engines/pdf-tools").then((m) => m.watermarkPdf),
  "protect-pdf": () => import("./engines/pdf-tools").then((m) => m.protectPdf),
  "unlock-pdf": () => import("./engines/pdf-tools").then((m) => m.unlockPdf),
  "delete-pdf-pages": () => import("./engines/pdf-tools").then((m) => m.deletePages),
  "extract-pdf-images": () => import("./engines/pdf-tools").then((m) => m.extractImages),
  "resize-image": () => import("./engines/image-tools").then((m) => m.resizeImage),
  "compress-image": () => import("./engines/image-tools").then((m) => m.compressImageToSize),
  "zip-extractor": () => import("./engines/zip").then((m) => m.extractZip),
  "create-zip": () => import("./engines/zip").then((m) => m.createZip),
};

/** Runs conversions in the browser. Files never leave the device. */
export const localProvider: ConversionProvider = {
  async convert(request, handlers) {
    const load = engines[getTool(request.toolSlug)?.engine ?? request.toolSlug];
    if (!load) throw new ConversionError("This tool isn't ready yet.");
    handlers.onProgress(0.02);
    const engine = await load();
    handlers.signal.throwIfAborted();
    return engine(request, handlers);
  },
};
