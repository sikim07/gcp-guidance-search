export const SOURCES = ["fda-ich", "fda-guidance", "mfds", "kgcp"] as const;
export type SourceId = (typeof SOURCES)[number];

export type ParseStatus = "ok" | "needs_ocr" | "failed";
export type DocumentStatus = "active" | "withdrawn";
export type ChangeKind =
  | "new"
  | "revised_date"
  | "revised_hash"
  | "revised_both"
  | "unchanged"
  | "vanished";

export type CatalogEntry = {
  source: SourceId;
  title: string;
  url: string;
  pdfUrl?: string;
  issuedDate: string | null;
  category: string;
  externalId: string;
};

export type DocumentRecord = {
  id: string;
  source: SourceId;
  title: string;
  url: string;
  issuedDate: string | null;
  fileHash: string | null;
  currentVersionId: string | null;
  category: string;
  externalId: string;
  status: DocumentStatus;
  createdAt: string;
};

export type DocumentVersion = {
  id: string;
  documentId: string;
  versionLabel: string;
  issuedDate: string | null;
  fileHash: string;
  extractedText: string;
  parseStatus: ParseStatus;
  diffSummary: string | null;
  createdAt: string;
};

export type ChunkRecord = {
  id: string;
  versionId: string;
  documentId: string;
  section: string;
  text: string;
  embedding: number[];
  isCurrent: boolean;
};

export type ChangeLogRecord = {
  id: string;
  documentId: string;
  fromVersionId: string | null;
  toVersionId: string | null;
  changeKind: ChangeKind;
  summary: string;
  createdAt: string;
};

export type SearchLogRecord = {
  id: string;
  query: string;
  normalizedQuery: string;
  ipHash: string;
  cacheHit: boolean;
  latencyMs: number;
  similarityMs: number;
  topChunkIds: string[];
  answer: string;
  createdAt: string;
};

export type FeedbackRecord = {
  id: string;
  searchLogId: string | null;
  query: string;
  answer: string;
  rating: "up" | "down";
  createdAt: string;
};

export type QueryCacheRecord = {
  queryHash: string;
  normalizedQuery: string;
  embedding: number[];
  answer: string;
  sources: AnswerSource[];
  expiresAt: string;
  hitCount: number;
};

export type AnswerSource = {
  title: string;
  section: string;
  url: string;
};

export type SearchResponse = {
  answer: string;
  sources: AnswerSource[];
  cacheHit: boolean;
  searchLogId: string;
};

export type IngestJob = {
  id: string;
  source: SourceId;
  externalId: string;
  reason: ChangeKind;
  status: "queued" | "processing" | "done" | "failed";
  attempts: number;
  lastError: string | null;
  catalog: CatalogEntry;
};

/** pgvector 전환 임계값. cosine.ts / README / BENCHMARK.md 와 동기화할 것. */
export const VECTOR_DB_THRESHOLDS = {
  chunkCount: 5000,
  similarityMs: 500,
} as const;
