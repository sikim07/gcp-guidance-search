import { randomUUID } from "node:crypto";
import type { AppStore } from "@/lib/db/types";
import { chunkByClause } from "@/lib/pipeline/chunk";
import { embedTexts } from "@/lib/pipeline/embed";
import { fetchLawBody, fetchLawSearch, getLawOc } from "@/lib/pipeline/law-client";
import { detectStatuteRevision } from "@/lib/pipeline/statute-detector";
import {
  articlesFromLawBody,
  pickExactLaw,
  publicLawUrl,
  WATCHED_STATUTES,
  type ParsedArticle,
} from "@/lib/pipeline/sources/law-parser";
import type { ChangeKind, StatuteArticle, StatuteRecord } from "@/lib/types";
import { summarizeDiff, type SectionChange } from "@/lib/pipeline/section-diff";

export async function watchStatutes(
  store: AppStore,
): Promise<{
  checked: number;
  ingested: number;
  skipped: boolean;
  ingestedIds: string[];
}> {
  if (!getLawOc()) {
    return { checked: 0, ingested: 0, skipped: true, ingestedIds: [] };
  }

  let ingested = 0;
  const ingestedIds: string[] = [];
  // Vercel cron 제한: 본문 JSON이 큰 법령(규칙)은 한 번에 하나만 받는다.
  const maxBodies = Number.parseInt(process.env.LAW_MAX_BODIES_PER_WATCH ?? "1", 10);
  for (const watched of WATCHED_STATUTES) {
    const list = await fetchLawSearch(watched.query);
    const hit = pickExactLaw(list, watched.exactTitle);
    if (!hit) continue;
    const existing = (await store.listStatutes()).find((row) => row.lawId === hit.lawId);
    const kind = detectStatuteRevision({
      previous: existing,
      incoming: {
        mst: hit.mst,
        promulgatedDate: hit.promulgatedDate,
        effectiveDate: hit.effectiveDate,
        amendmentType: hit.amendmentType,
      },
    });
    if (kind === "unchanged") continue;
    const body = await fetchLawBody(hit.lawId);
    const parsed = articlesFromLawBody(body, {
      includeAnnexTitle: "annexTitle" in watched ? watched.annexTitle : undefined,
    });
    const statuteId = await ingestParsedStatute(store, {
      existing,
      lawId: hit.lawId,
      mst: hit.mst,
      title: hit.title,
      shortTitle: watched.shortTitle,
      promulgatedDate: hit.promulgatedDate,
      effectiveDate: hit.effectiveDate,
      amendmentType: hit.amendmentType,
      articles: parsed,
      kind,
    });
    ingested += 1;
    ingestedIds.push(statuteId);
    if (ingested >= maxBodies) break;
  }
  return { checked: WATCHED_STATUTES.length, ingested, skipped: false, ingestedIds };
}

