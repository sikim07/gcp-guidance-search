import { describe, expect, it } from "vitest";
import { overlayThumbLayout } from "@/lib/ui/overlay-thumb";

describe("overlayThumbLayout", () => {
  it("hides the thumb when the document does not overflow", () => {
    expect(
      overlayThumbLayout({
        scrollHeight: 900,
        clientHeight: 900,
        scrollTop: 0,
        trackHeight: 900,
      }),
    ).toEqual({ opacity: 0, height: 0, top: 0 });
  });

  it("sizes the thumb from the visible ratio when the feed overflows", () => {
    const layout = overlayThumbLayout({
      scrollHeight: 2000,
      clientHeight: 900,
      scrollTop: 0,
      trackHeight: 900,
    });
    expect(layout.opacity).toBe(1);
    expect(layout.height).toBe(Math.max(40, (900 / 2000) * 900));
    expect(layout.top).toBe(0);
  });

  it("moves the thumb down as the document scrolls", () => {
    const layout = overlayThumbLayout({
      scrollHeight: 2000,
      clientHeight: 900,
      scrollTop: 1100,
      trackHeight: 900,
    });
    const height = Math.max(40, (900 / 2000) * 900);
    const maxTop = 900 - height;
    expect(layout.top).toBe((1100 / 1100) * maxTop);
  });
});
