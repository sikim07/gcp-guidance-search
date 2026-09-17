/** Next prerender writes the section as a folder name; skip oversize statute headings. */
export function isSafeStaticSection(section: string): boolean {
  return Buffer.byteLength(section, "utf8") <= 120;
}

/**
 * Document detail pages stay ISR (`revalidate = 3600`, `dynamicParams = true`)
 * and are listed in sitemap.xml. Prerendering them at build talks to the live
 * store (Supabase) and can abort `next build` on statement timeout.
 */
export async function documentStaticParams(): Promise<Array<{ id: string }>> {
  return [];
}

/**
 * Clause pages stay ISR (`revalidate = 3600`, `dynamicParams = true`) and are
 * listed in sitemap.xml. Prerendering every section at build pulled ~1,000
 * pages and the full embedding table through `currentChunks()`.
 */
export async function clauseStaticParams(): Promise<
  Array<{ id: string; section: string }>
> {
  return [];
}
