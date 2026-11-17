import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_KEY,
  hasResponded,
  isGranted,
  parseConsent,
  readConsent,
  writeConsent,
} from "@/lib/analytics/consent";
import { getMeasurementId, trackEvent } from "@/lib/analytics/ga";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  const listeners = new Map<string, Set<() => void>>();
  const windowMock = {
    localStorage: localStorageMock,
    dataLayer: [] as unknown[],
    gtag: undefined as ((...args: unknown[]) => void) | undefined,
    addEventListener: (type: string, fn: () => void) => {
      const set = listeners.get(type) ?? new Set();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, fn: () => void) => {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent: (event: { type: string }) => {
      for (const fn of listeners.get(event.type) ?? []) fn();
      return true;
    },
  };
  const documentMock = {
    documentElement: {
      getAttribute: vi.fn(() => null),
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
    },
    head: { appendChild: vi.fn() },
    createElement: vi.fn(() => ({ async: false, src: "" })),
    querySelector: vi.fn(() => null),
  };
  vi.stubGlobal("window", windowMock);
  vi.stubGlobal("document", documentMock);
  delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
});

describe("analytics consent", () => {
  it("parses only granted or denied", () => {
    expect(parseConsent("granted")).toBe("granted");
    expect(parseConsent("denied")).toBe("denied");
    expect(parseConsent("maybe")).toBeNull();
    expect(parseConsent(null)).toBeNull();
  });

  it("persists consent in localStorage", () => {
    expect(hasResponded()).toBe(false);
    writeConsent("granted");
    expect(readConsent()).toBe("granted");
    expect(isGranted()).toBe(true);
    writeConsent("denied");
    expect(isGranted()).toBe(false);
    expect(hasResponded()).toBe(true);
    expect(store.get(ANALYTICS_CONSENT_KEY)).toBe("denied");
  });
});

describe("ga helpers", () => {
  it("accepts only G- measurement ids", () => {
    expect(getMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-ABC123" })).toBe(
      "G-ABC123",
    );
    expect(getMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "UA-1" })).toBeUndefined();
    expect(getMeasurementId({})).toBeUndefined();
  });

  it("no-ops trackEvent without id or consent", () => {
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => {
      calls.push(args);
    };
    trackEvent("search_submit", { scope: "all" });
    expect(calls).toHaveLength(0);

    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST01";
    trackEvent("search_submit", { scope: "all" });
    expect(calls).toHaveLength(0);

    writeConsent("granted");
    trackEvent("search_submit", { scope: "all", query: "secret" });
    expect(calls.some((row) => row[0] === "event")).toBe(true);
    const eventCall = calls.find((row) => row[0] === "event" && row[1] === "search_submit");
    expect(eventCall?.[2]).toEqual({ scope: "all" });
  });
});
