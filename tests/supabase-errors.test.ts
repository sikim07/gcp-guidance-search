import { describe, expect, it } from "vitest";
import {
  isMissingRelation,
  mapRevalidationLogRows,
  throwUnlessMissingRelation,
} from "@/lib/db/supabase-errors";

describe("isMissingRelation", () => {
  it("treats PostgREST schema-cache misses as a missing table", () => {
    expect(
      isMissingRelation({
        code: "PGRST205",
        message:
          "Could not find the table 'public.revalidation_logs' in the schema cache",
      }),
    ).toBe(true);
  });

  it("treats Postgres undefined_table as a missing table", () => {
    expect(
      isMissingRelation({
        code: "42P01",
        message: 'relation "revalidation_logs" does not exist',
      }),
    ).toBe(true);
  });

  it("does not swallow unrelated store errors", () => {
    expect(
      isMissingRelation({
        code: "PGRST303",
        message: "JWT issued at future",
      }),
    ).toBe(false);
  });
});

describe("mapRevalidationLogRows", () => {
  it("returns an empty list when the table is not in the schema cache", () => {
    expect(
      mapRevalidationLogRows(null, {
        code: "PGRST205",
        message:
          "Could not find the table 'public.revalidation_logs' in the schema cache",
      }),
    ).toEqual([]);
  });

  it("rethrows other query errors", () => {
    expect(() =>
      mapRevalidationLogRows(null, {
        code: "PGRST303",
        message: "JWT issued at future",
      }),
    ).toThrow(/JWT issued at future/);
  });

  it("maps jsonb arrays and timestamps from supabase rows", () => {
    expect(
      mapRevalidationLogRows(
        [
          {
            id: "r1",
            reason: "watch",
            paths: ["/", "/updates"],
            document_ids: ["d1"],
            statute_ids: null,
            created_at: "2026-09-18T01:00:00.000Z",
          },
        ],
        null,
      ),
    ).toEqual([
      {
        id: "r1",
        reason: "watch",
        paths: ["/", "/updates"],
        documentIds: ["d1"],
        statuteIds: [],
        createdAt: "2026-09-18T01:00:00.000Z",
      },
    ]);
  });
});

describe("throwUnlessMissingRelation", () => {
  it("does not throw when the relation is missing", () => {
    expect(() =>
      throwUnlessMissingRelation({
        code: "42P01",
        message: 'relation "revalidation_logs" does not exist',
      }),
    ).not.toThrow();
  });

  it("throws other errors so callers still fail closed", () => {
    expect(() =>
      throwUnlessMissingRelation({
        code: "42501",
        message: "permission denied",
      }),
    ).toThrow(/permission denied/);
  });
});
