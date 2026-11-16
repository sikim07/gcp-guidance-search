import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pipeline/embed", () => ({
  embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3])),
}));

describe("stableUuid", () => {
  it("returns the same UUID for the same key", async () => {
    const { stableUuid } = await import("@/lib/pipeline/hasher");
    const a = stableUuid("doc:fda-ich:e6-r3");
    const b = stableUuid("doc:fda-ich:e6-r3");
    expect(a).toBe(b);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(stableUuid("doc:other")).not.toBe(a);
  });
});

describe("seedOneDocument", () => {
  it("assigns a stable document id from externalId", async () => {
    const { seedOneDocument } = await import("@/lib/pipeline/seed/bootstrap");
    const { stableUuid } = await import("@/lib/pipeline/hasher");
    const { emptySnapshot } = await import("@/lib/db/types");
    const snap = emptySnapshot();
    const store = {
      async upsertDocument(doc: { id: string }) {
        snap.documents = [doc as never];
      },
      async addVersion() {},
      async addChunks() {},
      async addChangeLog() {},
    };
    await seedOneDocument(store as never, {
      externalId: "fda-ich:e6-r3",
      source: "fda-ich",
      title: "E6",
      url: "https://example.com",
      issuedDate: "2025-01-01",
      category: "ich",
      text: "1. Scope\n\nThis is a test body long enough for chunking.",
    });
    expect(snap.documents[0]?.id).toBe(stableUuid("doc:fda-ich:e6-r3"));
  });
});
