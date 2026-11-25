import type { Category, Tool } from "./types";

const IMAGES = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif", "heic", "heif"];
const AUDIO = ["mp3", "wav", "m4a", "aac", "ogg", "flac"];
const VIDEO = ["mp4", "mov", "webm", "m4v"];

const qualityOption = {
  key: "quality", label: "Image quality", type: "range", default: 85, min: 40, max: 100, step: 5, unit: "%",
} as const;

export const tools: Tool[] = [
  {
    slug: "pdf-to-word", name: "PDF to Word", summary: "Get an editable DOCX from a PDF.",
    category: "pdf", support: "basic",
    supportNote: "Headings, paragraphs and page breaks carry over. Images, tables and columns are simplified to text.",
    accept: ["pdf"], maxMB: 100, mode: "each", multiple: true,
    outputs: [{ value: "docx", label: "Word (.docx)" }],
    options: [{ key: "pageBreaks", label: "Keep page breaks", type: "toggle", default: true, hint: "Start a new page wherever the PDF does." }],
    action: "Convert", glyph: { from: "PDF", to: "DOCX" },
    statuses: ["Reading the pages", "Rebuilding paragraphs", "Writing your Word file"], keywords: "docx edit document", quick: true,
  },
  {
    slug: "word-to-pdf", name: "Word to PDF", summary: "Turn a DOCX into a PDF you can submit.",
    category: "documents", support: "basic",
    supportNote: "Headings, lists, tables and images carry over. Fonts, headers, footers and exact page layout may change.",
    accept: ["docx"], maxMB: 50, mode: "each", multiple: true,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [{ key: "pageSize", label: "Page size", type: "select", default: "a4", choices: [{ value: "a4", label: "A4" }, { value: "letter", label: "US Letter" }] }],
    action: "Convert", glyph: { from: "DOCX", to: "PDF" },
    statuses: ["Opening your document", "Laying out the pages", "Saving the PDF"], keywords: "docx assignment submit", quick: true,
  },
  {
    slug: "jpg-to-pdf", name: "JPG to PDF", summary: "Combine photos of pages into one PDF.",
    category: "images", support: "full",
    accept: IMAGES, maxMB: 40, mode: "combine", multiple: true,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [
      { key: "pageSize", label: "Page size", type: "select", default: "a4", choices: [{ value: "a4", label: "A4" }, { value: "letter", label: "US Letter" }, { value: "fit", label: "Match each image" }] },
      { key: "margin", label: "Margin", type: "select", default: "small", choices: [{ value: "none", label: "None" }, { value: "small", label: "Small" }, { value: "large", label: "Large" }] },
      qualityOption,
    ],
    action: "Create PDF", glyph: { from: "JPG", to: "PDF", tone: "violet" },
    statuses: ["Reading your images", "Placing them on pages", "Saving the PDF"], keywords: "png image photo scan jpeg", quick: true,
  },
  {
    slug: "pdf-to-jpg", name: "PDF to JPG", summary: "Save every PDF page as an image.",
    category: "pdf", support: "full",
    accept: ["pdf"], maxMB: 100, mode: "each", multiple: true,
    outputs: [{ value: "jpg", label: "JPG" }, { value: "png", label: "PNG" }],
    options: [
      { key: "dpi", label: "Resolution", type: "select", default: "150", choices: [{ value: "96", label: "Screen (96 dpi)" }, { value: "150", label: "Standard (150 dpi)" }, { value: "300", label: "Print (300 dpi)" }] },
      { ...qualityOption, showIf: (_v, output) => output === "jpg" },
    ],
    action: "Convert", glyph: { from: "PDF", to: "JPG" },
    statuses: ["Opening the PDF", "Drawing the pages", "Saving the images"], keywords: "png image jpeg picture", quick: true,
  },
  {
    slug: "ppt-to-pdf", name: "PPT to PDF", summary: "Share slides as a PDF anyone can open.",
    category: "documents", support: "basic",
    supportNote: "Text, pictures, shapes, tables and common charts carry over, in any language. Animations, 3D effects and some special fonts don't.",
    accept: ["pptx"], maxMB: 100, mode: "each", multiple: true,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [
      { key: "quality", label: "Quality", type: "select", default: "standard", choices: [{ value: "small", label: "Small file" }, { value: "standard", label: "Standard" }, { value: "high", label: "High, for printing" }] },
      { key: "hidden", label: "Include hidden slides", type: "toggle", default: false },
    ],
    action: "Convert", glyph: { from: "PPTX", to: "PDF" },
    statuses: ["Opening your slides", "Drawing the slides", "Saving the PDF"], keywords: "powerpoint pptx slides presentation", quick: true,
  },
  {
    slug: "excel-to-pdf", name: "Excel to PDF", summary: "Print-ready PDF tables from a sheet.",
    category: "documents", support: "basic",
    supportNote: "Cell values from every sheet carry over as tables. Charts, colours and merged cells don't.",
    accept: ["xlsx", "xls", "csv"], maxMB: 30, mode: "each", multiple: true,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [
      { key: "orientation", label: "Orientation", type: "select", default: "landscape", choices: [{ value: "landscape", label: "Landscape" }, { value: "portrait", label: "Portrait" }] },
      { key: "pageSize", label: "Page size", type: "select", default: "a4", choices: [{ value: "a4", label: "A4" }, { value: "letter", label: "US Letter" }] },
    ],
    action: "Convert", glyph: { from: "XLSX", to: "PDF" },
    statuses: ["Reading the sheets", "Drawing the tables", "Saving the PDF"], keywords: "xlsx csv spreadsheet", quick: true,
  },
  {
    slug: "compress-pdf", name: "Compress PDF", summary: "Shrink a PDF and keep its text selectable.",
    category: "pdf", support: "full",
    supportNote: "Most of the saving comes from images. A PDF that is only text may already be as small as it gets.",
    accept: ["pdf"], maxMB: 150, mode: "each", multiple: true,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [{ key: "level", label: "Compression", type: "select", default: "balanced", choices: [{ value: "light", label: "Light: best quality" }, { value: "balanced", label: "Balanced" }, { value: "strong", label: "Strong: smallest file" }] }],
    primaryOptions: ["level"],
    action: "Compress", glyph: { from: "PDF", tone: "indigo" },
    statuses: ["Opening the PDF", "Compressing images", "Saving the smaller file"], keywords: "reduce shrink smaller size", quick: true,
  },
  {
    slug: "merge-pdf", name: "Merge PDF", summary: "Join several PDFs in the order you choose.",
    category: "pdf", support: "full",
    accept: ["pdf"], maxMB: 100, mode: "combine", multiple: true, minFiles: 2,
    outputs: [{ value: "pdf", label: "PDF" }],
    action: "Merge", glyph: { from: "PDF" },
    statuses: ["Opening your PDFs", "Joining the pages", "Saving the PDF"], keywords: "combine join", quick: true,
  },
  {
    slug: "split-pdf", name: "Split PDF", summary: "Pull out pages or break a PDF apart.",
    category: "pdf", support: "full",
    accept: ["pdf"], maxMB: 100, mode: "each", multiple: true,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [
      { key: "mode", label: "How to split", type: "select", default: "ranges", choices: [{ value: "ranges", label: "Choose page ranges" }, { value: "every", label: "One file per page" }] },
      { key: "ranges", label: "Pages", type: "text", default: "1", placeholder: "1-3, 5, 8-10", hint: "Each range becomes its own PDF. Example: 1-3, 5, 8-10", showIf: (v) => v.mode === "ranges" },
    ],
    primaryOptions: ["mode", "ranges"],
    action: "Split", glyph: { from: "PDF" },
    statuses: ["Opening the PDF", "Separating the pages", "Saving the parts"], keywords: "extract pages separate", quick: true,
  },
  {
    slug: "ocr", name: "OCR to Text", summary: "Read text from scans, photos and PDFs.",
    category: "documents", support: "full",
    supportNote: "Reads English. Clear printed text works best; handwriting is hit and miss, so check the result.",
    accept: ["pdf", ...IMAGES], maxMB: 50, mode: "each", multiple: true,
    outputs: [{ value: "txt", label: "Text (.txt)" }, { value: "docx", label: "Word (.docx)" }, { value: "pdf", label: "Searchable PDF" }],
    action: "Read text", glyph: { from: "JPG", to: "TXT", tone: "violet" },
    statuses: ["Loading the text reader", "Reading your pages", "Saving the text"], keywords: "scan image text handwriting notes searchable recognize", quick: true,
  },
  {
    slug: "image-converter", name: "Image Converter", summary: "Switch between JPG, PNG and WebP.",
    category: "images", support: "full",
    supportNote: "HEIC photos need a browser that can open them, such as Safari.",
    accept: IMAGES, maxMB: 40, mode: "each", multiple: true,
    outputs: [{ value: "jpg", label: "JPG" }, { value: "png", label: "PNG" }, { value: "webp", label: "WebP" }],
    options: [
      { ...qualityOption, showIf: (_v, output) => output !== "png" },
      { key: "maxSide", label: "Resize longest side", type: "select", default: "0", choices: [{ value: "0", label: "Keep original size" }, { value: "2560", label: "2560 px" }, { value: "1920", label: "1920 px" }, { value: "1280", label: "1280 px" }, { value: "800", label: "800 px" }] },
    ],
    action: "Convert", glyph: { from: "JPG", to: "PNG", tone: "violet" },
    statuses: ["Opening your image", "Converting", "Saving"], keywords: "jpeg webp heic picture photo", quick: true,
  },
  {
    slug: "audio-converter", name: "Audio Converter", summary: "Convert recordings to MP3 or WAV.",
    category: "media", support: "full",
    supportNote: "Which input formats open depends on your browser. MP3, WAV and M4A work almost everywhere.",
    accept: AUDIO, maxMB: 150, mode: "each", multiple: true,
    outputs: [{ value: "mp3", label: "MP3" }, { value: "wav", label: "WAV" }],
    options: [
      { key: "bitrate", label: "Quality", type: "select", default: "128", showIf: (_v, o) => o === "mp3", choices: [{ value: "64", label: "Voice notes (64 kbps)" }, { value: "128", label: "Standard (128 kbps)" }, { value: "192", label: "High (192 kbps)" }, { value: "320", label: "Best (320 kbps)" }] },
      { key: "mono", label: "Mono", type: "toggle", default: false, hint: "Good for lectures. About half the size for WAV." },
    ],
    action: "Convert", glyph: { from: "M4A", to: "MP3", tone: "violet" },
    statuses: ["Opening the audio", "Encoding", "Saving"], keywords: "mp3 wav m4a lecture recording", quick: true,
  },
  {
    slug: "video-converter", name: "Video Converter", summary: "Change video format, or pull out the audio.",
    category: "media", support: "demo",
    supportNote: "Getting MP3 audio works on your real file. MP4 and WebM need a conversion server that isn't connected yet, so those give a placeholder.",
    accept: VIDEO, maxMB: 300, mode: "each", multiple: true,
    outputs: [
      { value: "mp3", label: "Audio only (MP3)", support: "full" },
      { value: "mp4", label: "MP4 (demo)", support: "demo" },
      { value: "webm", label: "WebM (demo)", support: "demo" },
    ],
    options: [{ key: "bitrate", label: "Audio quality", type: "select", default: "128", showIf: (_v, o) => o === "mp3", choices: [{ value: "64", label: "Voice (64 kbps)" }, { value: "128", label: "Standard (128 kbps)" }, { value: "192", label: "High (192 kbps)" }] }],
    action: "Convert", glyph: { from: "MOV", to: "MP4", tone: "violet" },
    statuses: ["Opening the video", "Preparing frames", "Encoding", "Saving"], keywords: "mp4 mov webm lecture audio mp3", quick: true,
  },
  {
    slug: "zip-extractor", name: "ZIP Extractor", summary: "Open a ZIP and save what's inside.",
    category: "archives", support: "full",
    accept: ["zip"], maxMB: 200, mode: "each", multiple: true,
    outputs: [{ value: "files", label: "Extracted files" }],
    action: "Extract", glyph: { from: "ZIP", tone: "navy" },
    statuses: ["Opening the archive", "Unpacking files", "Getting them ready"], keywords: "unzip archive open", quick: true,
  },
  {
    slug: "file-size-reducer", name: "File Size Reducer", summary: "Shrink slides, documents, images and audio.",
    category: "archives", support: "full",
    supportNote: "Most of the saving comes from images and audio inside the file. PNG images are resized, not recompressed.",
    accept: ["pdf", "docx", "pptx", "xlsx", "jpg", "jpeg", "png", "webp", "mp3", "m4a", "wav"], maxMB: 150, mode: "each", multiple: true,
    outputs: [{ value: "same", label: "Same format" }],
    options: [{ key: "level", label: "Compression", type: "select", default: "balanced", choices: [{ value: "light", label: "Light: best quality" }, { value: "balanced", label: "Balanced" }, { value: "strong", label: "Strong: smallest file" }] }],
    primaryOptions: ["level"],
    action: "Reduce size", glyph: { from: "ANY", tone: "navy" },
    statuses: ["Opening your file", "Compressing what's inside", "Saving the smaller file"], keywords: "compress shrink upload limit portal", quick: true,
  },
  // Not on the home page; listed in the full directory.
  {
    slug: "rotate-pdf", name: "Rotate PDF", summary: "Turn sideways or upside-down pages.",
    category: "pdf", support: "full", accept: ["pdf"], maxMB: 100, mode: "each", multiple: true,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [{ key: "angle", label: "Rotate", type: "select", default: "90", choices: [{ value: "90", label: "Right 90°" }, { value: "270", label: "Left 90°" }, { value: "180", label: "Upside down 180°" }] }],
    primaryOptions: ["angle"],
    action: "Rotate", glyph: { from: "PDF" }, statuses: ["Opening the PDF", "Turning the pages", "Saving"], keywords: "turn orientation",
  },
  {
    slug: "pdf-to-text", name: "PDF to Text", summary: "Copy all the text out of a PDF.",
    category: "pdf", support: "full", accept: ["pdf"], maxMB: 100, mode: "each", multiple: true,
    outputs: [{ value: "txt", label: "Text (.txt)" }],
    action: "Get text", glyph: { from: "PDF", to: "TXT" }, statuses: ["Opening the PDF", "Collecting the text", "Saving"], keywords: "extract txt",
  },
  {
    slug: "word-to-text", name: "Word to Text", summary: "Plain text or HTML from a DOCX.",
    category: "documents", support: "full", accept: ["docx"], maxMB: 50, mode: "each", multiple: true,
    outputs: [{ value: "txt", label: "Text (.txt)" }, { value: "html", label: "Web page (.html)" }],
    action: "Convert", glyph: { from: "DOCX", to: "TXT" }, statuses: ["Opening your document", "Collecting the text", "Saving"], keywords: "docx txt html",
  },
  {
    slug: "spreadsheet-converter", name: "Spreadsheet Converter", summary: "Move data between Excel, CSV and JSON.",
    category: "documents", support: "full",
    supportNote: "Cell values carry over. Formatting and charts don't. CSV and JSON use one file per sheet.",
    accept: ["xlsx", "xls", "csv"], maxMB: 30, mode: "each", multiple: true,
    outputs: [{ value: "csv", label: "CSV" }, { value: "xlsx", label: "Excel (.xlsx)" }, { value: "json", label: "JSON" }],
    action: "Convert", glyph: { from: "XLSX", to: "CSV" }, statuses: ["Reading the sheets", "Converting the data", "Saving"], keywords: "excel csv json data",
  },
  {
    slug: "create-zip", name: "Create ZIP", summary: "Pack several files into one ZIP.",
    category: "archives", support: "full", accept: ["*"], maxMB: 200, mode: "combine", multiple: true,
    outputs: [{ value: "zip", label: "ZIP" }],
    action: "Create ZIP", glyph: { from: "ANY", to: "ZIP", tone: "navy" }, statuses: ["Reading your files", "Packing them", "Saving the ZIP"], keywords: "compress archive pack",
  },
];

export const categories: { value: Category; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "documents", label: "Documents" },
  { value: "images", label: "Images" },
  { value: "media", label: "Audio and video" },
  { value: "archives", label: "Archives and size" },
];

export const quickTools = tools.filter((t) => t.quick);
export const getTool = (slug: string) => tools.find((t) => t.slug === slug);

export function toolAccepts(tool: Tool, ext: string) {
  return tool.accept.includes("*") || tool.accept.includes(ext);
}

/** Tools that accept every one of these extensions. Dedicated tools come before catch-alls. */
export function toolsForExtensions(exts: string[]) {
  if (!exts.length) return [];
  return tools
    .filter((t) => exts.every((e) => toolAccepts(t, e)))
    .filter((t) => exts.length === 1 || t.multiple)
    .filter((t) => !t.minFiles || exts.length >= t.minFiles)
    .sort((a, b) => Number(a.accept.includes("*")) - Number(b.accept.includes("*")));
}
