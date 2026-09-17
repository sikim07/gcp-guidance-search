export type ClauseChunk = {
  section: string;
  text: string;
};

const SECTION_PATTERNS: RegExp[] = [
  /^(제\d+조(?:의\d+)?(?:\s*\([^)]+\))?)\s*/,
  /^(제\d+장)\s*/,
  /^(제\d+호)\s*/,
  /^(Q\d+[A-Z]?)\s*[.:)]\s*/i,
  /^(\d+(?:\.\d+){1,4})\s+/,
  /^(\d+\.)\s+/,
  /^([가-힣]\.)\s+/,
  /^([IVXLCM]+\.[A-Z]?)\s+/,
  /^(ADDENDUM\s+\d+(?:\.\d+)*)\s+/i,
];

const NAMED_HEADINGS =
  /^(BACKGROUND|INTRODUCTION|PRINCIPLES|DATA GOVERNANCE|QUALITY MANAGEMENT|ANNEX\s+\d+\b.*)$/i;

const SKIP_STANDALONE =
  /^(ADDENDUM|TABLE OF CONTENTS|ICH HARMONISED GUIDELINE|Current Step\b.*|January|February|March|April|May|June|July|August|September|October|November|December)$/i;

function matchSection(
  line: string,
): { section: string; rest: string; numbered: boolean } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (isTocLine(trimmed) || isHistoryIndexLine(trimmed)) return null;
  for (const pattern of SECTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      let section = match[1];
      let rest = trimmed.slice(match[0].length).trim();
      const numbered = /^\d/.test(section);
      const letter = /^[가-힣]\./.test(section);
      if (numbered && isWrappedTocTitle(rest)) return null;
      if (letter) {
        const labeled = letterHeading(section, rest);
        return { section: labeled.section, rest: labeled.rest, numbered: false };
      }
      if (isHeadingRest(rest)) {
        section = `${section} ${rest}`.replace(/\s+/g, " ").trim();
        rest = "";
      } else {
        section = section.replace(/\.$/, "");
      }
      return { section, rest, numbered };
    }
  }
  if (NAMED_HEADINGS.test(trimmed) && trimmed.length <= 80) {
    return { section: trimmed.replace(/\s+/g, " ").trim(), rest: "", numbered: false };
  }
  if (isStandaloneHeading(trimmed)) {
    return { section: trimmed.replace(/\s+/g, " ").trim(), rest: "", numbered: false };
  }
  return null;
}

function letterHeading(marker: string, rest: string): { section: string; rest: string } {
  const quoted = rest.match(/^"([^"]+)"/);
  if (quoted?.[1]) {
    return { section: `${marker} ${quoted[1]}`.replace(/\s+/g, " ").trim(), rest };
  }
  if (isHeadingRest(rest) || isShortTitleRest(rest)) {
    return { section: `${marker} ${rest}`.replace(/\s+/g, " ").trim(), rest: "" };
  }
  return { section: marker, rest };
}

function isShortTitleRest(rest: string): boolean {
  if (!rest || rest.length > 36) return false;
  if (/[.。!?]|[,，]/.test(rest)) return false;
  if (/하여야$|하며$|한다$|실시하$/.test(rest)) return false;
  return rest.split(/\s+/).length <= 8;
}

function isTocLine(line: string): boolean {
  return /\.{5,}|…{3,}/.test(line);
}

function isHistoryIndexLine(line: string): boolean {
  return /^\d+(?:\.\d+)+\s*\([a-z]\)/i.test(line) && /,/.test(line);
}

function isWrappedTocTitle(rest: string): boolean {
  const letters = rest.replace(/[^A-Za-z]/g, "");
  if (letters.length < 12 || rest.length < 40) return false;
  const uppers = letters.replace(/[^A-Z]/g, "").length;
  return uppers / letters.length > 0.8;
}

function isStandaloneHeading(line: string): boolean {
  if (line.length < 4 || line.length > 80) return false;
  if (SKIP_STANDALONE.test(line)) return false;
  if (/[.。!?:：]/.test(line)) return false;
  if (/^\d/.test(line)) return false;
  if (/^[가-힣]\)/.test(line) || /^\(\d+\)/.test(line) || /^\d+\)/.test(line))
    return false;
  if (/Steering Committee|Codification|Document History/i.test(line)) return false;
  if (/^Integrated Addendum to ICH E6/i.test(line)) return false;
  if (/^E6\b/.test(line)) return false;
  if (/[\p{Script=Hangul}]/u.test(line)) {
    if (/다$|요$|는다$|한다$|하여야$/.test(line)) return false;
    if (line.length > 36) return false;
    if (/[이가을를은는의와과에도로만부터까지으써]$/.test(line)) return false;
    if (/^(있는|ㆍ)/.test(line)) return false;
    return line.split(/\s+/).length <= 12;
  }
  if (!/^[A-Z]/.test(line)) return false;
  if (/^(The|A|An|This|When|If|Use|Keep)\b/.test(line)) return false;
  if (line.split(/\s+/).length === 1 && !NAMED_HEADINGS.test(line)) return false;
  return line.split(/\s+/).length <= 12;
}

function isHeadingRest(rest: string): boolean {
  if (!rest || rest.length > 42) return false;
  if (/[.。!?]|[,，]/.test(rest)) return false;
  if (/하여야$|하며$|한다$/.test(rest)) return false;
  if (!/[\p{Script=Hangul}]/u.test(rest)) return false;
  return rest.split(/\s+/).length <= 8;
}

function isRunningHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^Integrated Addendum to ICH E6/i.test(trimmed)) return true;
  if (/^ICH HARMONISED GUIDELINE$/i.test(trimmed)) return true;
  if (/^\d{1,3}$/.test(trimmed)) return true;
  if (isTocLine(trimmed) || isHistoryIndexLine(trimmed)) return true;
  return false;
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
  let parentNumbered: string | null = null;
  let buffer: string[] = [];
  let foundHeader = false;

  const flush = () => {
    const joined = buffer.join("\n").trim();
    if (joined) chunks.push({ section: currentSection, text: joined });
    buffer = [];
  };

  for (const line of lines) {
    if (isRunningHeader(line)) continue;
    const header = matchSection(line);
    if (header) {
      flush();
      foundHeader = true;
      let section = header.section;
      if (header.numbered) parentNumbered = section;
      else if (/^[가-힣]\./.test(section) && parentNumbered) {
        section = `${parentNumbered} · ${section}`;
      }
      currentSection = section;
      buffer = header.rest ? [header.rest] : [];
    } else {
      buffer.push(line);
    }
  }
  flush();

  if (!foundHeader || chunks.length === 0) {
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
