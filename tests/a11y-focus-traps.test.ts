import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("keyboard focus traps", () => {
  it("keeps SEO preset links out of the tab order", () => {
    const raw = readFileSync(
      path.join(process.cwd(), "components/preset-index.tsx"),
      "utf8",
    );
    expect(raw).toMatch(/\binert\b/);
    expect(raw).toMatch(/aria-hidden="true"/);
    expect(raw).toMatch(/tabIndex=\{-1\}/);
  });

  it("does not leave an invisible focusable translate button", () => {
    const raw = readFileSync(
      path.join(process.cwd(), "components/search-panel.tsx"),
      "utf8",
    );
    expect(raw).not.toMatch(/invisible"[\s\S]*toggle-translation/);
    expect(raw).toMatch(/canTranslate \? \(/);
    expect(raw).toMatch(/aria-label="검색 답변"/);
    expect(raw).toMatch(/aria-label="근거 원문"/);
    expect(raw).toMatch(/result-tab-panel/);
  });
});
