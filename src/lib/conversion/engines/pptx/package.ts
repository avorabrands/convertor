import { ConversionError } from "../../types";
import { unzipAsync } from "../zip";
import { findAll } from "./xml";

export interface Rel { type: string; target: string; external: boolean }
export type Picture = ImageBitmap | HTMLImageElement;

const MAX_UNPACKED = 1024 ** 3;

/** A .pptx is a ZIP of XML parts that point at each other through relationship files. */
export class Package {
  private xmlCache = new Map<string, Element | null>();
  private relCache = new Map<string, Map<string, Rel>>();
  private pictures = new Map<string, Promise<Picture | null>>();

  private constructor(readonly files: Record<string, Uint8Array>) {}

  static async open(file: Blob) {
    let total = 0;
    const files = await unzipAsync(new Uint8Array(await file.arrayBuffer()), (f) => {
      total += f.originalSize;
      if (total > MAX_UNPACKED) throw new ConversionError("This presentation unpacks to more than 1 GB, which is too much for a browser.");
      return !/\.(mp4|mov|avi|wmv|mp3|wav|m4a)$/i.test(f.name);
    });
    return new Package(files);
  }

  text(path: string) {
    const bytes = this.files[path];
    return bytes ? new TextDecoder().decode(bytes) : null;
  }

  xml(path: string | null | undefined): Element | null {
    if (!path) return null;
    if (!this.xmlCache.has(path)) {
      const text = this.text(path);
      const doc = text ? new DOMParser().parseFromString(text, "application/xml") : null;
      this.xmlCache.set(path, doc && !doc.querySelector("parsererror") ? doc.documentElement : null);
    }
    return this.xmlCache.get(path)!;
  }

  rels(path: string): Map<string, Rel> {
    let map = this.relCache.get(path);
    if (!map) {
      map = new Map();
      const cut = path.lastIndexOf("/");
      const dir = path.slice(0, cut + 1);
      const root = this.xml(`${dir}_rels/${path.slice(cut + 1)}.rels`);
      for (const r of findAll(root, "Relationship")) {
        const external = r.getAttribute("TargetMode") === "External";
        const target = r.getAttribute("Target") ?? "";
        map.set(r.getAttribute("Id") ?? "", {
          type: (r.getAttribute("Type") ?? "").split("/").at(-1)!,
          target: external ? target : resolve(dir, target),
          external,
        });
      }
      this.relCache.set(path, map);
    }
    return map;
  }

  target(from: string, id: string | null): string | null {
    const rel = id ? this.rels(from).get(id) : undefined;
    return rel && !rel.external ? rel.target : null;
  }
  byType(from: string, type: string): string | null {
    for (const r of this.rels(from).values()) if (r.type === type && !r.external) return r.target;
    return null;
  }

  /** Null when the picture is missing or in a format browsers can't draw (EMF, WMF, TIFF). */
  picture(path: string): Promise<Picture | null> {
    let p = this.pictures.get(path);
    if (!p) this.pictures.set(path, (p = this.decode(path)));
    return p;
  }

  private async decode(path: string): Promise<Picture | null> {
    const bytes = this.files[path];
    const ext = path.split(".").at(-1)!.toLowerCase();
    const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg", gif: "image/gif", bmp: "image/bmp", webp: "image/webp", svg: "image/svg+xml" }[ext];
    if (!bytes || !mime) return null;
    const blob = new Blob([bytes as BlobPart], { type: mime });
    try {
      if (ext !== "svg") return await createImageBitmap(blob);
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return img;
      } finally { URL.revokeObjectURL(url); }
    } catch {
      return null;
    }
  }

  async dispose() {
    for (const p of this.pictures.values()) {
      const img = await p;
      if (img instanceof ImageBitmap) img.close();
    }
  }
}

function resolve(dir: string, target: string) {
  const parts = target.startsWith("/") ? [] : dir.split("/").filter(Boolean);
  for (const p of target.split("/")) {
    if (p === "..") parts.pop();
    else if (p && p !== ".") parts.push(p);
  }
  return parts.join("/");
}
