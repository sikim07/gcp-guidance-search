import { randomUUID } from "node:crypto";
import type { AppStore } from "@/lib/db/types";
import { chunkByClause } from "@/lib/pipeline/chunk";
import { embedTexts } from "@/lib/pipeline/embed";
import { sha256 } from "@/lib/pipeline/hasher";
import { SEED_CORPUS, type SeedDoc } from "@/lib/pipeline/seed/corpus";
import { SEED_STATUTES } from "@/lib/pipeline/seed/statutes";
import { ingestParsedStatute } from "@/lib/pipeline/statute-runner";
import type { ChunkRecord, DocumentRecord, DocumentVersion } from "@/lib/types";

let seeding: Promise<void> | null = null;

export function isShortExcerptUpgrade(currentCount: number, nextCount: number): boolean {
  return (
    currentCount > 0 &&
    currentCount < 40 &&
    nextCount >= 80 &&
    nextCount >= currentCount * 3
  );
}

export function seedNeedsRefresh(opts: {
  fileHash: string | null;
  seedHash: string;
  currentSections: string[];
  nextSections: string[];
}): boolean {
  if (opts.fileHash === opts.seedHash) {
    if (opts.currentSections.length !== opts.nextSections.length) return true;
    return opts.currentSections.some((section, i) => section !== opts.nextSections[i]);
  }
  // 발췌 시드를 전문 시드로 바꿀 때만 덮는다. PDF 적재본(청크가 이미 많음)은 유지.
  return isShortExcerptUpgrade(opts.currentSections.length, opts.nextSections.length);
}

export async function ensureSeeded(store: AppStore): Promise<void> {
  if (!seeding) {
    seeding = (async () => {
      const existing = await store.listDocuments();
      const byExternal = new Map(existing.map((row) => [row.externalId, row]));
      if (existing.length === 0) {
        await seedStore(store);
      } else {
        const currentChunks = await store.currentChunks();
        for (const seed of SEED_CORPUS) {
          const have = byExternal.get(seed.externalId);
          if (!have) {
            await seedOneDocument(store, seed);
            continue;
          }
          const next = chunkByClause(seed.text, seed.title);
          const currentSections = currentChunks
            .filter((chunk) => chunk.documentId === have.id)
            .map((chunk) => chunk.section);
          if (
            seedNeedsRefresh({
              fileHash: have.fileHash,
              seedHash: sha256(seed.text),
              currentSections,
              nextSections: next.map((clause) => clause.section),
            })
          ) {
            await refreshSeedDocument(store, have, seed);
          }
        }
      }
      const statutes = await store.listStatutes();
      if (statutes.length === 0) await seedStatutes(store);
      else await refreshSeedStatutes(store);
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

async function refreshSeedStatutes(store: AppStore): Promise<void> {
  const seed = SEED_STATUTES.find((row) => row.lawId === "011794");
  const annex = seed?.articles.find((row) => row.kind === "annex");
  if (!seed || !annex) return;
  const existing = (await store.listStatutes()).find((row) => row.lawId === seed.lawId);
  if (!existing) {
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
    return;
  }
  const currentAnnex = (await store.currentStatuteArticles()).filter(
    (row) => row.statuteId === existing.id && row.kind === "annex",
  );
  const next = chunkByClause(annex.text, annex.section);
  if (!isShortExcerptUpgrade(currentAnnex.length, next.length)) return;
  await ingestParsedStatute(store, {
    existing,
    lawId: seed.lawId,
    mst: seed.mst,
    title: seed.title,
    shortTitle: seed.shortTitle,
    promulgatedDate: seed.promulgatedDate,
    effectiveDate: seed.effectiveDate,
    amendmentType: seed.amendmentType,
    articles: seed.articles,
    kind: "revised_hash",
  });
}

function buildChunks(
  seed: SeedDoc,
  documentId: string,
  versionId: string,
  embeddings: number[][],
): ChunkRecord[] {
  const clauses = chunkByClause(seed.text, seed.title);
  return clauses.map((clause, i) => ({
    id: randomUUID(),
    versionId,
    documentId,
    section: clause.section,
    text: clause.text,
    embedding: embeddings[i] ?? [],
    isCurrent: true,
  }));
}

export async function seedOneDocument(store: AppStore, seed: SeedDoc): Promise<void> {
  const now = new Date().toISOString();
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
    parseStatus: seed.text.trim().length < 40 ? "needs_ocr" : "ok",
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
  await store.upsertDocument(doc);
  await store.addVersion(version);
  await store.addChunks(buildChunks(seed, documentId, versionId, embeddings));
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

export async function refreshSeedDocument(
  store: AppStore,
  existing: DocumentRecord,
  seed: SeedDoc,
): Promise<void> {
  const now = new Date().toISOString();
  const versionId = randomUUID();
  const clauses = chunkByClause(seed.text, seed.title);
  const embeddings = await embedTexts(clauses.map((c) => `${c.section}\n${c.text}`));
  const hash = sha256(seed.text);
  await store.upsertDocument({
    ...existing,
    title: seed.title,
    url: seed.url,
    issuedDate: seed.issuedDate,
    fileHash: hash,
    currentVersionId: versionId,
    category: seed.category,
    status: "active",
  });
  await store.addVersion({
    id: versionId,
    documentId: existing.id,
    versionLabel: seed.issuedDate,
    issuedDate: seed.issuedDate,
    fileHash: hash,
    extractedText: seed.text,
    parseStatus: seed.text.trim().length < 40 ? "needs_ocr" : "ok",
    diffSummary: "검색에 쓰는 조항 경계를 다시 맞췄습니다. 공식 개정은 아닙니다.",
    createdAt: now,
  });
  await store.replaceCurrentChunks(
    existing.id,
    buildChunks(seed, existing.id, versionId, embeddings),
  );
  await store.addChangeLog({
    id: randomUUID(),
    documentId: existing.id,
    fromVersionId: existing.currentVersionId,
    toVersionId: versionId,
    changeKind: "revised_hash",
    summary: `${seed.title} 검색에 쓰는 조항 경계를 다시 맞췄습니다. 공식 개정은 아닙니다.`,
    createdAt: now,
  });
  await store.invalidateCache();
}

export async function seedStore(store: AppStore): Promise<void> {
  for (const seed of SEED_CORPUS) {
    await seedOneDocument(store, seed);
  }
}
