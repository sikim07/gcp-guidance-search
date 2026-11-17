import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("analytics notice placement", () => {
  it("renders a floating overlay outside main, not edge-stuck", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("<CookieNotice />");
    expect(layout).toContain("<AnalyticsLoader />");
    const mainBlock = layout.slice(layout.indexOf("<main"), layout.indexOf("</main>"));
    expect(mainBlock).not.toContain("<CookieNotice />");
    expect(layout.indexOf("</main>")).toBeLessThan(layout.indexOf("<CookieNotice />"));

    const notice = read("components/cookie-notice.tsx");
    expect(notice).toContain('className="analytics-notice"');
    expect(notice).toContain('role="dialog"');
    expect(notice).toContain('aria-modal="false"');
    expect(notice).toContain("data-animate");
    expect(notice).toContain("data-leaving");
    expect(notice).toContain("analytics-notice-title");
    expect(notice).toContain("markAnalyticsFocus");
    expect(notice).toContain("NavLink");
    expect(notice).toContain('href="/about"');
    expect(notice).toContain("scroll={false}");
    expect(notice).not.toMatch(/bottom-0|left-0|right-0|inset-x-0/);

    const css = read("app/globals.css");
    const rule = css.match(/\.analytics-notice\s*\{[^}]+\}/s);
    expect(rule?.[0]).toMatch(/position:\s*fixed/);
    expect(rule?.[0]).toMatch(/left:\s*50%/);
    expect(rule?.[0]).toMatch(/bottom:\s*calc\(var\(--liquid-tabbar-space\)/);
    expect(rule?.[0]).not.toMatch(/bottom:\s*0|left:\s*0|right:\s*0/);
    expect(rule?.[0]).toMatch(/view-transition-name:\s*analytics-consent-notice/);
    expect(css).toMatch(/::view-transition-group\(analytics-consent-notice\)/);
    expect(css).toMatch(/\.analytics-notice\[data-animate="in"\]/);
    expect(css).toMatch(
      /\.analytics-notice\[data-leaving="true"\]\s*\{[^}]*animation:\s*none/s,
    );
    expect(css).toMatch(/\.analytics-anchor\.is-hash-focus/);

    const about = read("app/about/page.tsx");
    expect(about).toContain("HashScroll");
    expect(about).toMatch(/id="analytics"/);
    expect(about).toContain("analytics-anchor");

    const hash = read("components/hash-scroll.tsx");
    expect(hash).toContain("is-hash-focus");
    expect(hash).toContain("markAnalyticsFocus");
    expect(hash).toContain("gcp-focus-analytics");
    expect(hash).toContain("maxScrollTop");
    expect(hash).toContain("PAGE_TRANSITION_MS");
    expect(hash).not.toContain("scrollIntoView");
    expect(hash).not.toMatch(/addEventListener\(\s*["']hashchange["']/);
    // One vertical move only — no top-detour choreography.
    expect(hash).not.toMatch(/smoothScrollToY\(0/);
    expect(hash).not.toMatch(/scrollTo\(\{\s*top:\s*0/);
  });

  it("keeps tabbar bottom padding through sm until md hides the tabbar", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("pb-[var(--liquid-tabbar-space)]");
    expect(layout).toContain("sm:pt-8");
    expect(layout).toContain("md:pb-8");
    expect(layout).not.toMatch(/sm:py-8/);
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

  it("reads the measurement id with a static process.env member access", () => {
    const ga = read("lib/analytics/ga.ts");
    // Regression: `env = process.env` + `env.NEXT_PUBLIC_…` is not inlined
    // into client bundles, so CookieNotice never sees an ID.
    expect(ga).toMatch(/process\.env\.NEXT_PUBLIC_GA_MEASUREMENT_ID/);
    expect(ga).not.toMatch(
      /getMeasurementId\([^)]*=\s*process\.env/,
    );
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
