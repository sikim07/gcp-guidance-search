import { PRESET_QUERIES } from "@/lib/search/presets";
import { normalizeQuery } from "@/lib/utils";

const MAX_RECENT = 5;

export function isPresetQuery(query: string): boolean {
  const current = normalizeQuery(query);
  return PRESET_QUERIES.some((preset) => normalizeQuery(preset.query) === current);
}

export function pushRecentQuery(query: string, existing: string[]): string[] {
  const trimmed = query.trim();
  if (!trimmed || isPresetQuery(trimmed)) return existing;
  const rest = existing.filter((row) => normalizeQuery(row) !== normalizeQuery(trimmed));
  return [trimmed, ...rest].slice(0, MAX_RECENT);
}

export function removeRecentQuery(query: string, existing: string[]): string[] {
  const current = normalizeQuery(query);
  return existing.filter((row) => normalizeQuery(row) !== current);
}

export function customRecents(recents: string[]): string[] {
  return recents.filter((row) => !isPresetQuery(row));
}

export const RECENT_STORAGE_KEY = "gcp-recent-queries";

export function parseStoredRecents(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is string => typeof row === "string" && row.trim().length > 0,
    );
  } catch {
    return [];
  }
}

const EMPTY_RECENTS: string[] = [];
let recentsSnapshot: string[] = EMPTY_RECENTS;
let recentsRaw: string | null = null;
const recentsListeners = new Set<() => void>();

function notifyRecents() {
  recentsListeners.forEach((listener) => listener());
}

export function subscribeRecents(onStoreChange: () => void): () => void {
  recentsListeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== RECENT_STORAGE_KEY) return;
      recentsRaw = null;
      onStoreChange();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      recentsListeners.delete(onStoreChange);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => {
    recentsListeners.delete(onStoreChange);
  };
}

export function getRecentsSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY_RECENTS;
  const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
  if (raw === recentsRaw) return recentsSnapshot;
  recentsRaw = raw;
  recentsSnapshot = parseStoredRecents(raw);
  return recentsSnapshot;
}

export function getRecentsServerSnapshot(): string[] {
  return EMPTY_RECENTS;
}

export function writeStoredRecents(next: string[]): string[] {
  recentsSnapshot = next;
  recentsRaw = JSON.stringify(next);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(RECENT_STORAGE_KEY, recentsRaw);
  }
  notifyRecents();
  return next;
}
