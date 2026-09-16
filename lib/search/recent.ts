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
