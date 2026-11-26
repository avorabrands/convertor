import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const ogSize = { width: 1200, height: 630 };

/** The share card: the product's sheet mark, a headline, and the free-tool promise. */
export function ogImage({ title, from, to }: { title: string; from?: string; to?: string }) {
  const sheet = (label: string, color: string, bg: string) => (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", width: 150, height: 186, borderRadius: 20, border: `4px solid ${color}`, background: bg, color, fontSize: 40, fontWeight: 700, paddingBottom: 34 }}>
      {label}
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#f8f8f5", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 700, color: "#141a3c" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#3d48d3", display: "flex" }} />
            {site.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ fontSize: 68, fontWeight: 700, color: "#141a3c", lineHeight: 1.08, maxWidth: 640 }}>{title}</div>
            <div style={{ fontSize: 30, color: "#555c7d" }}>Free for students · No sign-up · No watermark</div>
          </div>
        </div>
        {from && (
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            {sheet(from, "#868ba8", "#ffffff")}
            {to && <div style={{ fontSize: 56, color: "#3d48d3", display: "flex" }}>→</div>}
            {to && sheet(to, "#3d48d3", "#edeefc")}
          </div>
        )}
      </div>
    ),
    ogSize,
  );
}
