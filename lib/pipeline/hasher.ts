import { createHash } from "node:crypto";

export function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function hashIp(ip: string, salt = "gcp-guideline-watcher"): string {
  return sha256(`${salt}:${ip}`).slice(0, 32);
}

/**
 * Deterministic UUID (version-5 shaped) from an arbitrary key.
 * Seed corpus IDs must be stable across builds/serverless cold starts so
 * statically rendered `/documents` links still resolve when Supabase is down.
 */
export function stableUuid(key: string): string {
  const hex = sha256(`gcp-stable-uuid:${key}`);
  const chars = hex.slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = "8";
  return [
    chars.slice(0, 8).join(""),
    chars.slice(8, 12).join(""),
    chars.slice(12, 16).join(""),
    chars.slice(16, 20).join(""),
    chars.slice(20, 32).join(""),
  ].join("-");
}
