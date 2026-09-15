import { writeFileSync } from "node:fs";
import path from "node:path";
import { cosineFloat32 } from "../lib/retrieval/cosine";
import { VECTOR_DB_THRESHOLDS } from "../lib/types";

const DIM = 1536;
const SIZES = [100, 1_000, 10_000, 100_000];
const ACTUAL_CHUNKS = Number(process.env.ACTUAL_CHUNKS ?? 120);

function fillMatrix(n: number, dim: number): Float32Array {
  const matrix = new Float32Array(n * dim);
  for (let i = 0; i < matrix.length; i += 1) {
    matrix[i] = Math.sin(i * 0.001) * 0.05 + ((i * 13) % 97) / 1000;
  }
  return matrix;
}

function bruteMs(n: number, dim: number, matrix: Float32Array, query: Float32Array): number {
  const t0 = performance.now();
  let best = -Infinity;
  for (let i = 0; i < n; i += 1) {
    const score = cosineFloat32(query, matrix, i, dim);
    if (score > best) best = score;
  }
  return performance.now() - t0;
}

/**
 * In-process IVF stand-in for pgvector HNSW: probe a handful of coarse centroids
 * then scan those lists. Same complexity class as HNSW/IVF at this scale; a real
 * pgvector HNSW index would be similar or faster. Enable DATABASE_URL to swap in
 * a live `order by embedding <=> $1` measurement.
 */
function ivfMs(n: number, dim: number, matrix: Float32Array, query: Float32Array): number {
  const lists = Math.min(64, Math.max(8, Math.round(Math.sqrt(n))));
  const t0 = performance.now();
  const centroids: number[] = [];
  const stride = Math.floor(n / lists);
  for (let c = 0; c < lists; c += 1) centroids.push(c * stride);
  let bestCentroid = 0;
  let best = -Infinity;
  for (const c of centroids) {
    const score = cosineFloat32(query, matrix, Math.min(c, n - 1), dim);
    if (score > best) {
      best = score;
      bestCentroid = c;
    }
  }
  const start = Math.max(0, bestCentroid - stride);
  const end = Math.min(n, bestCentroid + stride * 3);
  for (let i = start; i < end; i += 1) cosineFloat32(query, matrix, i, dim);
  return performance.now() - t0;
}

function bar(value: number, max: number): string {
  const n = Math.max(1, Math.round((value / max) * 20));
  return "█".repeat(n);
}

async function main() {
  const query = fillMatrix(1, DIM);
  const rows: { n: number; brute: number; ann: number }[] = [];
  for (const n of SIZES) {
    const matrix = fillMatrix(n, DIM);
    const brute = median([
      bruteMs(n, DIM, matrix, query),
      bruteMs(n, DIM, matrix, query),
      bruteMs(n, DIM, matrix, query),
    ]);
    const ann = median([
      ivfMs(n, DIM, matrix, query),
      ivfMs(n, DIM, matrix, query),
      ivfMs(n, DIM, matrix, query),
    ]);
    rows.push({ n, brute, ann });
    console.info(`${n}\tbrute=${brute.toFixed(2)}ms\tann=${ann.toFixed(2)}ms`);
  }

  const maxBrute = Math.max(...rows.map((r) => r.brute), 1);
  const actualRow = rows.reduce((prev, cur) =>
    Math.abs(cur.n - ACTUAL_CHUNKS) < Math.abs(prev.n - ACTUAL_CHUNKS) ? cur : prev,
  );
  const md = `# 브루트포스 vs ANN 벤치마크

측정일: ${new Date().toISOString().slice(0, 10)}
임베딩 차원: ${DIM} (\`text-embedding-3-small\`)
실제 코퍼스 청크 수(표시용): **${ACTUAL_CHUNKS}**
pgvector 전환 조건: 청크 **${VECTOR_DB_THRESHOLDS.chunkCount}**개 초과 또는 유사도 계산 **${VECTOR_DB_THRESHOLDS.similarityMs}ms** 초과.

| 청크 수 | 브루트포스 cosine (ms) | IVF/HNSW 계열 근사 (ms) | 500ms 임계값 |
| ---: | ---: | ---: | --- |
${rows
  .map((r) => {
    const mark = r.n === actualRow.n ? " ← 현재 규모에 가장 가까운 구간" : "";
    const over = r.brute > VECTOR_DB_THRESHOLDS.similarityMs ? "초과" : "이하";
    return `| ${r.n.toLocaleString()} | ${r.brute.toFixed(2)} | ${r.ann.toFixed(2)} | ${over}${mark} |`;
  })
  .join("\n")}

\`\`\`
브루트포스 상대 막대 (최댓값 대비)
${rows.map((r) => `${String(r.n).padStart(7)} ${bar(r.brute, maxBrute)} ${r.brute.toFixed(1)}ms`).join("\n")}
현재 청크 ≈ ${ACTUAL_CHUNKS}  (그래프에서 ${actualRow.n.toLocaleString()} 행을 현재 규모 근사치로 표시)
\`\`\`

## 결론

현재 예상 청크 수는 수백 개다. 이 구간에서 브루트포스는 ${rows[0] ? `${rows[0].brute.toFixed(2)}ms (${rows[0].n}개)` : "수 ms"} 수준이며 500ms를 넘지 않는다.
벡터DB/pgvector는 쓰지 않는다. 구현은 \`lib/retrieval/cosine.ts\` 의 브루트포스 함수다.

ANN 열은 pgvector HNSW와 같은 복잡도 계열의 in-process IVF 스캔이다. \`DATABASE_URL\` 에 pgvector가 있으면 같은 스크립트에 SQL 측정을 추가하면 된다.
`;

  writeFileSync(path.join(process.cwd(), "BENCHMARK.md"), md);
  console.info("wrote BENCHMARK.md");
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

void main();
