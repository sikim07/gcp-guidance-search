import { revalidatePath, revalidateTag } from "next/cache";
import { recordRevalidation } from "@/lib/cache/revalidate-log";
import {
  PUBLIC_CATALOG_TAG,
  collectRevalidatePaths,
} from "@/lib/cache/revalidate-pages";

export async function revalidateGuidelinePages(input: {
  reason: string;
  documentIds: string[];
  statuteIds: string[];
}): Promise<{ paths: string[] }> {
  const targets = collectRevalidatePaths(input);
  revalidateTag(PUBLIC_CATALOG_TAG, { expire: 0 });
  for (const target of targets) {
    revalidatePath(target.path, target.type);
  }
  const paths = targets.map((row) => row.path);
  await recordRevalidation({
    reason: input.reason,
    paths,
    documentIds: input.documentIds,
    statuteIds: input.statuteIds,
  });
  return { paths };
}
