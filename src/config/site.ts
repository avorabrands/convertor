/**
 * Brand and address settings. Nothing else hard-codes the name or the web address.
 *
 * The address comes from NEXT_PUBLIC_SITE_URL, set in Vercel, so moving to a new domain
 * needs no code change. To serve the site from a folder of another site
 * (for example www.avorabrands.in/convert), also set NEXT_PUBLIC_BASE_PATH to "/convert".
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const url = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://convertly.avorabrands.in").replace(/\/$/, "");

export const site = {
  name: "Avora Convertly",
  shortName: "Convertly",
  tagline: "Convert your study files, without the hassle.",
  description:
    "Free online file converter for students. Convert PDF, Word, PowerPoint, Excel, images and audio in your browser, with no sign-up, no watermark and no uploads.",
  footerNote: "Made for students who have better things to do than fight file formats.",
  company: { name: "Avora Brands", url: "https://www.avorabrands.in" },
  /** The same profiles the Avora Brands website links to. */
  social: {
    instagram: "https://www.instagram.com/avorabrands",
    linkedin: "https://www.linkedin.com/company/124923992/",
    whatsapp: `https://wa.me/919019440645?text=${encodeURIComponent("Hi Avora Brands! I'm writing about Avora Convertly.")}`,
  },
  /** Full public address including any base path, without a trailing slash. */
  url: `${url}${basePath && !url.endsWith(basePath) ? basePath : ""}`,
  basePath,
  locale: "en_IN",
  /** Set this to a real inbox before launch. While empty, the contact section says so. */
  contactEmail: "",
} as const;

/** Absolute URL for a page path such as "/pdf-to-word". */
export const absoluteUrl = (path = "/") => `${site.url}${path === "/" ? "" : path}`;

/** Path for a file in /public, which Next.js doesn't prefix with the base path on its own. */
export const asset = (path: string) => `${site.basePath}${path}`;

export const toolHref = (slug: string) => `/${slug}`;
