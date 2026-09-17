import { revalidatePath } from "next/cache";
import { recordRevalidation } from "@/lib/cache/revalidate-log";
import { collectRevalidatePaths } from "@/lib/cache/revalidate-pages";

export async function revalidateGuidelinePages(input: {
  reason: string;
  documentIds: string[];
  statuteIds: string[];
}): Promise<{ paths: string[] }> {
  const targets = collectRevalidatePaths(input);
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
