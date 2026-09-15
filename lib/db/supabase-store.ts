import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppStore } from "@/lib/db/types";
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

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env is not configured");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function mapDoc(row: Record<string, unknown>): DocumentRecord {
  return {
    id: String(row.id),
    source: row.source as DocumentRecord["source"],
    title: String(row.title),
    url: String(row.url),
    issuedDate: (row.issued_date as string | null) ?? null,
    fileHash: (row.file_hash as string | null) ?? null,
    currentVersionId: (row.current_version_id as string | null) ?? null,
    category: String(row.category ?? ""),
    externalId: String(row.external_id),
    status: (row.status as DocumentRecord["status"]) ?? "active",
    createdAt: String(row.created_at),
  };
}

export const supabaseStore: AppStore = {
  async listDocuments() {
    const { data, error } = await client()
      .from("documents")
      .select("*")
      .order("created_at", {
        ascending: false,
      });
    if (error) throw error;
    return (data ?? []).map(mapDoc);
  },
  async getDocument(id) {
    const { data, error } = await client()
      .from("documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapDoc(data) : undefined;
  },
  async upsertDocument(doc) {
    const { error } = await client().from("documents").upsert({
      id: doc.id,
      source: doc.source,
      title: doc.title,
      url: doc.url,
      issued_date: doc.issuedDate,
      file_hash: doc.fileHash,
      current_version_id: doc.currentVersionId,
      category: doc.category,
      external_id: doc.externalId,
      status: doc.status,
      created_at: doc.createdAt,
    });
    if (error) throw error;
  },
  async listVersions(documentId) {
    const { data, error } = await client()
      .from("document_versions")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row): DocumentVersion => ({
      id: row.id,
      documentId: row.document_id,
      versionLabel: row.version_label,
      issuedDate: row.issued_date,
      fileHash: row.file_hash,
      extractedText: row.extracted_text,
      parseStatus: row.parse_status,
      diffSummary: row.diff_summary,
      createdAt: row.created_at,
    }));
  },
  async getVersion(id) {
    const { data, error } = await client()
      .from("document_versions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    return {
      id: data.id,
      documentId: data.document_id,
      versionLabel: data.version_label,
      issuedDate: data.issued_date,
      fileHash: data.file_hash,
      extractedText: data.extracted_text,
      parseStatus: data.parse_status,
      diffSummary: data.diff_summary,
      createdAt: data.created_at,
    };
  },
  async addVersion(version) {
    const { error } = await client().from("document_versions").insert({
      id: version.id,
      document_id: version.documentId,
      version_label: version.versionLabel,
      issued_date: version.issuedDate,
      file_hash: version.fileHash,
      extracted_text: version.extractedText,
      parse_status: version.parseStatus,
      diff_summary: version.diffSummary,
      created_at: version.createdAt,
    });
    if (error) throw error;
  },
  async currentChunks() {
    const { data, error } = await client()
      .from("chunks")
      .select("*")
      .eq("is_current", true);
    if (error) throw error;
    return (data ?? []).map((row): ChunkRecord => ({
      id: row.id,
      versionId: row.version_id,
      documentId: row.document_id,
      section: row.section,
      text: row.text,
      embedding: row.embedding as number[],
      isCurrent: row.is_current,
    }));
  },
  async replaceCurrentChunks(documentId, chunks) {
    const sb = client();
    const { error: updErr } = await sb
      .from("chunks")
      .update({ is_current: false })
      .eq("document_id", documentId);
    if (updErr) throw updErr;
    if (chunks.length === 0) return;
    const { error } = await sb.from("chunks").insert(
      chunks.map((c) => ({
        id: c.id,
        version_id: c.versionId,
        document_id: c.documentId,
        section: c.section,
        text: c.text,
        embedding: c.embedding,
        is_current: c.isCurrent,
      })),
    );
    if (error) throw error;
  },
  async addChunks(chunks) {
    if (!chunks.length) return;
    const { error } = await client()
      .from("chunks")
      .insert(
        chunks.map((c) => ({
          id: c.id,
          version_id: c.versionId,
          document_id: c.documentId,
          section: c.section,
          text: c.text,
          embedding: c.embedding,
          is_current: c.isCurrent,
        })),
      );
    if (error) throw error;
  },
  async addChangeLog(log) {
    const { error } = await client()
      .from("change_log")
      .insert({
        id: log.id,
        document_id: log.documentId,
        entity_kind: log.entityKind ?? "document",
        from_version_id: log.fromVersionId,
        to_version_id: log.toVersionId,
        change_kind: log.changeKind,
        summary: log.summary,
        created_at: log.createdAt,
      });
    if (error) throw error;
  },
  async listChangeLogs() {
    const { data, error } = await client()
      .from("change_log")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row): ChangeLogRecord => ({
      id: row.id,
      documentId: row.document_id,
      entityKind: row.entity_kind === "statute" ? "statute" : "document",
      fromVersionId: row.from_version_id,
      toVersionId: row.to_version_id,
      changeKind: row.change_kind,
      summary: row.summary,
      createdAt: row.created_at,
    }));
  },
  async addSearchLog(log) {
    const { error } = await client().from("search_logs").insert({
      id: log.id,
      query: log.query,
      normalized_query: log.normalizedQuery,
      ip_hash: log.ipHash,
      cache_hit: log.cacheHit,
      latency_ms: log.latencyMs,
      similarity_ms: log.similarityMs,
      top_chunk_ids: log.topChunkIds,
      answer: log.answer,
      created_at: log.createdAt,
    });
    if (error) throw error;
  },
  async listSearchLogs() {
    const { data, error } = await client()
      .from("search_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map((row): SearchLogRecord => ({
      id: row.id,
      query: row.query,
      normalizedQuery: row.normalized_query,
      ipHash: row.ip_hash,
      cacheHit: row.cache_hit,
      latencyMs: row.latency_ms,
      similarityMs: row.similarity_ms,
      topChunkIds: row.top_chunk_ids ?? [],
      answer: row.answer,
      createdAt: row.created_at,
    }));
  },
  async addFeedback(row) {
    const { error } = await client().from("feedback").insert({
      id: row.id,
      search_log_id: row.searchLogId,
      query: row.query,
      answer: row.answer,
      rating: row.rating,
      created_at: row.createdAt,
    });
    if (error) throw error;
  },
  async listFeedback() {
    const { data, error } = await client()
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map((row): FeedbackRecord => ({
      id: row.id,
      searchLogId: row.search_log_id,
      query: row.query,
      answer: row.answer,
      rating: row.rating,
      createdAt: row.created_at,
    }));
  },
  async getCachedAnswer(normalizedQuery) {
    const { data, error } = await client()
      .from("query_cache")
      .select("*")
      .eq("normalized_query", normalizedQuery)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    return {
      queryHash: data.query_hash,
      normalizedQuery: data.normalized_query,
      embedding: data.embedding,
      answer: data.answer,
      sources: data.sources as QueryCacheRecord["sources"],
      expiresAt: data.expires_at,
      hitCount: data.hit_count,
    };
  },
  async listQueryCache() {
    const { data, error } = await client().from("query_cache").select("*");
    if (error) throw error;
    return (data ?? []).map((row): QueryCacheRecord => ({
      queryHash: row.query_hash,
      normalizedQuery: row.normalized_query,
      embedding: row.embedding,
      answer: row.answer,
      sources: row.sources,
      expiresAt: row.expires_at,
      hitCount: row.hit_count,
    }));
  },
  async putQueryCache(row) {
    const { error } = await client().from("query_cache").upsert({
      query_hash: row.queryHash,
      normalized_query: row.normalizedQuery,
      embedding: row.embedding,
      answer: row.answer,
      sources: row.sources,
      expires_at: row.expiresAt,
      hit_count: row.hitCount,
    });
    if (error) throw error;
  },
  async bumpCacheHit(queryHash) {
    const existing = await client()
      .from("query_cache")
      .select("hit_count")
      .eq("query_hash", queryHash)
      .maybeSingle();
    const count = (existing.data?.hit_count ?? 0) + 1;
    const { error } = await client()
      .from("query_cache")
      .update({ hit_count: count })
      .eq("query_hash", queryHash);
    if (error) throw error;
  },
  async invalidateCache() {
    const { error } = await client().from("query_cache").delete().neq("query_hash", "");
    if (error) throw error;
  },
  async incrementRateLimit(bucket, day) {
    const sb = client();
    const { data } = await sb
      .from("rate_limits")
      .select("count")
      .eq("bucket", bucket)
      .eq("day", day)
      .maybeSingle();
    const count = (data?.count ?? 0) + 1;
    const { error } = await sb.from("rate_limits").upsert({ bucket, day, count });
    if (error) throw error;
    return count;
  },
  async enqueueJob(job) {
    const { error } = await client().from("ingest_jobs").insert({
      id: job.id,
      source: job.source,
      external_id: job.externalId,
      reason: job.reason,
      status: job.status,
      attempts: job.attempts,
      last_error: job.lastError,
      catalog: job.catalog,
    });
    if (error) throw error;
  },
  async nextJob() {
    const sb = client();
    const { data, error } = await sb
      .from("ingest_jobs")
      .select("*")
      .eq("status", "queued")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const { error: upd } = await sb
      .from("ingest_jobs")
      .update({ status: "processing" })
      .eq("id", data.id);
    if (upd) throw upd;
    return {
      id: data.id,
      source: data.source,
      externalId: data.external_id,
      reason: data.reason,
      status: "processing",
      attempts: data.attempts,
      lastError: data.last_error,
      catalog: data.catalog,
    };
  },
  async updateJob(job: IngestJob) {
    const { error } = await client()
      .from("ingest_jobs")
      .update({
        status: job.status,
        attempts: job.attempts,
        last_error: job.lastError,
      })
      .eq("id", job.id);
    if (error) throw error;
  },
  async listStatutes() {
    const { data, error } = await client().from("statutes").select("*").order("title");
    if (error) throw error;
    return (data ?? []).map(mapStatute);
  },
  async getStatute(id) {
    const { data, error } = await client()
      .from("statutes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapStatute(data) : undefined;
  },
  async upsertStatute(row) {
    const { error } = await client().from("statutes").upsert({
      id: row.id,
      law_id: row.lawId,
      title: row.title,
      short_title: row.shortTitle,
      url: row.url,
      current_mst: row.currentMst,
      promulgated_date: row.promulgatedDate,
      effective_date: row.effectiveDate,
      amendment_type: row.amendmentType,
      current_revision_id: row.currentRevisionId,
      status: row.status,
      created_at: row.createdAt,
    });
    if (error) throw error;
  },
  async listStatuteRevisions(statuteId) {
    let query = client()
      .from("statute_revisions")
      .select("*")
      .order("created_at", { ascending: false });
    if (statuteId) query = query.eq("statute_id", statuteId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapStatuteRevision);
  },
  async addStatuteRevision(row) {
    const { error } = await client().from("statute_revisions").insert({
      id: row.id,
      statute_id: row.statuteId,
      mst: row.mst,
      promulgated_date: row.promulgatedDate,
      effective_date: row.effectiveDate,
      amendment_type: row.amendmentType,
      diff_summary: row.diffSummary,
      created_at: row.createdAt,
    });
    if (error) throw error;
  },
  async currentStatuteArticles() {
    const { data, error } = await client()
      .from("statute_articles")
      .select("*")
      .eq("is_current", true);
    if (error) throw error;
    return (data ?? []).map(mapStatuteArticle);
  },
  async replaceCurrentStatuteArticles(statuteId, articles) {
    const sb = client();
    const { error: updErr } = await sb
      .from("statute_articles")
      .update({ is_current: false })
      .eq("statute_id", statuteId);
    if (updErr) throw updErr;
    if (articles.length === 0) return;
    const { error } = await sb.from("statute_articles").insert(
      articles.map((row) => ({
        id: row.id,
        statute_id: row.statuteId,
        revision_id: row.revisionId,
        article_key: row.articleKey,
        section: row.section,
        text: row.text,
        embedding: row.embedding,
        is_current: row.isCurrent,
        kind: row.kind,
      })),
    );
    if (error) throw error;
  },
};

