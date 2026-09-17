import { getStore } from "@/lib/db/store";
import { authorizeCron } from "@/lib/cron/authorize";
import { revalidateGuidelinePages } from "@/lib/cache/apply-revalidate";
import { drainQueue } from "@/lib/pipeline/runner";
import { ensureSeeded } from "@/lib/pipeline/seed/bootstrap";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const store = getStore();
  await ensureSeeded(store);
  const processed = await drainQueue(store, 4);
  let revalidated: string[] = [];
  if (processed.updatedDocumentIds.length > 0) {
    revalidated = (
      await revalidateGuidelinePages({
        reason: "cron-process",
        documentIds: processed.updatedDocumentIds,
        statuteIds: [],
      })
    ).paths;
  }
  return Response.json({
    ok: true,
    processed: processed.processed,
    updatedDocumentIds: processed.updatedDocumentIds,
    revalidated,
  });
}
