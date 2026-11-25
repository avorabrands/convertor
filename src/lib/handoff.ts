/** Carries files picked on one page into the workspace on the next. Memory only. */
let pending: { slug: string; files: File[] } | null = null;

export const handOff = (slug: string, files: File[]) => { pending = { slug, files }; };

export function takeHandOff(slug: string): File[] {
  if (pending?.slug !== slug) return [];
  const { files } = pending;
  pending = null;
  return files;
}
