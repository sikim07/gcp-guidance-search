import { describe, expect, it } from "vitest";
import { RateLimitError, enforceRateLimit } from "@/lib/cost/rate-limit";
import type { AppStore } from "@/lib/db/types";

function fakeStore(): AppStore {
  const counts = new Map<string, number>();
  return {
    incrementRateLimit: async (bucket, day) => {
      const key = `${bucket}:${day}`;
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
  } as AppStore;
}

describe("rate limit", () => {
  it("blocks the 21st request from the same IP", async () => {
    process.env.RATE_LIMIT_IP_DAILY = "20";
    process.env.RATE_LIMIT_GLOBAL_DAILY = "200";
    const store = fakeStore();
    for (let i = 0; i < 20; i += 1) {
      await enforceRateLimit(store, "203.0.113.10");
    }
    await expect(enforceRateLimit(store, "203.0.113.10")).rejects.toBeInstanceOf(RateLimitError);
  });
});
