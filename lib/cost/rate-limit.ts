import type { AppStore } from "@/lib/db/types";
import { DEFAULT_GLOBAL_DAILY, DEFAULT_IP_DAILY } from "@/lib/cost/limits";
import { hashIp } from "@/lib/pipeline/hasher";

export { DEFAULT_GLOBAL_DAILY, DEFAULT_IP_DAILY } from "@/lib/cost/limits";

export function rateLimitConfig() {
  return {
    ipDaily: Number(process.env.RATE_LIMIT_IP_DAILY ?? DEFAULT_IP_DAILY),
    globalDaily: Number(process.env.RATE_LIMIT_GLOBAL_DAILY ?? DEFAULT_GLOBAL_DAILY),
  };
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip") ?? "local";
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly status = 429,
  ) {
    super(message);
  }
}

export function shouldCountTowardRateLimit(cacheHit: boolean): boolean {
  return !cacheHit;
}

export async function gateSearch(opts: {
  cacheHit: boolean;
  limit: () => Promise<void>;
}): Promise<void> {
  if (shouldCountTowardRateLimit(opts.cacheHit)) await opts.limit();
}

export async function enforceRateLimit(store: AppStore, ip: string): Promise<void> {
  const { ipDaily, globalDaily } = rateLimitConfig();
  const day = new Date().toISOString().slice(0, 10);
  const ipCount = await store.incrementRateLimit(`ip:${hashIp(ip)}`, day);
  const globalCount = await store.incrementRateLimit("global", day);
  if (ipCount > ipDaily) {
    throw new RateLimitError(`IP당 일일 한도(${ipDaily}건)를 초과했습니다.`);
  }
  if (globalCount > globalDaily) {
    throw new RateLimitError(`전체 일일 한도(${globalDaily}건)를 초과했습니다.`);
  }
}
