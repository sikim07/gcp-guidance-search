import { memoryStore } from "@/lib/db/memory-store";
import type { AppStore } from "@/lib/db/types";
import { ensureSeeded } from "@/lib/pipeline/seed/bootstrap";

let ready: Promise<AppStore> | null = null;

/**
 * In-process seed store used when Supabase is restricted (egress 402, paused,
 * read-only). Keeps search answering from the seed corpus until the project
 * is restored — not a full production corpus.
 */
export function getFallbackStore(): Promise<AppStore> {
  if (!ready) {
    ready = (async () => {
      await ensureSeeded(memoryStore);
      return memoryStore;
    })();
  }
  return ready;
}

/** Test helper — drop the cached seed promise between cases. */
export function resetFallbackStoreForTests(): void {
  ready = null;
}
