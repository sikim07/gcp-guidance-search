import { describe, expect, it } from "vitest";
import { searchGuidelines } from "@/lib/retrieval/search";
import { emptySnapshot, type AppStore, type StoreSnapshot } from "@/lib/db/types";
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
import { mockEmbed } from "@/lib/pipeline/embed";

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

describe("search union of guidelines and statutes", () => {
  it("returns a statute source badge for KGCP annex hits and skips withdrawn KGCP documents", async () => {
    const guidelineText =
      "Part 11 electronic records require an audit trail of data changes.";
    const statuteText =
      "임상시험을 하려는 자는 별표 4의 의약품 임상시험 관리기준을 지켜야 한다. 시험대상자의 권리와 안전을 우선한다.";
    const store = makeStore({
      documents: [
        {
          id: "doc-g",
          source: "fda-guidance",
          title: "Part 11 Scope and Application",
          url: "https://www.fda.gov/media/75414/download",
          issuedDate: "2003-08-01",
          fileHash: "x",
          currentVersionId: "v1",
          category: "Part 11",
          externalId: "fda-guidance:75414",
          status: "active",
          createdAt: "2020-01-01T00:00:00.000Z",
        },
        {
          id: "doc-kgcp",
          source: "kgcp",
          title: "old kgcp seed",
          url: "https://www.law.go.kr/법령/의약품등의안전에관한규칙/별표4",
          issuedDate: "2025-02-21",
          fileHash: "y",
          currentVersionId: "v-k",
          category: "법령 / KGCP",
          externalId: "kgcp:011794:annex-4",
          status: "withdrawn",
          createdAt: "2020-01-01T00:00:00.000Z",
        },
      ],
      chunks: [
        {
          id: "c-g",
          versionId: "v1",
          documentId: "doc-g",
          section: "Part 11",
          text: guidelineText,
          embedding: mockEmbed(guidelineText),
          isCurrent: true,
        },
        {
          id: "c-k",
          versionId: "v-k",
          documentId: "doc-kgcp",
          section: "제1호",
          text: "이 기준은 의약품 임상시험을 과학적이고 윤리적으로 실시하기 위한 기준이다.",
          embedding: mockEmbed(
            "이 기준은 의약품 임상시험을 과학적이고 윤리적으로 실시하기 위한 기준이다.",
          ),
          isCurrent: true,
        },
      ],
      statutes: [
        {
          id: "st-rule",
          lawId: "011794",
          title: "의약품 등의 안전에 관한 규칙",
          shortTitle: "의약품 등의 안전에 관한 규칙",
          url: "https://www.law.go.kr/법령/의약품등의안전에관한규칙",
          currentMst: "284019",
          promulgatedDate: "2026-03-05",
          effectiveDate: "2026-03-05",
          amendmentType: "일부개정",
          currentRevisionId: "rev-r",
          status: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      statuteArticles: [
        {
          id: "art-30",
          statuteId: "st-rule",
          revisionId: "rev-r",
          articleKey: "0030001",
          section: "제30조(임상시험의 실시 기준 등)",
          text: statuteText,
          embedding: mockEmbed(statuteText),
          isCurrent: true,
          kind: "article",
        },
      ],
    });

    const result = await searchGuidelines(
      store,
      "임상시험 관리기준에서 시험대상자 권리는?",
      "ip",
    );
    expect(result.sources.some((s) => s.kind === "statute")).toBe(true);
    expect(result.sources.some((s) => s.title === "old kgcp seed")).toBe(false);
    expect(result.answer).toMatch(/임상시험|별표 4|시험대상자/);
  });

  it("ignores cached answers that were stored before passages existed", async () => {
    const statuteText =
      "임상시험을 하려는 자는 별표 4의 의약품 임상시험 관리기준을 지켜야 한다. 시험대상자의 권리와 안전을 우선한다.";
    const query = "임상시험 관리기준에서 시험대상자 권리는?";
    const store = makeStore({
      statutes: [
        {
          id: "st-rule",
          lawId: "011794",
          title: "의약품 등의 안전에 관한 규칙",
          shortTitle: "의약품 등의 안전에 관한 규칙",
          url: "https://www.law.go.kr/법령/의약품등의안전에관한규칙",
          currentMst: "284019",
          promulgatedDate: "2026-03-05",
          effectiveDate: "2026-03-05",
          amendmentType: "일부개정",
          currentRevisionId: "rev-r",
          status: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      statuteArticles: [
        {
          id: "art-30",
          statuteId: "st-rule",
          revisionId: "rev-r",
          articleKey: "0030001",
          section: "제30조(임상시험의 실시 기준 등)",
          text: statuteText,
          embedding: mockEmbed(statuteText),
          isCurrent: true,
          kind: "article",
        },
      ],
      queryCache: [
        {
          queryHash: "legacy",
          normalizedQuery: query,
          embedding: [],
          answer: "cached without passages",
          sources: [
            {
              title: "의약품 등의 안전에 관한 규칙",
              section: "제30조",
              url: "https://www.law.go.kr",
              kind: "statute",
            },
          ],
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          hitCount: 3,
        },
      ],
    });

    const result = await searchGuidelines(store, query, "ip");
    expect(result.cacheHit).toBe(false);
    expect(result.passages.length).toBeGreaterThan(0);
    expect(result.answer).not.toBe("cached without passages");
  });
});
