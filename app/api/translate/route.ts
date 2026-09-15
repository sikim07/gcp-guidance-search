import { z } from "zod";
import { getStore } from "@/lib/db/store";
import { haikuTranslate, resolveTranslations } from "@/lib/llm/translate";
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
});

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const { passages } = Body.parse(json) as { passages: Passage[] };
    const store = await getStore();
    try {
      const translations = await resolveTranslations(passages, {
        get: (id) => store.getTranslation(id),
        put: (id, text) => store.putTranslation(id, text),
        translate: haikuTranslate,
      });
      return Response.json({ translations, missingKey: false });
    } catch (error) {
      if (error instanceof Error && error.message === "no-anthropic-key") {
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
