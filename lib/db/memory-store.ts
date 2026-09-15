import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ChangeLogRecord,
  ChunkRecord,
  DocumentRecord,
  DocumentVersion,
  FeedbackRecord,
  IngestJob,
  QueryCacheRecord,
  SearchLogRecord,
  StatuteArticle,
  StatuteRecord,
  StatuteRevision,
} from "@/lib/types";
import { emptySnapshot, type AppStore, type StoreSnapshot } from "@/lib/db/types";

const STORE_PATH = path.join(process.cwd(), ".data", "store.json");

type GlobalStore = {
  __gcpStore?: StoreSnapshot;
  __gcpStoreLoaded?: boolean;
};

const g = globalThis as GlobalStore;

async function load(): Promise<StoreSnapshot> {
  if (g.__gcpStore && g.__gcpStoreLoaded) {
    g.__gcpStore = migrateSnapshot(g.__gcpStore);
    return g.__gcpStore;
  }
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    g.__gcpStore = migrateSnapshot(JSON.parse(raw) as StoreSnapshot);
  } catch {
    g.__gcpStore = emptySnapshot();
  }
  g.__gcpStoreLoaded = true;
  return g.__gcpStore;
}

function migrateSnapshot(snap: StoreSnapshot): StoreSnapshot {
  return {
    ...emptySnapshot(),
    ...snap,
    statutes: snap.statutes ?? [],
    statuteRevisions: snap.statuteRevisions ?? [],
    statuteArticles: snap.statuteArticles ?? [],
    translations: snap.translations ?? {},
  };
}

async function persist(snapshot: StoreSnapshot): Promise<void> {
  g.__gcpStore = snapshot;
  g.__gcpStoreLoaded = true;
  try {
    await mkdir(path.dirname(STORE_PATH), { recursive: true });
    await writeFile(STORE_PATH, JSON.stringify(snapshot, null, 2), "utf8");
  } catch {
    // Vercel 등 읽기 전용 파일시스템에서는 메모리만 사용
  }
}

export const memoryStore: AppStore = {
  async listDocuments() {
    return (await load()).documents
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getDocument(id) {
    return (await load()).documents.find((d) => d.id === id);
  },
  async upsertDocument(doc: DocumentRecord) {
    const snap = await load();
    const idx = snap.documents.findIndex((d) => d.id === doc.id);
    if (idx >= 0) snap.documents[idx] = doc;
    else snap.documents.push(doc);
    await persist(snap);
  },
  async listVersions(documentId) {
    return (await load()).versions
      .filter((v) => v.documentId === documentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getVersion(id) {
    return (await load()).versions.find((v) => v.id === id);
  },
  async addVersion(version: DocumentVersion) {
    const snap = await load();
    snap.versions.push(version);
    await persist(snap);
  },
  async currentChunks() {
    return (await load()).chunks.filter((c) => c.isCurrent);
  },
  async replaceCurrentChunks(documentId: string, chunks: ChunkRecord[]) {
    const snap = await load();
    for (const chunk of snap.chunks) {
      if (chunk.documentId === documentId) chunk.isCurrent = false;
    }
    snap.chunks.push(...chunks);
    await persist(snap);
  },
  async addChunks(chunks: ChunkRecord[]) {
    const snap = await load();
    snap.chunks.push(...chunks);
    await persist(snap);
  },
  async addChangeLog(log: ChangeLogRecord) {
    const snap = await load();
    snap.changeLogs.unshift(log);
    await persist(snap);
  },
  async listChangeLogs() {
    return (await load()).changeLogs
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async addSearchLog(log: SearchLogRecord) {
    const snap = await load();
    snap.searchLogs.unshift(log);
    await persist(snap);
  },
  async listSearchLogs() {
    return (await load()).searchLogs;
  },
  async addFeedback(row: FeedbackRecord) {
    const snap = await load();
    snap.feedback.unshift(row);
    await persist(snap);
  },
  async listFeedback() {
    return (await load()).feedback;
  },
  async getCachedAnswer(normalizedQuery: string) {
    const snap = await load();
    return snap.queryCache.find((c) => c.normalizedQuery === normalizedQuery);
  },
  async listQueryCache() {
    return (await load()).queryCache;
  },
  async putQueryCache(row: QueryCacheRecord) {
    const snap = await load();
    snap.queryCache = snap.queryCache.filter((c) => c.queryHash !== row.queryHash);
    snap.queryCache.push(row);
    await persist(snap);
  },
  async bumpCacheHit(queryHash: string) {
    const snap = await load();
    const row = snap.queryCache.find((c) => c.queryHash === queryHash);
    if (row) row.hitCount += 1;
    await persist(snap);
  },
  async invalidateCache() {
    const snap = await load();
    snap.queryCache = [];
    snap.translations = {};
    await persist(snap);
  },
  async incrementRateLimit(bucket: string, day: string) {
    const snap = await load();
    const key = `${bucket}:${day}`;
    const prev = snap.rateLimits[key];
    const count = (prev?.day === day ? prev.count : 0) + 1;
    snap.rateLimits[key] = { day, count };
    await persist(snap);
    return count;
  },
  async enqueueJob(job: IngestJob) {
    const snap = await load();
    snap.jobs.push(job);
    await persist(snap);
  },
  async nextJob() {
    const snap = await load();
    const job = snap.jobs.find((j) => j.status === "queued");
    if (!job) return undefined;
    job.status = "processing";
    await persist(snap);
    return job;
  },
  async updateJob(job: IngestJob) {
    const snap = await load();
    const idx = snap.jobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) snap.jobs[idx] = job;
    await persist(snap);
  },
  async listStatutes() {
    return (await load()).statutes
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, "ko"));
  },
  async getStatute(id) {
    return (await load()).statutes.find((row) => row.id === id);
  },
  async upsertStatute(row: StatuteRecord) {
    const snap = await load();
    const idx = snap.statutes.findIndex((item) => item.id === row.id);
    if (idx >= 0) snap.statutes[idx] = row;
    else snap.statutes.push(row);
    await persist(snap);
  },
  async listStatuteRevisions(statuteId) {
    return (await load()).statuteRevisions
      .filter((row) => !statuteId || row.statuteId === statuteId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async addStatuteRevision(row: StatuteRevision) {
    const snap = await load();
    snap.statuteRevisions.push(row);
    await persist(snap);
  },
  async currentStatuteArticles() {
    return (await load()).statuteArticles.filter((row) => row.isCurrent);
  },
  async replaceCurrentStatuteArticles(statuteId: string, articles: StatuteArticle[]) {
    const snap = await load();
    for (const article of snap.statuteArticles) {
      if (article.statuteId === statuteId) article.isCurrent = false;
    }
    snap.statuteArticles.push(...articles);
    await persist(snap);
  },
  async getTranslation(chunkId) {
    return (await load()).translations[chunkId];
  },
  async putTranslation(chunkId, text) {
    const snap = await load();
    snap.translations[chunkId] = text;
    await persist(snap);
  },
};
