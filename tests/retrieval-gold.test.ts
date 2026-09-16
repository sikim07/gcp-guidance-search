import { describe, expect, it } from "vitest";
import {
  filterByScope,
  lexicalRankScore,
  sectionQuery,
  type SearchOrigin,
} from "@/lib/retrieval/rank";

type Item = { section: string; text: string; origin: SearchOrigin };

function topSection(query: string, pool: Item[]): string {
  return [...pool]
    .map((item) => ({ item, score: lexicalRankScore(query, item.section, item.text) }))
    .sort((a, b) => b.score - a.score)[0]!.item.section;
}

const pool: Item[] = [
  {
    origin: "fda",
    section: "BACKGROUND",
    text: "BACKGROUND In March of 1997, FDA issued final part 11 regulations for electronic records.",
  },
  {
    origin: "fda",
    section: "I",
    text: "INTRODUCTION This guidance describes FDA current thinking regarding part 11.",
  },
  {
    origin: "fda",
    section: "Q12",
    text: "What are FDA’s expectations for the use of audit trails by regulated entities? Audit trails capture who made the change, when, and why, without obscuring the original entry.",
  },
  {
    origin: "fda",
    section: "4.8",
    text: "Informed Consent of Trial Subjects. The investigator should obtain legally effective informed consent.",
  },
  {
    origin: "domestic",
    section: "별표 4 의약품 임상시험 관리기준 · 5. 시험대상자 동의",
    text: "시험책임자는 임상시험 실시 전에 시험대상자 또는 대리인에게 목적과 위험을 설명하고 자발적인 서면 동의를 받아야 한다.",
  },
  {
    origin: "domestic",
    section: "별표 4 의약품 임상시험 관리기준 · 7. 모니터링",
    text: "의뢰자는 임상시험이 이 기준과 승인된 계획서에 따라 실시되는지를 확인하기 위하여 모니터링을 실시하여야 한다. 범위와 방법은 위험을 고려하여 정한다.",
  },
  {
    origin: "fda",
    section: "5.7",
    text: "and 6.3. 15 CPGM 7348.810: Sponsors, Contract Research Organizations and Monitors (March 11, 2011), available at: http://www.fda.gov/ICECI/EnforcementActions/Bioresearch 10555fnlPRAupdate11-21-22.docx",
  },
  {
    origin: "domestic",
    section: "국제의약품규제조화위원회 임상시험 관리기준(ICH GCP) 민원인 안내서 §1",
    text: "제1장 목적 이 안내서는 ICH E6 GCP 가이드라인의 개정된 사항을 중심으로 식품의약품안전처의 입장을 기술한 것이다.",
  },
  {
    origin: "domestic",
    section: "별표 4 의약품 임상시험 관리기준 · 6. 기록 및 자료",
    text: "시험책임자 및 의뢰자는 원자료와 필수문서를 보관하여야 한다. 전자기록은 검증, 접근 통제, 감사추적, 백업을 갖추어야 한다.",
  },
  {
    origin: "fda",
    section: "8.1",
    text: "Essential documents are those documents which individually and collectively permit evaluation of the conduct of a trial and the quality of the data produced.",
  },
  {
    origin: "domestic",
    section: "중대한 예상하지 못한 약물이상반응 보고",
    text: "의뢰자는 치명적이거나 생명을 위협하는 예상하지 못한 약물이상반응(SUSAR)을 최초 인지 후 7일 이내에 식품의약품안전처장에게 보고하고, 그 밖의 경우는 15일 이내에 보고한다. SAE 보고 기한.",
  },
  {
    origin: "domestic",
    section: "제47조(분쟁의 조정)",
    text: "개인정보 분쟁조정위원회는 개인정보에 관한 분쟁의 조정을 위해 당사자의 신청을 받아 조정한다. 보고 기한과 무관하다.",
  },
  {
    origin: "fda",
    section: "Principles",
    text: "ICH E6(R3) Good Clinical Practice sets proportionate, risk-based principles. Quality by design means building quality into the protocol.",
  },
];

describe("retrieval gold questions", () => {
  it("ranks audit-trail clauses above part 11 introductions", () => {
    const section = topSection("전자기록 감사추적은 어떤 항목을 남겨야 하나?", pool);
    expect(section).toMatch(/Q12|5\.5\.3|감사추적/);
    expect(section).not.toMatch(/BACKGROUND|^I$/);
  });

  it("ranks informed-consent clauses for the consent preset", () => {
    const section = topSection("시험대상자 서면 동의는 어떻게 받나?", pool);
    expect(section).toMatch(/4\.8|시험대상자 동의/);
  });

  it("ranks monitoring body text above footnotes and filenames", () => {
    const section = topSection("임상시험 모니터링 범위는 어떻게 정하나?", pool);
    expect(section).toMatch(/모니터링|5\.18/);
    expect(section).not.toBe("5.7");
  });

  it("ranks essential-document clauses above MFDS chapter 1", () => {
    const section = topSection("필수문서는 무엇을 보관하나?", pool);
    expect(section).toMatch(/8\.1|필수문서|기록 및 자료/);
    expect(section).not.toMatch(/제1장|안내서 §1/);
  });

  it("ranks SAE reporting clocks instead of empty or intro text", () => {
    const section = topSection("SAE는 며칠 안에 보고하나?", pool);
    expect(section).toMatch(/약물이상반응|312\.32|7일/);
    expect(section).not.toMatch(/제47조|분쟁/);
  });

  it("ranks E6(R3) quality principles for an R3 query", () => {
    const section = topSection("ICH E6 R3 품질관리", pool);
    expect(section).toMatch(/Principles|R3|Quality/);
  });
});

describe("section jump and scope", () => {
  it("parses clause-number queries", () => {
    expect(sectionQuery("5.5.3 감사추적")).toBe("5.5.3");
    expect(sectionQuery("제15조")).toBe("제15조");
    expect(sectionQuery("Q12")).toBe("Q12");
  });

  it("filters domestic vs fda origins", () => {
    const domestic = filterByScope(pool, "domestic");
    expect(domestic.every((row) => row.origin === "domestic")).toBe(true);
    expect(filterByScope(pool, "fda").every((row) => row.origin === "fda")).toBe(true);
  });
});
