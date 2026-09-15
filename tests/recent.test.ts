import { describe, expect, it } from "vitest";
import { PRESET_QUERIES } from "@/lib/search/presets";
import { parseStoredRecents, pushRecentQuery, visibleRecent } from "@/lib/search/recent";

describe("recent queries", () => {
  it("keeps the latest five unique questions, newest first", () => {
    let recents: string[] = [];
    recents = pushRecentQuery("감사추적은?", recents);
    recents = pushRecentQuery("동의는?", recents);
    recents = pushRecentQuery("감사추적은?", recents);
    recents = pushRecentQuery("모니터링은?", recents);
    recents = pushRecentQuery("민감정보는?", recents);
    recents = pushRecentQuery("의료기기 승인은?", recents);
    recents = pushRecentQuery("IRB 구성은?", recents);
    expect(recents).toEqual([
      "IRB 구성은?",
      "의료기기 승인은?",
      "민감정보는?",
      "모니터링은?",
      "감사추적은?",
    ]);
  });

  it("hides the query currently in the search box, including presets", () => {
    const recents = pushRecentQuery(PRESET_QUERIES[0].query, ["직접 적은 질문"]);
    expect(visibleRecent(recents, PRESET_QUERIES[0].query)).toEqual(["직접 적은 질문"]);
    expect(visibleRecent(recents, "직접 적은 질문")).toEqual([PRESET_QUERIES[0].query]);
  });

  it("ignores broken localStorage payloads", () => {
    expect(parseStoredRecents(null)).toEqual([]);
    expect(parseStoredRecents("{")).toEqual([]);
    expect(parseStoredRecents('["ok", 1, ""]')).toEqual(["ok"]);
  });
});
