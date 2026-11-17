export const ANALYTICS_CONSENT_KEY = "gcp-analytics-consent";

export type AnalyticsConsent = "granted" | "denied";

export function parseConsent(raw: string | null | undefined): AnalyticsConsent | null {
  if (raw === "granted" || raw === "denied") return raw;
  return null;
}

export function readConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    return parseConsent(window.localStorage.getItem(ANALYTICS_CONSENT_KEY));
  } catch {
    return null;
  }
}

export function writeConsent(value: AnalyticsConsent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // Private mode / quota — ignore; session still works without persistence.
  }
  window.dispatchEvent(new Event("gcp-analytics-consent"));
}

export function hasResponded(consent: AnalyticsConsent | null = readConsent()): boolean {
  return consent !== null;
}

export function isGranted(consent: AnalyticsConsent | null = readConsent()): boolean {
  return consent === "granted";
}
