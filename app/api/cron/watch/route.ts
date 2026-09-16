import { getStore } from "@/lib/db/store";
import { authorizeCron } from "@/lib/cron/authorize";
import { drainQueue, watchSources } from "@/lib/pipeline/runner";
import { watchStatutes } from "@/lib/pipeline/statute-runner";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const store = await getStore();
  const watched = await watchSources(store);
  const statutes = await watchStatutes(store);
  const processed = await drainQueue(store, 8);
  return Response.json({ ok: true, ...watched, statutes, processed });
}
