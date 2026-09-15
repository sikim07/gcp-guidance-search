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

  it("strips trailing footnote page numbers glued to a sentence", () => {
    const out = readableText(
      "FDA supports the use of electronic processes to obtain informed consent.82 Electronic media are being used.",
    );
    expect(out).not.toMatch(/consent\.82/);
    expect(out).toMatch(/consent\./);
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

  it("repairs mid-word spaces left by law.go.kr wrapping", () => {
    const raw =
      "생의학 적 연구를 말한다. 제공하 기 위하여 임상시험 용의약품을 쓴다. 식품의약품안전처 장의 승인을 받기 전에는 실 시해서는 안 된다. 변경계획서라 한 다.";
    const out = readableText(raw);
    expect(out).toMatch(/생의학적/);
    expect(out).toMatch(/제공하기/);
    expect(readableText('이하 "품목허가"라 한다.')).toMatch(/라 한다/);
    expect(out).toMatch(/임상시험용의약품/);
    expect(out).toMatch(/식품의약품안전처장의/);
    expect(out).toMatch(/실시해서는/);
    expect(out).toMatch(/한다/);
  });

  it("puts statute titles, circle numbers and glossary items on their own lines", () => {
    const raw =
      '제10조(임상시험계획의 승인 등) ① 의료기기로 임상시험을 하려는 자는 식품의약품안전처장의 승인을 받아야 한다. <개정 2013.3.23, 2024.2.6> ② 제조ㆍ수입하려는 자는 기준을 갖춘다. 용어의 정의이 기준에서 사용하는 용어의 뜻은 다음과 같다. 가. "임상시험"이란 사람을 대상으로 실시하는 시험을 말한다.';
    const out = readableText(raw);
    expect(out).toMatch(/제10조\(임상시험계획의 승인 등\)\n① /);
    expect(out).toMatch(/\n② /);
    expect(out).toMatch(/용어의 정의\n이 기준에서/);
    expect(out).toMatch(/\n가\. "임상시험"/);
    expect(out).toMatch(/<개정 2013\.3\.23, 2024\.2\.6>/);
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
