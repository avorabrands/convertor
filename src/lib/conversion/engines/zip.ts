import { unzip, zip, type Zippable } from "fflate";
import { baseOf } from "@/lib/files";
import { ConversionError, type Engine, type OutputFile } from "../types";

const MAX_UNPACKED = 1024 ** 3;

export const unzipAsync = (data: Uint8Array, filter?: (f: { name: string; originalSize: number }) => boolean) =>
  new Promise<Record<string, Uint8Array>>((resolve, reject) =>
    unzip(data, { filter }, (err, out) => (err ? reject(err) : resolve(out))));

export const zipAsync = (data: Zippable, level: 0 | 6 | 9 = 6) =>
  new Promise<Uint8Array>((resolve, reject) => zip(data, { level }, (err, out) => (err ? reject(err) : resolve(out))));

/** Packs results for "Download all", keeping names unique. */
export async function packFiles(files: OutputFile[], level: 0 | 6 = 0) {
  const entries: Zippable = {};
  for (const f of files) {
    const wanted = f.path ?? f.name;
    let key = wanted;
    for (let n = 2; key in entries; n++) key = wanted.replace(/(\.[^.]*)?$/, (ext) => ` (${n})${ext}`);
    entries[key] = new Uint8Array(await f.blob.arrayBuffer());
  }
  return new Blob([(await zipAsync(entries, level)) as BlobPart], { type: "application/zip" });
}

export const extractZip: Engine = async ({ files: [file] }, { onProgress, signal }) => {
  onProgress(0.1, "Opening the archive");
  const data = new Uint8Array(await file.arrayBuffer());
  if (data[0] === 0x50 && data[2] === 3 && data[6] & 1) {
    throw new ConversionError("This ZIP is password protected. Open it with your computer's own unzip app and enter the password there.");
  }
  let total = 0;
  const entries = await unzipAsync(data, (f) => {
    if (f.name.endsWith("/") || f.name.startsWith("__MACOSX/") || /(^|\/)\.DS_Store$/.test(f.name)) return false;
    total += f.originalSize;
    if (total > MAX_UNPACKED) throw new ConversionError("This ZIP unpacks to more than 1 GB, which is too much for a browser. Use your computer's own unzip app.");
    return true;
  });
  signal.throwIfAborted();
  onProgress(0.9, "Getting them ready");
  const results = Object.entries(entries).map(([path, bytes]) => ({
    name: path.split("/").at(-1)!,
    // Drop "../" so an archive can't write outside its own folder.
    path: path.split("/").filter((p) => p && p !== ".." && p !== ".").join("/"),
    blob: new Blob([bytes as BlobPart]),
  }));
  if (!results.length) throw new ConversionError("There are no files inside this ZIP.");
  return { files: results };
};

export const createZip: Engine = async ({ files }, { onProgress, signal }) => {
  onProgress(0.2, "Packing your files");
  const blob = await packFiles(files.map((f) => ({ name: f.name, blob: f })), 6);
  signal.throwIfAborted();
  return { files: [{ name: files.length === 1 ? `${baseOf(files[0].name)}.zip` : "files.zip", blob }] };
};
