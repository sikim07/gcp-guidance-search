import { describe, expect, it } from "vitest";
import { RateLimitError, enforceRateLimit, gateSearch } from "@/lib/cost/rate-limit";
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
  it("blocks the 6th new request from the same IP when the daily cap is 5", async () => {
    delete process.env.RATE_LIMIT_IP_DAILY;
    delete process.env.RATE_LIMIT_GLOBAL_DAILY;
    const store = fakeStore();
    for (let i = 0; i < 5; i += 1) {
      await enforceRateLimit(store, "203.0.113.10");
    }
    await expect(enforceRateLimit(store, "203.0.113.10")).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("still allows another IP after one IP is exhausted", async () => {
    delete process.env.RATE_LIMIT_IP_DAILY;
    process.env.RATE_LIMIT_GLOBAL_DAILY = "50";
    const store = fakeStore();
    for (let i = 0; i < 5; i += 1) {
      await enforceRateLimit(store, "203.0.113.10");
    }
    await expect(enforceRateLimit(store, "203.0.113.11")).resolves.toBeUndefined();
  });

  it("does not increment when the exact cache already has the answer", async () => {
    let calls = 0;
    await gateSearch({
      cacheHit: true,
      limit: async () => {
        calls += 1;
      },
    });
    expect(calls).toBe(0);
  });
});
