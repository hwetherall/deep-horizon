-- Hermes Scout initial schema (plan §7).

-- Enable useful extensions.
create extension if not exists pgcrypto;
create extension if not exists vector;

-- Enums.
do $$ begin
  create type opportunity_status as enum (
    'new',
    'watching',
    'benchmark',
    'testing',
    'adopted',
    'rejected',
    'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type opportunity_type as enum (
    'tool',
    'company',
    'api',
    'repo',
    'paper',
    'feature',
    'trend',
    'competitor',
    'workflow',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type feedback_decision as enum (
    'useful',
    'not_useful',
    'already_known',
    'benchmark',
    'watch',
    'reject',
    'adopted',
    'needs_more_research'
  );
exception when duplicate_object then null;
end $$;

-- Scan runs.
create table if not exists scan_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger_run_id text,
  date_window_start timestamptz,
  date_window_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  error text
);

-- Source patrol definitions.
create table if not exists source_patrols (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  enabled boolean not null default true,
  cadence text not null default 'daily',
  priority integer not null default 100,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Raw items from providers.
create table if not exists raw_items (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid references scan_runs(id) on delete set null,
  provider text not null,
  patrol_name text,
  query text,
  title text,
  url text not null,
  canonical_url text,
  source_domain text,
  snippet text,
  raw_content text,
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  provider_score numeric,
  provider_payload jsonb not null default '{}'::jsonb,
  content_hash text,
  dedupe_key text not null,
  is_duplicate boolean not null default false,
  duplicate_of uuid references raw_items(id),
  unique(dedupe_key)
);

-- Opportunities/entities.
create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type opportunity_type not null default 'other',
  category text,
  status opportunity_status not null default 'new',
  canonical_url text,
  description text,
  summary text,
  why_it_matters text,
  recommended_action text,
  strategic_relevance numeric,
  actionability numeric,
  integration_fit numeric,
  evidence_quality numeric,
  novelty numeric,
  urgency numeric,
  total_score numeric,
  confidence numeric,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  notion_page_id text,
  notion_url text,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb
);

-- Evidence linking raw items to opportunities.
create table if not exists opportunity_evidence (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  raw_item_id uuid references raw_items(id) on delete set null,
  url text not null,
  title text,
  source_domain text,
  evidence_type text not null default 'source',
  quote text,
  summary text,
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  confidence numeric,
  metadata jsonb not null default '{}'::jsonb,
  unique(opportunity_id, url)
);

-- Score history.
create table if not exists opportunity_scores (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  scan_run_id uuid references scan_runs(id) on delete set null,
  scoring_version text not null,
  strategic_relevance numeric not null,
  actionability numeric not null,
  integration_fit numeric not null,
  evidence_quality numeric not null,
  novelty numeric not null,
  urgency numeric not null,
  total_score numeric not null,
  confidence numeric not null,
  rationale text not null,
  created_at timestamptz not null default now(),
  raw_output jsonb not null default '{}'::jsonb
);

-- Briefs. opportunity_id is nullable (diverges from plan §7) so run-level
-- artifacts like the weekly self-review can be stored here too.
create table if not exists opportunity_briefs (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade,
  scan_run_id uuid references scan_runs(id) on delete set null,
  title text not null,
  markdown text not null,
  model text,
  prompt_version text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- Digests.
create table if not exists digests (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid references scan_runs(id) on delete set null,
  digest_date date not null,
  title text not null,
  markdown text not null,
  email_subject text,
  email_sent_at timestamptz,
  email_provider_message_id text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(digest_date)
);

create table if not exists digest_items (
  id uuid primary key default gen_random_uuid(),
  digest_id uuid not null references digests(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  rank integer not null,
  reason text,
  unique(digest_id, opportunity_id)
);

-- Human feedback.
create table if not exists feedback_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade,
  digest_id uuid references digests(id) on delete set null,
  decision feedback_decision not null,
  reviewer_email text not null,
  comment text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- Watchlist.
create table if not exists watchlist_items (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade,
  name text not null,
  url text,
  reason text,
  enabled boolean not null default true,
  last_checked_at timestamptz,
  next_check_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

-- Lessons used to steer future runs.
create table if not exists agent_lessons (
  id uuid primary key default gen_random_uuid(),
  lesson text not null,
  source text not null default 'human_feedback',
  strength numeric not null default 1.0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

-- Provider and LLM call logs for cost / debugging.
create table if not exists provider_calls (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid references scan_runs(id) on delete set null,
  provider text not null,
  endpoint text not null,
  request_hash text,
  status text not null,
  cost_usd numeric,
  latency_ms integer,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  error text
);

create table if not exists llm_calls (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid references scan_runs(id) on delete set null,
  task text not null,
  model text not null,
  prompt_version text,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric,
  latency_ms integer,
  status text not null,
  created_at timestamptz not null default now(),
  request jsonb,
  response jsonb,
  error text
);

-- Indexes.
create index if not exists idx_raw_items_discovered_at on raw_items(discovered_at desc);
create index if not exists idx_raw_items_source_domain on raw_items(source_domain);
create index if not exists idx_opportunities_score on opportunities(total_score desc nulls last);
create index if not exists idx_opportunities_status on opportunities(status);
create index if not exists idx_opportunity_evidence_opp on opportunity_evidence(opportunity_id);
create index if not exists idx_feedback_events_opp on feedback_events(opportunity_id);
create index if not exists idx_provider_calls_created_at on provider_calls(created_at desc);
create index if not exists idx_llm_calls_created_at on llm_calls(created_at desc);
