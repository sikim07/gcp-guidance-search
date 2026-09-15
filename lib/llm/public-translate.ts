const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAX_CHUNK = 1600;

export function parsePublicTranslation(data: unknown): string {
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed) return trimmed;
    throw new Error("public-translate-empty");
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("public-translate-parse");
  }
  if (data.every((item) => typeof item === "string")) {
    const joined = data.join("").trim();
    if (joined) return joined;
    throw new Error("public-translate-empty");
  }
  const first = data[0];
  if (Array.isArray(first) && first.length > 0) {
    if (first.every((row) => Array.isArray(row) && typeof row[0] === "string")) {
      const joined = first.map((row) => (row as [string])[0]).join("").trim();
      if (joined) return joined;
    }
    if (typeof first[0] === "string") {
      return parsePublicTranslation(first);
    }
  }
  if (typeof first === "string" && first.trim()) {
    return first.trim();
  }
  throw new Error("public-translate-parse");
}

export function splitForPublicTranslate(text: string, max = MAX_CHUNK): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= max) return [trimmed];
  const paragraphs = trimmed.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = "";
  const flush = () => {
    if (buf.trim()) chunks.push(buf.trim());
    buf = "";
  };
  for (const para of paragraphs) {
    if (para.length > max) {
      flush();
      for (const sentence of splitSentences(para)) {
        if ((buf + " " + sentence).trim().length > max) flush();
        buf = buf ? `${buf} ${sentence}` : sentence;
      }
      continue;
    }
    if ((buf + "\n\n" + para).trim().length > max) flush();
    buf = buf ? `${buf}\n\n${para}` : para;
  }
  flush();
  return chunks.length > 0 ? chunks : [trimmed.slice(0, max)];
}

function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.filter((part) => part.trim().length > 0);
}

async function fetchTranslate(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`public-translate-${response.status}`);
  }
  return parsePublicTranslation(await response.json());
}

async function translateOneChunk(text: string): Promise<string> {
  const chrome = new URL("https://clients5.google.com/translate_a/t");
  chrome.searchParams.set("client", "dict-chrome-ex");
  chrome.searchParams.set("sl", "en");
  chrome.searchParams.set("tl", "ko");
  chrome.searchParams.set("q", text);
  try {
    return await fetchTranslate(chrome.toString());
  } catch {
    const gtx = new URL("https://translate.googleapis.com/translate_a/single");
    gtx.searchParams.set("client", "gtx");
    gtx.searchParams.set("sl", "en");
    gtx.searchParams.set("tl", "ko");
    gtx.searchParams.set("dt", "t");
    gtx.searchParams.set("q", text);
    return fetchTranslate(gtx.toString());
  }
}

export async function publicTranslateEnToKo(text: string): Promise<string> {
  const pieces = splitForPublicTranslate(text);
  const out: string[] = [];
  for (const piece of pieces) {
    out.push(await translateOneChunk(piece));
  }
  return out.join("\n\n").trim();
}
