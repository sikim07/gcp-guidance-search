import { memoryStore } from "@/lib/db/memory-store";
import { supabaseStore } from "@/lib/db/supabase-store";
import type { AppStore } from "@/lib/db/types";

export function usingSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Pure lookup. Do not seed here — that belongs on cron / process bootstrap. */
export function getStore(): AppStore {
  return usingSupabase() ? supabaseStore : memoryStore;
}
