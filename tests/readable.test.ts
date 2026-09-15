import { describe, expect, it } from "vitest";
import { clipAtSentence, readableText } from "@/lib/text/readable";

describe("readableText", () => {
  it("drops dotted leaders and glued page numbers from FDA extracts", () => {
    const raw = `BACKGROUND59 60 In March of 1997, FDA issued final part 11 regulations that provide criteria for acceptance by61 FDA, under certain circumstances, of electronic records.
.................................. 54
handwritten62 signatures executed to electronic records as equivalent to paper records.`;
    const out = readableText(raw);
    expect(out).not.toMatch(/BACKGROUND59/);
    expect(out).not.toMatch(/by61/);
    expect(out).not.toMatch(/\.{5,}/);
    expect(out).not.toMatch(/^\s*54\s*$/m);
    expect(out).toMatch(/In March of 1997/);
    expect(out).toMatch(/part 11/);
  });

  it("joins hard-wrapped Korean statute lines into readable sentences", () => {
    const raw = `시험대상자의
서면 동의는
시험책임자가
받아야 한다.
가. "임상시험"이란
사람을 대상으로
실시하는 시험을
말한다.`;
    const out = readableText(raw);
    expect(out).toMatch(/시험대상자의 서면 동의는 시험책임자가 받아야 한다\./);
    expect(readableText("안전성과 유효\n성을 증명할")).toMatch(/유효성을/);
    expect(readableText("품목허 가 후")).toMatch(/품목허가/);
    expect(out).toMatch(/가\. "임상시험"이란/);
    expect(out.split("\n").length).toBeLessThan(raw.split("\n").length);
  });
});

describe("clipAtSentence", () => {
  it("cuts on a sentence boundary instead of mid-word", () => {
    const text =
      "The investigator should obtain consent. Audit trails must capture who changed the record and when. Extra leftover.";
    const clipped = clipAtSentence(text, 90);
    expect(clipped.endsWith(".")).toBe(true);
    expect(clipped).not.toMatch(/leftover/);
  });
});
