import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("analytics notice placement", () => {
  it("keeps the notice in-flow inside main, not fixed to bottom or sides", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("<CookieNotice />");
    expect(layout).toContain("<AnalyticsLoader />");
    const mainBlock = layout.slice(layout.indexOf("<main"), layout.indexOf("</main>"));
    expect(mainBlock).toContain("<CookieNotice />");
    expect(mainBlock.indexOf("<CookieNotice />")).toBeLessThan(
      mainBlock.indexOf("{children}"),
    );

    const notice = read("components/cookie-notice.tsx");
    expect(notice).toContain('className="analytics-notice"');
    expect(notice).not.toMatch(/className=\{?["'`][^"'`]*\bfixed\b/);
    expect(notice).not.toMatch(/style=\{\{[^}]*position:\s*["']fixed["']/);
    expect(notice).not.toMatch(/bottom-0|left-0|right-0|inset-x-0/);

    const css = read("app/globals.css");
    const rule = css.match(/\.analytics-notice\s*\{[^}]+\}/);
    expect(rule?.[0]).toMatch(/position:\s*relative/);
    expect(rule?.[0]).not.toMatch(/position:\s*fixed|position:\s*sticky/);
    expect(rule?.[0]).not.toMatch(/\bbottom\s*:|\bleft\s*:|\bright\s*:/);
  });

  it("documents GA-only consent vs AdSense on about", () => {
    const about = read("app/about/page.tsx");
    expect(about).toContain('id="analytics"');
    expect(about).toMatch(/거부하면 GA/);
    expect(about).toMatch(/AdSense/);
    expect(about).toMatch(/동의 게이트가 없습니다/);
  });

  it("exposes GA measurement id via env example only", () => {
    const env = read(".env.example");
    expect(env).toContain("NEXT_PUBLIC_GA_MEASUREMENT_ID=");
    const ga = read("lib/analytics/ga.ts");
    expect(ga).toContain("NEXT_PUBLIC_GA_MEASUREMENT_ID");
    expect(ga).not.toMatch(/G-[A-Z0-9]{6,}/);
  });
});

describe("analytics event wiring", () => {
  it("tracks allowlisted product events from search and retry UI", () => {
    const panel = read("components/search-panel.tsx");
    expect(panel).toContain('trackEvent("search_submit"');
    expect(panel).toContain('trackEvent("preset_click"');
    expect(panel).toContain('trackEvent("scope_change"');
    expect(panel).toContain('trackEvent("translate_toggle"');
    expect(panel).toContain('trackEvent("copy_citations"');
    expect(panel).toContain('trackEvent("feedback"');

    const retry = read("components/retry-notice.tsx");
    expect(retry).toContain('trackEvent("retry_click"');
    expect(retry).toContain("retryKind");
  });
});
