import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || undefined;

const config: NextConfig = {
  reactStrictMode: true,
  basePath,
  turbopack: { root: __dirname },
  async redirects() {
    return [
      // Tools used to live under /convert; keep old links and bookmarks working.
      { source: "/convert/ocr", destination: "/image-to-text", permanent: true },
      { source: "/ocr", destination: "/image-to-text", permanent: true },
      { source: "/convert/:tool", destination: "/:tool", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/vendor/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default config;
