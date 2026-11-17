"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isGranted, readConsent } from "@/lib/analytics/consent";
import { getMeasurementId, loadGaIfGranted, trackPageView } from "@/lib/analytics/ga";

/** Loads gtag only after grant; sends page_view on App Router navigations. */
export function AnalyticsLoader() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    function sync() {
      if (!getMeasurementId()) return;
      if (!isGranted(readConsent())) return;
      if (!loadGaIfGranted()) return;
      const path = pathname || "/";
      if (lastPath.current === path) return;
      lastPath.current = path;
      trackPageView(path);
    }

    sync();
    window.addEventListener("gcp-analytics-consent", sync);
    return () => window.removeEventListener("gcp-analytics-consent", sync);
  }, [pathname]);

  return null;
}
