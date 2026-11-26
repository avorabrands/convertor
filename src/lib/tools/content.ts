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
  /** How-to steps, for tools that aren't simple file conversions. */
  steps?: string[];
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
    title: "Video Converter: MP4, WebM and MP3 Free",
    description: "Convert videos to MP4 or WebM, or pull out the audio as MP3. Works with MOV from iPhones. Free, private, and your video is never uploaded.",
    keywords: ["video converter", "mov to mp4", "convert video to mp4", "webm to mp4", "video to mp3"],
    heading: "Free video converter",
    intro: "Turn iPhone MOV videos into MP4 that every portal and player accepts, make WebM files for websites, or keep just the audio as MP3.",
    uses: [
      { title: "iPhone videos", text: "Convert MOV to MP4 for Windows and college portals." },
      { title: "Lecture audio", text: "Keep only the sound from a recorded class." },
      { title: "Web projects", text: "Make WebM videos for your website." },
    ],
    faqs: [
      { q: "How long does it take?", a: "Getting the audio takes seconds. Converting video runs on your device, so a short clip takes under a minute and a long lecture can take several minutes." },
      { q: "Why does it download 32 MB first?", a: "That's the video engine. It downloads once, then your browser keeps it, and your videos never leave your device." },
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

  "add-page-numbers": {
    title: "Add Page Numbers to PDF: Free, No Sign-up",
    description: "Number the pages of a PDF in seconds. Choose the position and style, skip the cover page, and download. Free, and your PDF stays on your device.",
    keywords: ["add page numbers to pdf", "number pdf pages", "pdf page numbering", "page x of y pdf"],
    heading: "Add page numbers to a PDF, free",
    intro: "Many teachers ask for numbered pages. Add numbers to any PDF in the style you need, such as \"Page 3 of 12\", at the bottom or top of the page, and leave the cover page unnumbered.",
    uses: [
      { title: "Meet submission rules", text: "Number a project report or dissertation before you hand it in." },
      { title: "Merged files", text: "Number a PDF made from several files so the pages read in order." },
      { title: "Printouts", text: "Keep loose printed pages in order." },
    ],
    faqs: [
      { q: "Can I start numbering from 2 or skip the cover?", a: "Yes. Set the first number, and turn on \"Don't number the first page\" for a cover page." },
      { q: "Will it cover my text?", a: "Numbers sit in the page margin. If your PDF has content right at the edge, choose another position." },
    ],
  },
  "watermark-pdf": {
    title: "Watermark PDF: Add DRAFT or Text Free",
    description: "Stamp DRAFT, CONFIDENTIAL or your name across every page of a PDF. Choose the direction, colour and opacity. Free, with no uploads.",
    keywords: ["watermark pdf", "add watermark to pdf", "draft watermark", "stamp pdf"],
    heading: "Add a watermark to a PDF, free",
    intro: "Mark drafts as DRAFT, or put your name on work you share, so nobody passes it off as final or as their own. The watermark sits faintly behind your content on every page.",
    uses: [
      { title: "Share drafts", text: "Make it obvious a document isn't the final version." },
      { title: "Protect your notes", text: "Put your name on notes you share with classmates." },
      { title: "Portfolio samples", text: "Mark design or writing samples as samples." },
    ],
    faqs: [
      { q: "Can someone remove the watermark?", a: "A determined person with editing software can. It deters casual copying; it isn't security. For that, use Protect PDF." },
      { q: "Which characters can I use?", a: "English letters, numbers and punctuation for now." },
    ],
  },
  "protect-pdf": {
    title: "Protect PDF with a Password: Free and Private",
    description: "Lock a PDF with a password so only people you tell can open it. Your password and file never leave your device. Free, no sign-up.",
    keywords: ["password protect pdf", "lock pdf", "encrypt pdf", "secure pdf free"],
    heading: "Password-protect a PDF, free",
    intro: "Add a password to a PDF before you share it. Anyone opening it needs the password, and you can choose whether they can print or copy text. Because it all runs on your device, nobody else ever sees your password.",
    uses: [
      { title: "Personal documents", text: "Lock mark sheets, IDs and certificates before you email them." },
      { title: "Unpublished work", text: "Share a thesis draft only with your guide." },
      { title: "Shared devices", text: "Keep files private on a family or lab computer." },
    ],
    faqs: [
      { q: "What if I forget the password?", a: "Nobody can recover it, including us, because it's never sent anywhere. Keep it somewhere safe." },
      { q: "How strong is the protection?", a: "It uses standard PDF encryption that every PDF reader supports. A long password is much stronger than a short one." },
    ],
  },
  "unlock-pdf": {
    title: "Unlock PDF: Remove a Known Password Free",
    description: "Remove the password from a PDF you can already open, so you don't have to type it every time. Free, private, and nothing is uploaded.",
    keywords: ["unlock pdf", "remove pdf password", "decrypt pdf", "pdf password remover"],
    heading: "Remove a PDF password, free",
    intro: "Bank statements, fee receipts and some college documents arrive locked. If you know the password, save an unlocked copy so you can open, merge or print it without typing the password again.",
    uses: [
      { title: "Merge locked files", text: "Unlock a file so Merge PDF and other tools can use it." },
      { title: "Print easily", text: "Print statements and receipts without the password prompt." },
      { title: "Keep a usable copy", text: "Store an unlocked copy of your own documents." },
    ],
    faqs: [
      { q: "Can it crack a PDF if I don't know the password?", a: "No. You need the password. This tool removes it from a file you're already allowed to open." },
      { q: "Is it allowed?", a: "Only unlock PDFs you own or have permission to change." },
    ],
  },
  "delete-pdf-pages": {
    title: "Delete PDF Pages: Remove Pages Free",
    description: "Remove blank, extra or private pages from a PDF. Type the page numbers and download the shorter file. Free, with no uploads.",
    keywords: ["delete pdf pages", "remove pages from pdf", "remove blank page pdf"],
    heading: "Delete pages from a PDF, free",
    intro: "Drop the pages you don't need, such as a blank page from a scanner, an extra cover, or a page with personal details, and keep the rest in their original order.",
    uses: [
      { title: "Remove blank scans", text: "Scanners often add empty pages." },
      { title: "Keep it private", text: "Take out pages with personal details before sharing." },
      { title: "Trim to the limit", text: "Meet a page limit for a submission." },
    ],
    faqs: [
      { q: "How do I choose pages?", a: "Type the pages to remove, using commas and dashes, such as 2, 5-7." },
      { q: "What if I only want a few pages?", a: "Split PDF does the opposite: it keeps only the pages you list." },
    ],
  },
  "extract-pdf-images": {
    title: "Extract Images from PDF: Save Pictures Free",
    description: "Save every picture inside a PDF as its own JPG or PNG file. Free, no sign-up, and your PDF never leaves your device.",
    keywords: ["extract images from pdf", "save pictures from pdf", "pdf image extractor"],
    heading: "Extract images from a PDF, free",
    intro: "Get the photos, diagrams and figures out of a PDF at their original quality, ready for slides, notes or a report.",
    uses: [
      { title: "Reuse figures", text: "Put a diagram from a reading into your presentation, with credit." },
      { title: "Recover your photos", text: "Get pictures back from a PDF you made earlier." },
      { title: "Build study cards", text: "Collect diagrams for revision." },
    ],
    faqs: [
      { q: "Why did it find nothing in my scan?", a: "A scanned page is one big picture. Use PDF to JPG to save whole pages instead." },
      { q: "Are logos and icons included?", a: "Very small images, such as icons and lines, are skipped so you get the pictures that matter." },
    ],
  },
  "resize-image": {
    title: "Resize Image: Change Width and Height Free",
    description: "Resize images to exact pixels or a percentage, keeping proportions or not. Works with JPG, PNG, WebP and iPhone HEIC. Free and private.",
    keywords: ["resize image", "change image size", "resize photo pixels", "image resizer online"],
    heading: "Resize an image, free",
    intro: "Set the exact width and height a form, slide or website needs, or scale a photo down by percentage. Proportions are kept unless you choose otherwise.",
    uses: [
      { title: "Application photos", text: "Many forms want photos at an exact size, such as 200 by 230 pixels." },
      { title: "Lighter slides", text: "Shrink big camera photos before adding them to a presentation." },
      { title: "Profile pictures", text: "Make square images for college portals and email." },
    ],
    faqs: [
      { q: "Will my photo be stretched?", a: "Not with \"Keep proportions\" on. Turn it off only if you need exact dimensions." },
      { q: "How do I also get it under a file size?", a: "Use Compress Image to KB after resizing." },
    ],
  },
  "compress-image": {
    title: "Compress Image to 20KB, 50KB or 100KB Free",
    description: "Reduce a photo or signature to an exact size in KB for exam, scholarship and job application forms. Free, private, and works on phones.",
    keywords: ["compress image to 20kb", "compress image to 50kb", "reduce photo size in kb", "signature size 20kb", "image compressor for exam form"],
    heading: "Compress an image to a target size in KB",
    intro: "Exam and job portals, such as those for entrance tests and scholarships, often want a photo under 50 KB or a signature under 20 KB. Type the size you need and get a JPG as close to it as possible, at the best quality that fits.",
    uses: [
      { title: "Exam applications", text: "Meet photo and signature limits on entrance exam forms." },
      { title: "Scholarships and jobs", text: "Upload documents that portals keep rejecting as too large." },
      { title: "Email and chat", text: "Send photos that don't eat your data." },
    ],
    faqs: [
      { q: "How close to my target will it be?", a: "Usually just under it. It picks the highest quality that fits, and only shrinks the picture if quality alone isn't enough." },
      { q: "My form also needs exact dimensions.", a: "Resize the image first with Resize Image, then compress it here." },
    ],
  },
  "trim-audio": {
    title: "Trim Audio: Cut MP3 and Recordings Free",
    description: "Cut a lecture recording or song down to the part you need. Set start and end times, and save as MP3 or WAV. Free, and nothing is uploaded.",
    keywords: ["trim audio", "cut mp3", "audio cutter", "cut lecture recording"],
    heading: "Trim an audio recording, free",
    intro: "Keep just the part of a recording you need: one question from a lecture, the key minute of an interview, or a clip for a presentation.",
    uses: [
      { title: "Lecture highlights", text: "Save the part of a class you need to revise." },
      { title: "Interview clips", text: "Pull quotes from a recorded interview for a project." },
      { title: "Presentation audio", text: "Make a short clip to play in your slides." },
    ],
    faqs: [
      { q: "How do I write the times?", a: "Minutes and seconds, such as 1:30, or hours too, such as 1:02:15. Leave the end empty to keep everything after the start." },
      { q: "Which files work?", a: "MP3, WAV, M4A, AAC, OGG and FLAC, depending on your browser." },
    ],
  },
  "compress-video": {
    title: "Compress Video: Reduce MP4 Size Free",
    description: "Make videos small enough to upload or share by lowering resolution and bitrate. Free, private, and runs in your browser with no uploads.",
    keywords: ["compress video", "reduce video size", "compress mp4", "video compressor online free"],
    heading: "Compress a video, free",
    intro: "Project videos and recorded presentations are often too big to upload. Shrink them to 720p or 480p, with quality settings that keep speech and slides clear.",
    uses: [
      { title: "Project submissions", text: "Get under portal limits for video assignments." },
      { title: "Share in groups", text: "Send recordings that WhatsApp accepts." },
      { title: "Save storage", text: "Keep lecture recordings without filling your phone." },
    ],
    faqs: [
      { q: "Why does it take a while?", a: "Your device does the work, so your video is never uploaded. Expect roughly real time for a 720p video on a laptop, and longer on phones." },
      { q: "Which setting should I use?", a: "720p Balanced suits most class videos. Choose 480p for talking-head recordings." },
    ],
  },
  "video-to-gif": {
    title: "Video to GIF Maker: Free and Private",
    description: "Turn a few seconds of video into a looping GIF for slides and chats. Choose the start, length and size. Free, with no uploads.",
    keywords: ["video to gif", "gif maker", "mp4 to gif", "make gif from video"],
    heading: "Make a GIF from a video, free",
    intro: "GIFs play automatically in slides and chats. Pick a moment from a video and turn it into a small looping animation.",
    uses: [
      { title: "Lively slides", text: "Show an experiment or demo moving, right in PowerPoint." },
      { title: "Explain a process", text: "Loop a short step-by-step clip." },
      { title: "Group chats", text: "Share reactions that play instantly." },
    ],
    faqs: [
      { q: "Why is my GIF large?", a: "GIFs are an old format and grow quickly. Use a shorter length, a smaller width or Light smoothness." },
      { q: "Is there sound?", a: "No. GIFs never have sound." },
    ],
  },
  "trim-video": {
    title: "Trim Video: Cut MP4 Clips Free",
    description: "Cut the start and end off a video without re-uploading it anywhere. Quick cuts in seconds, or precise cuts to the frame. Free and private.",
    keywords: ["trim video", "cut video", "video cutter online", "cut mp4"],
    heading: "Trim a video, free",
    intro: "Remove the setup at the start of a recording, or keep only the part you need for a presentation. Quick cuts take seconds because the video isn't re-encoded.",
    uses: [
      { title: "Tidy recordings", text: "Remove the first minute of fiddling with the camera." },
      { title: "Presentation clips", text: "Keep only the part that makes your point." },
      { title: "Smaller files", text: "Shorter videos upload faster." },
    ],
    faqs: [
      { q: "Why isn't the cut exactly where I said?", a: "Quick cuts snap to the nearest keyframe, usually within a second or two. Turn on Precise cut for an exact cut; it takes longer." },
      { q: "Is quality reduced?", a: "Not for quick cuts: the video is copied as it is." },
    ],
  },
  "word-counter": {
    title: "Word Counter: Count Words and Characters Free",
    description: "Count words, characters, sentences and paragraphs, with reading time. Paste text or open a Word or PDF file. Free, and nothing is uploaded.",
    keywords: ["word counter", "word count", "character counter", "essay word count", "count words in pdf"],
    heading: "Count the words in your essay",
    intro: "Check an essay against its word limit, or a bio against a character limit. Paste your text, or open a .docx or .pdf file, and see the counts update as you type.",
    uses: [
      { title: "Essay limits", text: "Hit the 1,500-word target without guessing." },
      { title: "Application forms", text: "Fit answers into character limits." },
      { title: "Speeches", text: "See how long your talk will take to deliver." },
    ],
    steps: ["Paste your text, or open a Word, PDF or text file.", "Read the counts as you type or edit.", "Check reading and speaking time for talks and presentations."],
    faqs: [
      { q: "Does it count words the same way as Word?", a: "Very nearly. Words are runs of letters and numbers; hyphenated words count once. Small differences can come from how footnotes and text boxes are handled." },
      { q: "Does it work for Hindi and other languages?", a: "Yes. It counts words in any language that separates words with spaces." },
    ],
  },
  "citation-generator": {
    title: "Citation Generator: APA, MLA and Harvard Free",
    description: "Create APA 7, MLA 9 and Harvard references for websites, books and journal articles. Copy with italics into Word or Google Docs. Free.",
    keywords: ["citation generator", "apa citation generator", "mla citation", "harvard referencing generator", "reference generator", "works cited"],
    heading: "Free citation and reference generator",
    intro: "Fill in the details of your source and get a correctly formatted reference in APA 7th, MLA 9th or Harvard style. Build a full reference list, sorted A to Z, and copy it with italics intact.",
    uses: [
      { title: "Reference lists", text: "Build your bibliography as you research." },
      { title: "Switch styles", text: "Change from APA to Harvard in one click if your teacher asks." },
      { title: "Avoid lost marks", text: "Get the punctuation and italics right every time." },
    ],
    steps: ["Choose the style your course uses, and the type of source.", "Fill in the authors, title, year and other details.", "Copy the reference, or add it to your list and copy the whole list."],
    faqs: [
      { q: "Will the italics paste into Word?", a: "Yes. Copied references keep their italics in Word and Google Docs." },
      { q: "Should I still check my references?", a: "Yes. Check names, dates and capitalisation against the source; your course may also have its own rules." },
      { q: "Where is my list saved?", a: "In this browser only. Clearing your browser data removes it." },
    ],
  },
  "case-converter": {
    title: "Case Converter: Title Case, UPPERCASE Free",
    description: "Change text to Sentence case, Title Case, UPPERCASE or lowercase in one click. Paste text or open a file. Free and private.",
    keywords: ["case converter", "title case converter", "uppercase to lowercase", "sentence case"],
    heading: "Change the case of text",
    intro: "Fix text typed with Caps Lock on, or turn headings into proper Title Case for your report.",
    uses: [
      { title: "Report headings", text: "Format titles consistently." },
      { title: "Caps Lock accidents", text: "Turn SHOUTING back into normal text." },
      { title: "References", text: "Use sentence case for APA titles." },
    ],
    steps: ["Paste or type your text.", "Choose the case you want.", "Copy the result."],
    faqs: [
      { q: "Which words stay lowercase in Title Case?", a: "Short words such as a, an, the, and, of and in, unless they start the title." },
      { q: "Does sentence case keep names capitalised?", a: "No. It can't tell names from other words, so check names after converting." },
    ],
  },
  "qr-code-generator": {
    title: "QR Code Generator: Free, No Sign-up",
    description: "Make QR codes for links, posters and project presentations. Download as PNG or SVG for sharp printing. Free, with no tracking or expiry.",
    keywords: ["qr code generator", "free qr code", "qr code for link", "qr code maker"],
    heading: "Make a QR code, free",
    intro: "Link a poster to your project, a presentation to your slides, or a stall to a form. The code is generated on your device and never expires.",
    uses: [
      { title: "Project posters", text: "Let visitors open your report or video." },
      { title: "Presentations", text: "Share your slides or a feedback form." },
      { title: "Events", text: "Send people to a registration form." },
    ],
    steps: ["Type or paste a link or text.", "Choose the colour and error correction.", "Download it as PNG, or SVG for printing at any size."],
    faqs: [
      { q: "Will my QR code stop working?", a: "No. The link is stored in the code itself, so it works as long as the link does." },
      { q: "PNG or SVG?", a: "PNG for slides and documents. SVG for posters, because it stays sharp at any size." },
    ],
  },
  "png-to-jpg": {
    title: "PNG to JPG Converter: Free and Private",
    description: "Convert PNG images and screenshots to smaller JPG files. Transparent areas turn white. Free, no sign-up, and nothing is uploaded.",
    keywords: ["png to jpg", "png to jpeg", "convert png to jpg free"],
    heading: "Convert PNG to JPG, free",
    intro: "PNG screenshots are often several times bigger than they need to be. Convert them to JPG for uploads and email.",
    uses: [{ title: "Upload limits", text: "Forms often accept JPG only." }, { title: "Smaller files", text: "JPG photos are usually much smaller." }, { title: "Email", text: "Attach more images at once." }],
    faqs: [{ q: "What happens to transparent areas?", a: "They become white, because JPG has no transparency." }],
  },
  "jpg-to-png": {
    title: "JPG to PNG Converter: Free and Private",
    description: "Convert JPG photos to PNG for editing and graphics. Free, no sign-up, and your images stay on your device.",
    keywords: ["jpg to png", "jpeg to png", "convert jpg to png free"],
    heading: "Convert JPG to PNG, free",
    intro: "PNG keeps every pixel exactly, so it's better for editing, diagrams and graphics with text.",
    uses: [{ title: "Editing", text: "Avoid quality loss each time you save." }, { title: "Design apps", text: "Some tools prefer PNG." }, { title: "Diagrams", text: "Keep lines and text crisp." }],
    faqs: [{ q: "Will the PNG be larger?", a: "Usually, yes. PNG doesn't throw away detail the way JPG does." }],
  },
  "heic-to-jpg": {
    title: "HEIC to JPG Converter: iPhone Photos Free",
    description: "Convert iPhone HEIC photos to JPG in any browser, including Chrome and Android. Free, private, and nothing is uploaded.",
    keywords: ["heic to jpg", "heic converter", "iphone photo to jpg", "heif to jpg"],
    heading: "Convert HEIC to JPG, free",
    intro: "iPhones save photos as HEIC, which many portals and Windows computers won't open. Convert them to JPG, which works everywhere.",
    uses: [{ title: "College portals", text: "Upload iPhone photos to forms that want JPG." }, { title: "Windows PCs", text: "Open photos that Windows can't show." }, { title: "Sharing", text: "Send photos anyone can open." }],
    faqs: [{ q: "Can I stop my iPhone saving HEIC?", a: "Yes: Settings > Camera > Formats > Most Compatible. New photos will be JPG." }, { q: "Is quality lost?", a: "Very little at 90% quality, the default." }],
  },
  "webp-to-jpg": {
    title: "WebP to JPG Converter: Free and Private",
    description: "Convert WebP images from websites into JPG or PNG files that every app opens. Free, no sign-up, and no uploads.",
    keywords: ["webp to jpg", "webp to png", "convert webp"],
    heading: "Convert WebP to JPG, free",
    intro: "Images saved from websites are often WebP, which older apps and some forms won't accept. Convert them to JPG or PNG.",
    uses: [{ title: "Slides", text: "Add web images to older versions of PowerPoint." }, { title: "Forms", text: "Upload images that need to be JPG." }, { title: "Editing", text: "Open images in any editor." }],
    faqs: [{ q: "JPG or PNG?", a: "JPG for photos; PNG for graphics, logos and anything with transparency." }],
  },
  "png-to-pdf": {
    title: "PNG to PDF: Combine Screenshots into a PDF Free",
    description: "Turn PNG screenshots and images into one PDF, in the order you choose. Free, no sign-up, and nothing is uploaded.",
    keywords: ["png to pdf", "screenshots to pdf", "image to pdf"],
    heading: "Convert PNG to PDF, free",
    intro: "Combine screenshots of an online test, notes or a portal page into a single PDF you can submit or keep.",
    uses: [{ title: "Online work", text: "Submit screenshots as one PDF." }, { title: "Receipts", text: "Keep payment screenshots together." }, { title: "Notes", text: "Collect slides and screenshots for revision." }],
    faqs: [{ q: "Can I mix JPG and PNG?", a: "Use JPG to PDF, which accepts every common image type." }],
  },
  "pdf-to-png": {
    title: "PDF to PNG Converter: Sharp Page Images Free",
    description: "Save each PDF page as a sharp PNG image, ideal for diagrams and text. Choose screen or print resolution. Free and private.",
    keywords: ["pdf to png", "pdf page to png", "convert pdf to image"],
    heading: "Convert PDF to PNG, free",
    intro: "PNG keeps text and line drawings crisp, so it's the best choice for diagrams, tables and slides taken from a PDF.",
    uses: [{ title: "Diagrams", text: "Clean images for slides." }, { title: "Tables", text: "Readable text in reports." }, { title: "Printing", text: "Choose 300 dpi for print quality." }],
    faqs: [{ q: "PNG or JPG?", a: "PNG for text and drawings; JPG for photo-heavy pages and smaller files." }],
  },
  "mp4-to-mp3": {
    title: "MP4 to MP3 Converter: Video to Audio Free",
    description: "Get the audio from an MP4 or MOV video as an MP3. Ideal for recorded lectures. Fast, free, and your video is never uploaded.",
    keywords: ["mp4 to mp3", "video to mp3", "extract audio from mp4", "lecture video to audio"],
    heading: "Convert MP4 to MP3, free",
    intro: "Turn recorded lectures and talks into audio you can listen to on the go. Audio extraction is quick, even for long videos.",
    uses: [{ title: "Revision on the move", text: "Listen to lectures while you travel." }, { title: "Save space", text: "Audio is a fraction of the video's size." }, { title: "Transcription", text: "Audio files are easier to transcribe." }],
    faqs: [{ q: "Which videos work?", a: "MP4, MOV, M4V and WebM, as long as your browser can read their audio. Chrome opens the widest range." }],
  },
  "m4a-to-mp3": {
    title: "M4A to MP3 Converter: Voice Memos Free",
    description: "Convert iPhone voice memos and M4A recordings to MP3 that plays everywhere. Free, private, and nothing is uploaded.",
    keywords: ["m4a to mp3", "voice memo to mp3", "convert m4a"],
    heading: "Convert M4A to MP3, free",
    intro: "iPhone Voice Memos save as M4A, which some apps and portals won't accept. MP3 plays on everything.",
    uses: [{ title: "Recorded lectures", text: "Share recordings with classmates on any phone." }, { title: "Assignments", text: "Submit audio where MP3 is required." }, { title: "Editing", text: "Open recordings in more apps." }],
    faqs: [{ q: "Which quality should I pick?", a: "64 kbps is plenty for speech and keeps files small." }],
  },
  "wav-to-mp3": {
    title: "WAV to MP3 Converter: Shrink Audio Free",
    description: "Convert large WAV recordings to MP3, often 10 times smaller. Choose the quality. Free, private, and nothing is uploaded.",
    keywords: ["wav to mp3", "convert wav", "compress wav"],
    heading: "Convert WAV to MP3, free",
    intro: "WAV files from recorders and editing software are huge. MP3 at 128 kbps sounds almost identical at a fraction of the size.",
    uses: [{ title: "Upload limits", text: "Fit recordings under portal limits." }, { title: "Sharing", text: "Send audio over chat apps." }, { title: "Storage", text: "Keep more recordings on your phone." }],
    faqs: [{ q: "How much smaller will it be?", a: "About 10 times smaller at 128 kbps, and more at lower quality." }],
  },
  "csv-to-excel": {
    title: "CSV to Excel Converter: Free and Private",
    description: "Open CSV exports from Google Forms, surveys and apps as proper Excel (.xlsx) files. Free, no sign-up, and your data stays on your device.",
    keywords: ["csv to excel", "csv to xlsx", "convert csv to excel"],
    heading: "Convert CSV to Excel, free",
    intro: "Survey and form exports come as CSV. Turn them into Excel files that open cleanly, keep leading zeros in roll numbers, and are ready for charts.",
    uses: [{ title: "Survey results", text: "Analyse Google Forms responses in Excel." }, { title: "Attendance", text: "Open exported attendance lists." }, { title: "Projects", text: "Share data with teammates who use Excel." }],
    faqs: [{ q: "Are leading zeros kept?", a: "Yes. Values are kept exactly as they appear in the CSV." }],
  },
  "excel-to-csv": {
    title: "Excel to CSV Converter: Free and Private",
    description: "Save each Excel sheet as a CSV file for Python, R, SPSS or any app that imports data. Free, with no uploads.",
    keywords: ["excel to csv", "xlsx to csv", "convert excel to csv"],
    heading: "Convert Excel to CSV, free",
    intro: "CSV is the simplest way to move data into statistics software, coding assignments and databases. Each sheet becomes its own CSV file.",
    uses: [{ title: "Coding classes", text: "Load data into Python or R." }, { title: "Statistics", text: "Import into SPSS or Jamovi." }, { title: "Databases", text: "Import rows into any database." }],
    faqs: [{ q: "What happens to formulas?", a: "CSV stores the calculated values, not the formulas." }],
  },
};
