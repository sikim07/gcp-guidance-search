"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@heroui/react";
import {
  hasResponded,
  readConsent,
  writeConsent,
  type AnalyticsConsent,
} from "@/lib/analytics/consent";
import { getMeasurementId, loadGaIfGranted } from "@/lib/analytics/ga";

function subscribeConsent(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("gcp-analytics-consent", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("gcp-analytics-consent", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/**
 * In-flow analytics notice inside <main>. Never position:fixed to bottom/sides
 * so AdSense Auto ads anchors and side rails stay clear.
 */
export function CookieNotice() {
  // Client-only: avoid SSR flash / hydration mismatch with localStorage.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const consent = useSyncExternalStore(
    subscribeConsent,
    readConsent,
    () => null,
  );
  const measurementId = getMeasurementId();

  if (!mounted || !measurementId || hasResponded(consent)) return null;

  function decide(next: AnalyticsConsent) {
    writeConsent(next);
    if (next === "granted") loadGaIfGranted();
  }

  return (
    <section
      className="analytics-notice"
      role="region"
      aria-label="분석 쿠키 안내"
      data-testid="analytics-notice"
    >
      <p className="analytics-notice-copy">
        서비스 개선을 위해 방문·검색 통계(Google Analytics)를 수집합니다.{" "}
        <Link href="/about#analytics" className="analytics-notice-link">
          안내
        </Link>
      </p>
      <div className="analytics-notice-actions">
        <Button
          size="sm"
          variant="secondary"
          className="analytics-notice-deny"
          data-testid="analytics-deny"
          onPress={() => decide("denied")}
        >
          거부
        </Button>
        <Button
          size="sm"
          className="analytics-notice-accept"
          data-testid="analytics-accept"
          onPress={() => decide("granted")}
        >
          확인
        </Button>
      </div>
    </section>
  );
}
