import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADSENSE_PUBLISHER_ID } from "@/lib/ads";

describe("ads.txt", () => {
  it("authorizes this publisher for Google AdSense", () => {
    const raw = readFileSync(path.join(process.cwd(), "public/ads.txt"), "utf8");
    const pub = ADSENSE_PUBLISHER_ID.replace(/^ca-/, "");
    expect(raw).toContain(`google.com, ${pub}, DIRECT, f08c47fec0942fa0`);
  });
});
