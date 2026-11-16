import { afterEach, describe, expect, it, vi } from "vitest";
import { resetFallbackStoreForTests } from "@/lib/db/fallback-store";
import { memoryStore } from "@/lib/db/memory-store";

vi.mock("@/lib/pipeline/embed", () => ({
  embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
}));

const listDocuments = vi.fn(async () => {
  throw new Error("supabase must not be called during next build");
});

vi.mock("@/lib/db/supabase-store", () => ({
  supabaseStore: {
    listDocuments,
  },
}));

afterEach(() => {
  delete process.env.NEXT_PHASE;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  listDocuments.mockClear();
  resetFallbackStoreForTests();
  vi.resetModules();
});

describe("build-time store isolation", () => {
  it("getStore never selects Supabase during next build", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";

    const { getStore, usingSupabase } = await import("@/lib/db/store");
    expect(usingSupabase()).toBe(true);
    expect(getStore()).toBe(memoryStore);
    expect(listDocuments).not.toHaveBeenCalled();
  });

  it("readPublicStore uses the seed store during next build without touching Supabase", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";

    const { readPublicStore } = await import("@/lib/cache/public-catalog");
    const docs = await readPublicStore((store) => store.listDocuments());
    expect(docs.length).toBeGreaterThan(0);
    expect(listDocuments).not.toHaveBeenCalled();
  }, 20_000);
});
