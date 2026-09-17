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
