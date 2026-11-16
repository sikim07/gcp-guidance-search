import type { SearchScope } from "@/lib/retrieval/rank";

export const SEARCH_SCOPES: Array<{
  id: SearchScope;
  label: string;
  hint: string;
}> = [
  {
    id: "all",
    label: "전체",
    hint: "FDA·ICH와 국내 규정",
  },
  {
    id: "domestic",
    label: "국내",
    hint: "식약처·KGCP·관련 법령",
  },
  {
    id: "fda",
    label: "FDA",
    hint: "FDA·ICH 가이드라인",
  },
];

export function parseSearchScope(value: unknown): SearchScope {
  if (value === "domestic" || value === "fda" || value === "all") return value;
  return "all";
}
