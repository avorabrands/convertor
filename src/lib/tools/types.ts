import type { SheetTone } from "@/components/ui/FileSheet";

export type SupportLevel = "full" | "basic" | "demo";

export const supportLevels: Record<SupportLevel, { label: string; description: string }> = {
  full: { label: "Full support", description: "Converts your real file, start to finish." },
  basic: { label: "Basic layout", description: "Converts your real file. Text and structure carry over; complex layouts are simplified." },
  demo: { label: "Demo", description: "Shows the flow with a placeholder file. Your file is not converted yet." },
};

export type Category = "pdf" | "documents" | "images" | "media" | "archives" | "study";

export type OptionValue = string | number | boolean;
export type OptionValues = Record<string, OptionValue>;

interface OptionBase { key: string; label: string; hint?: string; showIf?: (v: OptionValues, output: string) => boolean; /** Sits beside the next half-width option. */ half?: boolean }
export type ToolOption =
  | (OptionBase & { type: "select"; default: string; choices: { value: string; label: string }[] })
  | (OptionBase & { type: "range"; default: number; min: number; max: number; step: number; unit?: string })
  | (OptionBase & { type: "toggle"; default: boolean })
  | (OptionBase & { type: "text"; default: string; placeholder?: string; secret?: boolean; required?: boolean; /** Opens the number keypad on phones. */ numeric?: boolean });

export interface OutputFormat { value: string; label: string; support?: SupportLevel }

export interface Tool {
  slug: string;
  /** Study tools have their own interface instead of a file workspace. */
  kind?: "file" | "study";
  /** Engine to run, when it differs from the slug (format shortcut pages share engines). */
  engine?: string;
  name: string;
  /** One line for cards. */
  summary: string;
  category: Category;
  support: SupportLevel;
  /** Shown in the workspace: what to expect from the result. */
  supportNote?: string;
  accept: string[];
  maxMB: number;
  /** "each": every file converts on its own. "combine": all files become one result. */
  mode: "each" | "combine";
  multiple: boolean;
  minFiles?: number;
  outputs: OutputFormat[];
  options?: ToolOption[];
  /** Options that define the job (split ranges, angle) sit outside "Advanced settings". */
  primaryOptions?: string[];
  action: string;
  glyph: { from: string; to?: string; tone?: SheetTone };
  statuses: string[];
  keywords?: string;
  quick?: boolean;
}
