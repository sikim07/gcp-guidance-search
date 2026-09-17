import { getStore } from "@/lib/db/store";
import { authorizeCron } from "@/lib/cron/authorize";
import { revalidateGuidelinePages } from "@/lib/cache/apply-revalidate";
import { drainQueue, watchSources } from "@/lib/pipeline/runner";
import { watchStatutes } from "@/lib/pipeline/statute-runner";
import { ensureSeeded } from "@/lib/pipeline/seed/bootstrap";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const store = getStore();
  await ensureSeeded(store);
  const watched = await watchSources(store);
  const statutes = await watchStatutes(store);
  const processed = await drainQueue(store, 8);
  const documentIds = [...watched.updatedDocumentIds, ...processed.updatedDocumentIds];
  const statuteIds = statutes.ingestedIds;
  let revalidated: string[] = [];
  if (documentIds.length > 0 || statuteIds.length > 0) {
    revalidated = (
      await revalidateGuidelinePages({
        reason: "cron-watch",
        documentIds,
        statuteIds,
      })
    ).paths;
  }
  return Response.json({
    ok: true,
    ...watched,
    statutes,
    processed: processed.processed,
    revalidated,
  });
}
