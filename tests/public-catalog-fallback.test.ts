import { afterEach, describe, expect, it, vi } from "vitest";
import { resetFallbackStoreForTests } from "@/lib/db/fallback-store";

vi.mock("@/lib/pipeline/embed", () => ({
  embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
}));

const listDocuments = vi.fn();

vi.mock("@/lib/db/store", () => ({
  getStore: () => ({
    listDocuments,
    listStatutes: vi.fn(),
    listChangeLogs: vi.fn(),
    currentChunks: vi.fn(),
    currentStatuteArticles: vi.fn(),
    currentChunkIndex: vi.fn(),
    currentStatuteArticleIndex: vi.fn(),
    listCurrentChunksByDocument: vi.fn(),
    listCurrentArticlesByStatute: vi.fn(),
  }),
  usingSupabase: () => true,
}));

afterEach(() => {
  listDocuments.mockReset();
  resetFallbackStoreForTests();
  vi.restoreAllMocks();
});

describe("readPublicStore", () => {
  it("falls back to the seed store when Supabase is egress-restricted", async () => {
    listDocuments.mockRejectedValue(
      new Error(
        JSON.stringify({
          message:
            "Service for this project is restricted due to the following violations: exceed_egress_quota. The project owner must upgrade their plan or remove spend caps to restore service.",
        }),
      ),
    );

    const { readPublicStore } = await import("@/lib/cache/public-catalog");
    const docs = await readPublicStore((store) => store.listDocuments());
    expect(docs.length).toBeGreaterThan(0);
  }, 20_000);

  it("rethrows unrelated store failures", async () => {
    listDocuments.mockRejectedValue(new Error("permission denied"));
    const { readPublicStore } = await import("@/lib/cache/public-catalog");
    await expect(
      readPublicStore((store) => store.listDocuments()),
    ).rejects.toThrow(/permission denied/);
  });
});
