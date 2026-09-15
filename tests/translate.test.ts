import { describe, expect, it } from "vitest";
import { applyGcpKoreanTerms } from "@/lib/llm/gcp-terms";
import { parsePublicTranslation, splitForPublicTranslate } from "@/lib/llm/public-translate";
import { lookupSeedKorean } from "@/lib/llm/seed-lookup";
import {
  detectPassageLanguage,
  needsEnglishTranslation,
  resolveTranslations,
  translateAnswer,
  translateClause,
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

describe("seed and public translation", () => {
  it("rewrites machine-translation GCP wording", () => {
    expect(applyGcpKoreanTerms("고지된 동의와 감사 추적, 인간 피험자, 후원자")).toBe(
      "시험대상자 동의와 감사추적, 시험대상자, 의뢰자",
    );
  });

  it("parses dict-chrome-ex and gtx payloads", () => {
    expect(parsePublicTranslation(["감사 추적"])).toBe("감사 추적");
    expect(
      parsePublicTranslation([
        [
          ["전자 시스템은 감사 추적을 생성해야 합니다.", "Electronic systems"],
          [" 원래 항목을 가리지 않습니다.", " without obscuring"],
        ],
        null,
        "en",
      ]),
    ).toBe("전자 시스템은 감사 추적을 생성해야 합니다. 원래 항목을 가리지 않습니다.");
  });

  it("splits long text under the public-translate URL budget", () => {
    const chunks = splitForPublicTranslate("alpha. ".repeat(400), 80);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 80)).toBe(true);
  });

  it("looks up seed English without a model key", async () => {
    const source =
      "Electronic systems should be designed to generate audit trails that record changes to data. The audit trail should capture who made the change, when the change was made, and why the change was made, without obscuring the original entry.";
    expect(lookupSeedKorean(source)).toMatch(/감사추적/);
    const korean = await translateClause(source);
    expect(korean).toMatch(/감사추적/);
    expect(korean).not.toMatch(/Electronic systems/);
  });

  it("keeps Korean disclaimers when translating extractive answers", async () => {
    const answer = [
      "The audit trail should capture who made the change, when the change was made, and why the change was made, without obscuring the original entry.\n[Part 11 Q&A, Q8]",
      "법적 자문이 아닙니다. 출처 링크에서 원문을 확인하세요.",
    ].join("\n\n");
    const korean = await translateAnswer(answer);
    expect(korean).toMatch(/감사추적/);
    expect(korean).toMatch(/\[Part 11 Q&A, Q8\]/);
    expect(korean).toMatch(/법적 자문이 아닙니다/);
  });

  it("does not replace a multi-clause extractive answer with one seed paragraph", async () => {
    const answer = [
      "Informed Consent of Trial Subjects\n[E6(R2), 4.8]",
      "The written informed consent form and any other written information to be provided to subjects should be revised whenever important new information becomes available that may be relevant to the subject's consent. Any revised written informed consent form, and written information should receive the IRB/IEC's approval/favourable opinion in advance of use. The subject or the subject's legally acceptable representative should be informed of the new information in a timely manner.\n[E6(R2), 4.8.8]",
      "법적 자문이 아닙니다. 출처 링크에서 원문을 확인하세요.",
    ].join("\n\n");
    const korean = await translateAnswer(answer);
    expect(korean).toMatch(/시험대상자 동의/);
    expect(korean).not.toMatch(/시험 대상자의 시험대상자 동의/);
    expect(korean).toMatch(/\[E6\(R2\), 4\.8\]/);
    expect(korean).toMatch(/\[E6\(R2\), 4\.8\.8\]/);
    expect(korean).toMatch(/법적 자문이 아닙니다/);
  });

  it("matches a clipped extractive snippet inside a longer seed clause", () => {
    const clip =
      "The audit trail should capture who made the change, when the change was made, and why the change was made, without obscuring the original entry.";
    expect(lookupSeedKorean(clip)).toMatch(/감사추적/);
  });
});
