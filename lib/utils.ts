import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const match = value.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, "0");
      const d = match[3].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

export function compareIsoDates(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a.localeCompare(b);
}

export function sourceLabel(source: string): string {
  switch (source) {
    case "fda-ich":
      return "FDA / ICH";
    case "fda-guidance":
      return "FDA Guidance";
    case "mfds":
      return "식약처 안내서";
    case "kgcp":
      return "KGCP";
    case "statute":
      return "법령";
    default:
      return source;
  }
}
