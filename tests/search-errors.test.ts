import { describe, expect, it } from "vitest";
import { classifySearchFailure, searchFailureCopy } from "@/lib/search/errors";
import { isStoreUnavailableError } from "@/lib/db/supabase-errors";

describe("search failure copy", () => {
  it("offers retry on network and server errors, not on daily limits", () => {
    expect(classifySearchFailure(undefined)).toBe("network");
    expect(searchFailureCopy("network").retry).toBe(true);
    expect(searchFailureCopy("server").retry).toBe(true);
    expect(searchFailureCopy(classifySearchFailure(429)).retry).toBe(false);
    expect(searchFailureCopy(classifySearchFailure(400)).retry).toBe(false);
    expect(searchFailureCopy("limit").detail).toMatch(/하루 5건/);
  });

  it("treats store quota failures as unavailable with a documents escape hatch", () => {
    expect(classifySearchFailure(503, "store_unavailable")).toBe("unavailable");
    expect(isStoreUnavailableError(new Error("Bandwidth egress quota exceeded"))).toBe(
      true,
    );
    const copy = searchFailureCopy("unavailable");
    expect(copy.retry).toBe(true);
    expect(copy.documentsHref).toBe("/documents");
    expect(copy.title).toMatch(/저장소/);
  });
});
