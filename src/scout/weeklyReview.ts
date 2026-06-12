import { getDb } from "../db/client.js";
import { getEnv } from "../config/env.js";
import { getFeedbackSince, getActiveLessons, insertLessons } from "../db/queries/feedback.js";
import { getModels } from "../config/models.js";
import { callStructured } from "../llm/openrouter.js";
import { weeklyReviewSchema, weeklyReviewJsonSchema, type WeeklyReviewResult } from "../llm/schemas.js";
import { SCOUT_SYSTEM_PROMPT } from "../llm/prompts/system.js";
import {
  buildWeeklyReviewPrompt,
  WEEKLY_REVIEW_PROMPT_VERSION,
  type WeeklyReviewInput
} from "../llm/prompts/weekly-self-review.js";
import { Resend } from "resend";
import { logger } from "../utils/logger.js";

/**
 * Weekly self-review (plan §16/§18): summarize source performance and
 * feedback, generate lessons (stored, never silently applied to prompts),
 * email the review.
 */
export async function runWeeklyReview(params: {
  scanRunId: string;
}): Promise<WeeklyReviewResult> {
  const db = getDb();
  const env = getEnv();
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sinceIso = windowStart.toISOString();

  const input = await collectWeeklyStats(sinceIso, windowStart, windowEnd);

  const review = await callStructured({
    task: "weekly-self-review",
    model: getModels().strategy,
    promptVersion: WEEKLY_REVIEW_PROMPT_VERSION,
    system: SCOUT_SYSTEM_PROMPT,
    user: buildWeeklyReviewPrompt(input),
    schema: weeklyReviewSchema,
    jsonSchema: weeklyReviewJsonSchema as unknown as Record<string, unknown>,
    scanRunId: params.scanRunId,
    maxTokens: 6000,
    estimatedCostUsd: 0.2
  });

  // Store lessons; logged via the lessons table itself (plan §18: no silent changes).
  await insertLessons(
    review.lessons.map((l) => ({
      lesson: l.lesson,
      source: l.source || "weekly_review",
      strength: l.strength
    }))
  );

  // Persist the review as a scan-run artifact.
  await db.from("opportunity_briefs").insert({
    opportunity_id: null,
    scan_run_id: params.scanRunId,
    title: `Weekly self-review ${input.windowStart} → ${input.windowEnd}`,
    markdown: review.summary_markdown,
    model: getModels().strategy,
    prompt_version: WEEKLY_REVIEW_PROMPT_VERSION,
    metadata: { patrol_changes: review.patrol_changes }
  });

  if (env.SCOUT_ENABLE_EMAIL && env.RESEND_API_KEY) {
    try {
      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: env.DIGEST_FROM_EMAIL,
        to: env.DIGEST_TO_EMAIL,
        subject: `[Innovera Scout] Weekly review — ${input.windowEnd.slice(0, 10)}`,
        text: review.summary_markdown
      });
    } catch (error) {
      logger.warn("Weekly review email failed", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return review;
}

async function collectWeeklyStats(
  sinceIso: string,
  windowStart: Date,
  windowEnd: Date
): Promise<WeeklyReviewInput> {
  const db = getDb();

  const [rawItemsRes, scoresRes, digestsRes, providerCostRes, llmCostRes, feedback, lessons] =
    await Promise.all([
      db.from("raw_items").select("provider", { count: "exact" }).gte("discovered_at", sinceIso),
      db.from("opportunity_scores").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
      db.from("digests").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
      db.from("provider_calls").select("cost_usd").gte("created_at", sinceIso),
      db.from("llm_calls").select("cost_usd").gte("created_at", sinceIso),
      getFeedbackSince(sinceIso),
      getActiveLessons()
    ]);

  // Source performance: raw items per provider vs promoted (in any digest).
  const rawByProvider = new Map<string, number>();
  for (const row of rawItemsRes.data ?? []) {
    const p = row.provider as string;
    rawByProvider.set(p, (rawByProvider.get(p) ?? 0) + 1);
  }

  const { data: promotedRows } = await db
    .from("digest_items")
    .select("opportunity_id, digests!inner(created_at)")
    .gte("digests.created_at", sinceIso);
  const promotedCount = promotedRows?.length ?? 0;

  const sum = (rows: { cost_usd: unknown }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (Number(r.cost_usd) || 0), 0);

  // Each event carries a sentiment (faces) or a decision; report whichever is set.
  const signalOf = (f: { sentiment: string | null; decision: string | null }) =>
    f.sentiment ?? f.decision ?? "unknown";
  const feedbackSummary = new Map<string, number>();
  for (const f of feedback) {
    const signal = signalOf(f);
    feedbackSummary.set(signal, (feedbackSummary.get(signal) ?? 0) + 1);
  }

  // Resolve opportunity names for feedback details.
  const oppIds = [...new Set(feedback.map((f) => f.opportunity_id).filter(Boolean))] as string[];
  const nameById = new Map<string, string>();
  if (oppIds.length) {
    const { data: opps } = await db.from("opportunities").select("id, name").in("id", oppIds);
    for (const o of opps ?? []) nameById.set(o.id as string, o.name as string);
  }

  return {
    windowStart: windowStart.toISOString().slice(0, 10),
    windowEnd: windowEnd.toISOString().slice(0, 10),
    stats: {
      rawItems: rawItemsRes.count ?? rawItemsRes.data?.length ?? 0,
      candidates: scoresRes.count ?? 0,
      opportunitiesScored: scoresRes.count ?? 0,
      digestsSent: digestsRes.count ?? 0,
      providerCostUsd: sum(providerCostRes.data),
      llmCostUsd: sum(llmCostRes.data)
    },
    sourcePerformance: [...rawByProvider.entries()].map(([provider, rawItems]) => ({
      provider,
      rawItems,
      promoted: promotedCount
    })),
    feedbackSummary: [...feedbackSummary.entries()].map(([signal, count]) => ({
      signal,
      count
    })),
    feedbackDetails: feedback.map((f) => ({
      opportunityName: nameById.get(f.opportunity_id ?? "") ?? "(unknown)",
      signal: signalOf(f),
      comment: f.comment
    })),
    activeLessons: lessons.map((l) => l.lesson)
  };
}
