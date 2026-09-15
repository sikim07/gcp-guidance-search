const PAGE_GLUE = /([A-Za-z가-힣]{2,})(\d{2,3})(?:\s+\d{1,3}){0,4}(?=\s|$)/g;
const DOT_LEADERS = /\.{3,}\s*\d+\s*/g;
const ALONE_PAGE = /^\s*\d{1,4}\s*$/gm;
const GLUED_LOWER = /([a-z])(\d{1,3})(?=\s|[A-Z])/g;
const FOOTNOTE = /([A-Za-z가-힣][.!?…]?)(\d{1,3})(?=\s+[A-Z가-힣])/g;

const KEEP_SPACE_LEFT = new Set([
  "이",
  "그",
  "저",
  "수",
  "및",
  "등",
  "안",
  "못",
  "잘",
  "더",
  "곧",
  "즉",
  "또",
  "별",
  "각",
  "한",
  "두",
  "세",
]);

const KEEP_SPACE_RIGHT = new Set([
  "및",
  "등",
  "또는",
  "그리고",
  "또한",
  "다만",
  "즉",
  "곧",
  "그",
  "이",
  "저",
  "수",
  "때",
  "후",
  "전",
  "중",
  "각",
  "모든",
  "해당",
  "관련",
  "이상",
  "이하",
  "다음",
  "다른",
  "같은",
  "통해",
  "의해",
  "따라",
  "위한",
  "대한",
  "관한",
  "따른",
  "있는",
  "없는",
  "하는",
  "되는",
  "받은",
  "경우",
  "필요",
  "가능",
  "둘",
  "셋",
  "몇",
]);

export function readableText(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
  text = text.replace(DOT_LEADERS, " ");
  text = text.replace(ALONE_PAGE, "");
  text = text.replace(PAGE_GLUE, "$1");
  text = text.replace(GLUED_LOWER, "$1");
  text = text.replace(FOOTNOTE, "$1");
  text = unwrapHardWraps(text);
  text = joinKoreanFragments(text);
  text = formatDocumentLayout(text);
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function clipAtSentence(text: string, max: number): string {
  const cleaned = text.trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const markers = [". ", "? ", "! ", "다. ", "요. ", "\n\n", "\n①", "\n②"];
  let cut = -1;
  for (const marker of markers) {
    const idx = slice.lastIndexOf(marker);
    if (idx > cut) cut = idx + (marker.startsWith("\n") ? 1 : marker.trimEnd().length);
  }
  if (cut > max * 0.4) return slice.slice(0, cut).trim();
  return `${slice.trim()}…`;
}

function joinKoreanFragments(text: string): string {
  let out = text;
  out = out.replace(/유효 성/g, "유효성");
  out = out.replace(/품목허 가/g, "품목허가");
  out = out.replace(/안 전성/g, "안전성");
  out = out.replace(/임상시험 용/g, "임상시험용");
  out = out.replace(/생의학 적/g, "생의학적");
  out = out.replace(/식품의약품안전처 장/g, "식품의약품안전처장");
  out = out.replace(/([\p{Script=Hangul}]) 장(의|은|이|을|에게|께)/gu, "$1장$2");
  out = out.replace(
    /([\p{Script=Hangul}]) ([한된있없인진]) 다(?=[^\p{Script=Hangul}]|$)/gu,
    "$1$2다",
  );
  out = out.replace(
    /([\p{Script=Hangul}]) ([로서를은는이가과도만께])(?=[^\p{Script=Hangul}]|$)/gu,
    "$1$2",
  );
  out = out.replace(
    /([\p{Script=Hangul}]+) ([\p{Script=Hangul}]+)/gu,
    (full, left: string, right: string) => {
      if (KEEP_SPACE_RIGHT.has(right) || KEEP_SPACE_LEFT.has(left)) return full;
      if (["한다", "된다", "있다", "없다", "이다"].includes(right)) return full;
      if (/[하이되받]$/.test(left) && /^[기게지]/.test(right)) return `${left}${right}`;
      if (left.length === 1 || right.length === 1) return `${left}${right}`;
      if (right.length <= 2 && /^[의를을은는이가과와도만께로장적성용기자]$/.test(right)) {
        return `${left}${right}`;
      }
      return full;
    },
  );
  out = out.replace(/하기위하여/g, "하기 위하여");
  return out;
}

function formatDocumentLayout(text: string): string {
  let out = text.replace(/\s*(<[개개정증삭][^>]*>)\s*/g, "\n$1\n");
  out = out.replace(/(용어의 정의|목적|적용 범위|기본원칙)(?=\s*이 )/g, "$1\n");
  out = out.replace(/(제\d+조(?:의\d+)?(?:\([^)]+\))?)(?=\s*[①②③④⑤])/g, "$1\n");
  out = out.replace(/\s+([①-⑮])\s*/g, "\n$1 ");
  out = out.replace(/\s+([가-하]\.\s")/g, "\n$1");
  out = out.replace(/\s+(\d+\))\s+/g, "\n$1 ");
  return out;
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
    if (
      prev &&
      prev !== "" &&
      !isParagraphEnd(prev) &&
      !isNewBlock(current) &&
      !isHeading(prev)
    ) {
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
    if (/이란$|한다$|이다$|있다$|된다$|같다$/.test(trail)) {
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

function isHeading(line: string): boolean {
  return (
    line.length <= 24 &&
    !/[.!?…。]$/.test(line) &&
    /^(제\d|[0-9]+\.|용어의 정의|목적|적용|기본원칙)/.test(line)
  );
}

function isNewBlock(line: string): boolean {
  return /^(제\d|[0-9]+\.|[IVXLCM]+\.|Q\d|\(|[-•·]|[가-하]\.|[①-⑮]|이 (법|영|기준)에서)/.test(
    line,
  );
}
