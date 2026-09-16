import { describe, expect, it } from "vitest";
import {
  ANSWER_K,
  ANSWER_MAX_TOKENS,
  TOP_K,
  chunksForAnswer,
} from "@/lib/retrieval/limits";
import { peekExactSearchCache, searchCacheKey } from "@/lib/retrieval/search";
import { normalizeQuery } from "@/lib/utils";
import type { AppStore } from "@/lib/db/types";
import type { QueryCacheRecord } from "@/lib/types";

describe("answer vs retrieval limits", () => {
  it("keeps six retrieval candidates but sends three to the answer", () => {
    expect(TOP_K).toBe(6);
    expect(ANSWER_K).toBe(3);
    expect(chunksForAnswer([0, 1, 2, 3, 4, 5])).toEqual([0, 1, 2]);
  });

  it("caps completion tokens at 400", () => {
    expect(ANSWER_MAX_TOKENS).toBe(400);
  });
});

describe("cache generation", () => {
  it("scopes the v6 cache key by origin filter", () => {
    expect(searchCacheKey("감사추적", "all")).toBe("v6:all:감사추적");
    expect(searchCacheKey("감사추적", "fda")).toBe("v6:fda:감사추적");
    expect(searchCacheKey("감사추적", "all")).not.toBe(
      searchCacheKey("감사추적", "domestic"),
    );
  });
});

describe("exact cache peek", () => {
  it("returns only unexpired exact rows", async () => {
    const live: QueryCacheRecord = {
      queryHash: "h1",
      normalizedQuery: searchCacheKey(normalizeQuery("감사추적"), "all"),
      embedding: [1],
      answer: "감사추적을 남긴다",
      sources: [],
      passages: [],
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      hitCount: 1,
    };
    const store = {
      getCachedAnswer: async (key: string) =>
        key === live.normalizedQuery ? live : undefined,
    } as Pick<AppStore, "getCachedAnswer"> as AppStore;
    const hit = await peekExactSearchCache(store, "감사추적", "all");
    expect(hit?.answer).toMatch(/감사추적/);
    const miss = await peekExactSearchCache(store, "다른 질문", "all");
    expect(miss).toBeUndefined();
  });

  it("treats expired exact rows as a miss", async () => {
    const stale: QueryCacheRecord = {
      queryHash: "h2",
      normalizedQuery: searchCacheKey(normalizeQuery("감사추적"), "all"),
      embedding: [1],
      answer: "옛 답",
      sources: [],
      passages: [],
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      hitCount: 1,
    };
    const store = {
      getCachedAnswer: async () => stale,
    } as Pick<AppStore, "getCachedAnswer"> as AppStore;
    expect(await peekExactSearchCache(store, "감사추적", "all")).toBeUndefined();
  });
});
