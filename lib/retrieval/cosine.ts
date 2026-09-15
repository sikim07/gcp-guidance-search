/**
 * Brute-force cosine similarity over in-process embeddings.
 *
 * pgvector / a dedicated vector DB is intentionally NOT used.
 * Current expected corpus is hundreds of chunks; this function is the retrieval path.
 *
 * Revisit pgvector when either condition is true:
 *   1. current chunk count exceeds 5,000
 *   2. similarity-only latency (embedding API excluded) exceeds 500ms
 *
 * See README.md and BENCHMARK.md.
 */
export function cosine(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

export function cosineFloat32(
  query: Float32Array,
  matrix: Float32Array,
  index: number,
  dim: number,
): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const offset = index * dim;
  for (let i = 0; i < dim; i += 1) {
    const x = query[i] ?? 0;
    const y = matrix[offset + i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

export type RankedChunk<T> = { item: T; score: number };

export function bruteForceTopK<T>(
  query: number[],
  items: T[],
  getEmbedding: (item: T) => number[],
  k: number,
): RankedChunk<T>[] {
  const scored: RankedChunk<T>[] = items.map((item) => ({
    item,
    score: cosine(query, getEmbedding(item)),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export function l2Normalize(values: number[]): number[] {
  let sum = 0;
  for (const v of values) sum += v * v;
  const n = Math.sqrt(sum);
  if (n === 0) return values;
  return values.map((v) => v / n);
}
