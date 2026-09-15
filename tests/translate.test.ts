import { describe, expect, it } from "vitest";
import {
  detectPassageLanguage,
  needsEnglishTranslation,
  resolveTranslations,
} from "@/lib/llm/translate";
import type { Passage } from "@/lib/types";

const en: Passage = {
  chunkId: "en-1",
  title: "Part 11",
  section: "II",
  url: "https://example.com",
  kind: "guideline",
  original:
    "The agency considers part 11 to be applicable to records in electronic form that are created, modified, maintained, archived, retrieved, or transmitted under any records requirements set forth in Agency regulations.",
  language: "en",
};

const ko: Passage = {
  chunkId: "ko-1",
  title: "의약품 등의 안전에 관한 규칙",
  section: "제30조",
  url: "https://www.law.go.kr",
  kind: "statute",
  original:
    "임상시험을 하려는 자는 별표 4의 의약품 임상시험 관리기준을 지켜야 한다. 시험대상자의 권리·안전·복지를 우선하여야 한다.",
  language: "ko",
};

describe("passage language", () => {
  it("labels FDA English as en and statute Korean as ko", () => {
    expect(detectPassageLanguage(en.original)).toBe("en");
    expect(detectPassageLanguage(ko.original)).toBe("ko");
  });

  it("only offers English-to-Korean conversion when a passage is English", () => {
    expect(needsEnglishTranslation([ko])).toBe(false);
    expect(needsEnglishTranslation([en, ko])).toBe(true);
  });
});

describe("resolveTranslations", () => {
  it("returns Korean original without calling the translator", async () => {
    let calls = 0;
    const map = await resolveTranslations([ko], {
      get: async () => undefined,
      put: async () => {},
      translate: async () => {
        calls += 1;
        return "should not run";
      },
    });
    expect(calls).toBe(0);
    expect(map["ko-1"]).toBe(ko.original);
  });

  it("translates English once and reuses the stored text", async () => {
    const stored = new Map<string, string>();
    let calls = 0;
    const deps = {
      get: async (id: string) => stored.get(id),
      put: async (id: string, text: string) => {
        stored.set(id, text);
      },
      translate: async (text: string) => {
        calls += 1;
        return `KO:${text.slice(0, 24)}`;
      },
    };
    const first = await resolveTranslations([en], deps);
    const second = await resolveTranslations([en], deps);
    expect(calls).toBe(1);
    expect(first["en-1"]).toMatch(/^KO:/);
    expect(second["en-1"]).toBe(first["en-1"]);
  });
});
