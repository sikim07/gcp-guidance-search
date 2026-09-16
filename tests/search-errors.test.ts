import { describe, expect, it } from "vitest";
import { classifySearchFailure, searchFailureCopy } from "@/lib/search/errors";

describe("search failure copy", () => {
  it("offers retry on network and server errors, not on daily limits", () => {
    expect(classifySearchFailure(undefined)).toBe("network");
    expect(searchFailureCopy("network").retry).toBe(true);
    expect(searchFailureCopy("server").retry).toBe(true);
    expect(searchFailureCopy(classifySearchFailure(429)).retry).toBe(false);
    expect(searchFailureCopy(classifySearchFailure(400)).retry).toBe(false);
    expect(searchFailureCopy("limit").detail).toMatch(/하루 5건/);
  });
});
