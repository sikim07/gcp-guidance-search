import type { SourceKind } from "@/lib/types";
import { expandQuery } from "@/lib/retrieval/expand-query";

export type SearchScope = "all" | "domestic" | "fda";
export type SearchOrigin = "domestic" | "fda";

export function originOf(
  kind: SourceKind | undefined,
  url: string,
  source?: string,
): SearchOrigin {
  if (kind === "statute") return "domestic";
  if (source === "mfds" || source === "kgcp") return "domestic";
  if (/mfds\.go\.kr|law\.go\.kr/i.test(url)) return "domestic";
  return "fda";
}

export function filterByScope<T extends { origin: SearchOrigin }>(
  items: T[],
  scope: SearchScope,
): T[] {
  if (scope === "all") return items;
  return items.filter((item) => item.origin === scope);
}

export function sectionQuery(query: string): string | null {
  const q = query.trim();
  const article = q.match(/^제\s*(\d+)\s*조/);
  if (article) return `제${article[1]}조`;
  const annex = q.match(/^별표\s*(\d+)/);
  if (annex) return `별표 ${annex[1]}`;
  const dotted = q.match(/^(\d+(?:\.\d+)+)\b/);
  if (dotted) return dotted[1];
  const qn = q.match(/^Q\s*(\d+)/i);
  if (qn) return `Q${qn[1]}`;
  return null;
}

export function tokenize(text: string): string[] {
  const hangul = text.match(/[\p{Script=Hangul}]{2,}/gu) ?? [];
  const latin = text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  return [...hangul, ...latin];
}

export function lexicalScore(tokens: string[], section: string, text: string): number {
  if (tokens.length === 0) return 0;
  const hay = `${section} ${text}`.toLowerCase();
  const sectionHay = section.toLowerCase();
  let hits = 0;
  let sectionHits = 0;
  for (const token of tokens) {
    const needle = token.toLowerCase();
    if (hay.includes(needle)) hits += 1;
    if (sectionHay.includes(needle)) sectionHits += 1;
  }
  return Math.min(1, hits / tokens.length + 0.25 * (sectionHits / tokens.length));
}

export function qualityPenalty(section: string, text: string, query: string): number {
  const q = query.toLowerCase();
  const head = `${section}\n${text}`.slice(0, 240);
  let n = 0;
  if (/^(I|II|III|IV|BACKGROUND|INTRODUCTION)\b/i.test(section.trim())) n += 0.4;
  if (/\.docx\b/i.test(text) || /https?:\/\/www\.fda\.gov\/ICECI/i.test(text)) n += 0.45;
  if (text.trim().length < 80) n += 0.2;
  if (
    /Good Clinical Practice: Integrated Addendum/i.test(section) &&
    section.length > 40
  ) {
    n += 0.3;
  }
  if (/제1장\s*목적/.test(head) && !/목적|안내서/.test(q)) n += 0.35;
  if (/(?:^|[·\s])1\.\s*목적/.test(section) && !/목적/.test(q)) n += 0.4;
  if (/^BACKGROUND\b/i.test(text.trim()) && /감사추적|audit trail/.test(q)) n += 0.25;
  if (
    /sae|susar|이상반응/.test(q) &&
    /개인정보|분쟁의 조정|제47조/.test(`${section}\n${text}`)
  ) {
    n += 0.5;
  }
  return n;
}

export function phraseBoost(query: string, section: string, text: string): number {
  const q = query.toLowerCase();
  const hay = `${section}\n${text}`.toLowerCase();
  const head = text.trim().slice(0, 80);
  let boost = 0;
  if (
    /서면\s*동의|informed consent|시험대상자.{0,8}동의/.test(q) &&
    /서면\s*동의|informed consent/.test(hay)
  ) {
    boost += 0.14;
  }
  if (/감사추적|audit trail/.test(q) && /감사추적|audit trail/.test(hay)) {
    boost += 0.12;
  }
  if (/임상시험계획/.test(q) && /임상시험계획/.test(hay)) {
    boost += 0.1;
  }
  if (
    /4\.8/.test(section) &&
    /서면\s*동의|informed consent|시험대상자.{0,8}동의/.test(q)
  ) {
    boost += 0.18;
  }
  if (/제23조|민감정보/.test(`${section}\n${text}`) && /민감정보|건강정보/.test(q)) {
    boost += 0.22;
  }
  if (/모니터링|monitoring/.test(q) && /5\.18|머\.\s*모니터링/.test(section)) {
    boost += 0.18;
  }
  if (
    /필수문서|essential documents/.test(q) &&
    /필수문서|essential documents/.test(hay)
  ) {
    boost += 0.16;
  }
  if (
    /sae|susar|이상반응|약물이상반응/.test(q) &&
    /이상반응|safety report|7일|15일|7 calendar|15 calendar/.test(hay)
  ) {
    boost += 0.2;
  }
  if (
    /r3|품질관리|quality by design/.test(q) &&
    /e6\(r3\)|quality by design|비례적|risk proportionate/.test(hay)
  ) {
    boost += 0.18;
  }
  if (/5\.5\.3|q8|q12/i.test(section) && /감사추적|audit trail/.test(q)) {
    boost += 0.2;
  }
  if (
    (/용어의 정의|definitions/i.test(section) || /^용어의 정의/.test(head)) &&
    !/정의|definition/i.test(q)
  ) {
    boost -= 0.28;
  }
  return boost;
}

export function sectionBoost(query: string, section: string): number {
  const needle = sectionQuery(query);
  if (!needle) return 0;
  const s = section.toLowerCase();
  const n = needle.toLowerCase();
  if (s === n || s.startsWith(`${n} `) || s.startsWith(`${n}.`) || s.includes(n)) {
    return 0.5;
  }
  return 0;
}

export function lexicalRankScore(query: string, section: string, text: string): number {
  const tokens = tokenize(expandQuery(query));
  return (
    0.5 * lexicalScore(tokens, section, text) +
    phraseBoost(query, section, text) +
    sectionBoost(query, section) -
    qualityPenalty(section, text, query)
  );
}
