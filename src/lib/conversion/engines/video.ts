import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { asset } from "@/config/site";
import { baseOf, extOf } from "@/lib/files";
import { ConversionError, type ConversionHandlers, type Engine } from "../types";
import { parseTime } from "./util";

/**
 * Runs FFmpeg in the browser. The engine is a 32 MB download the first time,
 * then the browser keeps it. Each job gets its own copy so cancelling can stop it outright.
 */
async function withFFmpeg<T>(handlers: ConversionHandlers, work: (ff: FFmpeg) => Promise<T>): Promise<T> {
  const { onProgress, signal } = handlers;
  onProgress(0.02, "Downloading the video engine (32 MB, first time only)");
  const base = `${location.origin}${asset("/vendor/ffmpeg")}`;
  // Loaded from our own copy at runtime: bundlers can't follow FFmpeg's worker loader.
  const { FFmpeg } = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${base}/index.js`)) as typeof import("@ffmpeg/ffmpeg");
  const ff = new FFmpeg();
  const stop = () => ff.terminate();
  signal.addEventListener("abort", stop, { once: true });
  try {
    await ff.load({ classWorkerURL: `${base}/worker.js`, coreURL: `${base}/ffmpeg-core.js`, wasmURL: `${base}/ffmpeg-core.wasm` });
    signal.throwIfAborted();
    return await work(ff);
  } finally {
    signal.removeEventListener("abort", stop);
    ff.terminate();
  }
}

async function run(ff: FFmpeg, file: File, args: (input: string) => string[], outName: string, handlers: ConversionHandlers, message: string) {
  const input = `input.${extOf(file.name) || "mp4"}`;
  await ff.writeFile(input, new Uint8Array(await file.arrayBuffer()));
  const log: string[] = [];
  ff.on("log", ({ message: m }) => { log.push(m); if (log.length > 40) log.shift(); });
  ff.on("progress", ({ progress }) => { if (progress >= 0 && progress <= 1) handlers.onProgress(0.08 + progress * 0.88, `${message} (${Math.round(progress * 100)}%)`); });
  handlers.onProgress(0.08, message);
  const code = await ff.exec(args(input));
  if (code !== 0) {
    console.warn("FFmpeg failed", log.join("\n"));
    if (log.some((l) => /Invalid data found|could not find codec|moov atom not found/i.test(l))) throw new ConversionError("This video couldn't be read. It may be damaged or use an unusual format.");
    throw new ConversionError("The video couldn't be converted. Try a shorter clip, or a different output format.");
  }
  const data = await ff.readFile(outName);
  return data instanceof Uint8Array ? data : new TextEncoder().encode(data);
}

const MIME: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", gif: "image/gif" };

function encodeArgs(output: string, crf: number) {
  if (output === "webm") return ["-c:v", "libvpx", "-deadline", "realtime", "-cpu-used", "8", "-crf", String(Math.min(50, crf + 6)), "-b:v", "0", "-c:a", "libvorbis", "-b:a", "96k"];
  return ["-c:v", "libx264", "-preset", "veryfast", "-crf", String(crf), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"];
}

/** Video formats; audio-only output uses the faster audio converter. */
export const convertVideo: Engine = async (request, handlers) => {
  const { files: [file], output } = request;
  if (output === "mp3" || output === "wav") {
    const { convertAudio } = await import("./audio");
    return convertAudio(request, handlers);
  }
  return withFFmpeg(handlers, async (ff) => {
    const out = `output.${output}`;
    const data = await run(ff, file, (i) => ["-i", i, ...encodeArgs(output, 23), out], out, handlers, "Converting your video");
    return { files: [{ name: `${baseOf(file.name)}.${output}`, blob: new Blob([data as BlobPart], { type: MIME[output] }) }] };
  });
};

export const compressVideo: Engine = async ({ files: [file], options }, handlers) => withFFmpeg(handlers, async (ff) => {
  const height = Number(options.resolution ?? 720);
  const crf = ({ high: 24, balanced: 28, small: 32 } as Record<string, number>)[String(options.quality ?? "balanced")] ?? 28;
  const scale = height > 0 ? ["-vf", `scale=-2:'min(${height},ih)'`] : [];
  const data = await run(ff, file, (i) => ["-i", i, ...scale, ...encodeArgs("mp4", crf).map((a) => (a === "128k" ? "96k" : a)), "output.mp4"], "output.mp4", handlers, "Compressing your video");
  if (data.length >= file.size * 0.98) throw new ConversionError("This video is already well compressed. Try a lower resolution or the Small setting.");
  return { files: [{ name: `${baseOf(file.name)}-smaller.mp4`, blob: new Blob([data as BlobPart], { type: "video/mp4" }) }] };
});

export const videoToGif: Engine = async ({ files: [file], options }, handlers) => withFFmpeg(handlers, async (ff) => {
  const start = parseTime(String(options.start ?? "0:00"), "start");
  const duration = Number(options.duration ?? 5);
  const width = Number(options.width ?? 480);
  const fps = Number(options.fps ?? 12);
  const filter = `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer`;
  const data = await run(ff, file, (i) => ["-ss", String(start), "-t", String(duration), "-i", i, "-vf", filter, "-loop", "0", "output.gif"], "output.gif", handlers, "Making your GIF");
  if (data.length < 100) throw new ConversionError("No frames were found there. Check the start time is within the video.");
  return { files: [{ name: `${baseOf(file.name)}.gif`, blob: new Blob([data as BlobPart], { type: "image/gif" }) }] };
});

export const trimVideo: Engine = async ({ files: [file], options }, handlers) => withFFmpeg(handlers, async (ff) => {
  const start = parseTime(String(options.start ?? "0:00"), "start");
  const endText = String(options.end ?? "").trim();
  const end = endText ? parseTime(endText, "end") : null;
  if (end != null && end <= start) throw new ConversionError("The end time has to be after the start time.");
  const ext = ["mp4", "mov", "webm", "m4v"].includes(extOf(file.name)) ? extOf(file.name) : "mp4";
  const out = `output.${ext}`;
  // A precise cut re-encodes; a quick cut copies the stream and snaps to the nearest keyframe.
  const codec = options.precise === true ? encodeArgs(ext === "webm" ? "webm" : "mp4", 22) : ["-c", "copy", "-avoid_negative_ts", "make_zero"];
  const range = ["-ss", String(start), ...(end != null ? ["-to", String(end)] : [])];
  const data = await run(ff, file, (i) => (options.precise === true ? ["-i", i, ...range, ...codec, out] : [...range, "-i", i, ...codec, out]), out, handlers, "Trimming your video");
  return { files: [{ name: `${baseOf(file.name)}-trimmed.${ext}`, blob: new Blob([data as BlobPart], { type: MIME[ext] ?? "video/mp4" }) }] };
});
