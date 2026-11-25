# Convertly

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
| `src/config/site.ts` | Product name, description, contact email. Rename here (the logo mark is in `Logo.tsx` and `app/icon.svg`). |
| `src/app/globals.css` | Design tokens, light and dark |
| `src/lib/tools/registry.ts` | Every tool: formats, limits, options, support level |
| `src/lib/files.ts` | Validation and the error messages for wrong files |
| `src/lib/conversion/` | Conversion layer. The UI only imports `index.ts` |
| `src/lib/conversion/engines/` | Browser conversions, loaded on demand |
| `src/lib/conversion/demo.ts` | Simulated progress and placeholder output |
| `src/hooks/useConverter.ts` | Queue and job state |
| `src/components/` | `ui`, `layout`, `tools`, `workspace`, `home` |

## What is real

- **Full support:** JPG to PDF, PDF to JPG, compress, merge, split and rotate PDF, OCR (English), image, audio and spreadsheet conversion, PDF or Word to text, ZIP extract and create, file size reducer, video to MP3.
- **Basic layout:** PPT to PDF, PDF to Word, Word to PDF, Excel to PDF. Text and structure carry over; complex layouts are simplified. The Word and Excel PDF writers cover Latin, Greek and Cyrillic, and refuse other scripts rather than produce unreadable files.
- **Demo:** video to MP4 or WebM. Output is marked as a placeholder.

PPT to PDF (`engines/pptx/`) draws each slide on a canvas, so any script the device has fonts for works, and adds an invisible text layer for search. Covered: themes, masters, placeholders, about 80 preset shapes, freeforms, pictures, tables, SmartArt drawings, and bar, column, line, area, pie, doughnut and scatter charts. Not covered: animations, 3D, reflections and glows, EMF and WMF pictures, text columns, and other chart types (marked on the slide). Calibri, Cambria, Times and Courier use open fonts with matching widths.

Not built: accounts and share links. Their buttons explain that.

## Connect a backend

1. Implement `ConversionProvider` from `src/lib/conversion/types.ts`: send `request.files`, report through `handlers.onProgress`, stop on `handlers.signal`, return `OutputFile`s. Throw `ConversionError` for messages students should see.
2. Return it from `providerFor` in `src/lib/conversion/index.ts` for the tools it handles.
3. Set those tools' `support` in the registry.
4. Update the text that says files stay on the device: the note in `Workspace.tsx`, the privacy page, the FAQ and the trust section.
