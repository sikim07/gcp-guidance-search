import { createHash } from "node:crypto";

export function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function hashIp(ip: string, salt = "gcp-guideline-watcher"): string {
  return sha256(`${salt}:${ip}`).slice(0, 32);
}
