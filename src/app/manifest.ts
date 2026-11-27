import type { MetadataRoute } from "next";
import { asset, site } from "@/config/site";

export const dynamic = "force-static";

/** Lets students add the site to their home screen with the right name and icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    start_url: asset("/"),
    display: "standalone",
    background_color: "#f8f8f5",
    theme_color: "#3d48d3",
    icons: [
      { src: asset("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: asset("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
      { src: asset("/icons/maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
