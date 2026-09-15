-- GCP 가이드라인 검색기 초기 스키마
-- 임베딩은 real[] / jsonb 로 저장한다. vector / pgvector 컬럼을 만들지 말 것.
-- pgvector 전환 조건: 청크 수 > 5000 또는 유사도 계산(임베딩 API 제외) > 500ms
-- (lib/retrieval/cosine.ts, README.md, BENCHMARK.md 와 동기화)

create table if not exists documents (
  id uuid primary key,
  source text not null,
  title text not null,
  url text not null,
  issued_date date,
  file_hash text,
  current_version_id uuid,
  category text,
  external_id text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists document_versions (
  id uuid primary key,
  document_id uuid not null references documents (id),
  version_label text not null,
  issued_date date,
  file_hash text not null,
  extracted_text text not null,
  parse_status text not null,
  diff_summary text,
  created_at timestamptz not null default now()
);

create table if not exists chunks (
  id uuid primary key,
  version_id uuid not null references document_versions (id),
  document_id uuid not null references documents (id),
  section text not null,
  text text not null,
  -- jsonb array of floats (text-embedding-3-small, 1536-d). NOT a pgvector column.
  embedding jsonb not null,
  is_current boolean not null default true
);

create table if not exists change_log (
  id uuid primary key,
  document_id uuid not null references documents (id),
  from_version_id uuid,
  to_version_id uuid,
  change_kind text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists search_logs (
  id uuid primary key,
  query text not null,
  normalized_query text not null,
  ip_hash text not null,
  cache_hit boolean not null,
  latency_ms integer not null,
  similarity_ms integer not null,
  top_chunk_ids jsonb not null default '[]',
  answer text not null,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key,
  search_log_id uuid,
  query text not null,
  answer text not null,
  rating text not null,
  created_at timestamptz not null default now()
);

create table if not exists query_cache (
  query_hash text primary key,
  normalized_query text not null,
  embedding jsonb not null,
  answer text not null,
  sources jsonb not null,
  expires_at timestamptz not null,
  hit_count integer not null default 0
);

create table if not exists rate_limits (
  bucket text not null,
  day date not null,
  count integer not null,
  primary key (bucket, day)
);

create table if not exists ingest_jobs (
  id uuid primary key,
  source text not null,
  external_id text not null,
  reason text not null,
  status text not null,
  attempts integer not null default 0,
  last_error text,
  catalog jsonb not null
);

create index if not exists chunks_current_idx on chunks (is_current);
create index if not exists documents_source_idx on documents (source);
