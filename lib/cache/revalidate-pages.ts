export const PAGE_REVALIDATE_SECONDS = 3600;

export type RevalidateTarget = {
  path: string;
  type: "page" | "layout";
};

export function collectRevalidatePaths(input: {
  documentIds: string[];
  statuteIds: string[];
}): RevalidateTarget[] {
  const targets: RevalidateTarget[] = [
    { path: "/", type: "page" },
    { path: "/updates", type: "page" },
    { path: "/documents", type: "page" },
    { path: "/sitemap.xml", type: "page" },
  ];
  const ids = [...new Set([...input.documentIds, ...input.statuteIds])];
  for (const id of ids) {
    targets.push({ path: `/documents/${id}`, type: "layout" });
  }
  return targets;
}
