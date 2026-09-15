const PAGE_GLUE = /([A-Za-z가-힣]{2,})(\d{2,3})(?:\s+\d{1,3}){0,4}(?=\s|$)/g;
const DOT_LEADERS = /\.{3,}\s*\d+\s*/g;
const ALONE_PAGE = /^\s*\d{1,4}\s*$/gm;
const GLUED_LOWER = /([a-z])(\d{1,3})(?=\s|[A-Z])/g;

export function readableText(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
  text = text.replace(DOT_LEADERS, " ");
  text = text.replace(ALONE_PAGE, "");
  text = text.replace(PAGE_GLUE, "$1");
  text = text.replace(GLUED_LOWER, "$1");
  text = unwrapHardWraps(text);
  text = text.replace(
    /([\p{Script=Hangul}]) ([로서를은는이가과도만께])(?=[^\p{Script=Hangul}]|$)/gu,
    "$1$2",
  );
  text = text.replace(/유효 성/g, "유효성");
  text = text.replace(/품목허 가/g, "품목허가");
  text = text.replace(/안 전성/g, "안전성");
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function clipAtSentence(text: string, max: number): string {
  const cleaned = text.trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const markers = [". ", "? ", "! ", "다. ", "요. ", "\n\n"];
  let cut = -1;
  for (const marker of markers) {
    const idx = slice.lastIndexOf(marker);
    if (idx > cut) cut = idx + marker.trimEnd().length;
  }
  if (cut > max * 0.4) return slice.slice(0, cut).trim();
  return `${slice.trim()}…`;
}

function unwrapHardWraps(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const current = line.trim();
    if (!current) {
      if (out.length === 0 || out[out.length - 1] !== "") out.push("");
      continue;
    }
    const prev = out[out.length - 1];
    if (prev && prev !== "" && !isParagraphEnd(prev) && !isNewBlock(current)) {
      out[out.length - 1] = joinWrapped(prev, current);
    } else {
      out.push(current);
    }
  }
  return out.join("\n");
}

function joinWrapped(prev: string, current: string): string {
  const hangulEnd = /[\p{Script=Hangul}]$/u.test(prev);
  const hangulStart = /^[\p{Script=Hangul}]/u.test(current);
  if (hangulEnd && hangulStart) {
    const trail = prev.match(/[\p{Script=Hangul}]+$/u)?.[0] ?? "";
    const lead = current.match(/^[\p{Script=Hangul}]+/u)?.[0] ?? "";
    if (/이란$|한다$|이다$|있다$|된다$|같다$|한다$/.test(trail)) {
      return `${prev} ${current}`;
    }
    if (lead.length === 1 || (trail.length <= 2 && lead.length <= 3)) {
      return `${prev}${current}`;
    }
  }
  return `${prev} ${current}`;
}

function isParagraphEnd(line: string): boolean {
  return /[.!?…。]\s*$/.test(line) || /(?:다|요|음)\.\s*$/.test(line);
}

function isNewBlock(line: string): boolean {
  return /^(제\d|[0-9]+\.|[IVXLCM]+\.|Q\d|\(|[-•·]|[가-하]\.)/.test(line);
}
