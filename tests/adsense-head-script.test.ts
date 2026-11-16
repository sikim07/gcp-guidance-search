import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADSENSE_PUBLISHER_ID } from "@/lib/ads";

describe("AdSense head snippet", () => {
  it("embeds Google's adsbygoogle script in the root layout head", () => {
    const raw = readFileSync(path.join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(raw).toContain("<head>");
    expect(raw).toContain(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=\${ADSENSE_PUBLISHER_ID}`,
    );
    expect(raw).toContain("crossOrigin=\"anonymous\"");
    expect(ADSENSE_PUBLISHER_ID).toBe("ca-pub-9321980978046322");
  });
});