function mapStatute(row: Record<string, unknown>): StatuteRecord {
  return {
    id: String(row.id),
    lawId: String(row.law_id),
    title: String(row.title),
    shortTitle: String(row.short_title ?? row.title),
    url: String(row.url),
    currentMst: String(row.current_mst),
    promulgatedDate: (row.promulgated_date as string | null) ?? null,
    effectiveDate: (row.effective_date as string | null) ?? null,
    amendmentType: (row.amendment_type as string | null) ?? null,
    currentRevisionId: (row.current_revision_id as string | null) ?? null,
    status: (row.status as StatuteRecord["status"]) ?? "active",
    createdAt: String(row.created_at),
  };
}

function mapStatuteRevision(row: Record<string, unknown>): StatuteRevision {
  return {
    id: String(row.id),
    statuteId: String(row.statute_id),
    mst: String(row.mst),
    promulgatedDate: (row.promulgated_date as string | null) ?? null,
    effectiveDate: (row.effective_date as string | null) ?? null,
    amendmentType: (row.amendment_type as string | null) ?? null,
    diffSummary: (row.diff_summary as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapStatuteArticle(row: Record<string, unknown>): StatuteArticle {
  return {
    id: String(row.id),
    statuteId: String(row.statute_id),
    revisionId: String(row.revision_id),
    articleKey: String(row.article_key),
    section: String(row.section),
    text: String(row.text),
    embedding: row.embedding as number[],
    isCurrent: Boolean(row.is_current),
    kind: (row.kind as StatuteArticle["kind"]) ?? "article",
  };
}
