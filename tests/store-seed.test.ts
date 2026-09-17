import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureSeeded } from "@/lib/pipeline/seed/bootstrap";
import { getStore } from "@/lib/db/store";

vi.mock("@/lib/pipeline/seed/bootstrap", () => ({
  ensureSeeded: vi.fn(async () => undefined),
}));

describe("getStore", () => {
  beforeEach(() => {
    vi.mocked(ensureSeeded).mockClear();
  });

  it("returns a store without seeding on the read path", async () => {
    const store = await getStore();
    expect(store.listDocuments).toBeTypeOf("function");
    expect(ensureSeeded).not.toHaveBeenCalled();
  });
});

describe("shouldBootstrapSeed", () => {
  it("skips seeding during next build so deploys do not re-embed the corpus", async () => {
    const { shouldBootstrapSeed } = await import("@/lib/pipeline/seed/dev-bootstrap");
    expect(shouldBootstrapSeed({ NEXT_PHASE: "phase-production-build" })).toBe(false);
    expect(shouldBootstrapSeed({ NEXT_RUNTIME: "edge" })).toBe(false);
    expect(shouldBootstrapSeed({})).toBe(true);
  });
});
