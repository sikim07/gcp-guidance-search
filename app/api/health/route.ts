import { VECTOR_DB_THRESHOLDS } from "@/lib/types";
import { getStore, usingSupabase } from "@/lib/db/store";

export async function GET() {
  const store = await getStore();
  const documents = await store.listDocuments();
  const chunks = await store.currentChunks();
  return Response.json({
    ok: true,
    store: usingSupabase() ? "supabase" : "local-json",
    documents: documents.length,
    chunks: chunks.length,
    pgvectorThresholds: VECTOR_DB_THRESHOLDS,
  });
}
