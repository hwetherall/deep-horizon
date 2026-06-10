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

export type FeedbackDecision =
  | "useful"
  | "not_useful"
  | "already_known"
  | "benchmark"
  | "watch"
  | "reject"
  | "adopted"
  | "needs_more_research";

export type RecommendedAction =
  | "benchmark"
  | "prototype"
  | "integrate"
  | "buy"
  | "partner"
  | "watch"
  | "competitive_warning"
  | "ignore";

/** Normalized provider result, pre-insert. */
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

// ---------------------------------------------------------------------------
// Database row types (handwritten; mirror migrations/20260609000001_init-hermes-scout.sql)
// ---------------------------------------------------------------------------

export interface ScanRunRow {
  id: string;
  run_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  trigger_run_id: string | null;
  date_window_start: string | null;
  date_window_end: string | null;
  metadata: Record<string, unknown>;
  error: string | null;
}

export interface SourcePatrolRow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  cadence: string;
  priority: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RawItemRow {
  id: string;
  scan_run_id: string | null;
  provider: string;
  patrol_name: string | null;
  query: string | null;
  title: string | null;
  url: string;
  canonical_url: string | null;
  source_domain: string | null;
  snippet: string | null;
  raw_content: string | null;
  published_at: string | null;
  discovered_at: string;
  provider_score: number | null;
  provider_payload: Record<string, unknown>;
  content_hash: string | null;
  dedupe_key: string;
  is_duplicate: boolean;
  duplicate_of: string | null;
}

export interface OpportunityRow {
  id: string;
  name: string;
  slug: string;
  type: OpportunityType;
  category: string | null;
  status: OpportunityStatus;
  canonical_url: string | null;
  description: string | null;
  summary: string | null;
  why_it_matters: string | null;
  recommended_action: string | null;
  strategic_relevance: number | null;
  actionability: number | null;
  integration_fit: number | null;
  evidence_quality: number | null;
  novelty: number | null;
  urgency: number | null;
  total_score: number | null;
  confidence: number | null;
  first_seen_at: string;
  last_seen_at: string;
  notion_page_id: string | null;
  notion_url: string | null;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
}

export interface OpportunityEvidenceRow {
  id: string;
  opportunity_id: string;
  raw_item_id: string | null;
  url: string;
  title: string | null;
  source_domain: string | null;
  evidence_type: string;
  quote: string | null;
  summary: string | null;
  published_at: string | null;
  discovered_at: string;
  confidence: number | null;
  metadata: Record<string, unknown>;
}

export interface OpportunityScoreRow {
  id: string;
  opportunity_id: string;
  scan_run_id: string | null;
  scoring_version: string;
  strategic_relevance: number;
  actionability: number;
  integration_fit: number;
  evidence_quality: number;
  novelty: number;
  urgency: number;
  total_score: number;
  confidence: number;
  rationale: string;
  created_at: string;
  raw_output: Record<string, unknown>;
}

export interface OpportunityBriefRow {
  id: string;
  opportunity_id: string;
  scan_run_id: string | null;
  title: string;
  markdown: string;
  model: string | null;
  prompt_version: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface DigestRow {
  id: string;
  scan_run_id: string | null;
  digest_date: string;
  title: string;
  markdown: string;
  email_subject: string | null;
  email_sent_at: string | null;
  email_provider_message_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface DigestItemRow {
  id: string;
  digest_id: string;
  opportunity_id: string;
  rank: number;
  reason: string | null;
}

export interface FeedbackEventRow {
  id: string;
  opportunity_id: string | null;
  digest_id: string | null;
  decision: FeedbackDecision;
  reviewer_email: string;
  comment: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface WatchlistItemRow {
  id: string;
  opportunity_id: string | null;
  name: string;
  url: string | null;
  reason: string | null;
  enabled: boolean;
  last_checked_at: string | null;
  next_check_at: string | null;
  metadata: Record<string, unknown>;
}

export interface AgentLessonRow {
  id: string;
  lesson: string;
  source: string;
  strength: number;
  active: boolean;
  created_at: string;
  expires_at: string | null;
  metadata: Record<string, unknown>;
}

export interface ProviderCallRow {
  id: string;
  scan_run_id: string | null;
  provider: string;
  endpoint: string;
  request_hash: string | null;
  status: string;
  cost_usd: number | null;
  latency_ms: number | null;
  created_at: string;
  metadata: Record<string, unknown>;
  error: string | null;
}

export interface LlmCallRow {
  id: string;
  scan_run_id: string | null;
  task: string;
  model: string;
  prompt_version: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number | null;
  status: string;
  created_at: string;
  request: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  error: string | null;
}
