import { memoryStore } from "@/lib/db/memory-store";
import { supabaseStore } from "@/lib/db/supabase-store";
import type { AppStore } from "@/lib/db/types";
import { isNextProductionBuild } from "@/lib/runtime/next-phase";

export function usingSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Pure lookup. Do not seed here — that belongs on cron / process bootstrap.
 * Deploy builds must not touch Supabase; prerender uses the in-memory store
 * (seeded via `getFallbackStore` / public catalog) instead.
 */
export function getStore(): AppStore {
  if (isNextProductionBuild()) return memoryStore;
  return usingSupabase() ? supabaseStore : memoryStore;
}
