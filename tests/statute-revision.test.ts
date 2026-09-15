import { describe, expect, it } from "vitest";
import { detectStatuteRevision } from "@/lib/pipeline/statute-detector";
import type { StatuteRecord } from "@/lib/types";

const previous: StatuteRecord = {
  id: "st-1",
  lawId: "001783",
  title: "약사법",
  shortTitle: "약사법",
  url: "https://www.law.go.kr/법령/약사법",
  currentMst: "283893",
  promulgatedDate: "2026-03-10",
  effectiveDate: "2026-09-11",
  amendmentType: "타법개정",
  currentRevisionId: "rev-1",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("statute revision detector", () => {
  it("treats a missing statute as new", () => {
    expect(
      detectStatuteRevision({
        previous: undefined,
        incoming: {
          mst: "283893",
          promulgatedDate: "2026-03-10",
          effectiveDate: "2026-09-11",
        },
      }),
    ).toBe("new");
  });

  it("is unchanged when MST is the same, without looking at a file hash", () => {
    expect(
      detectStatuteRevision({
        previous,
        incoming: {
          mst: "283893",
          promulgatedDate: "2026-03-10",
          effectiveDate: "2026-09-11",
        },
      }),
    ).toBe("unchanged");
  });

  it("flags MST change as revised_mst even if dates were ignored", () => {
    expect(
      detectStatuteRevision({
        previous,
        incoming: {
          mst: "290000",
          promulgatedDate: "2026-03-10",
          effectiveDate: "2026-09-11",
          amendmentType: "일부개정",
        },
      }),
    ).toBe("revised_mst");
  });

  it("does not use a PDF/hash signal", () => {
    expect(
      detectStatuteRevision({
        previous,
        incoming: {
          mst: "283893",
          promulgatedDate: "2026-03-10",
          effectiveDate: "2026-09-11",
          fileHash: "definitely-different",
        },
      }),
    ).toBe("unchanged");
  });
});
