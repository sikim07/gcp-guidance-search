import { randomUUID } from "node:crypto";
import type { AppStore } from "@/lib/db/types";
import { chunkByClause } from "@/lib/pipeline/chunk";
import { embedTexts } from "@/lib/pipeline/embed";
import { sha256 } from "@/lib/pipeline/hasher";
import { SEED_CORPUS } from "@/lib/pipeline/seed/corpus";
import { SEED_STATUTES } from "@/lib/pipeline/seed/statutes";
import { ingestParsedStatute } from "@/lib/pipeline/statute-runner";
import type { ChunkRecord, DocumentRecord, DocumentVersion } from "@/lib/types";

let seeding: Promise<void> | null = null;

export async function ensureSeeded(store: AppStore): Promise<void> {
  if (!seeding) {
    seeding = (async () => {
      const existing = await store.listDocuments();
      if (existing.length === 0) await seedStore(store);
      const statutes = await store.listStatutes();
      if (statutes.length === 0) await seedStatutes(store);
    })().finally(() => {
      seeding = null;
    });
  }
  await seeding;
}

export async function seedStatutes(store: AppStore): Promise<void> {
  for (const seed of SEED_STATUTES) {
    await ingestParsedStatute(store, {
      lawId: seed.lawId,
      mst: seed.mst,
      title: seed.title,
      shortTitle: seed.shortTitle,
      promulgatedDate: seed.promulgatedDate,
      effectiveDate: seed.effectiveDate,
      amendmentType: seed.amendmentType,
      articles: seed.articles,
      kind: "new",
    });
  }
}

export async function seedStore(store: AppStore): Promise<void> {
  const now = new Date().toISOString();
  for (const seed of SEED_CORPUS) {
    const documentId = randomUUID();
    const versionId = randomUUID();
    const clauses = chunkByClause(seed.text, seed.title);
    const embeddings = await embedTexts(clauses.map((c) => `${c.section}\n${c.text}`));
    const version: DocumentVersion = {
      id: versionId,
      documentId,
      versionLabel: seed.issuedDate,
      issuedDate: seed.issuedDate,
      fileHash: sha256(seed.text),
      extractedText: seed.text,
      parseStatus: "ok",
      diffSummary: "초기 적재 (시드 코퍼스)",
      createdAt: now,
    };
    const doc: DocumentRecord = {
      id: documentId,
      source: seed.source,
      title: seed.title,
      url: seed.url,
      issuedDate: seed.issuedDate,
      fileHash: version.fileHash,
      currentVersionId: versionId,
      category: seed.category,
      externalId: seed.externalId,
      status: "active",
      createdAt: now,
    };
    const chunks: ChunkRecord[] = clauses.map((clause, i) => ({
      id: randomUUID(),
      versionId,
      documentId,
      section: clause.section,
      text: clause.text,
      embedding: embeddings[i] ?? [],
      isCurrent: true,
    }));
    await store.upsertDocument(doc);
    await store.addVersion(version);
    await store.addChunks(chunks);
    await store.addChangeLog({
      id: randomUUID(),
      documentId,
      fromVersionId: null,
      toVersionId: versionId,
      changeKind: "new",
      summary: `${seed.title} 초기 적재`,
      createdAt: now,
    });
  }
}
