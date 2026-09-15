import seedEnKo from "@/lib/llm/seed-ko.json";
import { readableText } from "@/lib/text/readable";

const MIN_PREFIX = 80;

export function fingerprintEnglish(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripAnswerDecorations(text: string): string {
  return text
    .replace(/\n\[[^\]]+\]\s*$/u, "")
    .replace(/\n법적 자문이 아닙니다[\s\S]*$/u, "")
    .trim();
}

const PAIRS = (seedEnKo as Array<[string, string]>).map(([en, ko]) => ({
  key: fingerprintEnglish(en),
  ko,
}));

const EXACT = new Map<string, string>();
for (const row of PAIRS) {
  if (row.key && !EXACT.has(row.key)) EXACT.set(row.key, row.ko);
}

export function lookupSeedKorean(text: string): string | undefined {
  const stripped = stripAnswerDecorations(text);
  const keys = [
    fingerprintEnglish(stripped),
    fingerprintEnglish(readableText(stripped)),
  ].filter((key, index, all) => key.length > 0 && all.indexOf(key) === index);

  for (const key of keys) {
    const hit = EXACT.get(key);
    if (hit) return hit;
  }

  let best: { len: number; ko: string } | undefined;
  for (const { key: seedKey, ko } of PAIRS) {
    if (seedKey.length < MIN_PREFIX) continue;
    for (const key of keys) {
      if (key.length < MIN_PREFIX) continue;
      const contained =
        key.startsWith(seedKey) ||
        seedKey.startsWith(key) ||
        key.includes(seedKey) ||
        seedKey.includes(key);
      if (!contained) continue;
      const len = Math.min(key.length, seedKey.length);
      if (!best || len > best.len) best = { len, ko };
    }
  }
  return best?.ko;
}
