import { getStore } from "@/lib/db/store";

/** Next prerender writes the section as a folder name; skip oversize statute headings. */
export function isSafeStaticSection(section: string): boolean {
  return Buffer.byteLength(section, "utf8") <= 120;
}

export async function documentStaticParams(): Promise<Array<{ id: string }>> {
  const store = getStore();
  const documents = await store.listDocuments();
  const statutes = await store.listStatutes();
  return [...documents, ...statutes]
    .filter((row) => row.status === "active")
    .map((row) => ({ id: row.id }));
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
