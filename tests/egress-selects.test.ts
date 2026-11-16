import { describe, expect, it } from "vitest";
import {
  CHUNK_PUBLIC_COLUMNS,
  CHUNK_SEARCH_COLUMNS,
  DOCUMENT_VERSION_LIST_COLUMNS,
  STATUTE_ARTICLE_PUBLIC_COLUMNS,
  STATUTE_ARTICLE_SEARCH_COLUMNS,
} from "@/lib/db/select-columns";
import { PAGE_REVALIDATE_SECONDS } from "@/lib/cache/revalidate-pages";

describe("Supabase egress-safe selects", () => {
  it("keeps embeddings off the public chunk/article column lists", () => {
    expect(CHUNK_PUBLIC_COLUMNS).not.toMatch(/\bembedding\b/);
    expect(STATUTE_ARTICLE_PUBLIC_COLUMNS).not.toMatch(/\bembedding\b/);
    expect(CHUNK_SEARCH_COLUMNS).toMatch(/\bembedding\b/);
    expect(STATUTE_ARTICLE_SEARCH_COLUMNS).toMatch(/\bembedding\b/);
  });

  it("keeps extracted PDF bodies off version history lists", () => {
    expect(DOCUMENT_VERSION_LIST_COLUMNS).not.toMatch(/extracted_text/);
  });

  it("uses a one-day ISR window so crawlers do not rebuild hourly", () => {
    expect(PAGE_REVALIDATE_SECONDS).toBe(86_400);
  });
});
