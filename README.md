# Avora Convertly

A file converter for students. Next.js (App Router), TypeScript, Tailwind CSS v4. Conversions run in the browser; there is no backend.

## Run it

```bash
npm install
npm run dev     # http://localhost:4321
npm run build && npm start
```

`npm run dev` and `npm run build` first copy workers, fonts and OCR data into `public/vendor` (git-ignored), so nothing loads from a third-party CDN.

## Where things are

| Path | What |
|---|---|
| `src/config/site.ts` | Product name, company, web address, contact email. Rename here (the logo mark is in `Logo.tsx` and `app/icon.svg`). |
| `src/lib/tools/content.ts` | Search-page copy for each tool: title, description, uses and FAQs |
| `src/lib/seo.ts` | Page metadata, structured data and shared FAQs |
| `src/app/globals.css` | Design tokens, light and dark |
| `src/lib/tools/registry.ts` | Every tool: formats, limits, options, support level |
| `src/lib/files.ts` | Validation and the error messages for wrong files |
| `src/lib/conversion/` | Conversion layer. The UI only imports `index.ts` |
| `src/lib/conversion/engines/` | Browser conversions, loaded on demand |
| `src/lib/conversion/demo.ts` | Simulated progress and placeholder output |
| `src/hooks/useConverter.ts` | Queue and job state |
| `src/components/` | `ui`, `layout`, `tools`, `workspace`, `home` |

## What is real

Every tool converts the student's real file on their device. 47 tools in all.

- **Full support:** Word, Excel and PPT to PDF (own layout engines in `engines/docx`, `engines/xlsx`, `engines/pptx`), all PDF tools (merge, split, compress, rotate, page numbers, watermark, password protect and unlock, delete pages, extract images, PDF to JPG/PNG/text), OCR, image tools (convert, resize, compress to KB, HEIC), audio (convert, trim), video (convert, compress, trim, GIF; FFmpeg in WebAssembly), ZIP, spreadsheets, and study tools (word counter, citations, case converter, QR codes).
- **Basic layout:** PDF to Word. Text, styles, alignment and pictures carry over; tables and columns become plain text, because PDFs don't store them.

Word to PDF and Excel to PDF write real vector text with metric-compatible open fonts (Carlito for Calibri, Tinos for Times New Roman, and so on). A page that uses a script those fonts don't cover, such as Hindi, is drawn as a 200 dpi picture with an invisible searchable layer.

Licences to note: FFmpeg core is GPL-2.0-or-later and libheif (via heic-to) is LGPL-3.0; both are credited on the privacy page.

Not built: accounts and share links. Their buttons explain that.

## Web address and SEO

Each tool has its own page at `/<slug>`, such as `/pdf-to-word`; old `/convert/<slug>` links redirect. `sitemap.xml`, `robots.txt`, share images and structured data are generated at build time from `NEXT_PUBLIC_SITE_URL`.

The live address is https://convertly.avorabrands.in, the default in `src/config/site.ts`. To use a different address without changing code, set these in Vercel (Project, Settings, Environment Variables), then redeploy:

| Variable | Subdomain, e.g. tools.avorabrands.in | Folder, e.g. www.avorabrands.in/convert |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://tools.avorabrands.in` | `https://www.avorabrands.in` |
| `NEXT_PUBLIC_BASE_PATH` | (leave unset) | `/convert` |

A folder also needs a rewrite in the main site's `vercel.json` that sends `/convert/:path*` to this project, and its `robots.txt` should list `/convert/sitemap.xml`.

## Connect a backend

1. Implement `ConversionProvider` from `src/lib/conversion/types.ts`: send `request.files`, report through `handlers.onProgress`, stop on `handlers.signal`, return `OutputFile`s. Throw `ConversionError` for messages students should see.
2. Return it from `providerFor` in `src/lib/conversion/index.ts` for the tools it handles.
3. Set those tools' `support` in the registry.
4. Update the text that says files stay on the device: the note in `Workspace.tsx`, the privacy page, the FAQ and the trust section.
