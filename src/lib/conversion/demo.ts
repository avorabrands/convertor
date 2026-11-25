import { baseOf, formatBytes } from "@/lib/files";
import { getTool } from "@/lib/tools/registry";
import type { ConversionProvider, OutputFile } from "./types";

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); reject(signal.reason); }, { once: true });
  });

/** Stands in for a conversion server: realistic timing, clearly marked placeholder output. */
export const demoProvider: ConversionProvider = {
  async convert({ toolSlug, files, output }, { onProgress, signal }) {
    const tool = getTool(toolSlug)!;
    const steps = 28;
    for (let i = 1; i <= steps; i++) {
      await wait(70 + Math.random() * 110, signal);
      onProgress((i / steps) * 0.97, tool.statuses[Math.min(tool.statuses.length - 1, Math.floor((i / steps) * tool.statuses.length))]);
    }
    const results: OutputFile[] = [];
    for (const file of files) {
      const lines = [
        `Placeholder for ${file.name} (${formatBytes(file.size)})`,
        `${tool.name} is a demo, so your file was not converted.`,
        "This file only shows where the result will appear.",
      ];
      results.push(
        output === "pdf"
          ? { name: `${baseOf(file.name)}-demo.pdf`, blob: await placeholderPdf(lines) }
          : { name: `${baseOf(file.name)}-${output}-demo.txt`, blob: new Blob([lines.join("\n")], { type: "text/plain" }) },
      );
    }
    return { files: results, isDemo: true, notes: ["This is a placeholder. Your file was not converted, so don't submit it."] };
  },
};

async function placeholderPdf(lines: string[]) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([842, 595]);
  page.drawText("Demo output", { x: 64, y: 480, size: 36, font: bold, color: rgb(0.24, 0.28, 0.83) });
  const safe = (s: string) => s.replace(/[^\x20-\x7e]/g, "?");
  lines.forEach((l, i) => page.drawText(safe(l).slice(0, 95), { x: 64, y: 430 - i * 26, size: 14, font, color: rgb(0.08, 0.1, 0.24) }));
  return new Blob([(await doc.save()) as BlobPart], { type: "application/pdf" });
}
