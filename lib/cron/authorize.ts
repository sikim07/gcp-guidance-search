type CronEnv = {
  CRON_SECRET?: string;
  NODE_ENV?: string;
};

/**
 * Vercel Cron은 CRON_SECRET이 있으면 Authorization: Bearer 로 호출한다.
 * 시크릿이 없어도 플랫폼 크론(User-Agent vercel-cron)은 통과시킨다.
 */
export function authorizeCron(request: Request, env: CronEnv = process.env): boolean {
  const secret = env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization");
  const url = new URL(request.url);
  if (secret) {
    return header === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
  }
  if (env.NODE_ENV !== "production") {
    return true;
  }
  const ua = request.headers.get("user-agent") ?? "";
  return request.headers.get("x-vercel-cron") === "1" || ua.includes("vercel-cron");
}
