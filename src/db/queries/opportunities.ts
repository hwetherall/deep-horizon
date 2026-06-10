import { getDb } from "../client.js";
import type {
  Candidate,
  OpportunityRow,
  OpportunityScore,
  OpportunityStatus
} from "../types.js";
import { opportunitySlug, canonicalizeUrl, sourceDomain } from "../../utils/hash.js";

/**
 * Insert or update an opportunity by deterministic slug (plan §13).
 * Existing rows get last_seen_at bumped and missing fields filled.
 */
export async function upsertOpportunity(candidate: Candidate): Promise<OpportunityRow> {
  const db = getDb();
  const slug = opportunitySlug(candidate.name, candidate.type, candidate.canonicalUrl);
  const now = new Date().toISOString();

  const { data: existing, error: selectError } = await db
    .from("opportunities")
    .select()
    .eq("slug", slug)
    .maybeSingle();
  if (selectError) throw new Error(`upsertOpportunity select failed: ${selectError.message}`);

  if (existing) {
    const { data, error } = await db
      .from("opportunities")
      .update({
        last_seen_at: now,
        summary: existing.summary ?? candidate.summary,
        canonical_url:
          existing.canonical_url ??
          (candidate.canonicalUrl ? canonicalizeUrl(candidate.canonicalUrl) : null),
        category: existing.category ?? candidate.category
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(`upsertOpportunity update failed: ${error.message}`);
    return data as OpportunityRow;
  }

  const { data, error } = await db
    .from("opportunities")
    .insert({
      name: candidate.name,
      slug,
      type: candidate.type,
      category: candidate.category,
      canonical_url: candidate.canonicalUrl ? canonicalizeUrl(candidate.canonicalUrl) : null,
      summary: candidate.summary,
      first_seen_at: now,
      last_seen_at: now,
      metadata: {
        possible_use_cases: candidate.possibleUseCases,
        risks: candidate.risks
      }
    })
    .select()
    .single();
  if (error) throw new Error(`upsertOpportunity insert failed: ${error.message}`);
  return data as OpportunityRow;
}

export async function addEvidence(params: {
  opportunityId: string;
  rawItemId?: string;
  url: string;
  title?: string;
  quote?: string;
  summary?: string;
  publishedAt?: string;
  evidenceType?: string;
  confidence?: number;
}): Promise<void> {
  const { error } = await getDb()
    .from("opportunity_evidence")
    .upsert(
      {
        opportunity_id: params.opportunityId,
        raw_item_id: params.rawItemId ?? null,
        url: params.url,
        title: params.title ?? null,
        source_domain: sourceDomain(params.url) ?? null,
        evidence_type: params.evidenceType ?? "source",
        quote: params.quote ?? null,
        summary: params.summary ?? null,
        published_at: params.publishedAt ?? null,
        confidence: params.confidence ?? null
      },
      { onConflict: "opportunity_id,url", ignoreDuplicates: true }
    );
  if (error) throw new Error(`addEvidence failed: ${error.message}`);
}

export async function recordScore(params: {
  opportunityId: string;
  scanRunId: string | null;
  scoringVersion: string;
  score: OpportunityScore;
  recommendedAction: string;
  whyItMatters: string;
  rawOutput: Record<string, unknown>;
}): Promise<void> {
  const db = getDb();
  const s = params.score;

  const { error: histError } = await db.from("opportunity_scores").insert({
    opportunity_id: params.opportunityId,
    scan_run_id: params.scanRunId,
    scoring_version: params.scoringVersion,
    strategic_relevance: s.strategicRelevance,
    actionability: s.actionability,
    integration_fit: s.integrationFit,
    evidence_quality: s.evidenceQuality,
    novelty: s.novelty,
    urgency: s.urgency,
    total_score: s.totalScore,
    confidence: s.confidence,
    rationale: s.rationale,
    raw_output: params.rawOutput
  });
  if (histError) throw new Error(`recordScore history failed: ${histError.message}`);

  const { error } = await db
    .from("opportunities")
    .update({
      strategic_relevance: s.strategicRelevance,
      actionability: s.actionability,
      integration_fit: s.integrationFit,
      evidence_quality: s.evidenceQuality,
      novelty: s.novelty,
      urgency: s.urgency,
      total_score: s.totalScore,
      confidence: s.confidence,
      recommended_action: params.recommendedAction,
      why_it_matters: params.whyItMatters
    })
    .eq("id", params.opportunityId);
  if (error) throw new Error(`recordScore update failed: ${error.message}`);
}

export async function getTopOpportunities(params: {
  minScore?: number;
  limit?: number;
  sinceIso?: string;
}): Promise<OpportunityRow[]> {
  let query = getDb()
    .from("opportunities")
    .select()
    .order("total_score", { ascending: false, nullsFirst: false })
    .limit(params.limit ?? 20);
  if (params.minScore !== undefined) query = query.gte("total_score", params.minScore);
  if (params.sinceIso) query = query.gte("last_seen_at", params.sinceIso);
  const { data, error } = await query;
  if (error) throw new Error(`getTopOpportunities failed: ${error.message}`);
  return (data ?? []) as OpportunityRow[];
}

export async function updateOpportunityStatus(
  opportunityId: string,
  status: OpportunityStatus
): Promise<void> {
  const { error } = await getDb()
    .from("opportunities")
    .update({ status })
    .eq("id", opportunityId);
  if (error) throw new Error(`updateOpportunityStatus failed: ${error.message}`);
}

export async function getRecentEntityNames(limit = 200): Promise<string[]> {
  const { data, error } = await getDb()
    .from("opportunities")
    .select("name")
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getRecentEntityNames failed: ${error.message}`);
  return (data ?? []).map((r) => r.name as string);
}

export async function getEvidenceCount(opportunityId: string): Promise<number> {
  const { count, error } = await getDb()
    .from("opportunity_evidence")
    .select("id", { count: "exact", head: true })
    .eq("opportunity_id", opportunityId);
  if (error) throw new Error(`getEvidenceCount failed: ${error.message}`);
  return count ?? 0;
}

export async function wasRecentlyRejected(
  opportunityId: string,
  withinDays = 30
): Promise<boolean> {
  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await getDb()
    .from("feedback_events")
    .select("id", { count: "exact", head: true })
    .eq("opportunity_id", opportunityId)
    .in("decision", ["reject", "not_useful"])
    .gte("created_at", since);
  if (error) throw new Error(`wasRecentlyRejected failed: ${error.message}`);
  return (count ?? 0) > 0;
}
