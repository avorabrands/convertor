import type { OptionValues } from "@/lib/tools/types";

export interface ConversionRequest {
  toolSlug: string;
  files: File[];
  output: string;
  options: OptionValues;
}

export interface ConversionHandlers {
  /** 0 to 1, with an optional friendly status line. */
  onProgress: (value: number, message?: string) => void;
  signal: AbortSignal;
}

export interface OutputFile {
  name: string;
  blob: Blob;
  /** Path inside "Download all", when it differs from the name. */
  path?: string;
}

export interface ConversionResult {
  files: OutputFile[];
  /** Plain-language things the student should know about the result. */
  notes?: string[];
  isDemo?: boolean;
}

/** The UI only knows this interface. Swap in a remote implementation without touching components. */
export interface ConversionProvider {
  convert(request: ConversionRequest, handlers: ConversionHandlers): Promise<ConversionResult>;
}

export type Engine = (request: ConversionRequest, handlers: ConversionHandlers) => Promise<ConversionResult>;

/** An expected failure, with wording that is safe to show as is. */
export class ConversionError extends Error {
  constructor(message: string, readonly suggestTool?: string) {
    super(message);
    this.name = "ConversionError";
  }
}
