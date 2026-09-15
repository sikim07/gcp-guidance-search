import { getStore } from "@/lib/db/store";
import { drainQueue, watchSources } from "@/lib/pipeline/runner";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization");
  const url = new URL(request.url);
  return header === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const store = await getStore();
  const watched = await watchSources(store);
  const processed = await drainQueue(store, 8);
  return Response.json({ ok: true, ...watched, processed });
}
