import { randomUUID } from "node:crypto";
import type { AppStore } from "@/lib/db/types";
import { chunkByClause } from "@/lib/pipeline/chunk";
import {
  detectCatalogChanges,
  detectContentRevision,
} from "@/lib/pipeline/change-detector";
import { embedTexts } from "@/lib/pipeline/embed";
import {
  fetchBytes,
  filterCatalog,
  loadSourceHtml,
  parseCatalog,
  seedFallbackCatalog,
} from "@/lib/pipeline/fetch";
import { sha256 } from "@/lib/pipeline/hasher";
import { notifyAdmin } from "@/lib/pipeline/notify";
import { extractPdfText } from "@/lib/pipeline/parse-pdf";
import { SEED_CORPUS } from "@/lib/pipeline/seed/corpus";
import { diffSections, summarizeDiff } from "@/lib/pipeline/section-diff";
import { extractKgcpText } from "@/lib/pipeline/sources/kgcp-parser";
import {
  SOURCES,
  type CatalogEntry,
  type ChangeKind,
  type ChunkRecord,
} from "@/lib/types";

export async function watchSources(
  store: AppStore,
): Promise<{ queued: number; detections: ChangeKind[] }> {
  const existing = await store.listDocuments();
  let queued = 0;
  const detections: ChangeKind[] = [];

  for (const source of SOURCES) {
    if (source === "kgcp") continue; // KGCP는 법령 별표 4로 옮김. 가이드라인 카탈로그로 다시 넣지 않는다.
    const { html, pageUrl } = await loadSourceHtml(source);
    let catalog = filterCatalog(source, parseCatalog(source, html, pageUrl));
    if (catalog.length === 0) catalog = seedFallbackCatalog(source);
    const found = detectCatalogChanges(
      catalog,
      existing.filter((d) => d.source === source),
    );
    for (const item of found) {
      detections.push(item.kind);
      if (item.kind === "vanished" && item.previous) {
        await store.upsertDocument({ ...item.previous, status: "withdrawn" });
        await store.addChangeLog({
          id: randomUUID(),
          documentId: item.previous.id,
          fromVersionId: item.previous.currentVersionId,
          toVersionId: item.previous.currentVersionId,
          changeKind: "vanished",
          summary: `${item.previous.title} 목록에서 사라짐 (철회로 표시)`,
          createdAt: new Date().toISOString(),
        });
        continue;
      }
      if (item.kind === "new" || item.kind === "unchanged") {
        await store.enqueueJob({
          id: randomUUID(),
          source,
          externalId: item.catalog.externalId,
          reason: item.kind === "new" ? "new" : "unchanged",
          status: "queued",
          attempts: 0,
          lastError: null,
          catalog: item.catalog,
        });
        queued += 1;
      }
    }
  }
  return { queued, detections };
}

export async function processNextJob(
  store: AppStore,
): Promise<{ processed: boolean; kind?: ChangeKind }> {
  const job = await store.nextJob();
  if (!job) return { processed: false };
  try {
    const result = await ingestEntry(store, job.catalog, job.reason);
    job.status = "done";
    job.attempts += 1;
    await store.updateJob(job);
    if (result.kind !== "unchanged") {
      await notifyAdmin({
        title: result.title,
        kind: result.kind,
        summary: result.summary,
      });
    }
    return { processed: true, kind: result.kind };
  } catch (error) {
    job.status = "failed";
    job.attempts += 1;
    job.lastError = error instanceof Error ? error.message : "unknown";
    await store.updateJob(job);
    throw error;
  }
}

export async function ingestEntry(
  store: AppStore,
  catalog: CatalogEntry,
  hintedKind: ChangeKind,
): Promise<{ kind: ChangeKind; title: string; summary: string }> {
  const { text, bytes } = await loadDocumentText(catalog);
  const hash = sha256(bytes);
  const existing = (await store.listDocuments()).find(
    (d) => d.externalId === catalog.externalId || d.url === catalog.url,
  );

  if (!existing) {
    await writeNewVersion(store, catalog, text, hash, "new", "신규 문서 적재");
    await store.invalidateCache();
    return { kind: "new", title: catalog.title, summary: "신규 문서 적재" };
  }

  const kind =
    hintedKind === "new"
      ? "new"
      : detectContentRevision({
          previous: existing,
          incomingDate: catalog.issuedDate,
          incomingHash: hash,
        });

  if (kind === "unchanged") {
    return { kind, title: catalog.title, summary: "변경 없음" };
  }

  const previousVersion = existing.currentVersionId
    ? await store.getVersion(existing.currentVersionId)
    : undefined;
  const previousText = previousVersion?.extractedText ?? "";
  const sectionChanges = previousText ? diffSections(previousText, text) : [];
  const summary =
    kind === "revised_date" && !sectionChanges.some((c) => c.kind !== "unchanged")
      ? "고시일/발행일만 변경 (본문 해시 동일 또는 조항 동일)"
      : summarizeDiff(sectionChanges.length ? sectionChanges : []);

  await writeNewVersion(
    store,
    catalog,
    text,
    hash,
    kind,
    summary,
    existing.id,
    existing.currentVersionId,
    sectionChanges,
  );
  await store.invalidateCache();
  return { kind, title: catalog.title, summary };
}

