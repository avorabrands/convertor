import { baseOf } from "@/lib/files";
import { ConversionError, type ConversionHandlers, type Engine } from "../types";
import { breathe, toBlob } from "./util";

const RATE = 44100;

export async function decodeAudio(file: File): Promise<AudioBuffer> {
  try {
    return await new OfflineAudioContext(1, 1, RATE).decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new ConversionError(`Your browser couldn't find audio it can read in "${file.name}". Try Chrome, or save the recording as MP3 or M4A first.`);
  }
}

const toInt16 = (f: Float32Array) => {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
};

function channelsOf(audio: AudioBuffer, mono: boolean): Int16Array[] {
  const left = audio.getChannelData(0);
  if (audio.numberOfChannels === 1) return [toInt16(left)];
  const right = audio.getChannelData(1);
  if (!mono) return [toInt16(left), toInt16(right)];
  const mix = new Float32Array(left.length);
  for (let i = 0; i < mix.length; i++) mix[i] = (left[i] + right[i]) / 2;
  return [toInt16(mix)];
}

export async function encodeMp3(audio: AudioBuffer, kbps: number, mono: boolean, { onProgress, signal }: ConversionHandlers) {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const ch = channelsOf(audio, mono);
  const encoder = new Mp3Encoder(ch.length, audio.sampleRate, kbps);
  const chunks: Uint8Array[] = [];
  const block = 1152;
  for (let i = 0, n = 0; i < ch[0].length; i += block, n++) {
    const part = ch.map((c) => c.subarray(i, i + block));
    const buf = part.length === 2 ? encoder.encodeBuffer(part[0], part[1]) : encoder.encodeBuffer(part[0]);
    if (buf.length) chunks.push(new Uint8Array(buf));
    if (n % 150 === 0) {
      onProgress(0.25 + (i / ch[0].length) * 0.72, "Encoding");
      await breathe(signal);
    }
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(new Uint8Array(tail));
  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}

function encodeWav(audio: AudioBuffer, mono: boolean) {
  const ch = channelsOf(audio, mono);
  const frames = ch[0].length;
  const dataSize = frames * ch.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buffer);
  const tag = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  tag(0, "RIFF"); v.setUint32(4, 36 + dataSize, true); tag(8, "WAVEfmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch.length, true);
  v.setUint32(24, audio.sampleRate, true); v.setUint32(28, audio.sampleRate * ch.length * 2, true);
  v.setUint16(32, ch.length * 2, true); v.setUint16(34, 16, true);
  tag(36, "data"); v.setUint32(40, dataSize, true);
  const pcm = new Int16Array(buffer, 44);
  for (let i = 0; i < frames; i++) for (let c = 0; c < ch.length; c++) pcm[i * ch.length + c] = ch[c][i];
  return toBlob(buffer, "audio/wav");
}

/** Also used for video files: the browser decodes only their audio track. */
export const convertAudio: Engine = async ({ files: [file], output, options }, handlers) => {
  handlers.onProgress(0.08, "Opening the audio");
  const audio = await decodeAudio(file);
  handlers.signal.throwIfAborted();
  const mono = options.mono === true;
  const blob = output === "wav" ? encodeWav(audio, mono) : await encodeMp3(audio, Number(options.bitrate ?? 128), mono, handlers);
  return { files: [{ name: `${baseOf(file.name)}.${output}`, blob }] };
};
