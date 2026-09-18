import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`));
  if (!match) throw new Error(`missing ${selector}`);
  return match[0];
}

describe("site chrome view transitions", () => {
  it("freezes the header group in place instead of morphing its box", () => {
    const block = rule("::view-transition-group(site-header)");
    expect(block).toMatch(/animation:\s*none/);
    expect(block).not.toMatch(/\bleft\s*:/);
    expect(block).not.toMatch(/\bwidth\s*:/);
    expect(block).not.toMatch(/\btransform\s*:/);
  });

  it("does not hide the document scrollbar on touch, where that reflow looks like a reload", () => {
    const root = rule("html,\nbody");
    expect(root).not.toMatch(/scrollbar-width/);
    expect(css).toMatch(
      /@media \(pointer: fine\)[\s\S]*html,\s*body \{\s*scrollbar-width:\s*none/,
    );
  });
});
