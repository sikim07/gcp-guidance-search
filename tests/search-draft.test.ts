import { afterEach, describe, expect, it } from "vitest";
import {
  DRAFT_STORAGE_KEY,
  EMPTY_SEARCH_DRAFT,
  getDraftSnapshot,
  parseStoredDraft,
  writeStoredDraft,
} from "@/lib/search/draft";
import type { SearchResponse } from "@/lib/types";

const result: SearchResponse = {
  answer: "감사추적을 남겨야 합니다.",
  sources: [
    {
      title: "Part 11",
      section: "11.10",
      url: "https://example.test/part11",
      kind: "guideline",
    },
  ],
  passages: [
    {
      chunkId: "c1",
      title: "Part 11",
      section: "11.10",
      url: "https://example.test/part11",
      kind: "guideline",
      original: "audit trail",
      language: "en",
    },
  ],
  cacheHit: false,
  searchLogId: "log-1",
};

function stubWindow() {
  const session = new Map<string, string>();
  const local = new Map<string, string>();
  const windowStub = {
    sessionStorage: {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => {
        session.set(key, value);
      },
      removeItem: (key: string) => {
        session.delete(key);
      },
    },
    localStorage: {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => {
        local.set(key, value);
      },
      removeItem: (key: string) => {
        local.delete(key);
      },
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowStub,
  });
  return { session, local };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("search draft storage", () => {
  it("returns an empty draft for missing or broken payloads", () => {
    expect(parseStoredDraft(null)).toEqual(EMPTY_SEARCH_DRAFT);
    expect(parseStoredDraft("{")).toEqual(EMPTY_SEARCH_DRAFT);
    expect(parseStoredDraft('{"query":1}')).toEqual(EMPTY_SEARCH_DRAFT);
  });

  it("keeps the last query, answer, and translation when writing and reading", () => {
    const { session, local } = stubWindow();
    const saved = writeStoredDraft({
      query: "전자기록 감사추적은?",
      result,
      tab: "original",
      translations: { c1: "감사추적" },
      translatedAnswer: "감사추적을 남겨야 합니다.",
      showKorean: true,
    });
    expect(saved.query).toBe("전자기록 감사추적은?");
    expect(saved.tab).toBe("original");
    expect(getDraftSnapshot()).toEqual(saved);
    expect(getDraftSnapshot().result?.answer).toBe("감사추적을 남겨야 합니다.");
    expect(session.get(DRAFT_STORAGE_KEY)).toBeTruthy();
    expect(local.get(DRAFT_STORAGE_KEY)).toBeUndefined();
  });

  it("drops a result that is missing required search fields", () => {
    const parsed = parseStoredDraft(
      JSON.stringify({
        query: "남은 질문",
        result: { answer: "불완전" },
        tab: "answer",
      }),
    );
    expect(parsed.query).toBe("남은 질문");
    expect(parsed.result).toBeNull();
  });

  it("uses a stable storage key next to recent queries", () => {
    expect(DRAFT_STORAGE_KEY).toBe("gcp-search-draft");
  });

  it("starts empty when only localStorage has a leftover draft", () => {
    const { local } = stubWindow();
    local.set(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        query: "닫힌 탭의 질문",
        result: null,
        tab: "answer",
        translations: null,
        translatedAnswer: null,
        showKorean: false,
      }),
    );
    expect(getDraftSnapshot()).toEqual(EMPTY_SEARCH_DRAFT);
    expect(local.has(DRAFT_STORAGE_KEY)).toBe(false);
  });
});
