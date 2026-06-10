import { getDb } from "../db/client.js";
import type { OpportunityRow, OpportunityEvidenceRow } from "../db/types.js";
import { recordScore } from "../db/queries/opportunities.js";
import { getActiveLessons } from "../db/queries/feedback.js";
import { getModels } from "../config/models.js";
import { SCORING_VERSION, computeTotalScore } from "../config/scoring.js";
import { callStructured } from "../llm/openrouter.js";
import { scoreResultSchema, scoreJsonSchema, type ScoreResult } from "../llm/schemas.js";
import { SCOUT_SYSTEM_PROMPT } from "../llm/prompts/system.js";
import { buildScoringPrompt, SCORE_PROMPT_VERSION } from "../llm/prompts/score-candidate.js";

export async function scoreOpportunity(params: {
  scanRunId: string;
  opportunity: OpportunityRow;
}): Promise<ScoreResult> {
  const db = getDb();
  const { data: evidence, error } = await db
    .from("opportunity_evidence")
    .select("url, title, summary, quote")
    .eq("opportunity_id", params.opportunity.id)
    .limit(10);
  if (error) throw new Error(`scoreOpportunity evidence fetch failed: ${error.message}`);

  const lessons = await getActiveLessons();

  const result = await callStructured({
    task: "score-candidate",
    model: getModels().extraction,
    promptVersion: SCORE_PROMPT_VERSION,
    system: SCOUT_SYSTEM_PROMPT,
    user: buildScoringPrompt({
      opportunity: params.opportunity,
      evidence: (evidence ?? []) as Pick<
        OpportunityEvidenceRow,
        "url" | "title" | "summary" | "quote"
      >[],
      lessons
    }),
    schema: scoreResultSchema,
    jsonSchema: scoreJsonSchema as unknown as Record<string, unknown>,
    scanRunId: params.scanRunId,
    maxTokens: 2000
  });

  // Recompute the weighted total deterministically; never trust LLM math.
  const totalScore = computeTotalScore({
    strategicRelevance: result.strategic_relevance,
    actionability: result.actionability,
    integrationFit: result.integration_fit,
    evidenceQuality: result.evidence_quality,
    novelty: result.novelty,
    urgency: result.urgency
  });

  await recordScore({
    opportunityId: params.opportunity.id,
    scanRunId: params.scanRunId,
    scoringVersion: SCORING_VERSION,
    score: {
      strategicRelevance: result.strategic_relevance,
      actionability: result.actionability,
      integrationFit: result.integration_fit,
      evidenceQuality: result.evidence_quality,
      novelty: result.novelty,
      urgency: result.urgency,
      totalScore,
      confidence: result.confidence,
      rationale: result.rationale
    },
    recommendedAction: result.recommended_action,
    whyItMatters: result.why_it_matters,
    rawOutput: result as unknown as Record<string, unknown>
  });

  return { ...result, total_score: totalScore };
}
