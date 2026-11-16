import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("search control color roles", () => {
  it("defines distinct tones for scope, preset, submit, and retry", () => {
    const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.chip-scope\s*\{/);
    expect(css).toMatch(/\.chip-preset\s*\{[^}]*var\(--ink\)/s);
    expect(css).not.toMatch(/\.chip-preset\s*\{[^}]*var\(--fda\)/s);
    expect(css).toMatch(/\.search-submit\s*\{[^}]*var\(--seal\)/s);
    expect(css).toMatch(/\.retry-action\s*\{/);
  });

  it("wires role classes into the search panel", () => {
    const panel = readFileSync(
      path.join(process.cwd(), "components/search-panel.tsx"),
      "utf8",
    );
    expect(panel).toContain("chip-scope");
    expect(panel).toContain("chip-preset");
    expect(panel).toContain("chip-recent");
    expect(panel).toMatch(/aria-pressed=\{active\}/);
    expect(panel).not.toMatch(/isDisabled=\{loading \|\| active\}/);
    const retry = readFileSync(
      path.join(process.cwd(), "components/retry-notice.tsx"),
      "utf8",
    );
    expect(retry).toContain("retry-action");
  });
});
