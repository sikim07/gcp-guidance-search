import type { Passage, SearchResponse } from "@/lib/types";

export const DRAFT_STORAGE_KEY = "gcp-search-draft";

export type SearchTab = "answer" | "original";

export type SearchDraft = {
  query: string;
  result: SearchResponse | null;
  tab: SearchTab;
  translations: Record<string, string> | null;
  translatedAnswer: string | null;
  showKorean: boolean;
};

export const EMPTY_SEARCH_DRAFT: SearchDraft = {
  query: "",
  result: null,
  tab: "answer",
  translations: null,
  translatedAnswer: null,
  showKorean: false,
};

export function parseStoredDraft(raw: string | null): SearchDraft {
  if (!raw) return EMPTY_SEARCH_DRAFT;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return EMPTY_SEARCH_DRAFT;
    }
    const row = parsed as Record<string, unknown>;
    if (typeof row.query !== "string") return EMPTY_SEARCH_DRAFT;
    return {
      query: row.query,
      result: isSearchResponse(row.result) ? row.result : null,
      tab: row.tab === "original" ? "original" : "answer",
      translations: isStringRecord(row.translations) ? row.translations : null,
      translatedAnswer:
        typeof row.translatedAnswer === "string" ? row.translatedAnswer : null,
      showKorean: row.showKorean === true,
    };
  } catch {
    return EMPTY_SEARCH_DRAFT;
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((item) => typeof item === "string");
}

function isSearchResponse(value: unknown): value is SearchResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.answer === "string" &&
    typeof row.searchLogId === "string" &&
    typeof row.cacheHit === "boolean" &&
    Array.isArray(row.sources) &&
    Array.isArray(row.passages) &&
    row.passages.every(isPassage)
  );
}

function isPassage(value: unknown): value is Passage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.chunkId === "string" &&
    typeof row.title === "string" &&
    typeof row.section === "string" &&
    typeof row.original === "string"
  );
}

let draftSnapshot: SearchDraft = EMPTY_SEARCH_DRAFT;
let draftRaw: string | null = null;
const draftListeners = new Set<() => void>();

function notifyDraft() {
  draftListeners.forEach((listener) => listener());
}

export function subscribeDraft(onStoreChange: () => void): () => void {
  draftListeners.add(onStoreChange);
  return () => {
    draftListeners.delete(onStoreChange);
  };
}

function dropLegacyLocalDraft() {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Private mode or missing localStorage.
  }
}

export function getDraftSnapshot(): SearchDraft {
  if (typeof window === "undefined") return EMPTY_SEARCH_DRAFT;
  dropLegacyLocalDraft();
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) {
    draftRaw = null;
    draftSnapshot = EMPTY_SEARCH_DRAFT;
    return draftSnapshot;
  }
  if (raw === draftRaw) return draftSnapshot;
  draftRaw = raw;
  draftSnapshot = parseStoredDraft(raw);
  return draftSnapshot;
}

export function getDraftServerSnapshot(): SearchDraft {
  return EMPTY_SEARCH_DRAFT;
}

export function writeStoredDraft(next: SearchDraft): SearchDraft {
  draftSnapshot = next;
  draftRaw = JSON.stringify(next);
  if (typeof window !== "undefined") {
    dropLegacyLocalDraft();
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, draftRaw);
    } catch {
      // Quota or private mode — keep the in-memory snapshot.
    }
  }
  notifyDraft();
  return next;
}

export function patchStoredDraft(patch: Partial<SearchDraft>): SearchDraft {
  return writeStoredDraft({ ...getDraftSnapshot(), ...patch });
}
