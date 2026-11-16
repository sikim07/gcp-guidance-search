import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Korean line wrapping", () => {
  it("keeps Hangul words intact instead of breaking per syllable", () => {
    const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/body\s*\{[^}]*word-break:\s*keep-all/s);
    expect(css).not.toMatch(/overflow-wrap:\s*anywhere/);
  });
});
