import { beforeAll, describe, expect, it } from "vitest";
import { emptySnapshot, type AppStore, type StoreSnapshot } from "@/lib/db/types";
import { seedStatutes, seedStore } from "@/lib/pipeline/seed/bootstrap";
import { PRESET_QUERIES } from "@/lib/search/presets";
import { searchGuidelines } from "@/lib/retrieval/search";
import type {
  ChangeLogRecord,
  ChunkRecord,
  DocumentRecord,
  DocumentVersion,
  IngestJob,
  StatuteArticle,
  StatuteRecord,
  StatuteRevision,
} from "@/lib/types";

function makeStore(initial?: Partial<StoreSnapshot>): AppStore {
  const snap: StoreSnapshot = { ...emptySnapshot(), ...initial };
  return {
    async listDocuments() {
      return snap.documents;
    },
    async getDocument(id) {
      return snap.documents.find((d) => d.id === id);
    },
    async upsertDocument(doc: DocumentRecord) {
      const idx = snap.documents.findIndex((d) => d.id === doc.id);
      if (idx >= 0) snap.documents[idx] = doc;
      else snap.documents.push(doc);
    },
    async listVersions() {
      return snap.versions;
    },
    async getVersion(id) {
      return snap.versions.find((v) => v.id === id);
    },
    async addVersion(version: DocumentVersion) {
      snap.versions.push(version);
    },
    async currentChunks() {
      return snap.chunks.filter((c) => c.isCurrent);
    },
    async replaceCurrentChunks(documentId: string, chunks: ChunkRecord[]) {
      for (const chunk of snap.chunks) {
        if (chunk.documentId === documentId) chunk.isCurrent = false;
      }
      snap.chunks.push(...chunks);
    },
    async addChunks(chunks: ChunkRecord[]) {
      snap.chunks.push(...chunks);
    },
    async addChangeLog(log: ChangeLogRecord) {
      snap.changeLogs.push(log);
    },
    async listChangeLogs() {
      return snap.changeLogs;
    },
    async addSearchLog() {},
    async listSearchLogs() {
      return [];
    },
    async addFeedback() {},
    async listFeedback() {
      return [];
    },
    async getCachedAnswer(normalized: string) {
      return snap.queryCache.find((row) => row.normalizedQuery === normalized);
    },
    async listQueryCache() {
      return snap.queryCache;
    },
    async putQueryCache() {},
    async bumpCacheHit() {},
    async invalidateCache() {
      snap.queryCache = [];
    },
    async incrementRateLimit() {
      return 1;
    },
    async enqueueJob(job: IngestJob) {
      snap.jobs.push(job);
    },
    async nextJob() {
      return snap.jobs.find((j) => j.status === "queued");
    },
    async updateJob() {},
    async listStatutes() {
      return snap.statutes;
    },
    async getStatute(id) {
      return snap.statutes.find((s) => s.id === id);
    },
    async upsertStatute(row: StatuteRecord) {
      const idx = snap.statutes.findIndex((s) => s.id === row.id);
      if (idx >= 0) snap.statutes[idx] = row;
      else snap.statutes.push(row);
    },
    async listStatuteRevisions() {
      return snap.statuteRevisions;
    },
    async addStatuteRevision(row: StatuteRevision) {
      snap.statuteRevisions.push(row);
    },
    async currentStatuteArticles() {
      return snap.statuteArticles.filter((a) => a.isCurrent);
    },
    async replaceCurrentStatuteArticles(statuteId: string, articles: StatuteArticle[]) {
      for (const article of snap.statuteArticles) {
        if (article.statuteId === statuteId) article.isCurrent = false;
      }
      snap.statuteArticles.push(...articles);
    },
    async getTranslation() {
      return undefined;
    },
    async putTranslation() {},
  };
}

const TOP1: Record<(typeof PRESET_QUERIES)[number]["id"], RegExp> = {
  "audit-trail": /5\.5\.3|Q8|Q12|자료의 처리|감사추적/,
  consent: /4\.8|대상자의 동의|시험대상자 동의|Informed Consent/,
  monitoring: /5\.18|머\.\s*모니터링|모니터링/,
  sensitive: /제23조|민감정보/,
  "device-trial": /제10조|임상시험계획/,
  "sae-clock": /7일|15일|약물이상반응|312\.32|SAE와 SUSAR/,
};

describe("preset top-1 sections", () => {
  const store = makeStore();

  beforeAll(async () => {
    await seedStore(store);
    await seedStatutes(store);
  });

  it.each(PRESET_QUERIES)("$id → $label", async (preset) => {
    const result = await searchGuidelines(store, preset.query, "search-quality");
    const top = result.passages[0];
    expect(top, `${preset.id} returned no passage`).toBeTruthy();
    expect(top?.section, `${preset.id} top-1 was ${top?.section}`).toMatch(
      TOP1[preset.id],
    );
  });
});
