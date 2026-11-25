import { baseOf, extOf } from "@/lib/files";
import { ConversionError, type Engine, type OutputFile } from "../types";
import { PdfWriter } from "./pdf-writer";
import { breathe, PDF_MIME, toBlob } from "./util";

async function readBook(file: File) {
  const XLSX = await import("xlsx");
  const book = extOf(file.name) === "csv"
    ? XLSX.read(await file.text(), { type: "string", raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  return { XLSX, book };
}

const MAX_ROWS = 4000;

export const sheetToPdf: Engine = async ({ files: [file], options }, { onProgress, signal }) => {
  onProgress(0.1, "Reading the sheets");
  const { XLSX, book } = await readBook(file);
  const writer = await PdfWriter.create(String(options.pageSize ?? "a4"), options.orientation !== "portrait", 36);
  const notes: string[] = [];
  const names = book.SheetNames.filter((n) => book.Sheets[n]?.["!ref"]);
  let drawn = 0;
  for (const [i, name] of names.entries()) {
    onProgress(0.2 + (i / names.length) * 0.7, `Drawing ${name}`);
    await breathe(signal);
    let rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name], { header: 1, raw: false, defval: "", blankrows: false });
    if (!rows.length) continue;
    if (rows.length > MAX_ROWS) {
      notes.push(`"${name}" has ${rows.length.toLocaleString()} rows. The PDF includes the first ${MAX_ROWS.toLocaleString()}.`);
      rows = rows.slice(0, MAX_ROWS);
    }
    const cols = Math.max(...rows.map((r) => r.length));
    if (drawn++) writer.newPage();
    if (extOf(file.name) !== "csv") writer.paragraph([{ text: name, bold: true }], { size: 14, after: 8 });
    const size = cols > 14 ? 6 : cols > 9 ? 7.5 : 9;
    writer.table(rows.map((r, n) => Array.from({ length: cols }, (_, c) => [{ text: String(r[c] ?? ""), bold: n === 0 }])), { size });
    if (cols > 20) notes.push(`"${name}" has ${cols} columns, so the text is small. Landscape works best.`);
  }
  if (!drawn) throw new ConversionError("This spreadsheet has no values in it.");
  onProgress(0.94, "Saving the PDF");
  const result = await writer.finish();
  return { files: [{ name: `${baseOf(file.name)}.pdf`, blob: toBlob(result.bytes, PDF_MIME) }], notes: [...notes, ...result.notes] };
};

export const convertSheet: Engine = async ({ files: [file], output }, { onProgress }) => {
  onProgress(0.2, "Reading the sheets");
  const { XLSX, book } = await readBook(file);
  const base = baseOf(file.name);
  if (output === "xlsx") {
    const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    return { files: [{ name: `${base}.xlsx`, blob: toBlob(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") }] };
  }
  const names = book.SheetNames.filter((n) => book.Sheets[n]?.["!ref"]);
  if (!names.length) throw new ConversionError("This spreadsheet has no values in it.");
  const files: OutputFile[] = names.map((n) => {
    const sheet = book.Sheets[n];
    const suffix = names.length > 1 ? `-${n.replace(/[^\p{L}\p{N} _-]/gu, "_")}` : "";
    return output === "json"
      ? { name: `${base}${suffix}.json`, blob: new Blob([JSON.stringify(XLSX.utils.sheet_to_json(sheet, { defval: null }), null, 2)], { type: "application/json" }) }
      : { name: `${base}${suffix}.csv`, blob: new Blob(["﻿", XLSX.utils.sheet_to_csv(sheet)], { type: "text/csv;charset=utf-8" }) };
  });
  return { files };
};
