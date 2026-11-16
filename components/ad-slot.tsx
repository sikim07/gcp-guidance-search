"use client";

import { useEffect, useRef } from "react";
import {
  adsEnabled,
  adsenseClientId,
  adsenseSlotId,
  type AdPlacement,
} from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Display ad below search results / document catalog.
 * Never mounts inside clause body or answer text.
 */
export function AdSlot({ placement }: { placement: AdPlacement }) {
  const pushed = useRef(false);
  const client = adsenseClientId();
  const slot = adsenseSlotId(placement);
  const live = adsEnabled(placement);

  useEffect(() => {
    if (!live || !client || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers / missing script — leave the labeled shell.
    }
  }, [live, client]);

  return (
    <aside
      className="ad-slot"
      aria-label="광고"
      data-testid={`ad-slot-${placement}`}
      data-live={live ? "true" : "false"}
    >
      <p className="ad-slot-label">광고</p>
      {live && client && slot ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="ad-slot-placeholder">
          <p className="text-muted text-xs leading-5">
            AdSense 연결 후 여기에 표시됩니다. 조항 본문·답변과 분리된 영역입니다.
          </p>
        </div>
      )}
    </aside>
  );
}
