import { getStore } from "@/lib/db/store";
import { authorizeCron } from "@/lib/cron/authorize";
import { drainQueue } from "@/lib/pipeline/runner";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const store = await getStore();
  const processed = await drainQueue(store, 4);
  return Response.json({ ok: true, processed });
}
