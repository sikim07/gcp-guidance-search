import { afterEach, describe, expect, it } from "vitest";
import {
  ADSENSE_PUBLISHER_ID,
  adsEnabled,
  adsenseClientId,
  adsenseSlotId,
} from "@/lib/ads";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  delete process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH;
  delete process.env.NEXT_PUBLIC_ADSENSE_SLOT_DOCUMENTS;
  delete process.env.NEXT_PUBLIC_ADSENSE_SLOT_UPDATES;
  delete process.env.NEXT_PUBLIC_ADSENSE_SLOT_ABOUT;
});

describe("ads config", () => {
  it("defaults the publisher client but stays off until a slot is set", () => {
    expect(adsenseClientId()).toBe(ADSENSE_PUBLISHER_ID);
    expect(adsenseSlotId("search-result")).toBeUndefined();
    expect(adsEnabled("search-result")).toBe(false);

    process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH = "111";
    expect(adsEnabled("search-result")).toBe(true);
    expect(adsEnabled("documents")).toBe(false);
  });

  it("lets updates/about reuse the documents display slot", () => {
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_DOCUMENTS = "222";
    expect(adsenseSlotId("documents")).toBe("222");
    expect(adsenseSlotId("updates")).toBe("222");
    expect(adsenseSlotId("about")).toBe("222");
    expect(adsEnabled("updates")).toBe(true);
    expect(adsEnabled("about")).toBe(true);
  });
});
