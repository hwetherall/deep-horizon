import { getDb } from "../client.js";
import type { FeedbackDecision, FeedbackEventRow, AgentLessonRow } from "../types.js";

export async function insertFeedbackEvent(params: {
  opportunityId: string;
  digestId?: string;
  decision: FeedbackDecision;
  reviewerEmail: string;
  comment?: string;
  metadata?: Record<string, unknown>;
}): Promise<FeedbackEventRow> {
  const { data, error } = await getDb()
    .from("feedback_events")
    .insert({
      opportunity_id: params.opportunityId,
      digest_id: params.digestId ?? null,
      decision: params.decision,
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
