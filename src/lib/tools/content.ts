/**
 * Search-page copy for each tool. Keep it accurate to what the tool really does:
 * promises here that the converter doesn't keep cost more trust than they win in rankings.
 */
export interface ToolContent {
  /** Page title before the site name, about 50 characters. */
  title: string;
  /** Search result snippet, about 150 characters. */
  description: string;
  keywords: string[];
  /** The page's main heading. */
  heading: string;
  intro: string;
  uses: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
}

export const content: Record<string, ToolContent> = {
  "pdf-to-word": {
    title: "PDF to Word Converter: Free, No Sign-up",
    description: "Convert PDF to an editable Word document for free. Made for students: no sign-up, no watermark, and your PDF never leaves your device.",
    keywords: ["pdf to word", "pdf to docx", "convert pdf to word free", "editable pdf", "pdf to word for students"],
    heading: "Free PDF to Word converter",
    intro: "Turn a PDF into a Word document you can edit, so you can quote from a reading, fix a draft that only exists as a PDF, or reuse your own notes. Headings, paragraphs and page breaks carry over.",
    uses: [
      { title: "Edit an old assignment", text: "Lost the original .docx? Get the text back from the PDF you submitted and keep working." },
      { title: "Quote from readings", text: "Copy passages from lecture PDFs into your essay without retyping them." },
      { title: "Fix a group project file", text: "Turn a teammate's exported PDF back into something everyone can edit." },
    ],
    faqs: [
      { q: "Will my PDF look exactly the same in Word?", a: "The text, headings and page breaks carry over. Images, tables and multi-column layouts are simplified to plain text, so check the result before you reuse it." },
      { q: "Why does it say my PDF has no text?", a: "Scanned PDFs are pictures of pages, so there's no text to copy. Use Image to Text (OCR) instead; it can save straight to Word." },
    ],
  },
  "word-to-pdf": {
    title: "Word to PDF Converter: Free for Students",
    description: "Convert DOCX to PDF free, ready to submit on your learning portal. No sign-up, no watermark, and your document stays on your device.",
    keywords: ["word to pdf", "docx to pdf", "convert word to pdf free", "assignment to pdf", "doc to pdf for students"],
    heading: "Free Word to PDF converter",
    intro: "Most portals want assignments as PDFs. Turn your .docx into a PDF in seconds, with headings, lists, tables and pictures in place.",
    uses: [
      { title: "Submit assignments", text: "Meet the \"PDF only\" rule on Moodle, Google Classroom or your college portal." },
      { title: "Share notes that look the same everywhere", text: "A PDF opens the same on every phone and laptop." },
      { title: "Print at the library", text: "Library computers and print shops handle PDFs without font surprises." },
    ],
    faqs: [
      { q: "Will my formatting stay the same?", a: "Headings, bold and italic text, lists, tables and pictures carry over. Exact fonts, headers, footers and page layout can change, so look over the PDF before you submit it." },
      { q: "Does it work for Hindi or Telugu documents?", a: "Not yet. Word to PDF lays out Latin, Greek and Cyrillic text. For Indian scripts, export to PDF from Word or Google Docs. PPT to PDF does handle Indian scripts." },
      { q: "Can I convert an old .doc file?", a: "Open it in Word or Google Docs, save it as .docx, then convert it here." },
    ],
  },
  "jpg-to-pdf": {
    title: "JPG to PDF: Combine Photos into One PDF Free",
    description: "Turn photos of handwritten pages into one PDF for free. Put pages in order, pick A4, and download. No sign-up and no uploads.",
    keywords: ["jpg to pdf", "image to pdf", "photos to pdf", "combine images into pdf", "handwritten assignment to pdf"],
    heading: "Free JPG to PDF converter",
    intro: "Photographed your handwritten assignment? Add every page, put them in order and get a single PDF sized for A4 or Letter. Phone photos are turned the right way up automatically.",
    uses: [
      { title: "Submit handwritten work", text: "Turn page photos into the one PDF your teacher asked for." },
      { title: "Save whiteboard notes", text: "Keep a lecture's whiteboard photos together in one file." },
      { title: "Send certificates and IDs", text: "Combine scans for college applications and forms." },
    ],
    faqs: [
      { q: "Which image types can I use?", a: "JPG, PNG, WebP, GIF, BMP and AVIF. iPhone HEIC photos work in browsers that can open them, such as Safari." },
      { q: "How do I change the page order?", a: "Use the up and down arrows next to each image before you create the PDF. Pages follow the list from top to bottom." },
    ],
  },
  "pdf-to-jpg": {
    title: "PDF to JPG Converter: Save Pages as Images Free",
    description: "Convert each PDF page to a JPG or PNG image for free. Choose screen or print quality. No sign-up, and your PDF stays on your device.",
    keywords: ["pdf to jpg", "pdf to image", "pdf to png", "convert pdf page to image", "pdf to jpg free"],
    heading: "Free PDF to JPG converter",
    intro: "Save every page of a PDF as an image, ready for slides, social posts or a WhatsApp study group. Choose JPG for small files or PNG for sharp text.",
    uses: [
      { title: "Put a page in your slides", text: "Drop a diagram or table from a reading straight into PowerPoint." },
      { title: "Share in group chats", text: "Images preview instantly in WhatsApp and Instagram; PDFs don't." },
      { title: "Make print-quality images", text: "Use 300 dpi for posters and project boards." },
    ],
    faqs: [
      { q: "Do I get one image per page?", a: "Yes. A 10-page PDF gives 10 images, which you can download one by one or together as a ZIP." },
      { q: "JPG or PNG?", a: "JPG makes smaller files and suits photos. PNG keeps text and line drawings crisp." },
    ],
  },
  "ppt-to-pdf": {
    title: "PPT to PDF Converter: Free, Works with Any Language",
    description: "Convert PowerPoint (PPTX) slides to PDF for free. Keeps shapes, pictures, tables and charts, in any language. No sign-up and no uploads.",
    keywords: ["ppt to pdf", "pptx to pdf", "powerpoint to pdf", "convert presentation to pdf free", "slides to pdf"],
    heading: "Free PPT to PDF converter",
    intro: "Share your presentation as a PDF that opens on any device, without PowerPoint. Slides keep their layout, pictures, tables and common charts, and text in Hindi, Telugu, Tamil and other scripts displays correctly.",
    uses: [
      { title: "Submit a presentation", text: "Many portals accept only PDF. Convert your group's deck in one click." },
      { title: "Share lecture slides", text: "Send slides that open on any phone, with no app needed." },
      { title: "Print handouts", text: "A PDF prints the same at every shop." },
    ],
    faqs: [
      { q: "What doesn't carry over?", a: "Animations, transitions, 3D effects and some special fonts. Charts are redrawn from the data in the file; unusual chart types are marked on the slide." },
      { q: "Can I search the text in the PDF?", a: "Yes, for English and other Latin-script text. Slides in other scripts look right but can't be searched yet." },
      { q: "Does it work with Google Slides or Canva?", a: "Yes. Download your presentation as PowerPoint (.pptx) first, then convert it here." },
    ],
  },
  "excel-to-pdf": {
    title: "Excel to PDF Converter: Free Printable Tables",
    description: "Convert Excel (XLSX, XLS) or CSV to a printable PDF table for free. Every sheet, header rows repeated. No sign-up and no uploads.",
    keywords: ["excel to pdf", "xlsx to pdf", "csv to pdf", "spreadsheet to pdf", "convert excel to pdf free"],
    heading: "Free Excel to PDF converter",
    intro: "Turn spreadsheets into neat PDF tables for lab reports, attendance sheets and project data. Every sheet becomes its own section, and long tables repeat their header row on each page.",
    uses: [
      { title: "Attach data to a report", text: "Add your results table to a lab report or dissertation appendix." },
      { title: "Print attendance and marks", text: "Get a printable copy of a class sheet in landscape." },
      { title: "Share survey results", text: "Send results anyone can open, with no spreadsheet app needed." },
    ],
    faqs: [
      { q: "Are charts and colours kept?", a: "No. The PDF shows cell values as clean tables. Charts, cell colours and merged cells aren't carried over." },
      { q: "What if my sheet is very wide?", a: "Choose landscape. With many columns the text gets smaller to fit the page." },
    ],
  },
  "compress-pdf": {
    title: "Compress PDF: Reduce PDF Size Free",
    description: "Make a PDF smaller for upload limits while keeping its text selectable. Free, no sign-up, and your PDF never leaves your device.",
    keywords: ["compress pdf", "reduce pdf size", "pdf size reducer", "make pdf smaller", "compress pdf to 1mb"],
    heading: "Free PDF compressor",
    intro: "Portal says your file is too big? Shrink the PDF by recompressing the pictures inside it. Text stays sharp and selectable, and you can see exactly how much smaller the file got.",
    uses: [
      { title: "Beat upload limits", text: "Get under the 2 MB or 5 MB cap on college and exam portals." },
      { title: "Email big readings", text: "Make scanned chapters small enough to attach." },
      { title: "Save phone storage", text: "Keep a semester of notes without filling your phone." },
    ],
    faqs: [
      { q: "How much smaller will it get?", a: "It depends on the pictures inside. Scans and photo-heavy PDFs often shrink by more than half. A PDF that's mostly text may already be about as small as it can be." },
      { q: "Will the text get blurry?", a: "No. Only pictures are recompressed; text and drawings are left as they are. Choose Light if the pictures need to stay sharp." },
    ],
  },
  "merge-pdf": {
    title: "Merge PDF: Combine PDF Files Free",
    description: "Combine several PDFs into one, in the order you choose. Free, no sign-up, no watermark, and your files stay on your device.",
    keywords: ["merge pdf", "combine pdf", "join pdf files", "merge pdf free", "combine pdf for assignment"],
    heading: "Free PDF merger",
    intro: "Join your cover page, assignment and references into the single PDF your teacher wants. Put the files in order, then merge. Every page keeps its original layout.",
    uses: [
      { title: "One file per submission", text: "Combine the cover sheet, answers and annexures." },
      { title: "Group project reports", text: "Join each member's section into the final report." },
      { title: "Applications", text: "Put certificates and mark sheets into one upload." },
    ],
    faqs: [
      { q: "How do I set the order?", a: "Use the up and down arrows beside each file. The merged PDF follows the list from top to bottom." },
      { q: "Can I merge a password-protected PDF?", a: "Not directly. Open it with its password, save a copy without one, then merge that copy." },
    ],
  },
  "split-pdf": {
    title: "Split PDF: Extract Pages from a PDF Free",
    description: "Pull out the pages you need, or split a PDF into single pages. Free, no sign-up, and your PDF stays on your device.",
    keywords: ["split pdf", "extract pages from pdf", "separate pdf pages", "split pdf free", "pdf page extractor"],
    heading: "Free PDF splitter",
    intro: "Need just one chapter from a long reading, or each question as its own file? Type the page ranges you want, or split the whole PDF into single pages.",
    uses: [
      { title: "Take one chapter", text: "Keep only the pages you need from a big textbook PDF." },
      { title: "Submit answers separately", text: "Some portals want one file per question." },
      { title: "Share part of a document", text: "Send only the relevant pages to your group." },
    ],
    faqs: [
      { q: "How do I write the page ranges?", a: "Use commas and dashes, like 1-3, 5, 8-10. Each range becomes its own PDF." },
      { q: "Can I get every page as a separate file?", a: "Yes. Choose \"One file per page\" and download them all together as a ZIP." },
    ],
  },
  "image-to-text": {
    title: "Image to Text (OCR): Free Online Text Extractor",
    description: "Extract text from photos, scans and scanned PDFs for free. Save as text, Word or a searchable PDF. No sign-up, and nothing is uploaded.",
    keywords: ["image to text", "ocr online free", "extract text from image", "scanned pdf to text", "photo to text", "handwriting to text"],
    heading: "Free image to text converter (OCR)",
    intro: "Turn photos of notes, textbook pages and scanned PDFs into text you can edit and search. Save as plain text, a Word document, or a searchable PDF that keeps the original look.",
    uses: [
      { title: "Make notes searchable", text: "Find any word in a semester of scanned notes." },
      { title: "Copy from a textbook photo", text: "Quote a passage without retyping it." },
      { title: "Fix a scanned assignment", text: "Get editable text from a scan, then correct it in Word." },
    ],
    faqs: [
      { q: "Does it read handwriting?", a: "Sometimes. Clear, printed text works best. Neat handwriting may be readable, but check the result carefully." },
      { q: "Which languages does it read?", a: "English for now." },
      { q: "How do I get the best results?", a: "Photograph the page straight on, in good light, with the text filling the frame." },
    ],
  },
  "image-converter": {
    title: "Image Converter: JPG, PNG and WebP Free",
    description: "Convert images between JPG, PNG and WebP, and resize them, for free. Works with iPhone HEIC in Safari. No sign-up and no uploads.",
    keywords: ["image converter", "png to jpg", "jpg to png", "webp to jpg", "heic to jpg", "resize image"],
    heading: "Free image converter",
    intro: "Change an image's format or size in seconds: PNG to JPG for smaller files, JPG to PNG for editing, or WebP to JPG when an app won't accept it. You can resize at the same time.",
    uses: [
      { title: "Meet portal requirements", text: "Many forms only accept JPG under a certain size." },
      { title: "Fix images that won't open", text: "Turn WebP downloads into JPGs that every app opens." },
      { title: "Shrink photos for slides", text: "Resize big camera photos so your deck stays light." },
    ],
    faqs: [
      { q: "Will transparent backgrounds be kept?", a: "Yes in PNG and WebP. JPG has no transparency, so clear areas become white." },
      { q: "Can I convert iPhone HEIC photos?", a: "Yes, in browsers that can open HEIC, such as Safari. In other browsers, set your iPhone camera to \"Most Compatible\" to save JPGs." },
    ],
  },
  "audio-converter": {
    title: "Audio Converter: Convert to MP3 or WAV Free",
    description: "Convert M4A, WAV, OGG, FLAC and AAC recordings to MP3 or WAV for free. Ideal for lecture recordings. No sign-up and no uploads.",
    keywords: ["audio converter", "m4a to mp3", "wav to mp3", "convert recording to mp3", "lecture recording mp3"],
    heading: "Free audio converter",
    intro: "Convert voice memos and lecture recordings to MP3 so they play anywhere and take less space, or to WAV for editing. Mono can halve the size of voice recordings.",
    uses: [
      { title: "Lecture recordings", text: "Shrink long recordings so they fit on your phone." },
      { title: "Podcast and media projects", text: "Get WAV files for your editing software." },
      { title: "Share voice notes", text: "MP3 plays on every device and app." },
    ],
    faqs: [
      { q: "Which formats can I convert from?", a: "MP3, WAV, M4A, AAC, OGG and FLAC, depending on what your browser can open. MP3, WAV and M4A work almost everywhere." },
      { q: "Which MP3 quality should I pick?", a: "64 kbps is fine for speech, 128 kbps for most audio, and 192 kbps or more for music." },
    ],
  },
  "video-converter": {
    title: "Video to MP3: Extract Audio from Video Free",
    description: "Get the audio from MP4, MOV and WebM videos as an MP3 for free. Great for lecture videos. MP4 and WebM output is a preview for now.",
    keywords: ["video to mp3", "mp4 to mp3", "extract audio from video", "video converter", "lecture video to audio"],
    heading: "Free video converter",
    intro: "Pull the audio out of a lecture video or recorded class as an MP3, so you can listen on the go. Converting between video formats (MP4, WebM) is coming soon and shows a preview for now.",
    uses: [
      { title: "Listen to lectures on the go", text: "Turn a recorded class into audio for your commute." },
      { title: "Get interview audio", text: "Use the sound from a recorded interview in your project." },
      { title: "Save phone storage", text: "An MP3 is a fraction of the size of the video." },
    ],
    faqs: [
      { q: "Can I convert MP4 to WebM or MOV to MP4?", a: "Not yet. Those options show a placeholder so you can see the flow. Getting the audio as MP3 works on your real file." },
      { q: "Why won't my video open?", a: "Your browser has to be able to read the video's audio. Chrome opens the widest range of files." },
    ],
  },
  "zip-extractor": {
    title: "ZIP Extractor: Open ZIP Files Online Free",
    description: "Open a ZIP file and download what's inside, on any device, even a phone. Free, no sign-up, and the ZIP never leaves your device.",
    keywords: ["zip extractor", "unzip online", "open zip file", "extract zip on phone", "unzip files free"],
    heading: "Free online ZIP extractor",
    intro: "Teachers often share course material as ZIP files. Open one on any device, see what's inside, and save just the files you need.",
    uses: [
      { title: "Open course material", text: "Get at assignment packs and lecture bundles on your phone." },
      { title: "Check a download", text: "See what's in a ZIP before you save everything." },
      { title: "Get one file out", text: "Download only the file you need." },
    ],
    faqs: [
      { q: "Can it open RAR or 7z files?", a: "Not yet. Only ZIP files for now." },
      { q: "What about password-protected ZIPs?", a: "Those need your computer's own unzip app, where you can enter the password." },
    ],
  },
  "file-size-reducer": {
    title: "File Size Reducer: Shrink PDF, PPT, Word Files Free",
    description: "Reduce the size of PDFs, PowerPoint, Word, Excel, images and audio for upload limits. Free, no sign-up, and files stay on your device.",
    keywords: ["file size reducer", "reduce file size", "compress ppt", "compress word document", "reduce pptx size", "compress file for upload"],
    heading: "Free file size reducer",
    intro: "Upload limits are tight. Shrink presentations, documents, PDFs, images and recordings by recompressing the pictures and audio inside them. You keep the same format, just smaller.",
    uses: [
      { title: "Upload big presentations", text: "Picture-heavy slide decks often shrink the most." },
      { title: "Email attachments", text: "Get under Gmail's 25 MB limit." },
      { title: "Exam and application portals", text: "Meet strict size caps without retyping anything." },
    ],
    faqs: [
      { q: "Which files can it reduce?", a: "PDF, PowerPoint (.pptx), Word (.docx), Excel (.xlsx), JPG, PNG, WebP, MP3, M4A and WAV." },
      { q: "Why didn't my file get smaller?", a: "Most of the saving comes from pictures and audio. A file that's mostly text may already be as small as it can be. Try the Strong setting." },
    ],
  },
  "rotate-pdf": {
    title: "Rotate PDF: Turn PDF Pages Free",
    description: "Rotate sideways or upside-down PDF pages and save the fix. Free, no sign-up, and your PDF never leaves your device.",
    keywords: ["rotate pdf", "turn pdf pages", "fix sideways pdf", "rotate pdf free", "flip pdf"],
    heading: "Free PDF rotator",
    intro: "Scanned a page sideways? Rotate the PDF by 90 or 180 degrees and save it, so it opens the right way up for everyone.",
    uses: [
      { title: "Fix scanned pages", text: "Turn sideways scans the right way up before you submit." },
      { title: "Landscape tables", text: "Rotate wide pages so they read properly." },
      { title: "Upside-down photos", text: "Fix pages photographed the wrong way round." },
    ],
    faqs: [
      { q: "Does rotating reduce quality?", a: "No. Pages are turned, not redrawn, so nothing changes in quality." },
      { q: "Can I rotate just one page?", a: "This tool rotates every page. To fix one page, split it out, rotate it, then merge the PDF again." },
    ],
  },
  "pdf-to-text": {
    title: "PDF to Text: Extract Text from PDF Free",
    description: "Copy all the text out of a PDF into a plain .txt file for free. No sign-up, no uploads, and paragraphs are rejoined for you.",
    keywords: ["pdf to text", "extract text from pdf", "pdf to txt", "copy text from pdf", "pdf text extractor"],
    heading: "Free PDF to text converter",
    intro: "Get every word out of a PDF as plain text, with broken lines joined back into paragraphs. Handy for notes, summaries and word counts.",
    uses: [
      { title: "Make study notes", text: "Paste a reading's text into your notes app." },
      { title: "Count words", text: "Check the length of a paper or abstract." },
      { title: "Use with other tools", text: "Plain text works with any app." },
    ],
    faqs: [
      { q: "Why is my text file empty?", a: "The PDF is probably a scan. Use Image to Text (OCR) to read the text from the page images." },
      { q: "Is the formatting kept?", a: "No. You get plain text, with paragraphs and page breaks kept." },
    ],
  },
  "word-to-text": {
    title: "Word to Text: Convert DOCX to TXT or HTML Free",
    description: "Convert a Word document to plain text or a clean web page (HTML) for free. No sign-up, and your document stays on your device.",
    keywords: ["word to text", "docx to txt", "docx to html", "convert word to plain text", "word to html"],
    heading: "Free Word to text converter",
    intro: "Strip a Word document down to plain text for forms and word counts, or turn it into clean HTML for a blog, a website or a college magazine.",
    uses: [
      { title: "Paste into online forms", text: "Plain text pastes cleanly into application boxes." },
      { title: "Publish online", text: "Get simple HTML for a blog or website." },
      { title: "Check word count", text: "See your essay as plain text." },
    ],
    faqs: [
      { q: "What does the HTML version keep?", a: "Headings, paragraphs, lists, bold, italics, links, tables and images." },
      { q: "Can I convert .doc files?", a: "Save the file as .docx in Word or Google Docs first, then convert it here." },
    ],
  },
  "spreadsheet-converter": {
    title: "Spreadsheet Converter: Excel to CSV, JSON Free",
    description: "Convert between Excel (XLSX, XLS), CSV and JSON for free. One CSV per sheet. No sign-up, and your data stays on your device.",
    keywords: ["excel to csv", "csv to excel", "xlsx to csv", "excel to json", "csv to xlsx", "spreadsheet converter"],
    heading: "Free spreadsheet converter",
    intro: "Move data between Excel, CSV and JSON, for statistics software, coding projects, Google Forms exports and anything else that needs a different format.",
    uses: [
      { title: "Statistics and coding classes", text: "Get CSV or JSON for Python, R or SPSS." },
      { title: "Open CSV exports in Excel", text: "Turn form and survey exports into .xlsx files." },
      { title: "Share data cleanly", text: "CSV opens in every spreadsheet app." },
    ],
    faqs: [
      { q: "What happens to multiple sheets?", a: "CSV and JSON give one file per sheet. Excel output keeps all the sheets in one file." },
      { q: "Are formulas kept?", a: "The values are kept. Formulas, formatting and charts aren't." },
    ],
  },
  "create-zip": {
    title: "Create ZIP: Compress Files into a ZIP Free",
    description: "Pack several files into one ZIP to submit or share. Free, no sign-up, works on phones, and your files never leave your device.",
    keywords: ["create zip", "zip files online", "compress files to zip", "make zip on phone", "zip folder online"],
    heading: "Free ZIP file creator",
    intro: "Need to submit several files as one upload? Add them all and get a single ZIP, ready for a portal or an email.",
    uses: [
      { title: "Submit a project", text: "Bundle code, reports and images into one upload." },
      { title: "Send many photos", text: "Share a set of images as one attachment." },
      { title: "Keep files together", text: "Archive a finished assignment with its sources." },
    ],
    faqs: [
      { q: "Can I add different file types?", a: "Yes. Any mix of files can go into one ZIP." },
      { q: "Does zipping make files smaller?", a: "Documents and text shrink. Photos, videos and PDFs are already compressed, so they barely change." },
    ],
  },
};
