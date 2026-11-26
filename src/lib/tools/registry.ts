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
    supportNote: "Keeps headings, paragraphs, bold and italic text, alignment and pictures. Tables and columns become plain text, because PDFs don't store them as tables.",
    accept: ["pdf"], maxMB: 100, mode: "each", multiple: true,
    outputs: [{ value: "docx", label: "Word (.docx)" }],
    options: [{ key: "pageBreaks", label: "Keep page breaks", type: "toggle", default: true, hint: "Start a new page wherever the PDF does." }],
    action: "Convert", glyph: { from: "PDF", to: "DOCX" },
    statuses: ["Reading the pages", "Rebuilding paragraphs", "Writing your Word file"], keywords: "docx edit document", quick: true,
  },
  {
    slug: "word-to-pdf", name: "Word to PDF", summary: "Turn a DOCX into a PDF you can submit.",
    category: "documents", support: "full",
    supportNote: "Keeps your styles, lists, tables, pictures, headers and footers, page numbers and footnotes, in any language. Text columns and some drawings are simplified.",
    accept: ["docx"], maxMB: 50, mode: "each", multiple: true,
    outputs: [{ value: "pdf", label: "PDF" }],
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
    category: "documents", support: "full",
    supportNote: "Slides keep their layout, pictures, shapes, tables and common charts, in any language. Animations, 3D effects and some special fonts don't carry over.",
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
    category: "documents", support: "full",
    supportNote: "Keeps fonts, colours, borders, merged cells, number formats, pictures, common charts and the file's page setup.",
    accept: ["xlsx", "xls", "csv"], maxMB: 30, mode: "each", multiple: true,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [
      { key: "orientation", label: "Orientation", type: "select", default: "auto", choices: [{ value: "auto", label: "Automatic" }, { value: "landscape", label: "Landscape" }, { value: "portrait", label: "Portrait" }] },
      { key: "fit", label: "Fit columns to the page width", type: "toggle", default: true, hint: "Off: wide sheets continue on extra pages, as Excel prints them." },
      { key: "gridlines", label: "Gridlines", type: "select", default: "auto", choices: [{ value: "auto", label: "Only if the sheet has no borders" }, { value: "on", label: "Always" }, { value: "off", label: "Never" }] },
    ],
    action: "Convert", glyph: { from: "XLSX", to: "PDF" },
    statuses: ["Reading the sheets", "Laying out the pages", "Saving the PDF"], keywords: "xlsx csv spreadsheet", quick: true,
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
    slug: "image-to-text", name: "Image to Text (OCR)", summary: "Read text from scans, photos and PDFs.",
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
    slug: "video-converter", name: "Video Converter", summary: "Convert video to MP4 or WebM, or pull out the audio.",
    category: "media", support: "full",
    supportNote: "Video conversion runs on your device: a short clip takes seconds, a long lecture can take several minutes. Getting the audio is quick.",
    accept: VIDEO, maxMB: 300, mode: "each", multiple: true,
    outputs: [
      { value: "mp4", label: "MP4" },
      { value: "mp3", label: "Audio only (MP3)" },
      { value: "webm", label: "WebM" },
    ],
    options: [{ key: "bitrate", label: "Audio quality", type: "select", default: "128", showIf: (_v, o) => o === "mp3", choices: [{ value: "64", label: "Voice (64 kbps)" }, { value: "128", label: "Standard (128 kbps)" }, { value: "192", label: "High (192 kbps)" }] }],
    action: "Convert", glyph: { from: "MOV", to: "MP4", tone: "violet" },
    statuses: ["Downloading the video engine", "Converting your video", "Saving"], keywords: "mp4 mov webm lecture audio mp3", quick: true,
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
  // ---- More PDF tools
  {
    slug: "add-page-numbers", name: "Add Page Numbers", summary: "Number the pages of a PDF.",
    category: "pdf", support: "full", accept: ["pdf"], maxMB: 100, mode: "each", multiple: true,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [
      { key: "position", label: "Position", type: "select", default: "bottom-center", choices: [{ value: "bottom-center", label: "Bottom centre" }, { value: "bottom-right", label: "Bottom right" }, { value: "bottom-left", label: "Bottom left" }, { value: "top-right", label: "Top right" }, { value: "top-center", label: "Top centre" }] },
      { key: "format", label: "Style", type: "select", default: "n", choices: [{ value: "n", label: "1" }, { value: "page-n", label: "Page 1" }, { value: "n-of-total", label: "1 of 10" }, { value: "page-n-of-total", label: "Page 1 of 10" }] },
      { key: "start", label: "First number", type: "text", default: "1" },
      { key: "skipFirst", label: "Don't number the first page", type: "toggle", default: false, hint: "For a cover page." },
      { key: "size", label: "Size", type: "select", default: "11", choices: [{ value: "9", label: "Small" }, { value: "11", label: "Medium" }, { value: "14", label: "Large" }] },
    ],
    primaryOptions: ["position", "format"],
    action: "Add numbers", glyph: { from: "PDF", to: "1 2 3" }, statuses: ["Opening the PDF", "Numbering pages", "Saving"], keywords: "page numbers paginate number pdf pages", quick: false,
  },
  {
    slug: "watermark-pdf", name: "Watermark PDF", summary: "Stamp DRAFT or your name across every page.",
    category: "pdf", support: "full", accept: ["pdf"], maxMB: 100, mode: "each", multiple: true,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [
      { key: "text", label: "Watermark text", type: "text", default: "DRAFT", placeholder: "DRAFT", required: true },
      { key: "layout", label: "Direction", type: "select", default: "diagonal", choices: [{ value: "diagonal", label: "Diagonal" }, { value: "horizontal", label: "Horizontal" }] },
      { key: "opacity", label: "Opacity", type: "range", default: 20, min: 5, max: 60, step: 5, unit: "%" },
      { key: "color", label: "Colour", type: "select", default: "gray", choices: [{ value: "gray", label: "Grey" }, { value: "red", label: "Red" }, { value: "blue", label: "Blue" }, { value: "black", label: "Black" }] },
      { key: "scale", label: "Size", type: "range", default: 100, min: 30, max: 100, step: 10, unit: "%" },
    ],
    primaryOptions: ["text"],
    action: "Add watermark", glyph: { from: "PDF" }, statuses: ["Opening the PDF", "Adding the watermark", "Saving"], keywords: "stamp draft confidential watermark",
  },
  {
    slug: "protect-pdf", name: "Protect PDF", summary: "Lock a PDF with a password.",
    category: "pdf", support: "full", accept: ["pdf"], maxMB: 100, mode: "each", multiple: false,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [
      { key: "password", label: "Password", type: "text", default: "", secret: true, required: true, hint: "At least 4 characters. Your password never leaves this device." },
      { key: "print", label: "Allow printing", type: "toggle", default: true },
      { key: "copy", label: "Allow copying text", type: "toggle", default: false },
    ],
    primaryOptions: ["password"],
    action: "Protect PDF", glyph: { from: "PDF" }, statuses: ["Opening the PDF", "Adding the password", "Saving"], keywords: "password encrypt lock secure",
  },
  {
    slug: "unlock-pdf", name: "Unlock PDF", summary: "Remove a password you know from a PDF.",
    category: "pdf", support: "full", accept: ["pdf"], maxMB: 100, mode: "each", multiple: false,
    supportNote: "You need the PDF's password. This tool doesn't guess or break passwords.",
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [{ key: "password", label: "PDF password", type: "text", default: "", secret: true, required: true }],
    primaryOptions: ["password"],
    action: "Unlock PDF", glyph: { from: "PDF" }, statuses: ["Opening the PDF", "Removing the password", "Saving"], keywords: "remove password decrypt unlock",
  },
  {
    slug: "delete-pdf-pages", name: "Delete PDF Pages", summary: "Remove blank or unwanted pages.",
    category: "pdf", support: "full", accept: ["pdf"], maxMB: 100, mode: "each", multiple: false,
    outputs: [{ value: "pdf", label: "PDF" }],
    options: [{ key: "pages", label: "Pages to delete", type: "text", default: "", placeholder: "2, 5-7", required: true, hint: "Use commas and dashes, such as 2, 5-7." }],
    primaryOptions: ["pages"],
    action: "Delete pages", glyph: { from: "PDF" }, statuses: ["Opening the PDF", "Removing pages", "Saving"], keywords: "remove pages delete blank page",
  },
  {
    slug: "extract-pdf-images", name: "Extract PDF Images", summary: "Save the pictures inside a PDF.",
    category: "pdf", support: "full", accept: ["pdf"], maxMB: 100, mode: "each", multiple: true,
    outputs: [{ value: "images", label: "Pictures" }],
    action: "Extract images", glyph: { from: "PDF", to: "JPG" }, statuses: ["Opening the PDF", "Finding pictures", "Saving"], keywords: "get images from pdf extract photos",
  },
  // ---- More image tools
  {
    slug: "resize-image", name: "Resize Image", summary: "Change an image's width and height.",
    category: "images", support: "full", accept: IMAGES, maxMB: 40, mode: "each", multiple: true,
    outputs: [{ value: "same", label: "Same format" }],
    options: [
      { key: "mode", label: "Resize by", type: "select", default: "pixels", choices: [{ value: "pixels", label: "Width and height (pixels)" }, { value: "percent", label: "Percentage" }] },
      { key: "width", label: "Width (px)", type: "text", default: "1200", placeholder: "1200", showIf: (v) => v.mode !== "percent" },
      { key: "height", label: "Height (px)", type: "text", default: "", placeholder: "Automatic", showIf: (v) => v.mode !== "percent" },
      { key: "keepRatio", label: "Keep proportions", type: "toggle", default: true, showIf: (v) => v.mode !== "percent", hint: "Off: stretch to exactly this width and height." },
      { key: "percent", label: "Scale", type: "range", default: 50, min: 5, max: 200, step: 5, unit: "%", showIf: (v) => v.mode === "percent" },
      { key: "format", label: "Save as", type: "select", default: "same", choices: [{ value: "same", label: "Same format" }, { value: "jpg", label: "JPG" }, { value: "png", label: "PNG" }, { value: "webp", label: "WebP" }] },
    ],
    primaryOptions: ["mode", "width", "height", "percent"],
    action: "Resize", glyph: { from: "JPG", tone: "violet" }, statuses: ["Opening your image", "Resizing", "Saving"], keywords: "resize photo dimensions pixels scale image size",
  },
  {
    slug: "compress-image", name: "Compress Image to KB", summary: "Get a photo under 20, 50 or 100 KB for forms.",
    category: "images", support: "full", accept: IMAGES, maxMB: 40, mode: "each", multiple: true,
    supportNote: "Saves a JPG as close to your target as possible. Made for exam, scholarship and job forms.",
    outputs: [{ value: "jpg", label: "JPG" }],
    options: [
      { key: "target", label: "Target size (KB)", type: "text", default: "50", placeholder: "50", required: true },
      { key: "maxSide", label: "Maximum size", type: "select", default: "0", choices: [{ value: "0", label: "Keep dimensions if possible" }, { value: "1200", label: "1200 px" }, { value: "800", label: "800 px" }, { value: "400", label: "400 px" }] },
    ],
    primaryOptions: ["target"],
    action: "Compress", glyph: { from: "JPG", to: "KB", tone: "violet" }, statuses: ["Opening your image", "Finding the best quality", "Saving"], keywords: "compress photo 20kb 50kb 100kb signature exam form reduce image size", quick: false,
  },
  // ---- Audio and video
  {
    slug: "trim-audio", name: "Trim Audio", summary: "Cut a recording down to the part you need.",
    category: "media", support: "full", accept: AUDIO, maxMB: 150, mode: "each", multiple: false,
    outputs: [{ value: "mp3", label: "MP3" }, { value: "wav", label: "WAV" }],
    options: [
      { key: "start", label: "Start", type: "text", default: "0:00", placeholder: "0:00", hint: "Minutes and seconds, such as 1:30." },
      { key: "end", label: "End", type: "text", default: "", placeholder: "End of recording" },
    ],
    primaryOptions: ["start", "end"],
    action: "Trim", glyph: { from: "MP3", tone: "violet" }, statuses: ["Opening the audio", "Cutting", "Saving"], keywords: "cut audio trim recording lecture clip mp3 cutter",
  },
  {
    slug: "compress-video", name: "Compress Video", summary: "Make a video small enough to upload.",
    category: "media", support: "full", accept: VIDEO, maxMB: 300, mode: "each", multiple: false,
    supportNote: "Runs on your device, so long videos take a while: about real time for 720p on a laptop. Short clips work best.",
    outputs: [{ value: "mp4", label: "MP4" }],
    options: [
      { key: "resolution", label: "Resolution", type: "select", default: "720", choices: [{ value: "1080", label: "1080p" }, { value: "720", label: "720p" }, { value: "480", label: "480p" }, { value: "0", label: "Keep original" }] },
      { key: "quality", label: "Quality", type: "select", default: "balanced", choices: [{ value: "high", label: "High" }, { value: "balanced", label: "Balanced" }, { value: "small", label: "Small file" }] },
    ],
    primaryOptions: ["resolution", "quality"],
    action: "Compress", glyph: { from: "MP4", tone: "violet" }, statuses: ["Downloading the video engine", "Compressing your video", "Saving"], keywords: "reduce video size compress mp4 upload whatsapp",
  },
  {
    slug: "video-to-gif", name: "Video to GIF", summary: "Turn a short clip into a GIF.",
    category: "media", support: "full", accept: VIDEO, maxMB: 200, mode: "each", multiple: false,
    outputs: [{ value: "gif", label: "GIF" }],
    options: [
      { key: "start", label: "Start at", type: "text", default: "0:00", placeholder: "0:00" },
      { key: "duration", label: "Length", type: "select", default: "5", choices: [{ value: "3", label: "3 seconds" }, { value: "5", label: "5 seconds" }, { value: "10", label: "10 seconds" }] },
      { key: "width", label: "Width", type: "select", default: "480", choices: [{ value: "320", label: "320 px" }, { value: "480", label: "480 px" }, { value: "640", label: "640 px" }] },
      { key: "fps", label: "Smoothness", type: "select", default: "12", choices: [{ value: "8", label: "Light (8 fps)" }, { value: "12", label: "Standard (12 fps)" }, { value: "18", label: "Smooth (18 fps)" }] },
    ],
    primaryOptions: ["start", "duration"],
    action: "Make GIF", glyph: { from: "MP4", to: "GIF", tone: "violet" }, statuses: ["Downloading the video engine", "Making your GIF", "Saving"], keywords: "gif maker video to gif animation",
  },
  {
    slug: "trim-video", name: "Trim Video", summary: "Cut the start or end off a video.",
    category: "media", support: "full", accept: VIDEO, maxMB: 300, mode: "each", multiple: false,
    outputs: [{ value: "same", label: "Same format" }],
    options: [
      { key: "start", label: "Start", type: "text", default: "0:00", placeholder: "0:00", hint: "Minutes and seconds, such as 1:30." },
      { key: "end", label: "End", type: "text", default: "", placeholder: "End of video" },
      { key: "precise", label: "Precise cut", type: "toggle", default: false, hint: "Slower. Without it, the cut snaps to the nearest keyframe, usually within a second or two." },
    ],
    primaryOptions: ["start", "end"],
    action: "Trim", glyph: { from: "MP4", tone: "violet" }, statuses: ["Downloading the video engine", "Trimming your video", "Saving"], keywords: "cut video trim clip",
  },
  // ---- Study tools
  { slug: "word-counter", kind: "study", name: "Word Counter", summary: "Count words, characters and reading time.", category: "study", support: "full", accept: [], maxMB: 50, mode: "each", multiple: false, outputs: [{ value: "none", label: "" }], action: "", glyph: { from: "TXT", to: "123" }, statuses: [], keywords: "word count character count essay length reading time" },
  { slug: "citation-generator", kind: "study", name: "Citation Generator", summary: "APA, MLA and Harvard references, formatted for you.", category: "study", support: "full", accept: [], maxMB: 0, mode: "each", multiple: false, outputs: [{ value: "none", label: "" }], action: "", glyph: { from: "APA", to: "MLA" }, statuses: [], keywords: "cite reference bibliography apa mla harvard works cited" },
  { slug: "case-converter", kind: "study", name: "Case Converter", summary: "UPPERCASE, lowercase, Title Case and more.", category: "study", support: "full", accept: [], maxMB: 0, mode: "each", multiple: false, outputs: [{ value: "none", label: "" }], action: "", glyph: { from: "abc", to: "ABC" }, statuses: [], keywords: "uppercase lowercase title case sentence case text" },
  { slug: "qr-code-generator", kind: "study", name: "QR Code Generator", summary: "QR codes for posters, projects and links.", category: "study", support: "full", accept: [], maxMB: 0, mode: "each", multiple: false, outputs: [{ value: "none", label: "" }], action: "", glyph: { from: "URL", to: "QR" }, statuses: [], keywords: "qr code maker link poster" },
  // ---- Format shortcuts: same engines, pages for what people search
  { slug: "png-to-jpg", engine: "image-converter", name: "PNG to JPG", summary: "Turn PNG images into smaller JPGs.", category: "images", support: "full", accept: ["png"], maxMB: 40, mode: "each", multiple: true, outputs: [{ value: "jpg", label: "JPG" }], options: [{ key: "quality", label: "Image quality", type: "range", default: 85, min: 40, max: 100, step: 5, unit: "%" }], action: "Convert", glyph: { from: "PNG", to: "JPG", tone: "violet" }, statuses: ["Opening your image", "Converting", "Saving"], keywords: "png jpg jpeg convert" },
  { slug: "jpg-to-png", engine: "image-converter", name: "JPG to PNG", summary: "Convert JPG photos to PNG.", category: "images", support: "full", accept: ["jpg", "jpeg"], maxMB: 40, mode: "each", multiple: true, outputs: [{ value: "png", label: "PNG" }], action: "Convert", glyph: { from: "JPG", to: "PNG", tone: "violet" }, statuses: ["Opening your image", "Converting", "Saving"], keywords: "jpg jpeg png convert" },
  { slug: "heic-to-jpg", engine: "image-converter", name: "HEIC to JPG", summary: "Open iPhone photos anywhere as JPGs.", category: "images", support: "full", accept: ["heic", "heif"], maxMB: 40, mode: "each", multiple: true, outputs: [{ value: "jpg", label: "JPG" }], options: [{ key: "quality", label: "Image quality", type: "range", default: 90, min: 40, max: 100, step: 5, unit: "%" }], action: "Convert", glyph: { from: "HEIC", to: "JPG", tone: "violet" }, statuses: ["Opening your photo", "Converting", "Saving"], keywords: "heic jpg iphone photo convert heif" },
  { slug: "webp-to-jpg", engine: "image-converter", name: "WebP to JPG", summary: "Convert WebP images that won't open.", category: "images", support: "full", accept: ["webp"], maxMB: 40, mode: "each", multiple: true, outputs: [{ value: "jpg", label: "JPG" }, { value: "png", label: "PNG" }], action: "Convert", glyph: { from: "WEBP", to: "JPG", tone: "violet" }, statuses: ["Opening your image", "Converting", "Saving"], keywords: "webp jpg png convert" },
  { slug: "png-to-pdf", engine: "jpg-to-pdf", name: "PNG to PDF", summary: "Put screenshots and PNGs into one PDF.", category: "images", support: "full", accept: ["png"], maxMB: 40, mode: "combine", multiple: true, outputs: [{ value: "pdf", label: "PDF" }], options: [{ key: "pageSize", label: "Page size", type: "select", default: "a4", choices: [{ value: "a4", label: "A4" }, { value: "letter", label: "US Letter" }, { value: "fit", label: "Match each image" }] }, { key: "margin", label: "Margin", type: "select", default: "small", choices: [{ value: "none", label: "None" }, { value: "small", label: "Small" }, { value: "large", label: "Large" }] }], action: "Create PDF", glyph: { from: "PNG", to: "PDF", tone: "violet" }, statuses: ["Reading your images", "Placing them on pages", "Saving the PDF"], keywords: "png pdf screenshots combine" },
  { slug: "pdf-to-png", engine: "pdf-to-jpg", name: "PDF to PNG", summary: "Save PDF pages as sharp PNG images.", category: "pdf", support: "full", accept: ["pdf"], maxMB: 100, mode: "each", multiple: true, outputs: [{ value: "png", label: "PNG" }], options: [{ key: "dpi", label: "Resolution", type: "select", default: "150", choices: [{ value: "96", label: "Screen (96 dpi)" }, { value: "150", label: "Standard (150 dpi)" }, { value: "300", label: "Print (300 dpi)" }] }], action: "Convert", glyph: { from: "PDF", to: "PNG" }, statuses: ["Opening the PDF", "Drawing the pages", "Saving the images"], keywords: "pdf png image" },
  { slug: "mp4-to-mp3", engine: "video-converter", name: "MP4 to MP3", summary: "Get the audio from a video as MP3.", category: "media", support: "full", accept: VIDEO, maxMB: 300, mode: "each", multiple: true, outputs: [{ value: "mp3", label: "MP3" }], options: [{ key: "bitrate", label: "Audio quality", type: "select", default: "128", choices: [{ value: "64", label: "Voice (64 kbps)" }, { value: "128", label: "Standard (128 kbps)" }, { value: "192", label: "High (192 kbps)" }] }], action: "Convert", glyph: { from: "MP4", to: "MP3", tone: "violet" }, statuses: ["Opening the video", "Encoding", "Saving"], keywords: "mp4 mp3 video audio extract" },
  { slug: "m4a-to-mp3", engine: "audio-converter", name: "M4A to MP3", summary: "Convert iPhone voice memos to MP3.", category: "media", support: "full", accept: ["m4a", "aac"], maxMB: 150, mode: "each", multiple: true, outputs: [{ value: "mp3", label: "MP3" }], options: [{ key: "bitrate", label: "Quality", type: "select", default: "128", choices: [{ value: "64", label: "Voice notes (64 kbps)" }, { value: "128", label: "Standard (128 kbps)" }, { value: "192", label: "High (192 kbps)" }] }], action: "Convert", glyph: { from: "M4A", to: "MP3", tone: "violet" }, statuses: ["Opening the audio", "Encoding", "Saving"], keywords: "m4a mp3 voice memo iphone" },
  { slug: "wav-to-mp3", engine: "audio-converter", name: "WAV to MP3", summary: "Shrink WAV recordings to MP3.", category: "media", support: "full", accept: ["wav"], maxMB: 300, mode: "each", multiple: true, outputs: [{ value: "mp3", label: "MP3" }], options: [{ key: "bitrate", label: "Quality", type: "select", default: "128", choices: [{ value: "64", label: "Voice (64 kbps)" }, { value: "128", label: "Standard (128 kbps)" }, { value: "192", label: "High (192 kbps)" }, { value: "320", label: "Best (320 kbps)" }] }], action: "Convert", glyph: { from: "WAV", to: "MP3", tone: "violet" }, statuses: ["Opening the audio", "Encoding", "Saving"], keywords: "wav mp3 compress audio" },
  { slug: "csv-to-excel", engine: "spreadsheet-converter", name: "CSV to Excel", summary: "Open CSV exports as Excel files.", category: "documents", support: "full", accept: ["csv"], maxMB: 30, mode: "each", multiple: true, outputs: [{ value: "xlsx", label: "Excel (.xlsx)" }], action: "Convert", glyph: { from: "CSV", to: "XLSX" }, statuses: ["Reading the data", "Converting", "Saving"], keywords: "csv xlsx excel google forms export" },
  { slug: "excel-to-csv", engine: "spreadsheet-converter", name: "Excel to CSV", summary: "Save each sheet as a CSV file.", category: "documents", support: "full", accept: ["xlsx", "xls"], maxMB: 30, mode: "each", multiple: true, outputs: [{ value: "csv", label: "CSV" }], action: "Convert", glyph: { from: "XLSX", to: "CSV" }, statuses: ["Reading the sheets", "Converting", "Saving"], keywords: "xlsx csv excel export data" },
];

export const categories: { value: Category; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "documents", label: "Documents" },
  { value: "images", label: "Images" },
  { value: "media", label: "Audio and video" },
  { value: "archives", label: "Archives and size" },
  { value: "study", label: "Study tools" },
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
