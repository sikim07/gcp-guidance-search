import { applyGcpKoreanTerms } from "@/lib/llm/gcp-terms";
import { publicTranslateEnToKo } from "@/lib/llm/public-translate";
import { lookupSeedKorean } from "@/lib/llm/seed-lookup";
import type { Passage } from "@/lib/types";

export function needsEnglishTranslation(passages: Passage[]): boolean {
  return passages.some((row) => row.language === "en" || row.language === "mixed");
}

export type TranslateDeps = {
  get: (chunkId: string) => Promise<string | undefined>;
  put: (chunkId: string, text: string) => Promise<void>;
  translate: (text: string) => Promise<string>;
};

export function detectPassageLanguage(text: string): Passage["language"] {
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const hangul = (text.match(/\p{Script=Hangul}/gu) ?? []).length;
  if (hangul === 0 && latin === 0) return "mixed";
  if (hangul > latin * 2) return "ko";
  if (latin > hangul * 2) return "en";
  return "mixed";
}

/**
 * Korean passages stay as-is. English/mixed passages are translated once and stored by chunk id.
 * Callers must invalidate that id when the chunk is revised.
 */
export async function resolveTranslations(
  passages: Passage[],
  deps: TranslateDeps,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    passages.map(async (passage) => {
      if (passage.language === "ko") {
        out[passage.chunkId] = passage.original;
        return;
      }
      const cached = await deps.get(passage.chunkId);
      if (cached) {
        out[passage.chunkId] = cached;
        return;
      }
      const translated = await deps.translate(passage.original);
      await deps.put(passage.chunkId, translated);
      out[passage.chunkId] = translated;
    }),
  );
  return out;
}

export const TRANSLATE_SYSTEM_PROMPT = `당신은 임상시험 규제 문서를 한국어로만 옮기는 번역기다.
규칙은 절대적이다:
1. 입력 조항을 한국어로 번역한다. 해석·요약·의견을 보태지 않는다.
2. 조항 번호, 법령명, 고유명사는 살린다.
3. 입력이 이미 한국어면 그대로 반환한다.`;

export async function haikuTranslate(text: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("no-anthropic-key");
  }
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
  const message = await client.messages.create({
    model,
    max_tokens: 1200,
    system: TRANSLATE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: text.slice(0, 4000) }],
  });
  return message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();
}

export async function openaiTranslate(text: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("no-openai-key");
  }
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: key });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4o-mini",
    temperature: 0,
    max_tokens: 1200,
    messages: [
      { role: "system", content: TRANSLATE_SYSTEM_PROMPT },
      { role: "user", content: text.slice(0, 4000) },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

export async function translateClause(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (detectPassageLanguage(trimmed) === "ko") return trimmed;

  const fromSeed = lookupSeedKorean(trimmed);
  if (fromSeed) return fromSeed;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const out = (await haikuTranslate(trimmed)).trim();
      if (out) return out;
    } catch {
      // fall through to other translators
    }
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      const out = (await openaiTranslate(trimmed)).trim();
      if (out) return out;
    } catch {
      // fall through to public machine translation
    }
  }

  const machine = await publicTranslateEnToKo(trimmed);
  return applyGcpKoreanTerms(machine);
}

/** Translate English blocks in an extractive answer; keep Korean disclaimers and citations. */
export async function translateAnswer(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (detectPassageLanguage(trimmed) === "ko") return trimmed;

  const fromSeed = lookupSeedKorean(trimmed);
  if (fromSeed) return fromSeed;

  const blocks = trimmed.split(/\n{2,}/);
  const out = await Promise.all(
    blocks.map(async (block) => {
      if (detectPassageLanguage(block) === "ko") return block;
      const cited = block.match(/^(.*)(\n\[[^\]]+\])\s*$/su);
      if (cited) {
        const body = cited[1].trim();
        return body ? `${await translateClause(body)}${cited[2]}` : cited[2].trim();
      }
      return translateClause(block);
    }),
  );
  return out.join("\n\n");
}
