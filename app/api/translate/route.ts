import { z } from "zod";
import { getStore } from "@/lib/db/store";
import { resolveTranslations, translateClause } from "@/lib/llm/translate";
import type { Passage } from "@/lib/types";

const Body = z.object({
  passages: z.array(
    z.object({
      chunkId: z.string(),
      title: z.string(),
      section: z.string(),
      url: z.string(),
      kind: z.enum(["guideline", "statute"]),
      original: z.string(),
      language: z.enum(["en", "ko", "mixed"]),
    }),
  ),
  answer: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const { passages, answer } = Body.parse(json) as {
      passages: Passage[];
      answer?: string;
    };
    const store = await getStore();
    try {
      const translations = await resolveTranslations(passages, {
        get: (id) => store.getTranslation(id),
        put: (id, text) => store.putTranslation(id, text),
        translate: translateClause,
      });
      let translatedAnswer: string | undefined;
      if (answer && answer.trim()) {
        const cached = await store.getTranslation(`answer:${answer.slice(0, 80)}`);
        if (cached) {
          translatedAnswer = cached;
        } else {
          translatedAnswer = await translateClause(answer);
          await store.putTranslation(`answer:${answer.slice(0, 80)}`, translatedAnswer);
        }
      }
      return Response.json({ translations, translatedAnswer, missingKey: false });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "no-translate-key" || error.message === "no-anthropic-key")
      ) {
        const translations = Object.fromEntries(
          passages.map((row) => [row.chunkId, row.original]),
        );
        return Response.json({ translations, missingKey: true });
      }
      throw error;
    }
  } catch {
    return Response.json({ error: "번역 요청이 올바르지 않습니다." }, { status: 400 });
  }
}
