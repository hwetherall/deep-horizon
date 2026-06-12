import { getDb } from "../client.js";
import type {
  FeedbackDecision,
  FeedbackSentiment,
  FeedbackEventRow,
  AgentLessonRow
} from "../types.js";

export async function insertFeedbackEvent(params: {
  opportunityId: string;
  digestId?: string;
  decision?: FeedbackDecision;
  sentiment?: FeedbackSentiment;
  reviewerEmail: string;
  comment?: string;
  metadata?: Record<string, unknown>;
}): Promise<FeedbackEventRow> {
  if (!params.decision && !params.sentiment) {
    throw new Error("insertFeedbackEvent requires a decision or a sentiment");
  }
  const { data, error } = await getDb()
    .from("feedback_events")
    .insert({
      opportunity_id: params.opportunityId,
      digest_id: params.digestId ?? null,
      decision: params.decision ?? null,
      sentiment: params.sentiment ?? null,
      reviewer_email: params.reviewerEmail,
      comment: params.comment ?? null,
      metadata: params.metadata ?? {}
    })
    .select()
    .single();
  if (error) throw new Error(`insertFeedbackEvent failed: ${error.message}`);
  return data as FeedbackEventRow;
}

export async function getFeedbackSince(sinceIso: string): Promise<FeedbackEventRow[]> {
  const { data, error } = await getDb()
    .from("feedback_events")
    .select()
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getFeedbackSince failed: ${error.message}`);
  return (data ?? []) as FeedbackEventRow[];
}

/** One human-feedback data point joined to its opportunity, for the taste profile. */
export interface FeedbackSignal {
  opportunityName: string;
  category: string | null;
  type: string | null;
  recommendedAction: string | null;
  sentiment: FeedbackSentiment | null;
  decision: FeedbackDecision | null;
  comment: string | null;
  createdAt: string;
}

// Scoring calls this once per candidate within a scan; cache briefly so a run
// reads the same taste profile without refetching per candidate.
let signalsCache: { at: number; data: FeedbackSignal[] } | undefined;
const SIGNALS_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Recent human feedback joined to opportunity context (seed Q15). Feeds the
 * taste profile injected into extraction and scoring prompts so the scout
 * learns what Innovera finds interesting without waiting for the weekly review.
 */
export async function getRecentFeedbackSignals(params?: {
  days?: number;
  limit?: number;
}): Promise<FeedbackSignal[]> {
  const days = params?.days ?? 60;
  const limit = params?.limit ?? 100;
  if (!params && signalsCache && Date.now() - signalsCache.at < SIGNALS_CACHE_TTL_MS) {
    return signalsCache.data;
  }
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getDb()
    .from("feedback_events")
    .select(
      "sentiment, decision, comment, created_at, opportunities(name, category, type, recommended_action)"
    )
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getRecentFeedbackSignals failed: ${error.message}`);

  const signals = (data ?? []).flatMap((row) => {
    const r = row as Record<string, unknown>;
    const opp = r.opportunities as {
      name?: string;
      category?: string | null;
      type?: string | null;
      recommended_action?: string | null;
    } | null;
    if (!opp?.name) return [];
    return [
      {
        opportunityName: opp.name,
        category: opp.category ?? null,
        type: opp.type ?? null,
        recommendedAction: opp.recommended_action ?? null,
        sentiment: (r.sentiment ?? null) as FeedbackSentiment | null,
        decision: (r.decision ?? null) as FeedbackDecision | null,
        comment: (r.comment ?? null) as string | null,
        createdAt: String(r.created_at)
      }
    ];
  });
  if (!params) signalsCache = { at: Date.now(), data: signals };
  return signals;
}

/** Latest sentiment per opportunity, for showing existing ratings in the report. */
export async function getLatestSentimentByOpportunity(
  opportunityIds: string[]
): Promise<Map<string, FeedbackSentiment>> {
  const result = new Map<string, FeedbackSentiment>();
  if (opportunityIds.length === 0) return result;
  const { data, error } = await getDb()
    .from("feedback_events")
    .select("opportunity_id, sentiment, created_at")
    .in("opportunity_id", opportunityIds)
    .not("sentiment", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getLatestSentimentByOpportunity failed: ${error.message}`);
  for (const row of data ?? []) {
    const id = row.opportunity_id as string;
    if (!result.has(id)) result.set(id, row.sentiment as FeedbackSentiment);
  }
  return result;
}

export async function getActiveLessons(): Promise<AgentLessonRow[]> {
  const { data, error } = await getDb()
    .from("agent_lessons")
    .select()
    .eq("active", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("strength", { ascending: false });
  if (error) throw new Error(`getActiveLessons failed: ${error.message}`);
  return (data ?? []) as AgentLessonRow[];
}

export async function insertLessons(
  lessons: { lesson: string; source: string; strength: number }[]
): Promise<void> {
  if (lessons.length === 0) return;
  const { error } = await getDb().from("agent_lessons").insert(lessons);
  if (error) throw new Error(`insertLessons failed: ${error.message}`);
}
