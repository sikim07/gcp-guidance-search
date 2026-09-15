import { VECTOR_DB_THRESHOLDS } from "@/lib/types";
import { l2Normalize } from "@/lib/retrieval/cosine";
import { sha256 } from "@/lib/pipeline/hasher";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIM = 1536;

/**
 * Deterministic fallback used when OPENAI_API_KEY is absent (local/demo).
 * Similar token bags land in similar directions so retrieval still works without a paid call.
 */
export function mockEmbed(text: string, dim = EMBEDDING_DIM): number[] {
  const vec = new Array<number>(dim).fill(0);
  const tokens = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const token of tokens) {
    const hashed = sha256(token);
    for (let i = 0; i < 8; i += 1) {
      const slot = Number.parseInt(hashed.slice(i * 4, i * 4 + 4), 16) % dim;
      vec[slot] += 1 / (i + 1);
    }
  }
  return l2Normalize(vec);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || texts.length === 0) {
    return texts.map((t) => mockEmbed(t));
  }

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: key });
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((row) => row.embedding);
}

export function shouldConsiderPgvector(chunkCount: number, similarityMs: number): boolean {
  return chunkCount > VECTOR_DB_THRESHOLDS.chunkCount || similarityMs > VECTOR_DB_THRESHOLDS.similarityMs;
}
