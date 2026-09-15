create table if not exists translated_chunks (
  chunk_id text primary key,
  text text not null,
  created_at timestamptz not null default now()
);

alter table query_cache add column if not exists passages jsonb not null default '[]';
