"use client";

import { useEffect, useRef } from "react";

export function OverlayScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".app-frame");
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!scroller || !track || !thumb) return;

    const update = () => {
      const overflow = scroller.scrollHeight - scroller.clientHeight;
      if (overflow <= 1) {
        thumb.style.opacity = "0";
        return;
      }
      const trackHeight = track.clientHeight;
      const thumbHeight = Math.max(40, (scroller.clientHeight / scroller.scrollHeight) * trackHeight);
      const maxTop = Math.max(0, trackHeight - thumbHeight);
      const top = (scroller.scrollTop / overflow) * maxTop;
      thumb.style.opacity = "1";
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${top}px)`;
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, []);

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
