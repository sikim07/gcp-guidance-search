import { diffLines } from "diff";
import { chunkByClause, type ClauseChunk } from "@/lib/pipeline/chunk";
import { summarizeDiffGroups } from "@/lib/text/change-copy";

export type SectionChange = {
  section: string;
  kind: "added" | "removed" | "changed" | "unchanged";
  previousText?: string;
  currentText?: string;
};

function indexBySection(chunks: ClauseChunk[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const chunk of chunks) {
    map.set(chunk.section, chunk.text);
  }
  return map;
}

/**
 * Compare two extracted texts clause-by-clause so only changed sections are re-embedded.
 */
export function diffSections(previousText: string, currentText: string): SectionChange[] {
  const prev = indexBySection(chunkByClause(previousText));
  const next = indexBySection(chunkByClause(currentText));
  const keys = new Set([...prev.keys(), ...next.keys()]);
  const changes: SectionChange[] = [];

  for (const section of keys) {
    const a = prev.get(section);
    const b = next.get(section);
    if (a && !b) {
      changes.push({ section, kind: "removed", previousText: a });
    } else if (!a && b) {
      changes.push({ section, kind: "added", currentText: b });
    } else if (a && b && a.trim() !== b.trim()) {
      changes.push({ section, kind: "changed", previousText: a, currentText: b });
    } else if (a && b) {
      changes.push({ section, kind: "unchanged", previousText: a, currentText: b });
    }
  }
  return changes;
}

export function summarizeDiff(changes: SectionChange[]): string {
  return summarizeDiffGroups({
    changed: changes.filter((c) => c.kind === "changed").map((c) => c.section),
    added: changes.filter((c) => c.kind === "added").map((c) => c.section),
    removed: changes.filter((c) => c.kind === "removed").map((c) => c.section),
  });
}

export function lineDiff(previousText: string, currentText: string): string {
  return diffLines(previousText, currentText)
    .flatMap((part) => {
      const prefix = part.added ? "+" : part.removed ? "-" : " ";
      return part.value
        .split("\n")
        .filter((line, i, arr) => !(i === arr.length - 1 && line === ""))
        .map((line) => `${prefix}${line}`);
    })
    .slice(0, 400)
    .join("\n");
}
