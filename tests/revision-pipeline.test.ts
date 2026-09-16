import { describe, expect, it } from "vitest";
import { detectContentRevision } from "@/lib/pipeline/change-detector";
import { ingestEntry, parseStatusForText } from "@/lib/pipeline/runner";
import { emptySnapshot, type AppStore, type StoreSnapshot } from "@/lib/db/types";
import { SEED_CORPUS } from "@/lib/pipeline/seed/corpus";
import { sha256 } from "@/lib/pipeline/hasher";
import type {
  ChangeLogRecord,
  ChunkRecord,
  DocumentRecord,
  DocumentVersion,
  IngestJob,
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
    async getCachedAnswer() {
      return undefined;
    },
    async listQueryCache() {
      return [];
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
      return snap.statutes ?? [];
    },
    async getStatute(id) {
      return (snap.statutes ?? []).find((s) => s.id === id);
    },
    async upsertStatute(row) {
      snap.statutes ??= [];
      const idx = snap.statutes.findIndex((s) => s.id === row.id);
      if (idx >= 0) snap.statutes[idx] = row;
      else snap.statutes.push(row);
    },
    async listStatuteRevisions() {
      return snap.statuteRevisions ?? [];
    },
    async addStatuteRevision(row) {
      snap.statuteRevisions ??= [];
      snap.statuteRevisions.push(row);
    },
    async currentStatuteArticles() {
      return (snap.statuteArticles ?? []).filter((a) => a.isCurrent);
    },
    async replaceCurrentStatuteArticles(statuteId, articles) {
      snap.statuteArticles ??= [];
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

const part11 = SEED_CORPUS.find((s) => s.externalId === "fda-guidance:75414")!;

describe("revision pipeline integration", () => {
  it("date-only / hash-only / unchanged cases", () => {
    const previous: DocumentRecord = {
      id: "doc-part11",
      source: part11.source,
      title: part11.title,
      url: part11.url,
      issuedDate: part11.issuedDate,
      fileHash: sha256(part11.text),
      currentVersionId: "v1",
      category: part11.category,
      externalId: part11.externalId,
      status: "active",
      createdAt: "2020-01-01T00:00:00.000Z",
    };
    expect(
      detectContentRevision({
        previous,
        incomingDate: "2024-01-01",
        incomingHash: previous.fileHash!,
      }),
    ).toBe("revised_date");
    expect(
      detectContentRevision({
        previous,
        incomingDate: part11.issuedDate,
        incomingHash: sha256(part11.text + "\nnew paragraph"),
      }),
    ).toBe("revised_hash");
    expect(
      detectContentRevision({
        previous,
        incomingDate: part11.issuedDate,
        incomingHash: previous.fileHash!,
      }),
    ).toBe("unchanged");
  });

  it("ingest of an identical seed document records unchanged", async () => {
    process.env.USE_FIXTURE_SOURCES = "true";
    const store = makeStore();
    const first = await ingestEntry(
      store,
      {
        source: part11.source,
        title: part11.title,
        url: part11.url,
        pdfUrl: part11.pdfUrl,
        issuedDate: part11.issuedDate,
        category: part11.category,
        externalId: part11.externalId,
      },
      "new",
    );
    expect(first.kind).toBe("new");
    const second = await ingestEntry(
      store,
      {
        source: part11.source,
        title: part11.title,
        url: part11.url,
        pdfUrl: part11.pdfUrl,
        issuedDate: part11.issuedDate,
        category: part11.category,
        externalId: part11.externalId,
      },
      "unchanged",
    );
    expect(second.kind).toBe("unchanged");
  });

  it("marks empty PDF extracts as needing OCR", () => {
    expect(parseStatusForText("")).toBe("needs_ocr");
    expect(parseStatusForText("   \n\t")).toBe("needs_ocr");
    expect(parseStatusForText("Q8. Audit trails capture who, when, and why.")).toBe("ok");
  });
});
