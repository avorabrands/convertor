import { ConversionError } from "../types";

export const toBlob = (bytes: Uint8Array | ArrayBuffer, type: string) => new Blob([bytes as BlobPart], { type });
export const PDF_MIME = "application/pdf";
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Lets the page repaint and the cancel button respond during long loops.
 * Uses a message instead of a timer, because browsers slow timers to one a second in background tabs.
 */
export const breathe = (signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = () => {
      port1.close();
      if (signal?.aborted) reject(signal.reason);
      else resolve();
    };
    port2.postMessage(0);
  });

export function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new RangeError("canvas allocation failed");
  return { canvas, ctx };
}

/** Phones refuse canvases over about 16 million pixels. */
export const fitScale = (w: number, h: number, maxPixels = 16_000_000) => Math.min(1, Math.sqrt(maxPixels / (w * h)));

const encoderSource = `onmessage = async ({ data: { id, bitmap, type, quality, opaque } }) => {
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext("2d", { alpha: !opaque }).drawImage(bitmap, 0, 0);
    bitmap.close();
    postMessage({ id, blob: await canvas.convertToBlob({ type, quality }) });
  } catch (error) {
    postMessage({ id, blob: null });
  }
};`;

type Encode = (bitmap: ImageBitmap, type: string, quality: number | undefined, opaque: boolean) => Promise<Blob | null>;
let encoder: Encode | null | undefined;

/** One shared worker that turns pictures into PNG, JPG or WebP. Null where the browser can't. */
function getEncoder(): Encode | null {
  if (encoder !== undefined) return encoder;
  if (typeof OffscreenCanvas === "undefined" || typeof Worker === "undefined") return (encoder = null);
  try {
    const url = URL.createObjectURL(new Blob([encoderSource], { type: "text/javascript" }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    const waiting = new Map<number, (blob: Blob | null) => void>();
    let next = 0;
    worker.onmessage = ({ data }: MessageEvent<{ id: number; blob: Blob | null }>) => {
      waiting.get(data.id)?.(data.blob);
      waiting.delete(data.id);
    };
    worker.onerror = () => {
      encoder = null;
      for (const done of waiting.values()) done(null);
      waiting.clear();
    };
    encoder = (bitmap, type, quality, opaque) =>
      new Promise((resolve) => {
        const id = next++;
        waiting.set(id, resolve);
        worker.postMessage({ id, bitmap, type, quality, opaque }, [bitmap]);
      });
  } catch {
    encoder = null;
  }
  return encoder;
}

/**
 * On the page itself, encoding waits for idle time, which takes seconds per image in a background tab.
 * The worker encodes straight away and keeps the page responsive.
 */
export async function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number, opaque = type === "image/jpeg") {
  let blob: Blob | null = null;
  const encode = canvas.width * canvas.height < 12_000_000 ? getEncoder() : null;
  if (encode) {
    try {
      const copy = new OffscreenCanvas(canvas.width, canvas.height);
      copy.getContext("2d", { alpha: !opaque })!.drawImage(canvas, 0, 0);
      blob = await encode(copy.transferToImageBitmap(), type, quality, opaque);
    } catch {
      blob = null;
    }
  }
  blob ??= await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new RangeError("canvas allocation failed");
  if (blob.type !== type) throw new ConversionError("Your browser can't save that image format. Choose JPG or PNG instead.");
  return blob;
}

/** Decodes with the photo's rotation applied. */
export async function openImage(file: Blob, name: string): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (/\.(heic|heif)$/i.test(name)) {
      throw new ConversionError("This browser can't open HEIC photos. Try Safari, or set your iPhone camera to “Most Compatible” to get JPGs.");
    }
    throw new ConversionError(`"${name}" couldn't be opened as an image. It may be damaged.`);
  }
}

export function drawScaled(bitmap: ImageBitmap, maxSide: number, background?: string) {
  const bySide = maxSide > 0 ? Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height)) : 1;
  const scale = bySide * fitScale(bitmap.width * bySide, bitmap.height * bySide);
  const { canvas, ctx } = canvasOf(bitmap.width * scale, bitmap.height * scale);
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}
