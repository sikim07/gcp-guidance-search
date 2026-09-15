import type {
  ChangeLogRecord,
  ChunkRecord,
  DocumentRecord,
  DocumentVersion,
  FeedbackRecord,
  IngestJob,
  QueryCacheRecord,
  SearchLogRecord,
} from "@/lib/types";

export type StoreSnapshot = {
  documents: DocumentRecord[];
  versions: DocumentVersion[];
  chunks: ChunkRecord[];
  changeLogs: ChangeLogRecord[];
  searchLogs: SearchLogRecord[];
  feedback: FeedbackRecord[];
  queryCache: QueryCacheRecord[];
  jobs: IngestJob[];
  rateLimits: Record<string, { day: string; count: number }>;
};

export interface AppStore {
  listDocuments(): Promise<DocumentRecord[]>;
  getDocument(id: string): Promise<DocumentRecord | undefined>;
  upsertDocument(doc: DocumentRecord): Promise<void>;
  listVersions(documentId: string): Promise<DocumentVersion[]>;
  getVersion(id: string): Promise<DocumentVersion | undefined>;
  addVersion(version: DocumentVersion): Promise<void>;
  currentChunks(): Promise<ChunkRecord[]>;
  replaceCurrentChunks(documentId: string, chunks: ChunkRecord[]): Promise<void>;
  addChunks(chunks: ChunkRecord[]): Promise<void>;
  addChangeLog(log: ChangeLogRecord): Promise<void>;
  listChangeLogs(): Promise<ChangeLogRecord[]>;
  addSearchLog(log: SearchLogRecord): Promise<void>;
  listSearchLogs(): Promise<SearchLogRecord[]>;
  addFeedback(row: FeedbackRecord): Promise<void>;
  listFeedback(): Promise<FeedbackRecord[]>;
  getCachedAnswer(normalizedQuery: string): Promise<QueryCacheRecord | undefined>;
  listQueryCache(): Promise<QueryCacheRecord[]>;
  putQueryCache(row: QueryCacheRecord): Promise<void>;
  bumpCacheHit(queryHash: string): Promise<void>;
  invalidateCache(): Promise<void>;
  incrementRateLimit(bucket: string, day: string): Promise<number>;
  enqueueJob(job: IngestJob): Promise<void>;
  nextJob(): Promise<IngestJob | undefined>;
  updateJob(job: IngestJob): Promise<void>;
}

export function emptySnapshot(): StoreSnapshot {
  return {
    documents: [],
    versions: [],
    chunks: [],
    changeLogs: [],
    searchLogs: [],
    feedback: [],
    queryCache: [],
    jobs: [],
    rateLimits: {},
  };
}
