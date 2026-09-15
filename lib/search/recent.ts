const MAX_RECENT = 5;

export function pushRecentQuery(query: string, existing: string[]): string[] {
  const trimmed = query.trim();
  if (!trimmed) return existing;
  const rest = existing.filter((row) => row !== trimmed);
  return [trimmed, ...rest].slice(0, MAX_RECENT);
}

export function visibleRecent(recents: string[], currentQuery: string): string[] {
  const current = currentQuery.trim();
  return recents.filter((row) => row !== current);
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
