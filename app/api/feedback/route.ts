import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getStore } from "@/lib/db/store";

const Body = z.object({
  searchLogId: z.string().nullable().optional(),
  query: z.string(),
  answer: z.string(),
  rating: z.enum(["up", "down"]),
  comment: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const json: unknown = await request.json();
  const body = Body.parse(json);
  const comment = body.comment?.trim() || undefined;
  const store = await getStore();
  await store.addFeedback({
    id: randomUUID(),
    searchLogId: body.searchLogId ?? null,
    query: body.query,
    answer: body.answer,
    rating: body.rating,
    comment,
    createdAt: new Date().toISOString(),
  });
  return Response.json({ ok: true });
}
