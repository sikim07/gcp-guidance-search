import { unlink } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetFallbackStoreForTests } from "@/lib/db/fallback-store";
import { resetMemoryStoreForTests } from "@/lib/db/memory-store";
import { stableUuid } from "@/lib/pipeline/hasher";

vi.mock("@/lib/pipeline/embed", () => ({
  embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
}));

const locked = async () => {
  throw new Error(
    "Service for this project is restricted due to the following violations: exceed_egress_quota",
  );
};

vi.mock("@/lib/db/supabase-store", () => ({
  supabaseStore: new Proxy(
    {},
    {
      get: () => locked,
    },
  ),
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
  resetFallbackStoreForTests();
  resetMemoryStoreForTests();
  await clearLocalStoreFile();
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  resetFallbackStoreForTests();
  resetMemoryStoreForTests();
});

describe("loadPublicDocumentDetail", () => {
  it("falls back to the seed corpus when Supabase is locked", async () => {
    const { loadPublicDocumentDetail } = await import(
      "@/lib/documents/load-public-document"
    );
    const id = stableUuid("doc:fda-ich:e6-r3");
    const detail = await loadPublicDocumentDetail(id);
    expect(detail?.kind).toBe("guideline");
    if (detail?.kind === "guideline") {
      expect(detail.doc.title).toMatch(/E6/i);
      expect(detail.chunks.length).toBeGreaterThan(0);
    }
  }, 30_000);
});
