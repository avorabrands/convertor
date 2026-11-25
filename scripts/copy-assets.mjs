// Copies the workers, fonts and language data that conversions load at runtime
// into public/vendor, so nothing is fetched from a third-party CDN.
import { cp, mkdir, rm, readdir, copyFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const mod = (...p) => path.join(root, "node_modules", ...p);
const out = (...p) => path.join(root, "public", "vendor", ...p);

await rm(out(), { recursive: true, force: true });
await mkdir(out("pdfjs"), { recursive: true });
await mkdir(out("tesseract"), { recursive: true });

await copyFile(mod("pdfjs-dist/legacy/build/pdf.worker.min.mjs"), out("pdfjs/pdf.worker.min.mjs"));
for (const dir of ["cmaps", "standard_fonts", "wasm"]) {
  await cp(mod("pdfjs-dist", dir), out("pdfjs", dir), { recursive: true });
}

await copyFile(mod("tesseract.js/dist/worker.min.js"), out("tesseract/worker.min.js"));
for (const file of await readdir(mod("tesseract.js-core"))) {
  if (file.endsWith("lstm.wasm.js")) await copyFile(mod("tesseract.js-core", file), out("tesseract", file));
}
await copyFile(
  mod("@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz"),
  out("tesseract/eng.traineddata.gz"),
);
console.log("Conversion assets copied to public/vendor");

// Open fonts with the same letter widths as Calibri, Times New Roman, Cambria and
// Courier New, so slide text wraps where the author expects.
await mkdir(out("fonts"), { recursive: true });
for (const family of ["carlito", "tinos", "caladea", "cousine"]) {
  for (const file of await readdir(mod("@fontsource", family, "files"))) {
    if (/-(latin|latin-ext|greek)-(400|700)-(normal|italic)\.woff2$/.test(file)) {
      await copyFile(mod("@fontsource", family, "files", file), out("fonts", file));
    }
  }
}
