import type { AnswerSource } from "@/lib/types";

export function formatCitations(sources: AnswerSource[]): string {
  const lines = sources.map((source) => {
    const note = versionNote(source);
    return `[${source.title}, ${source.section}]${note} ${source.url}`.trim();
  });
  return `${lines.join("\n")}\n법적 자문이 아님. 원문을 확인할 것.`;
}

function versionNote(source: AnswerSource): string {
  if (source.kind === "statute") {
    const parts: string[] = [];
    if (source.currentMst && /^\d+$/.test(source.currentMst)) {
      parts.push(`공포번호 ${source.currentMst}`);
    }
    if (source.effectiveDate) parts.push(`${source.effectiveDate} 시행`);
    return parts.length ? ` (${parts.join(", ")})` : "";
  }
  if (source.issuedDate) return ` (${source.issuedDate} 발행)`;
  return "";
}
