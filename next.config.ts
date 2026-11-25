import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: __dirname },
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
