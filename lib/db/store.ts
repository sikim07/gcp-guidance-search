import { memoryStore } from "@/lib/db/memory-store";
import { supabaseStore } from "@/lib/db/supabase-store";
import type { AppStore } from "@/lib/db/types";
import { ensureSeeded } from "@/lib/pipeline/seed/bootstrap";

export function usingSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getStore(): Promise<AppStore> {
  const store = usingSupabase() ? supabaseStore : memoryStore;
  await ensureSeeded(store);
  return store;
}
