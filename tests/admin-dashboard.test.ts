import { describe, expect, it } from "vitest";
import { loadAdminDashboard } from "@/lib/admin/load-dashboard";
import type { AppStore } from "@/lib/db/types";
import type {
  FeedbackRecord,
  RevalidationLogRecord,
  SearchLogRecord,
} from "@/lib/types";

function storeStub(overrides: Partial<AppStore>): AppStore {
  return {
    listSearchLogs: async () => [],
    listFeedback: async () => [],
    listRevalidationLogs: async () => [],
    ...overrides,
  } as AppStore;
}

describe("loadAdminDashboard", () => {
  it("keeps the admin page renderable when revalidation logs are unavailable", async () => {
    const logs: SearchLogRecord[] = [
      {
        id: "s1",
        query: "KGCP 제4조",
        normalizedQuery: "kgcp 제4조",
        ipHash: "x",
        cacheHit: false,
        latencyMs: 12,
        similarityMs: 1,
        topChunkIds: [],
        answer: "…",
        createdAt: "2026-09-18T01:00:00.000Z",
      },
    ];
    const data = await loadAdminDashboard(
      storeStub({
        listSearchLogs: async () => logs,
        listRevalidationLogs: async () => {
          throw { code: "PGRST205", message: "Could not find the table" };
        },
      }),
    );
    expect(data.logs).toEqual(logs);
    expect(data.feedback).toEqual([]);
    expect(data.revalidations).toEqual([]);
    expect(data.notice).toMatch(/재검증/);
  });

  it("does not throw when every store read fails", async () => {
    const data = await loadAdminDashboard(
      storeStub({
        listSearchLogs: async () => {
          throw new Error("JWT issued at future");
        },
        listFeedback: async () => {
          throw new Error("JWT issued at future");
        },
        listRevalidationLogs: async () => {
          throw new Error("JWT issued at future");
        },
      }),
    );
    expect(data.logs).toEqual([]);
    expect(data.feedback).toEqual([]);
    expect(data.revalidations).toEqual([]);
    expect(data.notice).toMatch(/JWT issued at future/);
  });

  it("returns rows when the store is healthy", async () => {
    const feedback: FeedbackRecord[] = [
      {
        id: "f1",
        searchLogId: "s1",
        query: "q",
        answer: "a",
        rating: "up",
        createdAt: "2026-09-18T01:00:00.000Z",
      },
    ];
    const revalidations: RevalidationLogRecord[] = [
      {
        id: "r1",
        createdAt: "2026-09-18T01:00:00.000Z",
        reason: "cron",
        paths: ["/"],
        documentIds: [],
        statuteIds: [],
      },
    ];
    const data = await loadAdminDashboard(
      storeStub({
        listFeedback: async () => feedback,
        listRevalidationLogs: async () => revalidations,
      }),
    );
    expect(data.notice).toBeNull();
    expect(data.feedback).toEqual(feedback);
    expect(data.revalidations).toEqual(revalidations);
  });
});
