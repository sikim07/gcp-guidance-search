import { describe, expect, it } from "vitest";
import { PRESET_QUERIES } from "@/lib/search/presets";
import {
  customRecents,
  getRecentsSnapshot,
  isPresetQuery,
  parseStoredRecents,
  pushRecentQuery,
  removeRecentQuery,
  writeStoredRecents,
} from "@/lib/search/recent";

describe("recent queries", () => {
  it("keeps the latest five unique custom questions, newest first", () => {
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

  it("does not store preset questions; they stay in the preset row", () => {
    const recents = pushRecentQuery(PRESET_QUERIES[0].query, ["직접 적은 질문"]);
    expect(isPresetQuery(PRESET_QUERIES[0].query)).toBe(true);
    expect(recents).toEqual(["직접 적은 질문"]);
    expect(customRecents(recents)).toEqual(["직접 적은 질문"]);
  });

  it("keeps the current custom query in the list so it does not vanish when clicked", () => {
    const recents = pushRecentQuery("직접 적은 질문", []);
    expect(customRecents(recents)).toEqual(["직접 적은 질문"]);
  });

  it("removes a custom query", () => {
    const recents = removeRecentQuery("동의는?", ["IRB 구성은?", "동의는?"]);
    expect(recents).toEqual(["IRB 구성은?"]);
  });

  it("ignores broken localStorage payloads", () => {
    expect(parseStoredRecents(null)).toEqual([]);
    expect(parseStoredRecents("{")).toEqual([]);
    expect(parseStoredRecents('["ok", 1, ""]')).toEqual(["ok"]);
  });

  it("writeStoredRecents keeps a stable snapshot until the stored string changes", () => {
    const store = new Map<string, string>();
    const windowStub = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: windowStub,
    });
    const first = writeStoredRecents(["감사추적은?"]);
    expect(getRecentsSnapshot()).toBe(first);
    expect(getRecentsSnapshot()).toEqual(["감사추적은?"]);
  });
});
