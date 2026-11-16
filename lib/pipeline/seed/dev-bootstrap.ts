import { getStore } from "@/lib/db/store";
import { ensureSeeded } from "@/lib/pipeline/seed/bootstrap";

export function shouldBootstrapSeed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.NEXT_RUNTIME === "edge") return false;
  // `next build` boots instrumentation; seeding belongs to cron / runtime, not prerender.
  if (env.NEXT_PHASE === "phase-production-build") return false;
  // Production Supabase projects seed via cron. Cold-start bootstrap against a
  // Fair Use / egress-locked project crashes every API route with /500.
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) return false;
  return true;
}

/** Process bootstrap only. Never call this from a page render. */
export async function seedIfNeeded(): Promise<void> {
  if (!shouldBootstrapSeed()) return;
  try {
    await ensureSeeded(getStore());
  } catch (error) {
    console.error("[seedIfNeeded] bootstrap failed", error);
  }
}
