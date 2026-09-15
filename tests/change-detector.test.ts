import { describe, expect, it } from "vitest";
import { detectCatalogChanges, detectContentRevision } from "@/lib/pipeline/change-detector";
import type { CatalogEntry, DocumentRecord } from "@/lib/types";

const catalog: CatalogEntry = {
  source: "fda-guidance",
  title: "Part 11 Scope and Application",
  url: "https://www.fda.gov/media/75414/download",
  issuedDate: "2003-08-01",
  category: "Part 11",
  externalId: "fda-guidance:75414",
};

function doc(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: "doc-1",
    source: "fda-guidance",
    title: catalog.title,
    url: catalog.url,
    issuedDate: "2003-08-01",
    fileHash: "abc",
    currentVersionId: "v1",
    category: "Part 11",
    externalId: catalog.externalId,
    status: "active",
    createdAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("change detector", () => {
  it("flags unseen catalog rows as new", () => {
    const [hit] = detectCatalogChanges([catalog], []);
    expect(hit?.kind).toBe("new");
  });

  it("flags date-only revision", () => {
    expect(
      detectContentRevision({
        previous: doc(),
        incomingDate: "2024-01-01",
        incomingHash: "abc",
      }),
    ).toBe("revised_date");
  });

  it("flags hash-only revision when the published date is unchanged", () => {
    expect(
      detectContentRevision({
        previous: doc(),
        incomingDate: "2003-08-01",
        incomingHash: "def",
      }),
    ).toBe("revised_hash");
  });

  it("returns unchanged when date and hash match", () => {
    expect(
      detectContentRevision({
        previous: doc(),
        incomingDate: "2003-08-01",
        incomingHash: "abc",
      }),
    ).toBe("unchanged");
  });

  it("marks documents missing from the catalog as vanished", () => {
    const found = detectCatalogChanges([], [doc()]);
    expect(found[0]?.kind).toBe("vanished");
  });
});
