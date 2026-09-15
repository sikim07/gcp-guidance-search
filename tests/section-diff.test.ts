import { describe, expect, it } from "vitest";
import { diffSections, summarizeDiff } from "@/lib/pipeline/section-diff";

describe("section-diff", () => {
  it("re-embeds only changed clauses", () => {
    const previous = `4.8 Informed Consent\nGet consent first.\n\n4.9 Records\nKeep an audit trail.`;
    const current = `4.8 Informed Consent\nGet consent first.\n\n4.9 Records\nKeep an audit trail and the reason for each change.`;
    const changes = diffSections(previous, current);
    const changed = changes.filter((c) => c.kind !== "unchanged");
    expect(changed).toHaveLength(1);
    expect(changed[0]?.section).toBe("4.9");
    expect(summarizeDiff(changes)).toContain("4.9");
  });
});
