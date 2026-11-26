import { baseOf, extOf } from "@/lib/files";
import { ConversionError, type Engine, type OutputFile } from "../types";
import { toBlob } from "./util";

async function readBook(file: File) {
  const XLSX = await import("xlsx");
  const book = extOf(file.name) === "csv"
    ? XLSX.read(await file.text(), { type: "string", raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  return { XLSX, book };
}

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
