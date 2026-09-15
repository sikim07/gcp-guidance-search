import { z } from "zod";
import { getStore } from "@/lib/db/store";
import {
  resolveTranslations,
  translateAnswer,
  translateClause,
} from "@/lib/llm/translate";
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
    const translations = await resolveTranslations(passages, {
      get: (id) => store.getTranslation(id),
      put: (id, text) => store.putTranslation(id, text),
      translate: translateClause,
    });
    let translatedAnswer: string | undefined;
    if (answer && answer.trim()) {
      const cacheKey = `answer:v3:${answer.slice(0, 80)}`;
      const cached = await store.getTranslation(cacheKey);
      if (cached) {
        translatedAnswer = cached;
      } else {
        translatedAnswer = await translateAnswer(answer);
        await store.putTranslation(cacheKey, translatedAnswer);
      }
    }
    return Response.json({ translations, translatedAnswer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "번역 요청이 올바르지 않습니다." }, { status: 400 });
    }
    return Response.json(
      { error: "지금은 번역을 할 수 없습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
