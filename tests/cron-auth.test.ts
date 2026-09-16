import { describe, expect, it } from "vitest";
import { authorizeCron } from "@/lib/cron/authorize";

function req(headers: Record<string, string>, url = "https://example.com/api/cron/watch") {
  return new Request(url, { headers });
}

describe("authorizeCron", () => {
  it("accepts Bearer CRON_SECRET in production", () => {
    const env = { NODE_ENV: "production", CRON_SECRET: "test-secret" };
    expect(authorizeCron(req({ authorization: "Bearer test-secret" }), env)).toBe(true);
    expect(authorizeCron(req({ authorization: "Bearer other" }), env)).toBe(false);
  });

  it("accepts Vercel cron user-agent when no secret is set", () => {
    const env = { NODE_ENV: "production" };
    expect(authorizeCron(req({ "user-agent": "vercel-cron/1.0" }), env)).toBe(true);
    expect(authorizeCron(req({ "x-vercel-cron": "1" }), env)).toBe(true);
    expect(authorizeCron(req({ "user-agent": "Mozilla/5.0" }), env)).toBe(false);
  });
});
