export type ClauseChunk = {
  section: string;
  text: string;
};

const SECTION_PATTERNS: RegExp[] = [
  /^(제\d+조(?:의\d+)?(?:\s*\([^)]+\))?)\s*/,
  /^(제\d+호)\s*/,
  /^(Q\d+[A-Z]?)\s*[.:)]\s*/i,
  /^((?:\d+\.){1,4}\d?)\s+/,
  /^([IVXLCM]+\.[A-Z]?)\s+/,
  /^(ADDENDUM\s+\d+(?:\.\d+)*)\s+/i,
];

function matchSection(line: string): { section: string; rest: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  for (const pattern of SECTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return { section: match[1].replace(/\.$/, ""), rest: trimmed.slice(match[0].length).trim() };
    }
  }
  return null;
}

/**
 * Split extracted guidance text by clause/section numbers, not by raw paragraphs.
 * Fallback: packed paragraphs of ~1,200 characters when no clause markers exist.
 */
export function chunkByClause(text: string, fallbackTitle = "본문"): ClauseChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
  const lines = normalized.split("\n");
  const chunks: ClauseChunk[] = [];
  let currentSection = fallbackTitle;
  let buffer: string[] = [];

  const flush = () => {
    const joined = buffer.join("\n").trim();
    if (joined) chunks.push({ section: currentSection, text: joined });
    buffer = [];
  };

  for (const line of lines) {
    const header = matchSection(line);
    if (header) {
      flush();
      currentSection = header.section;
      buffer = header.rest ? [header.rest] : [];
    } else {
      buffer.push(line);
    }
  }
  flush();

  if (chunks.length <= 1) {
    return packParagraphs(normalized, fallbackTitle);
  }

  return chunks;
}

function packParagraphs(text: string, title: string): ClauseChunk[] {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const packed: ClauseChunk[] = [];
  let buf = "";
  let index = 1;
  for (const para of paras) {
    if ((buf + "\n\n" + para).length > 1200 && buf) {
      packed.push({ section: `${title} §${index}`, text: buf.trim() });
      index += 1;
      buf = para;
    } else {
      buf = buf ? `${buf}\n\n${para}` : para;
    }
  }
  if (buf.trim()) packed.push({ section: `${title} §${index}`, text: buf.trim() });
  return packed;
}
