import { z } from "zod";
import { getFallbackStore } from "@/lib/db/fallback-store";
import { getStore } from "@/lib/db/store";
import { isStoreUnavailableError } from "@/lib/db/supabase-errors";
import type { AppStore } from "@/lib/db/types";
import { clientIp, enforceRateLimit, RateLimitError } from "@/lib/cost/rate-limit";
import { hashIp } from "@/lib/pipeline/hasher";
import {
  hitCachedSearch,
  peekExactSearchCache,
  searchGuidelines,
} from "@/lib/retrieval/search";
import type { SearchResponse } from "@/lib/types";

const Body = z.object({
  query: z.string().trim().min(2).max(500),
  scope: z.enum(["all", "domestic", "fda"]).optional(),
});

async function runSearch(
  store: AppStore,
  query: string,
  scope: "all" | "domestic" | "fda",
  ip: string,
): Promise<SearchResponse> {
  const cached = await peekExactSearchCache(store, query, scope);
  if (cached) {
    return hitCachedSearch(store, query, hashIp(ip), cached);
  }
  await enforceRateLimit(store, ip);
  return searchGuidelines(store, query, hashIp(ip), scope);
}

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const { query, scope = "all" } = Body.parse(json);
    const ip = clientIp(request.headers);
    try {
      const result = await runSearch(getStore(), query, scope, ip);
      return Response.json(result);
    } catch (error) {
      if (error instanceof RateLimitError || error instanceof z.ZodError) {
        throw error;
      }
      if (!isStoreUnavailableError(error)) throw error;
      const fallback = await getFallbackStore();
      const result = await runSearch(fallback, query, scope, ip);
      return Response.json({
        ...result,
        degraded: true,
      } satisfies SearchResponse);
    }
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
    if (isStoreUnavailableError(error)) {
      return Response.json(
        {
          error:
            "검색 저장소를 잠시 쓸 수 없습니다. 문서 목록에서 조항을 직접 열어 보세요.",
          code: "store_unavailable",
        },
        { status: 503 },
      );
    }
    const message = error instanceof Error ? error.message : "search failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
