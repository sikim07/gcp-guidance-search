import { z } from "zod";
import { getStore } from "@/lib/db/store";
import { clientIp, enforceRateLimit, RateLimitError } from "@/lib/cost/rate-limit";
import { hashIp } from "@/lib/pipeline/hasher";
import {
  hitCachedSearch,
  peekExactSearchCache,
  searchGuidelines,
} from "@/lib/retrieval/search";

const Body = z.object({
  query: z.string().trim().min(2).max(500),
  scope: z.enum(["all", "domestic", "fda"]).optional(),
});

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const { query, scope = "all" } = Body.parse(json);
    const store = await getStore();
    const ip = clientIp(request.headers);
    const cached = await peekExactSearchCache(store, query, scope);
    if (cached) {
      return Response.json(await hitCachedSearch(store, query, hashIp(ip), cached));
    }
    await enforceRateLimit(store, ip);
    const result = await searchGuidelines(store, query, hashIp(ip), scope);
    return Response.json(result);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "질문을 두 글자 이상 입력해 주세요." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "search failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
