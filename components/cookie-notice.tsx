"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
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
 * Floating analytics notice (overlay). Not in document flow so dismiss does not
 * shift page content. Inset from viewport edges so AdSense rails/anchors stay clear.
 */
export function CookieNotice() {
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
  const [leaving, setLeaving] = useState(false);
  const measurementId = getMeasurementId();

  if (!mounted || !measurementId) return null;
  if (hasResponded(consent) && !leaving) return null;

  function decide(next: AnalyticsConsent) {
    setLeaving(true);
    writeConsent(next);
    if (next === "granted") loadGaIfGranted();
  }

  return (
    <section
      className="analytics-notice"
      role="dialog"
      aria-modal="false"
      aria-label="분석 쿠키 안내"
      data-testid="analytics-notice"
      data-leaving={leaving ? "true" : undefined}
      onTransitionEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (leaving) setLeaving(false);
      }}
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
