import { baseOf } from "@/lib/files";
import { ConversionError, type Engine } from "../types";

async function readDocx(file: File) {
  const mammoth = (await import("mammoth/mammoth.browser.js")).default;
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: ["u => u"] });
  return { html: value, text: async () => (await mammoth.extractRawText({ arrayBuffer })).value };
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export const wordToText: Engine = async ({ files: [file], output }, { onProgress }) => {
  onProgress(0.2, "Opening your document");
  const doc = await readDocx(file);
  const name = baseOf(file.name);
  if (output === "html") {
    // A document can carry hostile links; keep only ordinary ones.
    const dom = new DOMParser().parseFromString(doc.html, "text/html");
    dom.querySelectorAll("a[href]").forEach((a) => { if (!/^(https?:|mailto:|#)/i.test(a.getAttribute("href")!)) a.removeAttribute("href"); });
    const page = `<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<title>${escapeHtml(name)}</title>\n<body>\n${dom.body.innerHTML}\n</body>\n</html>\n`;
    return { files: [{ name: `${name}.html`, blob: new Blob([page], { type: "text/html;charset=utf-8" }) }] };
  }
  const text = (await doc.text()).replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new ConversionError("We couldn't find any text in this document.");
  return { files: [{ name: `${name}.txt`, blob: new Blob([text], { type: "text/plain;charset=utf-8" }) }] };
};
