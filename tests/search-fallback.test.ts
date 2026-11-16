import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFallbackStore,
  resetFallbackStoreForTests,
} from "@/lib/db/fallback-store";

vi.mock("@/lib/pipeline/embed", () => ({
  embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
}));

afterEach(() => {
  resetFallbackStoreForTests();
});

describe("getFallbackStore", () => {
  it(
    "seeds an in-process corpus when Supabase cannot serve search",
    async () => {
      const store = await getFallbackStore();
      const docs = await store.listDocuments();
      expect(docs.length).toBeGreaterThan(0);
      const chunks = await store.currentChunksWithEmbeddings();
      expect(chunks.some((row) => row.embedding.length > 0)).toBe(true);
      const again = await getFallbackStore();
      expect(again).toBe(store);
    },
    20_000,
  );
});

