-- 법령은 documents와 분리한다. 개정 식별은 MST/공포일/시행일/제개정구분이며 file_hash를 쓰지 않는다.
-- change_log.document_id 는 문서 id 또는 법령 id 를 담을 수 있게 FK를 해제한다.

create table if not exists statutes (
  id uuid primary key,
  law_id text not null unique,
  title text not null,
  short_title text not null,
  url text not null,
  current_mst text not null,
  promulgated_date date,
  effective_date date,
  amendment_type text,
  current_revision_id uuid,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists statute_revisions (
  id uuid primary key,
  statute_id uuid not null references statutes (id),
  mst text not null,
  promulgated_date date,
  effective_date date,
  amendment_type text,
  diff_summary text,
  created_at timestamptz not null default now()
);

create table if not exists statute_articles (
  id uuid primary key,
  statute_id uuid not null references statutes (id),
  revision_id uuid not null references statute_revisions (id),
  article_key text not null,
  section text not null,
  text text not null,
  embedding jsonb not null,
  is_current boolean not null default true,
  kind text not null default 'article'
);

alter table change_log drop constraint if exists change_log_document_id_fkey;
alter table change_log add column if not exists entity_kind text not null default 'document';

create index if not exists statute_articles_current_idx on statute_articles (is_current);
create index if not exists statutes_law_id_idx on statutes (law_id);
