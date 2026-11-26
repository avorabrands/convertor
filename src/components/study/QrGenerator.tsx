"use client";

import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/workspace/OptionField";
import { saveBlob } from "@/lib/files";
import { TextInput } from "./TextInput";

export function QrGenerator() {
  const [text, setText] = useState("https://");
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [dark, setDark] = useState("#141a3c");
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const value = text.trim();

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!canvas.current || !value || value === "https://") return;
      const QR = await import("qrcode");
      try {
        await QR.toCanvas(canvas.current, value, { errorCorrectionLevel: level, margin: 2, width: 320, color: { dark, light: "#ffffff" } });
        if (alive) setError("");
      } catch {
        if (alive) setError("That's too much text for one QR code. Use a link instead.");
      }
    })();
    return () => { alive = false; };
  }, [value, level, dark]);

  const png = async () => {
    const QR = await import("qrcode");
    const url = await QR.toDataURL(value, { errorCorrectionLevel: level, margin: 2, width: 1200, color: { dark, light: "#ffffff" } });
    saveBlob(await (await fetch(url)).blob(), "qr-code.png");
  };
  const svg = async () => {
    const QR = await import("qrcode");
    const s = await QR.toString(value, { type: "svg", errorCorrectionLevel: level, margin: 2, color: { dark, light: "#ffffff" } });
    saveBlob(new Blob([s], { type: "image/svg+xml" }), "qr-code.svg");
  };
  const ready = value && value !== "https://" && !error;

  return (
    <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
      <div className="space-y-4">
        <TextInput value={text} onChange={setText} label="Link or text" placeholder="https://your-project.example" rows={4} files={false} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Error correction" value={level} onChange={(v) => setLevel(v as typeof level)} choices={[{ value: "L", label: "Low (simplest code)" }, { value: "M", label: "Medium" }, { value: "Q", label: "High" }, { value: "H", label: "Highest (survives damage)" }]} hint="Higher levels still scan when printed small or scratched." />
          <SelectField label="Colour" value={dark} onChange={setDark} choices={[{ value: "#141a3c", label: "Navy" }, { value: "#000000", label: "Black" }, { value: "#3d48d3", label: "Indigo" }, { value: "#14794a", label: "Green" }]} hint="Dark colours on white scan best." />
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
      <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-white p-4 shadow-card">
        <canvas ref={canvas} width={320} height={320} className="size-64 sm:size-72" aria-label={ready ? `QR code for ${value}` : "QR code preview"} role="img" />
        <div className="flex gap-2">
          <Button size="sm" disabled={!ready} onClick={png}><Download className="size-4" aria-hidden />PNG</Button>
          <Button size="sm" variant="secondary" disabled={!ready} onClick={svg}><Download className="size-4" aria-hidden />SVG</Button>
        </div>
      </div>
    </div>
  );
}
