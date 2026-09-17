import { getStore } from "@/lib/db/store";
import { ensureSeeded } from "@/lib/pipeline/seed/bootstrap";

/** Process bootstrap only. Never call this from a page render. */
export async function seedIfNeeded(): Promise<void> {
  await ensureSeeded(getStore());
}
