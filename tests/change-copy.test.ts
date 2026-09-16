import { describe, expect, it } from "vitest";
import {
  articleKeyToLabel,
  changeKindLabel,
  humanizeChangeSummary,
  prettySectionLabel,
} from "@/lib/text/change-copy";

describe("articleKeyToLabel", () => {
  it("turns Open Law keys into 제N조 labels", () => {
    expect(articleKeyToLabel("0004001")).toBe("제4조");
    expect(articleKeyToLabel("0015001")).toBe("제15조");
    expect(articleKeyToLabel("0007021")).toBe("제7조의2");
    expect(articleKeyToLabel("annex-4#5. 시험대상자 동의")).toBe("5. 시험대상자 동의");
  });
});

describe("prettySectionLabel", () => {
  it("shortens KGCP annex headings to 별표 4 · 항", () => {
    expect(prettySectionLabel("별표 4 의약품 임상시험 관리기준 · 7. 모니터링")).toBe(
      "별표 4 · 7. 모니터링",
    );
  });
});

describe("humanizeChangeSummary", () => {
  it("rewrites guideline section dumps into a short Korean sentence", () => {
    const raw =
      "변경 II, III, IV, V / 추가 본문, I, 1, 2, 3, 4, 5, 6, 7, 8, C, 9, 10, 11, 12, 13, 14, 15, 16, 2018, 50.25 / 삭제 VI";
    const out = humanizeChangeSummary(raw);
    expect(out).toMatch(/바뀐 조항: II절, III절, IV절, V절/);
    expect(out).toMatch(/새로 실린 조항/);
    expect(out).toMatch(/서문/);
    expect(out).toMatch(/빠진 조항: VI절/);
    expect(out).not.toMatch(/50\.25/);
    expect(out).not.toMatch(/2018/);
  });

  it("rewrites statute article-key dumps using 제N조 and collapses long lists", () => {
    const added = Array.from(
      { length: 40 },
      (_, i) => String(i + 1).padStart(4, "0") + "001",
    ).join(", ");
    const raw = `일부개정 · 공포 2026-03-10 · 시행 2026-09-11 · MST seed → 283839. 변경 0004001, 0015001, 0023001 / 추가 ${added}`;
    const out = humanizeChangeSummary(raw);
    expect(out).toMatch(/시드 조문을 법령 현행본\(283839\)으로 바꿨습니다/);
    expect(out).toMatch(/바뀐 조항: 제4조, 제15조, 제23조/);
    expect(out).toMatch(/새로 실린 조항 40개/);
    expect(out).not.toMatch(/0004001/);
    expect(humanizeChangeSummary("변경 없음")).toBe("변경 없음");
    expect(humanizeChangeSummary("초기 적재 (시드 코퍼스)")).toMatch(/초기 적재/);
  });

  it("folds file-hash-only summaries instead of showing the raw hash", () => {
    expect(humanizeChangeSummary("file hash changed: abcdef")).toMatch(
      /본문 파일이 바뀌었습니다/,
    );
    expect(humanizeChangeSummary("파일 해시만 변경")).toMatch(/본문 파일이 바뀌었습니다/);
  });
});

describe("changeKindLabel", () => {
  it("does not show raw enum names", () => {
    expect(changeKindLabel("revised_hash")).toBe("본문이 바뀜");
    expect(changeKindLabel("revised_mst")).toBe("법령 개정");
  });
});
