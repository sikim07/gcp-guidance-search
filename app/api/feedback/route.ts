import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getStore } from "@/lib/db/store";
import { appendFeedbackToSheet, sheetsWebhookUrl } from "@/lib/feedback/sheets";

const Body = z.object({
  searchLogId: z.string().nullable().optional(),
  query: z.string(),
  answer: z.string(),
  rating: z.enum(["up", "down"]),
  comment: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const body = Body.parse(json);
    const comment = body.comment?.trim() || undefined;
    const row = {
      id: randomUUID(),
      searchLogId: body.searchLogId ?? null,
      query: body.query,
      answer: body.answer,
      rating: body.rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    if (!sheetsWebhookUrl()) {
      if (process.env.NODE_ENV === "production") {
        return Response.json(
          { error: "의견 시트가 아직 연결되지 않았습니다." },
          { status: 503 },
        );
      }
      const store = await getStore();
      await store.addFeedback(row);
      return Response.json({ ok: true, stored: "memory" });
    }
    await appendFeedbackToSheet(row);
    const store = await getStore();
    try {
      await store.addFeedback(row);
    } catch {
      // 시트에 남았으면 메모리 저장 실패는 무시한다.
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "피드백 요청이 올바르지 않습니다." }, { status: 400 });
    }
    return Response.json(
      { error: "의견을 시트에 저장하지 못했습니다. 잠시 후 다시 보내 주세요." },
      { status: 502 },
    );
  }
}
