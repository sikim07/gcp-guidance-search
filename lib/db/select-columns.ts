/**
 * Public ISR/catalog reads must not pull jsonb embeddings or full PDF text.
 * Those columns dominate Supabase egress when Googlebot walks clause pages.
 */
export const CHUNK_PUBLIC_COLUMNS =
  "id, version_id, document_id, section, text, is_current";

export const CHUNK_SEARCH_COLUMNS =
  "id, version_id, document_id, section, text, embedding, is_current";

export const STATUTE_ARTICLE_PUBLIC_COLUMNS =
  "id, statute_id, revision_id, article_key, section, text, is_current, kind";

export const STATUTE_ARTICLE_SEARCH_COLUMNS =
  "id, statute_id, revision_id, article_key, section, text, embedding, is_current, kind";

/** Version history UI only needs labels/summaries — not extracted PDF bodies. */
export const DOCUMENT_VERSION_LIST_COLUMNS =
  "id, document_id, version_label, issued_date, file_hash, parse_status, diff_summary, created_at";
