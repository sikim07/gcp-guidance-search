import type { AnswerSource } from "@/lib/types";

export function formatCitations(sources: AnswerSource[]): string {
  const lines = sources.map(
    (source) => `[${source.title}, ${source.section}] ${source.url}`,
  );
  return `${lines.join("\n")}\n법적 자문이 아님. 원문을 확인할 것.`;
}
