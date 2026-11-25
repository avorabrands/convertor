import type { Tool } from "./tools/types";
import { toolAccepts } from "./tools/registry";
import type { SheetTone } from "@/components/ui/FileSheet";

export const extOf = (name: string) => (/\.([^.\\/]+)$/.exec(name)?.[1] ?? "").toLowerCase();
export const baseOf = (name: string) => name.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "") || "file";

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1000 && i < units.length - 1) { n /= 1024; i++; }
  return `${n < 10 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

export function toneFor(ext: string): SheetTone {
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif", "heic", "heif", "mp3", "wav", "m4a", "aac", "ogg", "flac", "mp4", "mov", "webm", "m4v"].includes(ext)) return "violet";
  if (["zip"].includes(ext)) return "navy";
  if (["pdf", "docx", "pptx", "xlsx", "xls", "csv", "txt"].includes(ext)) return "indigo";
  return "slate";
}

/** Extensions people try that we can't open, with the quickest way forward. */
const advice: Record<string, string> = {
  doc: "That's an older Word format. Open it in Word or Google Docs, save it as .docx, then try again.",
  ppt: "That's an older PowerPoint format. Save it as .pptx, then try again.",
  pages: "Apple Pages files can't be opened here. In Pages, choose File > Export to > Word, then try again.",
  key: "Keynote files can't be opened here. In Keynote, choose File > Export to > PowerPoint, then try again.",
  numbers: "Numbers files can't be opened here. In Numbers, choose File > Export to > Excel, then try again.",
  gdoc: "That's a shortcut to a Google Doc, not the document. In Google Docs, choose File > Download > Word, then try again.",
  gslides: "That's a shortcut to Google Slides. Choose File > Download > PowerPoint, then try again.",
  gsheet: "That's a shortcut to Google Sheets. Choose File > Download > Excel, then try again.",
  rar: "RAR archives aren't supported yet. If you can, ask for a ZIP instead.",
  "7z": "7z archives aren't supported yet. If you can, ask for a ZIP instead.",
};

const joinExts = (exts: string[]) => {
  const shown = [...new Set(exts.map((e) => (e === "jpeg" ? "jpg" : e === "heif" ? "heic" : e)))].map((e) => e.toUpperCase());
  return shown.length > 1 ? `${shown.slice(0, -1).join(", ")} or ${shown.at(-1)}` : (shown[0] ?? "");
};
export const acceptLabel = (tool: Tool) => (tool.accept.includes("*") ? "Any file type" : joinExts(tool.accept));
export const acceptAttr = (tool: Tool) => (tool.accept.includes("*") ? undefined : tool.accept.map((e) => `.${e}`).join(","));

export function unsupportedMessage(name: string) {
  const ext = extOf(name);
  return advice[ext] ?? (ext ? `We don't have a converter for .${ext} files yet.` : `"${name}" has no file extension, so we can't tell what it is.`);
}

const ZIP_BASED = new Set(["zip", "docx", "pptx", "xlsx"]);

/** Reads the first bytes so a renamed file gets a clear answer before conversion starts. */
async function contentMismatch(file: File): Promise<string | null> {
  const ext = extOf(file.name);
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const text = String.fromCharCode(...head);
  if (ext === "pdf" && !text.includes("%PDF-")) return `"${file.name}" ends in .pdf but isn't a PDF inside. Try downloading or exporting it again.`;
  if (ZIP_BASED.has(ext) && !(head[0] === 0x50 && head[1] === 0x4b)) {
    const isOldOffice = head[0] === 0xd0 && head[1] === 0xcf;
    if (isOldOffice && ext !== "zip") return `"${file.name}" is password protected or saved in an older Office format. Remove the password or re-save it as .${ext}, then try again.`;
    return `"${file.name}" doesn't look like a real .${ext} file. It may have been renamed or damaged.`;
  }
  return null;
}

export async function validateFile(file: File, tool: Tool): Promise<string | null> {
  const ext = extOf(file.name);
  if (!toolAccepts(tool, ext)) {
    return advice[ext] ?? `${tool.name} works with ${acceptLabel(tool)} files. "${file.name}" is ${ext ? `a .${ext} file` : "missing a file extension"}.`;
  }
  if (file.size === 0) return `"${file.name}" is empty. Check that it finished downloading, then add it again.`;
  if (file.size > tool.maxMB * 1024 * 1024) {
    return `"${file.name}" is ${formatBytes(file.size)}. ${tool.name} takes files up to ${tool.maxMB} MB.`;
  }
  try {
    return await contentMismatch(file);
  } catch {
    return `We couldn't read "${file.name}". If it's in cloud storage, download it to your device first.`;
  }
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
