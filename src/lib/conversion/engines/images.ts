import { baseOf } from "@/lib/files";
import type { Engine } from "../types";
import { canvasBlob, drawScaled, openImage } from "./util";

const mime: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export const convertImage: Engine = async ({ files, output, options }, { onProgress, signal }) => {
  const [file] = files;
  onProgress(0.2, "Opening your image");
  const bitmap = await openImage(file, file.name);
  signal.throwIfAborted();
  onProgress(0.6, "Converting");
  // JPG has no transparency, so clear areas become white instead of black.
  const canvas = drawScaled(bitmap, Number(options.maxSide ?? 0), output === "jpg" ? "#fff" : undefined);
  bitmap.close();
  const blob = await canvasBlob(canvas, mime[output], Number(options.quality ?? 85) / 100);
  onProgress(1);
  return { files: [{ name: `${baseOf(file.name)}.${output}`, blob }] };
};
