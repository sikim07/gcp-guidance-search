const LAW_BASE = "https://www.law.go.kr/DRF";

export function getLawOc(): string | undefined {
  const value = process.env.LAW_OC?.trim();
  return value || undefined;
}

function headers(): HeadersInit {
  return {
    "User-Agent": "gcp-guideline-watcher/0.1 (personal research)",
    Accept: "application/json,text/plain,*/*",
    Referer: "https://open.law.go.kr/",
  };
}

export async function fetchLawSearch(query: string): Promise<unknown> {
  const oc = getLawOc();
  if (!oc) throw new Error("LAW_OC is not set");
  const url = new URL(`${LAW_BASE}/lawSearch.do`);
  url.searchParams.set("OC", oc);
  url.searchParams.set("target", "law");
  url.searchParams.set("type", "JSON");
  url.searchParams.set("search", "1");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "100");
  return fetchLawJson(url);
}

export async function fetchLawBody(lawId: string): Promise<unknown> {
  const oc = getLawOc();
  if (!oc) throw new Error("LAW_OC is not set");
  const url = new URL(`${LAW_BASE}/lawService.do`);
  url.searchParams.set("OC", oc);
  url.searchParams.set("target", "law");
  url.searchParams.set("type", "JSON");
  url.searchParams.set("ID", lawId);
  return fetchLawJson(url);
}

async function fetchLawJson(url: URL): Promise<unknown> {
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    throw new Error(`법령 API ${response.status}`);
  }
  const text = await response.text();
  if (!text.trim()) {
    throw new Error("법령 API 빈 응답");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("법령 API JSON 파싱 실패");
  }
}