export async function ingestParsedStatute(
  store: AppStore,
  input: {
    existing?: StatuteRecord;
    lawId: string;
    mst: string;
    title: string;
    shortTitle: string;
    promulgatedDate: string | null;
    effectiveDate: string | null;
    amendmentType: string | null;
    articles: ParsedArticle[];
    kind: ChangeKind;
  },
): Promise<string> {
  const now = new Date().toISOString();
  const statuteId = input.existing?.id ?? randomUUID();
  const revisionId = randomUUID();
  const expanded = expandArticles(input.articles);
  const previousArticles = input.existing
    ? (await store.currentStatuteArticles()).filter((row) => row.statuteId === statuteId)
    : [];
  const previousByKey = new Map(previousArticles.map((row) => [row.articleKey, row]));
  const changes: SectionChange[] = diffArticles(previousArticles, expanded);
  const toEmbed = expanded.filter((article) => {
    if (!input.existing) return true;
    const change = changes.find((row) => row.section === article.articleKey);
    return !change || change.kind !== "unchanged";
  });
  const embeddings = await embedTexts(
    toEmbed.map((article) => `${article.section}\n${article.text}`),
  );
  const embedMap = new Map(
    toEmbed.map((article, index) => [article.articleKey, embeddings[index] ?? []]),
  );

  const rows: StatuteArticle[] = expanded.map((article) => {
    const reused = previousByKey.get(article.articleKey);
    const changed = toEmbed.some((row) => row.articleKey === article.articleKey);
    return {
      id: randomUUID(),
      statuteId,
      revisionId,
      articleKey: article.articleKey,
      section: article.section,
      text: article.text,
      embedding: changed
        ? (embedMap.get(article.articleKey) ?? [])
        : (reused?.embedding ?? []),
      isCurrent: true,
      kind: article.kind,
    };
  });

  const summary =
    input.kind === "new"
      ? `${input.title} 초기 적재 (MST ${input.mst})`
      : `${input.amendmentType ?? "개정"} · 공포 ${input.promulgatedDate ?? "미상"} · 시행 ${input.effectiveDate ?? "미상"} · MST ${input.existing?.currentMst} → ${input.mst}. ${summarizeDiff(changes)}`;

  const record: StatuteRecord = {
    id: statuteId,
    lawId: input.lawId,
    title: input.title,
    shortTitle: input.shortTitle,
    url: publicLawUrl(input.title),
    currentMst: input.mst,
    promulgatedDate: input.promulgatedDate,
    effectiveDate: input.effectiveDate,
    amendmentType: input.amendmentType,
    currentRevisionId: revisionId,
    status: "active",
    createdAt: input.existing?.createdAt ?? now,
  };
  await store.upsertStatute(record);
  await store.addStatuteRevision({
    id: revisionId,
    statuteId,
    mst: input.mst,
    promulgatedDate: input.promulgatedDate,
    effectiveDate: input.effectiveDate,
    amendmentType: input.amendmentType,
    diffSummary: summary,
    createdAt: now,
  });
  await store.replaceCurrentStatuteArticles(statuteId, rows);
  await store.addChangeLog({
    id: randomUUID(),
    documentId: statuteId,
    entityKind: "statute",
    fromVersionId: input.existing?.currentRevisionId ?? null,
    toVersionId: revisionId,
    changeKind: input.kind,
    summary,
    createdAt: now,
  });
  await store.invalidateCache();

  if (expanded.some((article) => article.kind === "annex")) {
    await withdrawKgcpGuidelines(store);
  }
  return statuteId;
}

function expandArticles(articles: ParsedArticle[]): ParsedArticle[] {
  const out: ParsedArticle[] = [];
  for (const article of articles) {
    if (article.kind !== "annex") {
      out.push(article);
      continue;
    }
    const chunks = chunkByClause(article.text, article.section);
    if (chunks.length <= 1) {
      out.push(article);
      continue;
    }
    for (const chunk of chunks) {
      out.push({
        articleKey: `${article.articleKey}#${chunk.section}`,
        section: `${article.section} · ${chunk.section}`,
        text: chunk.text,
        kind: "annex",
      });
    }
  }
  return out;
}

function diffArticles(
  previous: StatuteArticle[],
  next: ParsedArticle[],
): SectionChange[] {
  const prev = new Map(previous.map((row) => [row.articleKey, row]));
  const nextByKey = new Map(next.map((row) => [row.articleKey, row]));
  const keys = new Set([...prev.keys(), ...nextByKey.keys()]);
  const changes: SectionChange[] = [];
  for (const key of keys) {
    const a = prev.get(key);
    const b = nextByKey.get(key);
    const label = b?.section ?? a?.section ?? key;
    if (a && !b) changes.push({ section: label, kind: "removed", previousText: a.text });
    else if (!a && b)
      changes.push({ section: label, kind: "added", currentText: b.text });
    else if (a && b && a.text.trim() !== b.text.trim()) {
      changes.push({
        section: label,
        kind: "changed",
        previousText: a.text,
        currentText: b.text,
      });
    } else if (a && b) {
      changes.push({
        section: label,
        kind: "unchanged",
        previousText: a.text,
        currentText: b.text,
      });
    }
  }
  return changes;
}

async function withdrawKgcpGuidelines(store: AppStore): Promise<void> {
  const docs = await store.listDocuments();
  for (const doc of docs) {
    if (doc.source !== "kgcp" || doc.status === "withdrawn") continue;
    await store.upsertDocument({ ...doc, status: "withdrawn" });
    await store.addChangeLog({
      id: randomUUID(),
      documentId: doc.id,
      entityKind: "document",
      fromVersionId: doc.currentVersionId,
      toVersionId: doc.currentVersionId,
      changeKind: "vanished",
      summary: `${doc.title} 가이드라인 시드에서 내림. KGCP는 법령 별표 4로 옮겼다.`,
      createdAt: new Date().toISOString(),
    });
  }
}
