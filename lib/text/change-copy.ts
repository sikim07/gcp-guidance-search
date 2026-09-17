import type { ChangeKind } from "@/lib/types";

export function changeKindLabel(kind: ChangeKind): string {
  switch (kind) {
    case "new":
      return "처음 넣음";
    case "revised_date":
      return "발행일만 바뀜";
    case "revised_hash":
      return "본문이 바뀜";
    case "revised_both":
      return "발행일과 본문이 바뀜";
    case "revised_mst":
      return "법령 개정";
    case "vanished":
      return "목록에서 빠짐";
    default:
      return "변동 없음";
  }
}

export function articleKeyToLabel(key: string): string {
  const trimmed = key.trim();
  if (trimmed.includes("#")) {
    return trimmed.split("#").slice(1).join("#").trim() || trimmed;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return trimmed;
  const article = Number.parseInt(digits.slice(0, 4), 10);
  if (!article) return trimmed;
  const branch = Number.parseInt(digits.slice(-3), 10);
  if (branch <= 1) return `제${article}조`;
  if (branch % 10 === 1) return `제${article}조의${Math.floor(branch / 10)}`;
  return `제${article}조`;
}

export function prettySectionLabel(raw: string): string {
  const item = raw.trim();
  if (!item) return "";
  if (/^\d{7,}$/.test(item)) return articleKeyToLabel(item);
  if (item === "본문") return "서문";
  if (/^[IVXLCM]+$/i.test(item)) return `${item.toUpperCase()}절`;
  if (/^\d+\.\d+$/.test(item)) return `조항 ${item}`;
  const annex = item.match(/^별표\s*(\d+)\b/);
  if (annex && item.includes("·")) {
    const tail = item.split("·").pop()?.trim();
    if (tail) return `별표 ${annex[1]} · ${tail}`;
  }
  return item;
}

export function formatSectionList(sections: string[], limit = 4): string {
  const labels = [...new Set(sections.map(prettySectionLabel).filter(Boolean))];
  if (labels.length === 0) return "";
  if (labels.length <= limit) return labels.join(", ");
  return `${labels.slice(0, limit).join(", ")} 외 ${labels.length - limit}개`;
}

export function summarizeDiffGroups(groups: {
  changed: string[];
  added: string[];
  removed: string[];
}): string {
  const parts: string[] = [];
  if (groups.changed.length) {
    parts.push(
      groups.changed.length > 8
        ? `바뀐 조항 ${groups.changed.length}개`
        : `바뀐 조항: ${formatSectionList(groups.changed)}`,
    );
  }
  if (groups.added.length) {
    parts.push(
      groups.added.length > 8
        ? `새로 실린 조항 ${groups.added.length}개`
        : `새로 실린 조항: ${formatSectionList(groups.added)}`,
    );
  }
  if (groups.removed.length) {
    parts.push(
      groups.removed.length > 8
        ? `빠진 조항 ${groups.removed.length}개`
        : `빠진 조항: ${formatSectionList(groups.removed)}`,
    );
  }
  return parts.join(". ") || "조항 단위 변경 없음";
}

export function humanizeChangeSummary(raw: string): string {
  const text = raw.trim();
  if (!text) return "변경 내용이 기록되지 않았습니다.";

  const changed = parseNamedList(text, "변경");
  const added = parseNamedList(text, "추가");
  const removed = parseNamedList(text, "삭제");
  if (!changed.length && !added.length && !removed.length) {
    return humanizeHead(text) || text;
  }

  const head = text
    .split(/\s*(?:변경|추가|삭제)\s+/)[0]
    ?.trim()
    .replace(/[·.]\s*$/, "");
  const body = summarizeDiffGroups({
    changed: collapseNoise(changed),
    added: collapseNoise(added),
    removed: collapseNoise(removed),
  });
  const prefix = humanizeHead(head ?? "");
  return [prefix, body].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function parseNamedList(text: string, label: string): string[] {
  const match = text.match(new RegExp(`${label}\\s+([^/]+)`));
  if (!match?.[1]) return [];
  const items = match[1]
    .split(",")
    .map((row) => row.trim())
    .filter(Boolean);
  if (
    items.length === 1 &&
    /[\p{Script=Hangul}]{2,}/u.test(items[0]) &&
    !/\d/.test(items[0])
  ) {
    return [];
  }
  return items;
}

function collapseNoise(items: string[]): string[] {
  const kept: string[] = [];
  let noise = 0;
  for (const item of items) {
    if (isNoiseSection(item)) {
      noise += 1;
      continue;
    }
    kept.push(item.replace(/\b\d{7}\b/g, (key) => articleKeyToLabel(key)));
  }
  if (noise >= 8) kept.push("세부 항목");
  else if (noise > 0) {
    kept.push(...items.filter(isNoiseSection).slice(0, 3));
  }
  return kept;
}

function isNoiseSection(item: string): boolean {
  const t = item.trim();
  if (/^\d{4}$/.test(t) && Number(t) >= 1900) return true;
  if (/^\d+\.\d+$/.test(t)) return true;
  if (/^[A-Za-z]$/.test(t)) return true;
  if (/^\d{1,2}$/.test(t)) return true;
  return false;
}

function humanizeHead(head: string): string {
  if (!head) return "";
  let out = head.replace(/\b(\d{7})\b/g, (_, key) => articleKeyToLabel(key));
  out = out.replace(
    /MST\s+seed\s*→\s*(\S+)/i,
    "시드 조문을 법령 현행본($1)으로 바꿨습니다.",
  );
  out = out.replace(/MST\s+(\S+)\s*→\s*(\S+)/, "법령번호 $1에서 $2로 바뀌었습니다.");
  out = out.replace(/고시일\/발행일만 변경[^.]*$/, "발행일만 바뀌고 본문은 같습니다.");
  if (/file hash|파일 해시/i.test(out) && !/조항/.test(out)) {
    return "본문 파일이 바뀌었습니다. 바뀐 조항은 다음 개정 기록에 표시됩니다.";
  }
  if (/시드 조항을 다시 잘랐/.test(out)) {
    return "검색에 쓰는 조항 경계를 다시 맞췄습니다. 공식 개정은 아닙니다.";
  }
  return out.replace(/^[·.\s]+|[·.\s]+$/g, "");
}

export function isInternalReseed(summary: string): boolean {
  return /시드 조항을 다시 잘랐|조항 경계를 다시 맞췄/.test(summary);
}

export function isInternalPipelineChange(summary: string): boolean {
  if (isInternalReseed(summary)) return true;
  if (/초기 적재/.test(summary)) return false;
  const hasOfficialMarker = /공포|발행일|시행\s|MST\s|파일 해시|file hash/i.test(summary);
  if (hasOfficialMarker) return false;
  return /바뀐 조항|새로 실린 조항|빠진 조항|변경\s|추가\s|삭제\s/.test(summary);
}

export function feedKindLabel(kind: ChangeKind, summary: string): string {
  if (isInternalReseed(summary)) return "조항 나누기";
  return changeKindLabel(kind);
}

export function collapseRepeatedFeedItems<
  T extends { documentId: string; summary: string },
>(logs: T[]): T[] {
  const out: T[] = [];
  for (const log of logs) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.documentId === log.documentId &&
      humanizeChangeSummary(prev.summary) === humanizeChangeSummary(log.summary)
    ) {
      continue;
    }
    out.push(log);
  }
  return out;
}

export function publicRevisionFeed<T extends { documentId: string; summary: string }>(
  logs: T[],
): T[] {
  return collapseRepeatedFeedItems(logs.filter((log) => !isInternalPipelineChange(log.summary)));
}
