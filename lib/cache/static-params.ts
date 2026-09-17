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

export async function clauseStaticParams(): Promise<Array<{ id: string; section: string }>> {
  const store = getStore();
  const activeDocs = new Set(
    (await store.listDocuments())
      .filter((row) => row.status === "active")
      .map((row) => row.id),
  );
  const activeStatutes = new Set(
    (await store.listStatutes())
      .filter((row) => row.status === "active")
      .map((row) => row.id),
  );
  const chunks = (await store.currentChunks()).filter((row) => activeDocs.has(row.documentId));
  const articles = (await store.currentStatuteArticles()).filter((row) =>
    activeStatutes.has(row.statuteId),
  );
  return [
    ...chunks.map((row) => ({ id: row.documentId, section: row.section })),
    ...articles.map((row) => ({ id: row.statuteId, section: row.section })),
  ].filter((row) => isSafeStaticSection(row.section));
}
