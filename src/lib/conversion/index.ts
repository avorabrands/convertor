import { getTool } from "@/lib/tools/registry";
import { demoProvider } from "./demo";
import { localProvider } from "./local";
import { ConversionError, type ConversionProvider, type ConversionRequest } from "./types";

export * from "./types";

/**
 * The single place that decides where a conversion runs.
 * To connect a backend, write a ConversionProvider that calls it and return it here
 * for the tools or outputs it handles.
 */
function providerFor({ toolSlug, output }: ConversionRequest): ConversionProvider {
  const tool = getTool(toolSlug);
  if (!tool) throw new ConversionError("We couldn't find that tool.");
  const level = tool.outputs.find((o) => o.value === output)?.support ?? tool.support;
  return level === "demo" ? demoProvider : localProvider;
}

export const convert: ConversionProvider["convert"] = async (request, handlers) => {
  // Rejects as soon as the student cancels, even if a library can't be interrupted.
  const aborted = new Promise<never>((_, reject) => {
    const fail = () => reject(new DOMException("Cancelled", "AbortError"));
    if (handlers.signal.aborted) fail();
    handlers.signal.addEventListener("abort", fail, { once: true });
  });
  aborted.catch(() => {});
  try {
    return await Promise.race([providerFor(request).convert(request, handlers), aborted]);
  } catch (error) {
    throw toFriendlyError(error);
  }
};

function toFriendlyError(error: unknown): Error {
  if (error instanceof ConversionError) return error;
  if (error instanceof DOMException && error.name === "AbortError") return error;
  console.warn("Conversion failed", error);
  const e = error as { name?: string; message?: string };
  const message = e?.message ?? "";
  if (e?.name === "PasswordException" || /encrypted|password/i.test(message)) {
    return new ConversionError("This file is password protected. Remove the password first, then try again.");
  }
  if (/ChunkLoadError|Failed to fetch|Loading chunk|NetworkError|dynamically imported/i.test(`${e?.name} ${message}`)) {
    return new ConversionError("Part of the converter didn't load. Check your connection, then try again.");
  }
  if (e instanceof RangeError || /memory|allocation/i.test(message)) {
    return new ConversionError("Your device ran out of memory for this file. Try a smaller file or fewer files at once.");
  }
  return new ConversionError("We couldn't read this file. It may be damaged or saved in an unusual way. Try exporting it again from the app that made it.");
}
