"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { overlayThumbLayout } from "@/lib/ui/overlay-thumb";

function documentScroller(): HTMLElement {
  return (document.scrollingElement ?? document.documentElement) as HTMLElement;
}

export function OverlayScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const scroller = documentScroller();
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const update = () => {
      const layout = overlayThumbLayout({
        scrollHeight: scroller.scrollHeight,
        clientHeight: scroller.clientHeight,
        scrollTop: scroller.scrollTop,
        trackHeight: track.clientHeight,
      });
      thumb.style.opacity = String(layout.opacity);
      if (layout.opacity === 0) return;
      thumb.style.height = `${layout.height}px`;
      thumb.style.transform = `translateY(${layout.top}px)`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    observer.observe(document.body);
    const frame = document.querySelector(".app-frame");
    if (frame) observer.observe(frame);
    if (frame?.firstElementChild) observer.observe(frame.firstElementChild);
    return () => {
      window.removeEventListener("scroll", update);
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <div
      ref={trackRef}
      className="overlay-scrollbar"
      aria-hidden
      style={{ viewTransitionName: "overlay-scrollbar" }}
    >
      <div ref={thumbRef} className="overlay-scrollbar-thumb" />
    </div>
  );
}
