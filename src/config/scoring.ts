export const SCORING_VERSION = "v1";

export const SCORE_WEIGHTS = {
  strategicRelevance: 0.25,
  actionability: 0.2,
  integrationFit: 0.2,
  evidenceQuality: 0.15,
  novelty: 0.1,
  urgency: 0.1
} as const;

export interface ScoreDimensions {
  strategicRelevance: number;
  actionability: number;
  integrationFit: number;
  evidenceQuality: number;
  novelty: number;
  urgency: number;
}

/** Weighted 0–10 total from the rubric dimensions. */
export function computeTotalScore(d: ScoreDimensions): number {
  const total =
    d.strategicRelevance * SCORE_WEIGHTS.strategicRelevance +
    d.actionability * SCORE_WEIGHTS.actionability +
    d.integrationFit * SCORE_WEIGHTS.integrationFit +
    d.evidenceQuality * SCORE_WEIGHTS.evidenceQuality +
    d.novelty * SCORE_WEIGHTS.novelty +
    d.urgency * SCORE_WEIGHTS.urgency;
  return Math.round(total * 100) / 100;
}

export interface RankInput {
  totalScore: number | null;
  recommendedAction: string | null;
  evidenceCount: number;
  evidenceQuality: number | null;
  wasRecentlyRejected: boolean;
  isLikelyDuplicate: boolean;
}

/**
 * Final digest ranking is not pure LLM score (plan §17): action and evidence
 * bonuses, hard penalties for recent rejections and duplicates.
 */
export function computeRankScore(o: RankInput): number {
  let score = o.totalScore ?? 0;

  if (o.recommendedAction === "benchmark") score += 0.8;
  if (o.recommendedAction === "prototype") score += 0.6;
  if (o.recommendedAction === "competitive_warning") score += 0.7;

  if (o.evidenceCount >= 3) score += 0.3;
  if (o.wasRecentlyRejected) score -= 3.0;
  if (o.isLikelyDuplicate) score -= 2.0;
  if ((o.evidenceQuality ?? 0) < 5) score -= 0.8;

  return Math.round(score * 100) / 100;
}
