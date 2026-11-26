import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { baseOf } from "@/lib/files";
import { ConversionError, type Engine, type OutputFile } from "../types";
import { parseRanges } from "./pdf-edit";
import { breathe, PDF_MIME, toBlob } from "./util";

const open = async (file: File) => {
  try {
    return await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  } catch (e) {
    if (/encrypt/i.test(String(e))) throw new ConversionError("This PDF is password protected. Unlock it first with Unlock PDF, then try again.", "unlock-pdf");
    throw e;
  }
};

const COLORS: Record<string, [number, number, number]> = { gray: [0.45, 0.45, 0.5], red: [0.75, 0.1, 0.15], blue: [0.24, 0.28, 0.83], black: [0, 0, 0] };

export const addPageNumbers: Engine = async ({ files: [file], options }, { onProgress, signal }) => {
  onProgress(0.1, "Opening the PDF");
  const doc = await open(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const start = Number(String(options.start ?? "1").trim() || "1");
  if (!Number.isInteger(start)) throw new ConversionError("The first number must be a whole number, such as 1.");
  const skip = options.skipFirst === true ? 1 : 0;
  const size = Number(options.size ?? 11);
  const counted = pages.length - skip;
  const [pos, edge] = String(options.position ?? "bottom-center").split("-");
  for (const [i, page] of pages.entries()) {
    if (i < skip) continue;
    if (i % 20 === 0) { onProgress(0.1 + (i / pages.length) * 0.8, "Numbering pages"); await breathe(signal); }
    const n = start + i - skip;
    const text = ({ n: `${n}`, "page-n": `Page ${n}`, "n-of-total": `${n} of ${start + counted - 1}`, "page-n-of-total": `Page ${n} of ${start + counted - 1}` } as Record<string, string>)[String(options.format ?? "n")] ?? `${n}`;
    const { width, height } = page.getSize();
    const w = font.widthOfTextAtSize(text, size);
    const margin = Math.max(24, Math.min(width, height) * 0.05);
    const x = edge === "left" ? margin : edge === "right" ? width - margin - w : (width - w) / 2;
    const y = pos === "top" ? height - margin - size : margin;
    page.drawText(text, { x, y, size, font, color: rgb(0.15, 0.15, 0.2) });
  }
  onProgress(0.95, "Saving");
  return { files: [{ name: `${baseOf(file.name)}-numbered.pdf`, blob: toBlob(await doc.save(), PDF_MIME) }] };
};

export const watermarkPdf: Engine = async ({ files: [file], options }, { onProgress, signal }) => {
  const text = String(options.text ?? "").trim();
  if (!text) throw new ConversionError("Type the watermark text first, such as DRAFT.");
  onProgress(0.1, "Opening the PDF");
  const doc = await open(file);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const safe = text.replace(/[^\x20-\x7e]/g, "");
  if (!safe.trim()) throw new ConversionError("Watermarks can use English letters, numbers and punctuation for now.");
  const [r, g, b] = COLORS[String(options.color ?? "gray")] ?? COLORS.gray;
  const opacity = Number(options.opacity ?? 25) / 100;
  for (const [i, page] of doc.getPages().entries()) {
    if (i % 20 === 0) { onProgress(0.1 + (i / doc.getPageCount()) * 0.8, "Adding the watermark"); await breathe(signal); }
    const { width, height } = page.getSize();
    const diagonal = options.layout !== "horizontal";
    const angle = diagonal ? Math.atan2(height, width) : 0;
    // Size the text to span most of the page along its line.
    const span = diagonal ? Math.hypot(width, height) * 0.7 : width * 0.75;
    const size = Math.min(span / Math.max(1, font.widthOfTextAtSize(safe, 1)), height * 0.25) * (Number(options.scale ?? 100) / 100);
    const w = font.widthOfTextAtSize(safe, size);
    const cx = width / 2 - (Math.cos(angle) * w) / 2 + (Math.sin(angle) * size * 0.35);
    const cy = height / 2 - (Math.sin(angle) * w) / 2 - (Math.cos(angle) * size * 0.35);
    page.drawText(safe, { x: cx, y: cy, size, font, color: rgb(r, g, b), opacity, rotate: degrees((angle * 180) / Math.PI) });
  }
  onProgress(0.95, "Saving");
  return { files: [{ name: `${baseOf(file.name)}-watermarked.pdf`, blob: toBlob(await doc.save(), PDF_MIME) }] };
};

export const protectPdf: Engine = async ({ files: [file], options }, { onProgress }) => {
  const password = String(options.password ?? "");
  if (password.length < 4) throw new ConversionError("Choose a password with at least 4 characters.");
  onProgress(0.2, "Opening the PDF");
  const { PDFDocument: Locked } = await import("@cantoo/pdf-lib");
  let doc;
  try { doc = await Locked.load(await file.arrayBuffer(), { updateMetadata: false }); }
  catch (e) { throw /encrypt/i.test(String(e)) ? new ConversionError("This PDF already has a password.") : e; }
  onProgress(0.6, "Adding the password");
  doc.encrypt({
    userPassword: password,
    ownerPassword: password,
    permissions: { printing: options.print !== false ? "highResolution" : undefined, copying: options.copy === true, modifying: false, annotating: false, fillingForms: true, contentAccessibility: true, documentAssembly: false },
  });
  return {
    files: [{ name: `${baseOf(file.name)}-protected.pdf`, blob: toBlob(await doc.save(), PDF_MIME) }],
    notes: ["Keep the password somewhere safe. Nobody, including us, can open this PDF without it."],
  };
};

export const unlockPdf: Engine = async ({ files: [file], options }, { onProgress }) => {
  const password = String(options.password ?? "");
  onProgress(0.2, "Opening the PDF");
  const { PDFDocument: Locked } = await import("@cantoo/pdf-lib");
  const bytes = await file.arrayBuffer();
  let src;
  try {
    src = await Locked.load(bytes, { password, ignoreEncryption: true });
  } catch (e) {
    if (/password/i.test(String(e))) throw new ConversionError(password ? "That password isn't right. Check it and try again." : "Enter the PDF's password first.");
    throw e;
  }
  const plain = await PDFDocument.load(bytes, { ignoreEncryption: true }).then((d) => !d.isEncrypted).catch(() => false);
  if (plain) throw new ConversionError("This PDF doesn't have a password, so there's nothing to unlock.");
  onProgress(0.6, "Removing the password");
  // A fresh document leaves the old encryption settings behind.
  const out = await Locked.create();
  (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
  return {
    files: [{ name: `${baseOf(file.name)}-unlocked.pdf`, blob: toBlob(await out.save(), PDF_MIME) }],
    notes: ["Only unlock PDFs you own or have permission to change."],
  };
};

export const deletePages: Engine = async ({ files: [file], options }, { onProgress }) => {
  onProgress(0.1, "Opening the PDF");
  const doc = await open(file);
  const count = doc.getPageCount();
  const remove = new Set(parseRanges(String(options.pages ?? ""), count).flatMap((r) => r.pages));
  if (remove.size >= count) throw new ConversionError("That would remove every page. Leave at least one.");
  const out = await PDFDocument.create();
  const keep = doc.getPageIndices().filter((i) => !remove.has(i));
  onProgress(0.5, "Removing pages");
  (await out.copyPages(doc, keep)).forEach((p) => out.addPage(p));
  return {
    files: [{ name: `${baseOf(file.name)}-edited.pdf`, blob: toBlob(await out.save(), PDF_MIME) }],
    notes: [`Removed ${remove.size} of ${count} ${count === 1 ? "page" : "pages"}.`],
  };
};

export const extractImages: Engine = async ({ files: [file] }, { onProgress, signal }) => {
  onProgress(0.05, "Opening the PDF");
  const { openPdf } = await import("./pdfjs");
  const { pageImagesFor } = await import("./pdf-read");
  const doc = await openPdf(file);
  const out: OutputFile[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      onProgress(0.08 + (n / doc.numPages) * 0.88, `Looking at page ${n} of ${doc.numPages}`);
      await breathe(signal);
      const images = await pageImagesFor(doc, n);
      images.forEach((img, i) => out.push({ name: `${baseOf(file.name)}-page${n}-${i + 1}.${img.jpeg ? "jpg" : "png"}`, blob: img.png }));
    }
  } finally {
    void doc.loadingTask.destroy();
  }
  if (!out.length) throw new ConversionError("We didn't find any pictures in this PDF. If it's a scan, each page is one big picture; use PDF to JPG instead.", "pdf-to-jpg");
  return { files: out };
};
