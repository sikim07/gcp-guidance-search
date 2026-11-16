/** One day: guideline/statute pages barely change; cron still busts via revalidatePath. */
export const PAGE_REVALIDATE_SECONDS = 86_400;

export const PUBLIC_CATALOG_TAG = "public-catalog";

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
