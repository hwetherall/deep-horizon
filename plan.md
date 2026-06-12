# Innovera AI Opportunity Radar — Build Plan

> Working name: **Hermes Scout**
>
> Purpose: build an always-on, memory-bearing research agent that continuously discovers AI tools, APIs, companies, open-source projects, features, papers, and market developments that Innovera should **build, buy, benchmark, integrate, watch, or ignore**.
>
> **2026-06-12 — two-level human feedback shipped (seed Q15 first implementation):** every suggestion can be rated **good / neutral / bad** (faces) from the daily email and the HTML report, with an optional written comment as level 2 (`functions/feedback.ts`, GET = rating, POST = comment). Sentiment lives on `feedback_events.sentiment`; `decision` is now nullable. Semantics: *bad* → status `rejected` (rank penalty + resurfacing suppression); *good*/*neutral* → recorded only. Learning is two-speed: (1) a **taste profile** built from the last 60 days of ratings+comments (`src/llm/prompts/taste-profile.ts`) is injected into every extraction and scoring prompt immediately; (2) the weekly review distills ratings+comments into durable `agent_lessons`. Prompt versions: extract-v3, score-v3, weekly-review-v2.
>
> **2026-06-11 reframing (see `deep-horizon-seed.md`):** the original patrols below are AI/agent-infrastructure-centric. Innovera's near-term product is a deep-tech, cross-domain **research-and-strategy engine** for corporate innovation teams (initiative in → researched options + risks out). The implementation now weights Tier 1 (deep research & synthesis, market & competitive intelligence, deep-tech feasibility, patent/IP/regulatory, risk frameworks) above agent-infrastructure plumbing (Tier 2), and reframes competitor monitoring as **emergence detection** (Tier 3). Current patrol set: `src/config/patrols.ts`; scoring rubric: `docs/scoring-rubric.md` (v2); system prompt: `src/llm/prompts/system.ts`. Patrol lists in the sections below reflect the original plan and are superseded by the seed answers.

---

## 0. Current decision

We have enough to build a strong MVP without more discovery work.

Use this stack:

```text
Claude Code / Cursor        development environment
TypeScript                  implementation language
Trigger.dev                 scheduled jobs + durable background tasks
InsForge Postgres           source of truth
InsForge functions/API      optional lightweight HTTP endpoints
OpenRouter                  model gateway
Exa                         high-quality AI-native web discovery
Tavily                      fast/advanced web search and research calls
Firecrawl                   scraping, crawling, clean markdown, page monitoring
Serper                      optional Google SERP fallback
Jina                        optional URL-to-markdown / reader / embeddings helper
Notion                      curated opportunity library
Daily email                 triage surface for Harry
```

Important architectural decision:

```text
InsForge/Postgres = operational memory and source of truth
Notion            = polished human-readable opportunity library
Daily email       = attention and feedback loop
Hermes memory     = steering preferences and learned behavior
Trigger.dev       = reliable recurring execution
```

Do **not** make Notion or the LLM the source of truth.

---

## 1. Product goal

The system should answer this every day:

> What new AI tools, APIs, companies, repos, research projects, product features, or market signals could materially help Innovera?

A good finding should produce at least one of these actions:

```text
benchmark
prototype
integrate
buy
partner
watch
competitive warning
ignore with reason
```

The system is not an AI-news feed. It is an opportunity radar.

---

## 2. MVP scope

### MVP user

Primary user:

```text
Harry Wetherall
Innovera.ai
Daily decision-maker / reviewer
```

### MVP cadence

Default cadence:

```text
Daily scan:      weekdays at 7:00 AM America/Denver
Daily email:     weekdays at 8:00 AM America/Denver
Weekly review:   Fridays at 10:00 AM America/Denver
Manual run:      available via Trigger.dev dashboard or local CLI
```

### MVP source categories

Start with these patrols (reweighted per `deep-horizon-seed.md` §5):

```text
Tier 1 — the research product itself
1. Deep research & multi-source synthesis (ai-search-research-tools)
2. Market & competitive intelligence
3. Technical feasibility & deep-tech scouting
4. Patent / IP / regulatory research
5. Risk identification & analysis frameworks

Tier 2 — plumbing that improves the engine
6. Agent infrastructure & orchestration
7. Memory, RAG, retrieval, and knowledge systems
8. Evals, observability, tracing, and monitoring
9. Model/API capability changes
10. Browser automation and computer-use tools

Tier 3 — detection & future
11. Competitor emergence (research→strategy→risk for innovation teams)
12. Open-source repos useful to the engine (GitHub queries)
```

### MVP outputs

Every day:

```text
1. Supabase records for all raw findings, candidates, scores, evidence, and feedback
2. Notion pages for top opportunities
3. Daily email with top findings and feedback links
4. Optional "quiet day" email if nothing good was found
```

Every week:

```text
1. Weekly self-review
2. Source performance summary
3. Lessons learned
4. Suggested changes to patrol instructions
```

---

## 3. Non-goals for MVP

Do not build these yet:

```text
autonomous outreach
autonomous purchases
autonomous production integrations
full custom web dashboard
multi-user permission model
fine-tuned ranking model
complex vector-memory interface
large crawl jobs over the entire web
Slack bot
browser-use agent
```

The first target is simple:

> Find 3–5 genuinely useful things per week that Harry would not want Innovera to miss.

---

## 4. High-level architecture

```text
Trigger.dev scheduled task
  ↓
Hermes Scout run
  ↓
Source patrols:
  Exa, Tavily, Firecrawl, Serper, Jina, GitHub, RSS
  ↓
Raw items table
  ↓
Candidate extraction
  ↓
Entity resolution / dedupe
  ↓
Relevance scoring
  ↓
Deep research for high-score candidates
  ↓
Opportunity database
  ↓
Notion publishing
  ↓
Daily email
  ↓
Feedback links
  ↓
Feedback stored in Supabase
  ↓
Hermes memory / rubric updates
```

---

## 5. Repository shape

Assume a TypeScript repo.

Recommended structure:

```text
.
├── README.md
├── plan.md
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── .env.example
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── functions/
│       └── feedback/
├── trigger/
│   ├── daily-scan.ts
│   ├── source-patrol.ts
│   ├── classify-candidates.ts
│   ├── deep-research.ts
│   ├── publish-digest.ts
│   ├── weekly-review.ts
│   └── watchlist-monitor.ts
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   ├── patrols.ts
│   │   ├── scoring.ts
│   │   └── models.ts
│   ├── db/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── queries/
│   ├── providers/
│   │   ├── exa.ts
│   │   ├── tavily.ts
│   │   ├── firecrawl.ts
│   │   ├── serper.ts
│   │   ├── jina.ts
│   │   ├── github.ts
│   │   ├── rss.ts
│   │   └── index.ts
│   ├── llm/
│   │   ├── openrouter.ts
│   │   ├── schemas.ts
│   │   ├── prompts/
│   │   │   ├── extract-candidates.ts
│   │   │   ├── score-candidate.ts
│   │   │   ├── dedupe-candidate.ts
│   │   │   ├── write-brief.ts
│   │   │   └── weekly-self-review.ts
│   │   └── models.ts
│   ├── scout/
│   │   ├── runDailyScan.ts
│   │   ├── runPatrol.ts
│   │   ├── normalizeRawItems.ts
│   │   ├── extractCandidates.ts
│   │   ├── resolveEntity.ts
│   │   ├── scoreCandidate.ts
│   │   ├── deepResearch.ts
│   │   ├── createDigest.ts
│   │   ├── publishNotion.ts
│   │   ├── sendEmail.ts
│   │   └── applyFeedback.ts
│   ├── notion/
│   │   ├── client.ts
│   │   ├── mapOpportunityToNotion.ts
│   │   └── blocks.ts
│   ├── email/
│   │   ├── client.ts
│   │   ├── templates/
│   │   │   └── dailyDigest.ts
│   │   └── sendDigest.ts
│   ├── utils/
│   │   ├── hash.ts
│   │   ├── dates.ts
│   │   ├── retry.ts
│   │   ├── logger.ts
│   │   └── cost.ts
│   └── tests/
│       ├── fixtures/
│       ├── unit/
│       └── integration/
└── docs/
    ├── architecture.md
    ├── source-provider-notes.md
    ├── scoring-rubric.md
    └── runbook.md
```

If this is going inside an existing Next.js repo, put `src/` under the existing app and keep `trigger/` at the project root.

---

## 6. Environment variables

Create `.env.example`:

```bash
# App
NODE_ENV=development
APP_BASE_URL=http://localhost:3000
APP_TIMEZONE=America/Denver

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Trigger.dev
TRIGGER_SECRET_KEY=

# OpenRouter
OPENROUTER_API_KEY=
OPENROUTER_APP_TITLE=Innovera AI Opportunity Radar
OPENROUTER_HTTP_REFERER=

# Search / crawl providers
EXA_API_KEY=
TAVILY_API_KEY=
FIRECRAWL_API_KEY=
SERPER_API_KEY=
JINA_API_KEY=

# GitHub
GITHUB_TOKEN=

# Notion
NOTION_API_KEY=
NOTION_OPPORTUNITIES_DATA_SOURCE_ID=

# Email
EMAIL_PROVIDER=resend
RESEND_API_KEY=
DIGEST_FROM_EMAIL=scout@innovera.ai
DIGEST_TO_EMAIL=harry@innovera.ai

# Safety / budget
SCOUT_MAX_DAILY_PROVIDER_COST_USD=20
SCOUT_MAX_DAILY_LLM_COST_USD=20
SCOUT_MAX_RAW_ITEMS_PER_DAY=500
SCOUT_MAX_DEEP_RESEARCH_PER_DAY=10
SCOUT_MIN_SCORE_FOR_NOTION=7.0
SCOUT_MIN_SCORE_FOR_DEEP_RESEARCH=7.5
```

---

## 7. Supabase schema

Create a first migration like:

```sql
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

-- Briefs.
create table if not exists opportunity_briefs (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
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
```

### RLS

For MVP, keep Scout server-side with the Supabase service role key and do not expose data publicly.

Later:

```text
enable RLS
create admin-only policies
create authenticated reviewer role
lock feedback endpoint with signed token
```

---

## 8. Core domain types

Create TypeScript domain types before implementation.

```ts
export type SourceProvider =
  | "exa"
  | "tavily"
  | "firecrawl"
  | "serper"
  | "jina"
  | "github"
  | "rss"
  | "manual";

export type OpportunityType =
  | "tool"
  | "company"
  | "api"
  | "repo"
  | "paper"
  | "feature"
  | "trend"
  | "competitor"
  | "workflow"
  | "other";

export type OpportunityStatus =
  | "new"
  | "watching"
  | "benchmark"
  | "testing"
  | "adopted"
  | "rejected"
  | "archived";

export interface RawItem {
  provider: SourceProvider;
  patrolName: string;
  query?: string;
  title: string;
  url: string;
  canonicalUrl?: string;
  sourceDomain?: string;
  snippet?: string;
  rawContent?: string;
  publishedAt?: string;
  discoveredAt: string;
  providerScore?: number;
  providerPayload: unknown;
}

export interface Candidate {
  name: string;
  type: OpportunityType;
  category: string;
  canonicalUrl?: string;
  summary: string;
  evidenceUrls: string[];
  possibleUseCases: string[];
  risks: string[];
}

export interface OpportunityScore {
  strategicRelevance: number;
  actionability: number;
  integrationFit: number;
  evidenceQuality: number;
  novelty: number;
  urgency: number;
  totalScore: number;
  confidence: number;
  rationale: string;
}
```

---

## 9. Search provider strategy

### Exa

Use Exa for high-quality discovery where semantic relevance matters.

Primary uses:

```text
new AI-native tools
research papers
technical product pages
company pages
deep searches with structured output
```

Use parameters like:

```text
query
startPublishedDate
startCrawlDate
numResults
includeDomains / excludeDomains
category: company | research paper | news
contents: highlights / text / summary
type: auto | deep-lite | deep
```

### Tavily

Use Tavily for fast search, news-like queries, and general web queries.

Primary uses:

```text
news / recent launches
"what changed this week" patrols
broad topic discovery
secondary confirmation of Exa findings
```

Use:

```text
search_depth: fast | basic | advanced
topic: general | news
time_range: day | week | month
include_raw_content where useful
max_results
```

### Firecrawl

Use Firecrawl for page extraction and known-source monitoring.

Primary uses:

```text
clean markdown from product/docs pages
crawl known vendor sites
scrape pricing/docs/changelog pages
monitor known URLs for meaningful change
extract links from a site map
```

Use Firecrawl after a URL has already passed lightweight relevance checks. Do not scrape every raw search result by default.

### Serper

Use Serper as a cheap Google SERP fallback.

Primary uses:

```text
when Exa/Tavily miss obvious web results
news result diversity
checking exact names / companies / product launches
```

Do not use as first source unless needed.

### Jina

Use Jina as optional utility.

Primary uses:

```text
URL-to-markdown fallback
quick reader extraction
embedding/reranking experiments later
```

Do not block MVP on Jina.

### GitHub API

Use GitHub for open-source leverage.

Initial queries:

```text
topic:ai-agent stars:>100 pushed:>2026-01-01
topic:llm stars:>100 pushed:>2026-01-01
"agent eval" pushed:>2026-01-01
"browser agent" pushed:>2026-01-01
"deep research" pushed:>2026-01-01
"mcp server" pushed:>2026-01-01
"rag evaluation" pushed:>2026-01-01
```

Normalize:

```text
repo name
description
stars
forks
created_at
updated_at
pushed_at
language
topics
license
README excerpt
```

### RSS

Use RSS for durable high-signal sources.

Start list:

```text
OpenAI blog/changelog
Anthropic news/changelog
Google DeepMind blog
Meta AI blog
Mistral AI news
LangChain blog/changelog
Vercel AI SDK changelog
Exa blog/changelog
Tavily blog/changelog
Firecrawl changelog
Jina AI blog
Hacker News front page / who is hiring / launch HN
Product Hunt AI category if available
GitHub Trending via unofficial feed if available
```

---

## 10. Patrol configuration

Create `src/config/patrols.ts`.

```ts
export const PATROLS = [
  {
    name: "ai-search-research-tools",
    priority: 10,
    description:
      "Find new tools and APIs that improve AI web search, deep research, citation quality, source discovery, crawling, extraction, and synthesis.",
    queries: [
      "new AI search API for agents deep research launched",
      "LLM web research API agent search tool",
      "deep research agent open source web search citations",
      "new tools for AI agents web browsing search extraction",
      "AI-native search API Exa Tavily alternatives"
    ],
    providers: ["exa", "tavily", "github"],
    minScoreForDeepResearch: 7.5
  },
  {
    name: "agent-infrastructure",
    priority: 20,
    description:
      "Find agent frameworks and infrastructure for orchestration, tool use, memory, planning, human-in-loop, and durable execution.",
    queries: [
      "new AI agent framework durable execution memory tools",
      "agent orchestration framework TypeScript LLM",
      "long running AI agent framework memory",
      "human in the loop AI agent workflow framework",
      "MCP agent framework new"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "evals-observability",
    priority: 30,
    description:
      "Find tools for evaluating, tracing, monitoring, debugging, and improving AI agents.",
    queries: [
      "new AI agent eval framework open source",
      "LLM observability tracing agent evaluation tool",
      "AI agent monitoring debugging framework",
      "prompt evals LLM regression testing new tool",
      "LLM tracing platform agent observability"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "browser-automation",
    priority: 40,
    description:
      "Find tools for browser agents, computer use, web automation, scraping, and task execution.",
    queries: [
      "browser agent framework AI automation new",
      "computer use agent browser automation open source",
      "AI web automation tool for agents",
      "browser-use alternatives agent automation",
      "headless browser AI agent framework"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "memory-rag-retrieval",
    priority: 50,
    description:
      "Find memory systems, RAG tools, retrieval frameworks, vector search, long-term memory, and knowledge systems useful for Innovera.",
    queries: [
      "AI agent memory system open source",
      "long term memory for AI agents",
      "RAG evaluation retrieval framework new",
      "knowledge graph memory LLM agents",
      "vector database agent memory new feature"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "model-api-capability-changes",
    priority: 60,
    description:
      "Find model and API feature changes that could unlock new Innovera capabilities.",
    queries: [
      "new LLM API feature tool calling structured output agents",
      "new model API computer use browser agent",
      "LLM provider changelog structured outputs agents",
      "new multimodal model API agent tools",
      "AI model pricing context window tool use update"
    ],
    providers: ["exa", "tavily", "rss"]
  },
  {
    name: "competitive-agent-companies",
    priority: 70,
    description:
      "Find companies building AI agent platforms, AI workflow automation, research agents, and enterprise copilots that may compete with or inspire Innovera.",
    queries: [
      "new AI agent platform startup enterprise workflows",
      "AI workflow automation company agents launched",
      "enterprise AI agents company research automation",
      "AI copilot agent platform vertical SaaS launched",
      "autonomous business process AI agent company"
    ],
    providers: ["exa", "tavily", "serper"]
  }
] as const;
```

---

## 11. LLM model strategy

Use OpenRouter as the model gateway.

Configure three model tiers:

```ts
export const MODELS = {
  triage: process.env.OPENROUTER_TRIAGE_MODEL ?? "openai/gpt-5.2-mini",
  extraction: process.env.OPENROUTER_EXTRACTION_MODEL ?? "anthropic/claude-sonnet-4.6",
  brief: process.env.OPENROUTER_BRIEF_MODEL ?? "openai/gpt-5.2",
  strategy: process.env.OPENROUTER_STRATEGY_MODEL ?? "anthropic/claude-opus-4.7"
};
```

Replace with actual preferred model IDs available in the OpenRouter account.

### Use structured outputs

Every classification/extraction step should request strict JSON.

Tasks that need JSON:

```text
candidate extraction
dedupe decision
scoring
brief metadata
feedback lesson extraction
weekly self-review
```

### Log every call

Log:

```text
model
task
prompt version
latency
input tokens
output tokens
cost
status
error
```

This is mandatory because pay-as-you-go providers can quietly become expensive.

---

## 12. Prompt design

### System prompt: Scout identity

```text
You are Hermes Scout, Innovera's always-on AI opportunity scout.

Your job is to discover and evaluate tools, APIs, companies, repos, papers, features, workflows, and market signals that could help Innovera build better AI products, improve agent capabilities, improve internal research, improve customer value, or detect competitive threats.

You are not an AI-news summarizer. You are an opportunity analyst.

Prioritize findings that create one of these actions:
- benchmark
- prototype
- integrate
- buy
- partner
- watch
- competitive warning
- ignore with reason

Reject generic AI hype, listicles, funding-only announcements, and tools with no obvious relevance to Innovera.
```

### Candidate extraction prompt

Input:

```text
patrol definition
raw search results
recently seen entities
active agent lessons
```

Output schema:

```json
{
  "candidates": [
    {
      "name": "string",
      "type": "tool|company|api|repo|paper|feature|trend|competitor|workflow|other",
      "category": "string",
      "canonical_url": "string|null",
      "summary": "string",
      "evidence_urls": ["string"],
      "possible_use_cases": ["string"],
      "risks": ["string"],
      "reject": false,
      "reject_reason": "string|null"
    }
  ]
}
```

Rules:

```text
Extract only concrete candidates.
Do not extract generic news narratives.
Do not extract listicles unless a specific tool/company/repo inside the list is valuable.
Prefer official pages, docs, repos, changelogs, and technical posts.
```

### Scoring prompt

Scoring dimensions:

```text
strategic_relevance  0–10
actionability        0–10
integration_fit      0–10
evidence_quality     0–10
novelty              0–10
urgency              0–10
confidence           0–1
```

Weights:

```text
0.25 strategic_relevance
0.20 actionability
0.20 integration_fit
0.15 evidence_quality
0.10 novelty
0.10 urgency
```

Output schema:

```json
{
  "strategic_relevance": 8.0,
  "actionability": 7.5,
  "integration_fit": 8.0,
  "evidence_quality": 7.0,
  "novelty": 6.5,
  "urgency": 5.0,
  "total_score": 7.35,
  "confidence": 0.78,
  "rationale": "string",
  "recommended_action": "benchmark|prototype|integrate|buy|partner|watch|competitive_warning|ignore",
  "why_it_matters": "string"
}
```

### Deep research prompt

Trigger only if:

```text
total_score >= SCOUT_MIN_SCORE_FOR_DEEP_RESEARCH
or recommended_action in ["benchmark", "prototype", "competitive_warning"]
```

The deep research brief must answer:

```text
What is it?
What changed / why now?
Why does it matter to Innovera?
What use cases could it unlock?
How would we test it?
What are the risks?
What are the alternatives?
What is the smallest useful experiment?
What is the recommendation?
```

---

## 13. Dedupe/entity resolution

Dedupe must happen at three levels.

### URL-level dedupe

Normalize URL:

```text
lowercase host
remove utm params
remove trailing slash
canonicalize common redirects
hash canonical URL
```

### Candidate-level dedupe

Use deterministic slug:

```text
name + type + canonical domain
```

Examples:

```text
exa + api + exa.ai
tavily + api + tavily.com
gpt-researcher + repo + github.com/assafelovic/gpt-researcher
```

### Semantic dedupe

Use LLM only when deterministic logic is uncertain.

Prompt:

```text
Are these two candidates the same product/company/repo/feature?
Return same_entity: true/false and rationale.
```

Store merges in metadata before adding a dedicated merge table.

---

## 14. Notion design

Create a Notion data source called:

```text
AI Opportunity Radar
```

Suggested properties:

```text
Name                   title
Status                 select: New, Watching, Benchmark, Testing, Adopted, Rejected, Archived
Type                   select
Category               select or text
Score                  number
Strategic Relevance    number
Actionability          number
Integration Fit        number
Evidence Quality       number
Novelty                number
Urgency                number
Confidence             number
Recommended Action     select
First Seen             date
Last Seen              date
Canonical URL          url
Source Count           number
Tags                   multi-select
Owner                  person
Decision               select
Rejected Reason        text
Supabase ID            rich text
```

Page body:

```md
# Opportunity brief

## Summary

## Why it matters for Innovera

## What changed / why now

## Evidence

## Potential use cases

## Integration path

## Risks

## Alternatives / competitors

## Suggested experiment

## Score breakdown

## Recommendation

## Prior related findings

## Feedback history
```

Only publish to Notion when:

```text
score >= SCOUT_MIN_SCORE_FOR_NOTION
or recommended_action is benchmark/prototype/competitive_warning
or human manually promotes it
```

If an opportunity already has a Notion page, update the page rather than creating a duplicate.

---

## 15. Daily email design

Email subject:

```text
[Innovera Scout] {N} AI opportunities — {B} benchmark-worthy — {date}
```

Email body:

```md
# Innovera AI Opportunity Radar

## Top opportunities today

1. {Name}
   Score: {score}
   Action: {recommended_action}
   Why it matters: {one_sentence}
   Notion: {link}
   Feedback: Useful | Benchmark | Watch | Reject

## Worth benchmarking

## Watchlist changes

## Rejected/downranked

## Source performance

## Cost summary
```

Feedback links should call an internal endpoint:

```text
GET /api/scout/feedback?opportunity_id=...&digest_id=...&decision=benchmark&token=...
```

For security, sign feedback links.

Use HMAC:

```text
token = hmac_sha256(secret, opportunity_id + digest_id + decision + reviewer_email)
```

The feedback endpoint should:

```text
verify token
write feedback_events row
update opportunity status if needed
return a tiny success page
```

---

## 16. Trigger.dev tasks

### `scout.daily-scan`

Schedule:

```text
0 7 * * 1-5 America/Denver
```

Responsibilities:

```text
create scan_runs row
load active patrols
trigger source patrol subtasks
wait for patrol completion
trigger candidate extraction
trigger scoring
trigger deep research for high-score items
trigger digest creation
trigger Notion publishing
trigger email sending
mark scan run complete
```

### `scout.source-patrol`

Input:

```ts
{
  scanRunId: string;
  patrolName: string;
  provider: SourceProvider;
  queries: string[];
  dateWindowStart: string;
  dateWindowEnd: string;
}
```

Responsibilities:

```text
execute provider queries
normalize results
insert raw_items with dedupe_key
log provider_calls
respect daily budget
```

### `scout.classify-candidates`

Responsibilities:

```text
load raw_items for scan run
batch by patrol
extract candidates
resolve entities
insert/update opportunities
insert evidence
score candidates
```

### `scout.deep-research`

Responsibilities:

```text
select high-score opportunities
gather more evidence
scrape important URLs
call Exa/Tavily deep search where useful
write opportunity brief
update Notion-ready markdown
```

### `scout.publish-digest`

Responsibilities:

```text
rank top opportunities
create digest row
publish/update Notion pages
send daily email
write digest_items
```

### `scout.weekly-review`

Responsibilities:

```text
summarize source performance
summarize accepted/rejected feedback
identify repeated false positives
write new agent lessons
suggest patrol updates
email weekly review
```

### `scout.watchlist-monitor`

Schedule:

```text
0 9 * * 1-5 America/Denver
```

Responsibilities:

```text
check known watchlist URLs
use Firecrawl/Jina for diff/extraction
detect meaningful changes
create evidence and update opportunities
alert only if score/urgency changes
```

---

## 17. Ranking logic

Final ranking should not be pure LLM score.

Use:

```text
rank_score =
  total_score
  + action_bonus
  + feedback_bonus
  + novelty_bonus
  + urgency_bonus
  - duplicate_penalty
  - low_evidence_penalty
  - recently_rejected_penalty
```

Example:

```ts
function computeRankScore(opportunity: Opportunity): number {
  let score = opportunity.totalScore ?? 0;

  if (opportunity.recommendedAction === "benchmark") score += 0.8;
  if (opportunity.recommendedAction === "prototype") score += 0.6;
  if (opportunity.recommendedAction === "competitive_warning") score += 0.7;

  if (opportunity.evidenceCount >= 3) score += 0.3;
  if (opportunity.wasRecentlyRejected) score -= 3.0;
  if (opportunity.isLikelyDuplicate) score -= 2.0;
  if ((opportunity.evidenceQuality ?? 0) < 5) score -= 0.8;

  return score;
}
```

---

## 18. Feedback learning

Feedback should update:

```text
opportunity.status
feedback_events
agent_lessons
future ranking
patrol source weights
```

Examples:

```text
If Harry clicks "already known" often for a source:
  downrank that source or require stronger novelty.

If Harry clicks "benchmark" on search/research tools:
  boost similar categories.

If Harry clicks "reject" on funding-only announcements:
  create lesson: "Downrank funding-only items unless there is a product/API change."
```

Weekly self-review should produce lessons like:

```json
{
  "lessons": [
    {
      "lesson": "Downrank generic funding announcements unless they include a concrete product, API, release, benchmark, or customer adoption signal.",
      "source": "weekly_review",
      "strength": 0.9
    }
  ],
  "patrol_changes": [
    {
      "patrol": "competitive-agent-companies",
      "change": "Add negative terms for funding-only announcements."
    }
  ]
}
```

Do not auto-apply major prompt/rubric changes without logging them.

---

## 19. Source quality rules

Boost:

```text
official docs
official changelogs
GitHub repos
technical blog posts
API docs
benchmark pages
pricing pages
papers
credible launch posts with concrete product info
```

Downrank:

```text
top-100 AI tool listicles
generic AI newsletters
funding-only announcements
SEO directories
thin wrappers around existing LLMs
products with no docs/API/repo
duplicate reposts
viral demos with no implementation path
```

Reject unless exceptional:

```text
pure thought leadership
opinion threads
generic "AI will change X" posts
unverifiable claims
no source URL
no clear Innovera relevance
```

---

## 20. Cost and rate-limit controls

Hard controls:

```text
max provider calls per daily scan
max LLM calls per daily scan
max deep research jobs per day
max raw results per query
max Firecrawl scrapes per candidate
max retries per provider
global daily cost budget
```

Implementation pattern:

```ts
await assertBudgetAvailable({
  scanRunId,
  provider: "exa",
  estimatedCostUsd: 0.01
});
```

If budget is exceeded:

```text
stop deep research first
continue low-cost dedupe/scoring
send digest with budget warning
```

---

## 21. Reliability rules

Every task must be:

```text
idempotent
retry-safe
logged
budget-aware
able to resume
```

Idempotency examples:

```text
raw_items unique(dedupe_key)
opportunities unique(slug)
digests unique(digest_date)
opportunity_evidence unique(opportunity_id, url)
Trigger task idempotency keys where supported
```

If a scan partially fails:

```text
mark scan_run status = partial_failed
send digest if enough data exists
include failure summary in email
```

---

## 22. API endpoints

### Feedback endpoint

```text
GET /api/scout/feedback
```

Parameters:

```text
opportunity_id
digest_id
decision
reviewer_email
token
comment optional
```

Behavior:

```text
verify token
insert feedback_events
update opportunity.status
return success HTML
```

### Manual scan endpoint

```text
POST /api/scout/run
```

Requires admin secret.

Body:

```json
{
  "patrols": ["ai-search-research-tools"],
  "dryRun": false
}
```

### Health endpoint

```text
GET /api/scout/health
```

Returns:

```json
{
  "ok": true,
  "last_scan_at": "...",
  "last_digest_at": "...",
  "open_errors": 0
}
```

---

## 23. Testing strategy

### Unit tests

Test:

```text
URL canonicalization
dedupe key generation
provider result normalization
score calculation
rank score calculation
feedback token signing/verification
Notion property mapping
email template rendering
```

### Integration tests

Use recorded fixtures for:

```text
Exa response
Tavily response
Firecrawl response
GitHub response
OpenRouter structured response
Notion page create/update
```

### E2E dry run

Create command:

```bash
pnpm scout:dry-run --patrol ai-search-research-tools --limit 20
```

Dry run should:

```text
run providers
store raw_items in dev Supabase
classify 5 candidates
write digest preview to local markdown
not send email
not create Notion pages unless --publish is passed
```

### Evaluation set

Create `src/tests/fixtures/evals/opportunities.json`.

Include examples:

```text
Exa
Tavily
GPT Researcher
Firecrawl
Browserbase
LangSmith
OpenTelemetry-style LLM tracing tool
Generic funding announcement
Top 100 AI tools listicle
Thin ChatGPT wrapper
```

Expected labels:

```text
useful
not useful
already known
benchmark
watch
reject
```

Measure:

```text
precision of top 5
duplicate rate
rejected-listicle rate
score calibration
cost per useful finding
```

---

## 24. Claude Code workflow

Create `CLAUDE.md` in the repo with:

```md
# Claude instructions for Innovera AI Opportunity Radar

You are helping build Hermes Scout, an always-on AI opportunity radar for Innovera.

## Product goal

Find AI tools, APIs, repos, companies, features, and research that Innovera should build, buy, benchmark, integrate, watch, or ignore.

## Stack

- TypeScript
- Trigger.dev
- Supabase
- OpenRouter
- Exa
- Tavily
- Firecrawl
- Notion
- Email digest

## Rules

- Prefer small, testable increments.
- Do not invent undocumented APIs.
- Add types before complex logic.
- Use strict JSON schemas for LLM calls.
- Every scheduled task must be idempotent.
- Every provider call must be logged.
- Every LLM call must be logged.
- Never expose service role keys to the browser.
- Do not build a UI until the core scan -> score -> digest loop works.
- Update plan.md when implementation diverges.

## Commands

Fill this in after repo setup:

- install:
- typecheck:
- test:
- lint:
- dev:
- trigger dev:
- supabase start:
- scout dry run:
```

Then use Claude Code phase by phase.

### Claude Code prompt for phase 0

```text
Read plan.md and CLAUDE.md. Do not implement the whole system. First create the project skeleton, package.json scripts, env validation, and typed config files. Then stop and summarize what changed.
```

### Claude Code prompt for phase 1

```text
Implement the Supabase migration from plan.md. Add generated TypeScript types or handwritten DB types. Add URL canonicalization and dedupe-key utilities with unit tests.
```

### Claude Code prompt for phase 2

```text
Implement provider clients for Exa, Tavily, Firecrawl, GitHub, and RSS. Each provider should normalize results to RawItem. Add fixtures and unit tests. Do not call real APIs in tests.
```

### Claude Code prompt for phase 3

```text
Implement scout.source-patrol and scout.daily-scan in Trigger.dev. The daily scan should create a scan_runs row, run source patrols, insert raw_items, and mark the run complete. No LLM calls yet.
```

### Claude Code prompt for phase 4

```text
Implement OpenRouter client with structured JSON output support. Add candidate extraction, scoring, and LLM call logging. Use strict schemas and fixtures. Add dry-run mode.
```

### Claude Code prompt for phase 5

```text
Implement deep research, opportunity brief generation, Notion publishing, and daily digest email. Use feature flags so email and Notion publishing can be disabled in development.
```

### Claude Code prompt for phase 6

```text
Implement feedback links, signed feedback tokens, the feedback endpoint, feedback_events writes, and status updates. Add tests for token verification and status transitions.
```

### Claude Code prompt for phase 7

```text
Implement weekly self-review. Summarize feedback, source performance, cost, duplicates, rejected reasons, and proposed agent lessons. Store lessons but do not silently change prompts without logging.
```

---

## 25. Implementation milestones

### Milestone 1 — Data foundation

Done when:

```text
Supabase migration applies cleanly
env validation works
raw_items can be inserted
scan_runs can be created/closed
unit tests pass
```

### Milestone 2 — Provider ingestion

Done when:

```text
Exa/Tavily/Firecrawl/GitHub/RSS clients exist
provider calls normalize to RawItem
dry run can fetch and store raw items
duplicates are suppressed
provider calls are logged
```

### Milestone 3 — Agent intelligence

Done when:

```text
raw items become candidates
candidates become opportunities
opportunities receive structured scores
score history is stored
high-score candidates trigger deep research
```

### Milestone 4 — Human-facing loop

Done when:

```text
top opportunities publish to Notion
daily digest email sends
feedback links work
feedback updates Supabase
digest rows and digest_items are stored
```

### Milestone 5 — Self-improvement

Done when:

```text
weekly self-review runs
lessons are generated from feedback
source performance is measured
prompt/rubric changes are versioned
```

---

## 26. MVP acceptance criteria

The MVP is successful when:

```text
1. A scheduled daily scan runs on weekdays.
2. It searches at least Exa, Tavily, Firecrawl, GitHub, and RSS.
3. It stores all raw items in Supabase.
4. It dedupes by URL and candidate entity.
5. It scores opportunities using the rubric.
6. It creates Notion pages for top findings.
7. It sends Harry a daily email.
8. Email feedback links write to Supabase.
9. A weekly review summarizes what worked and what failed.
10. The system can be dry-run locally without sending email or touching Notion.
```

Quality bar:

```text
Top 5 daily findings should contain no more than 1 obvious low-value item.
Weekly digest should produce at least 3 genuinely useful opportunities or watchlist updates.
Duplicate resurfacing should be rare.
Funding-only announcements should usually be rejected.
```

---

## 27. Suggested first benchmark

Because the original trigger for this project was web research quality, run a benchmark early.

Compare:

```text
current Innovera web research tool
Exa
Tavily
Firecrawl + search provider
Serper
Jina Reader
GPT Researcher or similar open-source deep research tool
```

Benchmark tasks:

```text
1. Find new AI search APIs useful for agents.
2. Find recent open-source agent evaluation frameworks.
3. Find companies building browser-use agents.
4. Find tools for long-term memory in AI agents.
5. Find model API changes relevant to tool-calling and structured outputs.
6. Find competitors to an AI workflow automation platform.
```

Measure:

```text
source quality
freshness
citation accuracy
coverage
cost
latency
API ergonomics
failure modes
```

Store results as an `experiments` table later.

---

## 28. Future extensions

After MVP:

```text
Slack digest and feedback buttons
Linear ticket creation for benchmark-worthy items
custom dashboard
watchlist diff monitor using Firecrawl monitors
semantic search over opportunity memory
source reputation scoring
multi-reviewer workflow
benchmark automation
Chrome/browser-use exploration
outreach assistant for partnership candidates
auto-generated "brief me before meeting" pages
```

---

## 29. Open TODOs

These are not blockers.

```text
DONE: Email provider = Resend (src/email/sendDigest.ts).
TODO: Create Notion data source and copy NOTION_OPPORTUNITIES_DATA_SOURCE_ID.
TODO: Choose exact OpenRouter model IDs for triage, extraction, brief, and strategy (defaults in src/config/models.ts, overridable via OPENROUTER_*_MODEL env vars).
DONE: Feedback endpoint = InsForge edge function (functions/feedback.ts), since there is no Next.js app.
DONE: Standalone repo = this repo (deep-horizon).
TODO: Add actual Hermes runtime interface once available.
DONE: Initial RSS feed list in src/config/patrols.ts (RSS_FEEDS) — verify URLs on first live run.
TODO: Add GitHub token (rate limits handled by withRetry on 429).
DONE: pgvector enabled in the migration; embedding writes postponed until dedupe requires them.
TODO: Run `npx trigger.dev init` and replace the placeholder project ref in trigger.config.ts.
TODO: Set SCOUT_FEEDBACK_SECRET in both Trigger.dev env (signing) and InsForge secrets (verification, `npx @insforge/cli secrets add`).
```

### Implementation divergences from this plan

```text
1. opportunity_briefs.opportunity_id is nullable (plan §7 said not null) so the
   weekly self-review can be stored as a run-level brief artifact.
2. Feature flags SCOUT_ENABLE_EMAIL / SCOUT_ENABLE_NOTION (default false) gate
   outbound side effects in development, per §24 phase 5.
3. Feedback links point at /functions/feedback on INSFORGE_URL rather than
   /api/scout/feedback (no Next.js app exists). Manual scan and health
   endpoints (§22) are deferred: manual runs use the Trigger.dev dashboard or
   `pnpm scout:dry-run`, which §2 lists as the MVP manual-run path.
4. total_score is recomputed deterministically from the weights (§12) instead
   of trusting the LLM's arithmetic; the LLM's value is kept in raw_output.
5. PIVOT (2026-06-09): Supabase → InsForge (project deep-horizon,
   4e15024f-6d89-44b5-955f-20b7c6c61c9e, us-west). The InsForge SDK's database
   module is postgrest-js, so all query code is unchanged; only the client
   factory (createAdminClient), env vars (INSFORGE_URL / INSFORGE_API_KEY),
   and the feedback function (Deno Subhosting, functions/feedback.ts) changed.
   Migrations live in migrations/ and apply via `pnpm db:migrate`. The Notion
   property "Supabase ID" was renamed "Scout ID". Where older sections of this
   plan say "Supabase", read "InsForge".
```

---

## 30. Build order

Recommended order:

```text
1. Create repo skeleton and CLAUDE.md
2. Add Supabase migration
3. Add env validation and config
4. Add provider clients and fixtures
5. Add daily Trigger scan that stores raw_items
6. Add candidate extraction
7. Add scoring
8. Add Notion publishing
9. Add email digest
10. Add feedback endpoint
11. Add weekly self-review
12. Add watchlist monitor
```

Do not build generalized Hermes first.

Build a vertical Hermes Scout first. Extract a general Hermes harness later if the patterns repeat.

---

## 31. Core principle

Every run should produce durable, inspectable state.

Bad:

```text
agent thinks, writes an email, forgets why
```

Good:

```text
scan run
raw items
candidates
scores
evidence
briefs
digest
feedback
lessons
```

This makes Hermes Scout a compounding strategic system instead of a noisy daily AI newsletter.
