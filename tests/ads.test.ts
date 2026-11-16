import { describe, expect, it } from "vitest";
import { adsEnabled, adsenseClientId, adsenseSlotId } from "@/lib/ads";

describe("ads config", () => {
  it("stays off until both client and slot are set", () => {
    delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    delete process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH;
    expect(adsenseClientId()).toBeUndefined();
    expect(adsenseSlotId("search-result")).toBeUndefined();
    expect(adsEnabled("search-result")).toBe(false);

    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = "ca-pub-123";
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH = "111";
    expect(adsEnabled("search-result")).toBe(true);
    expect(adsEnabled("documents")).toBe(false);
  });
});
