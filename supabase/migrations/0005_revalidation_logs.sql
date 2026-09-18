create table if not exists revalidation_logs (
  id uuid primary key,
  reason text not null,
  paths jsonb not null default '[]',
  document_ids jsonb not null default '[]',
  statute_ids jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists revalidation_logs_created_at_idx on revalidation_logs (created_at desc);
