export type LawListHit = {
  lawId: string;
  mst: string;
  title: string;
  amendmentType: string;
  promulgatedDate: string | null;
  effectiveDate: string | null;
  detailPath: string;
};

export type ParsedArticle = {
  articleKey: string;
  section: string;
  text: string;
  kind: "article" | "annex";
};

type Json = Record<string, unknown>;

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function asRecord(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};
}

function str(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

export function flattenLawText(value: unknown): string {
  if (typeof value === "string") {
    return value
      .replace(/[ \t\u00a0]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map(flattenLawText).filter(Boolean).join("\n");
  }
  if (value && typeof value === "object") {
    return Object.values(value).map(flattenLawText).filter(Boolean).join("\n");
  }
  return "";
}

export function yyyymmddToIso(value: unknown): string | null {
  const raw = str(value).replace(/\D/g, "");
  if (raw.length !== 8) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export function stripOc(url: string): string {
  try {
    const parsed = url.startsWith("/")
      ? new URL(url, "https://www.law.go.kr")
      : new URL(url);
    parsed.searchParams.delete("OC");
    if (url.startsWith("/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    return url
      .replace(/([?&])OC=[^&]*/gi, "")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }
}

export function publicLawUrl(title: string): string {
  return `https://www.law.go.kr/법령/${title}`;
}

export function pickExactLaw(
  payload: unknown,
  exactTitle: string,
): LawListHit | undefined {
  const root = asRecord(payload);
  const search = asRecord(root.LawSearch ?? root);
  const rows = asArray(search.law as Json | Json[] | undefined);
  const hit = rows.find((row) => str(row.법령명한글) === exactTitle);
  if (!hit) return undefined;
  return {
    lawId: str(hit.법령ID),
    mst: str(hit.법령일련번호),
    title: str(hit.법령명한글),
    amendmentType: str(hit.제개정구분명),
    promulgatedDate: yyyymmddToIso(hit.공포일자),
    effectiveDate: yyyymmddToIso(hit.시행일자),
    detailPath: stripOc(str(hit.법령상세링크)),
  };
}

export function articlesFromLawBody(
  payload: unknown,
  options: { includeAnnexTitle?: string } = {},
): ParsedArticle[] {
  const law = asRecord(asRecord(payload).법령);
  const units = asArray(asRecord(law.조문).조문단위 as Json | Json[] | undefined);
  const articles: ParsedArticle[] = [];

  for (const unit of units) {
    if (str(unit.조문여부) !== "조문") continue;
    const text = flattenArticle(unit);
    if (!text) continue;
    articles.push({
      articleKey: str(unit.조문키) || `article-${str(unit.조문번호)}`,
      section: articleSection(unit),
      text,
      kind: "article",
    });
  }

  if (options.includeAnnexTitle) {
    const annexUnits = asArray(asRecord(law.별표).별표단위 as Json | Json[] | undefined);
    for (const unit of annexUnits) {
      if (!isWantedAnnex(unit, options.includeAnnexTitle)) continue;
      const text = flattenLawText(unit.별표내용);
      if (!text) continue;
      const number = Number.parseInt(str(unit.별표번호), 10);
      const title = str(unit.별표제목).replace(/\(.*$/, "").trim();
      articles.push({
        articleKey: str(unit.별표키) || `annex-${number}`,
        section: `별표 ${number} ${title}`,
        text,
        kind: "annex",
      });
    }
  }

  return articles;
}

function isWantedAnnex(unit: Json, includeAnnexTitle: string): boolean {
  const number = Number.parseInt(str(unit.별표번호), 10);
  const title = str(unit.별표제목);
  if (number !== 4) return false;
  if (!title.includes(includeAnnexTitle)) return false;
  if (title.includes("제조")) return false;
  return true;
}

function articleSection(unit: Json): string {
  const header = flattenLawText(unit.조문내용).split("\n")[0]?.trim() ?? "";
  if (/^제\d+/.test(header)) return header.slice(0, 120);
  const num = str(unit.조문번호);
  const title = flattenLawText(unit.조문제목);
  const head = `제${num}조`;
  return title ? `${head}(${title})` : head;
}

function flattenArticle(unit: Json): string {
  const parts: string[] = [];
  const header = flattenLawText(unit.조문내용);
  if (header) parts.push(header);
  for (const hang of asArray(unit.항 as Json | Json[] | undefined)) {
    const hangText = flattenLawText(hang.항내용);
    if (hangText) parts.push(hangText);
    for (const ho of asArray(hang.호 as Json | Json[] | undefined)) {
      const hoText = flattenLawText(ho.호내용);
      if (hoText && !hangText.includes(hoText)) parts.push(hoText);
      for (const mok of asArray(ho.목 as Json | Json[] | undefined)) {
        const mokText = flattenLawText(mok.목내용 ?? mok);
        if (mokText) parts.push(mokText);
      }
    }
  }
  return parts.join("\n").trim();
}

export const WATCHED_STATUTES = [
  {
    query: "개인정보 보호법",
    exactTitle: "개인정보 보호법",
    shortTitle: "개인정보 보호법",
  },
  {
    query: "의료기기법",
    exactTitle: "의료기기법",
    shortTitle: "의료기기법",
  },
  {
    query: "약사법",
    exactTitle: "약사법",
    shortTitle: "약사법",
  },
  {
    query: "첨단재생의료 및 첨단바이오의약품 안전 및 지원에 관한 법률",
    exactTitle: "첨단재생의료 및 첨단바이오의약품 안전 및 지원에 관한 법률",
    shortTitle: "첨단재생바이오법",
  },
  {
    query: "의약품 등의 안전에 관한 규칙",
    exactTitle: "의약품 등의 안전에 관한 규칙",
    shortTitle: "의약품 등의 안전에 관한 규칙",
    annexTitle: "의약품 임상시험 관리기준",
  },
] as const;
