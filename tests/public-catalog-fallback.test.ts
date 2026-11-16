import { unlink } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetFallbackStoreForTests } from "@/lib/db/fallback-store";
import { resetMemoryStoreForTests } from "@/lib/db/memory-store";

vi.mock("@/lib/pipeline/embed", () => ({
  embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
}));

const listDocuments = vi.fn();

vi.mock("@/lib/db/supabase-store", () => ({
  supabaseStore: {
    listDocuments: (...args: unknown[]) => listDocuments(...args),
    listStatutes: vi.fn(),
    listChangeLogs: vi.fn(),
    currentChunks: vi.fn(),
    currentStatuteArticles: vi.fn(),
    currentChunkIndex: vi.fn(),
    currentStatuteArticleIndex: vi.fn(),
    listCurrentChunksByDocument: vi.fn(),
    listCurrentArticlesByStatute: vi.fn(),
  },
}));

async function clearLocalStoreFile() {
  try {
    await unlink(path.join(process.cwd(), ".data", "store.json"));
  } catch {
    /* missing is fine */
  }
}

beforeEach(async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  delete process.env.NEXT_PHASE;
  listDocuments.mockReset();
  resetFallbackStoreForTests();
  resetMemoryStoreForTests();
  await clearLocalStoreFile();
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  listDocuments.mockReset();
  resetFallbackStoreForTests();
  resetMemoryStoreForTests();
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