async function loadDocumentText(
  catalog: CatalogEntry,
): Promise<{ text: string; bytes: Buffer }> {
  const seed = SEED_CORPUS.find((s) => s.externalId === catalog.externalId);
  if (catalog.pdfUrl && process.env.USE_FIXTURE_SOURCES !== "true") {
    try {
      const bytes = await fetchBytes(catalog.pdfUrl);
      const text = await extractPdfText(bytes);
      if (text.length > 200) return { text, bytes };
    } catch {
      // fall through to seed / html
    }
  }
  if (catalog.source === "kgcp" && process.env.USE_FIXTURE_SOURCES === "true") {
    const { html } = await loadSourceHtml("kgcp");
    const text = extractKgcpText(html);
    return { text, bytes: Buffer.from(text) };
  }
  if (seed) return { text: seed.text, bytes: Buffer.from(seed.text) };
  throw new Error(`본문을 가져올 수 없습니다: ${catalog.title}`);
}

async function writeNewVersion(
  store: AppStore,
  catalog: CatalogEntry,
  text: string,
  hash: string,
  kind: ChangeKind,
  summary: string,
  existingId?: string,
  previousVersionId?: string | null,
  sectionChanges?: ReturnType<typeof diffSections>,
): Promise<void> {
  const now = new Date().toISOString();
  const documentId = existingId ?? randomUUID();
  const versionId = randomUUID();
  const clauses = chunkByClause(text, catalog.title);
  const previousChunks = existingId
    ? (await store.currentChunks()).filter((c) => c.documentId === existingId)
    : [];
  const previousBySection = new Map(previousChunks.map((c) => [c.section, c]));

  const toEmbed = clauses.filter((c) => {
    if (!sectionChanges) return true;
    const change = sectionChanges.find((s) => s.section === c.section);
    return !change || change.kind !== "unchanged";
  });
  const embeddings = await embedTexts(toEmbed.map((c) => `${c.section}\n${c.text}`));
  const embedMap = new Map(toEmbed.map((c, i) => [c.section, embeddings[i] ?? []]));

  const chunks: ChunkRecord[] = clauses.map((clause) => {
    const reused = previousBySection.get(clause.section);
    const changed = toEmbed.some((c) => c.section === clause.section);
    return {
      id: randomUUID(),
      versionId,
      documentId,
      section: clause.section,
      text: clause.text,
      embedding: changed
        ? (embedMap.get(clause.section) ?? [])
        : (reused?.embedding ?? []),
      isCurrent: true,
    };
  });

  if (!existingId) {
    await store.upsertDocument({
      id: documentId,
      source: catalog.source,
      title: catalog.title,
      url: catalog.url,
      issuedDate: catalog.issuedDate,
      fileHash: hash,
      currentVersionId: versionId,
      category: catalog.category,
      externalId: catalog.externalId,
      status: "active",
      createdAt: now,
    });
  } else {
    const existing = await store.getDocument(documentId);
    if (existing) {
      await store.upsertDocument({
        ...existing,
        title: catalog.title,
        url: catalog.url,
        issuedDate: catalog.issuedDate,
        fileHash: hash,
        currentVersionId: versionId,
        category: catalog.category,
        status: "active",
      });
    }
  }

  await store.addVersion({
    id: versionId,
    documentId,
    versionLabel: catalog.issuedDate ?? now.slice(0, 10),
    issuedDate: catalog.issuedDate,
    fileHash: hash,
    extractedText: text,
    parseStatus: "ok",
    diffSummary: summary,
    createdAt: now,
  });
  await store.replaceCurrentChunks(documentId, chunks);
  await store.addChangeLog({
    id: randomUUID(),
    documentId,
    fromVersionId: previousVersionId ?? null,
    toVersionId: versionId,
    changeKind: kind,
    summary,
    createdAt: now,
  });
}

export async function drainQueue(store: AppStore, max = 20): Promise<number> {
  let n = 0;
  for (let i = 0; i < max; i += 1) {
    const result = await processNextJob(store);
    if (!result.processed) break;
    n += 1;
  }
  return n;
}
