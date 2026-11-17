import { isGranted, readConsent } from "@/lib/analytics/consent";

export type GaEventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const LOADED_ATTR = "data-gcp-ga-loaded";

/** Allowlisted event names from the plan. */
export type GaEventName =
  | "page_view"
  | "search_submit"
  | "preset_click"
  | "scope_change"
  | "translate_toggle"
  | "copy_citations"
  | "feedback"
  | "retry_click";

export function getMeasurementId(
  env?: Record<string, string | undefined>,
): string | undefined {
  // Next.js only inlines the literal `process.env.NEXT_PUBLIC_*` access into
  // client bundles. Passing `process.env` as a default object and reading a
  // property off it leaves the value undefined in the browser.
  const value = (
    env
      ? env.NEXT_PUBLIC_GA_MEASUREMENT_ID
      : process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  )?.trim();
  if (!value || !/^G-[A-Z0-9]+$/i.test(value)) return undefined;
  return value;
}

function ensureGtagStub(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }
}

export function loadGaIfGranted(): boolean {
  const id = getMeasurementId();
  if (!id || !isGranted()) return false;
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  ensureGtagStub();
  if (document.documentElement.getAttribute(LOADED_ATTR) === id) {
    return true;
  }

  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);
  }

  window.gtag?.("js", new Date());
  window.gtag?.("config", id, {
    anonymize_ip: true,
    send_page_view: false,
  });
  document.documentElement.setAttribute(LOADED_ATTR, id);
  return true;
}

function sanitizeParams(params?: GaEventParams): Record<string, string | number | boolean> {
  if (!params) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    // Never send free-text queries / comments.
    if (key === "query" || key === "comment" || key === "text") continue;
    out[key] = value;
  }
  return out;
}

export function trackEvent(name: GaEventName, params?: GaEventParams): void {
  if (!getMeasurementId()) return;
  if (!isGranted(readConsent())) return;
  if (typeof window === "undefined") return;
  if (!loadGaIfGranted()) return;
  window.gtag?.("event", name, sanitizeParams(params));
}

export function trackPageView(path: string): void {
  trackEvent("page_view", {
    page_path: path,
    page_title: typeof document !== "undefined" ? document.title : undefined,
  });
}
