import { getEnv } from "../config/env.js";
import type { OpportunityRow } from "../db/types.js";
import { getRawItemsForScanRun } from "../db/queries/rawItems.js";
import { extractCandidatesForPatrol } from "./extractCandidates.js";
import { resolveEntity } from "./resolveEntity.js";
import { scoreOpportunity } from "./scoreCandidate.js";
import { canonicalizeUrl } from "../utils/hash.js";
import { logger } from "../utils/logger.js";

export interface ClassificationResult {
  candidatesAccepted: number;
  candidatesRejected: number;
  opportunitiesScored: number;
  deepResearchQueue: { opportunityId: string; name: string; totalScore: number }[];
}

/**
 * raw_items → candidates → opportunities → scores (plan §16,
 * scout.classify-candidates). Returns the high-score queue for deep research.
 */
export async function classifyCandidates(params: {
  scanRunId: string;
  /** Cap candidates processed, for dry runs. */
  maxCandidates?: number;
}): Promise<ClassificationResult> {
  const env = getEnv();
  const rawItems = await getRawItemsForScanRun(params.scanRunId);

  const byPatrol = new Map<string, typeof rawItems>();
  for (const item of rawItems) {
    const patrol = item.patrol_name ?? "unknown";
    if (!byPatrol.has(patrol)) byPatrol.set(patrol, []);
    byPatrol.get(patrol)!.push(item);
  }

  const rawItemIdsByUrl = new Map<string, string>();
  for (const item of rawItems) {
    rawItemIdsByUrl.set(item.canonical_url ?? canonicalizeUrl(item.url), item.id);
  }

  const result: ClassificationResult = {
    candidatesAccepted: 0,
    candidatesRejected: 0,
    opportunitiesScored: 0,
    deepResearchQueue: []
  };

  for (const [patrolName, items] of byPatrol) {
    if (patrolName === "unknown") continue;

    const outcome = await extractCandidatesForPatrol({
      scanRunId: params.scanRunId,
      patrolName,
      rawItems: items
    });
    result.candidatesRejected += outcome.rejected.length;

    for (const candidate of outcome.accepted) {
      if (params.maxCandidates && result.candidatesAccepted >= params.maxCandidates) {
        logger.info("maxCandidates cap reached; stopping classification", {
          cap: params.maxCandidates
        });
        return result;
      }
      result.candidatesAccepted++;

      let opportunity: OpportunityRow;
      try {
        opportunity = await resolveEntity({
          scanRunId: params.scanRunId,
          candidate,
          rawItemIdsByUrl
        });
      } catch (error) {
        logger.error("Entity resolution failed", {
          candidate: candidate.name,
          error: error instanceof Error ? error.message : String(error)
        });
        continue;
      }

      try {
        const score = await scoreOpportunity({
          scanRunId: params.scanRunId,
          opportunity
        });
        result.opportunitiesScored++;

        const needsDeepResearch =
          score.total_score >= env.SCOUT_MIN_SCORE_FOR_DEEP_RESEARCH ||
          ["benchmark", "prototype", "competitive_warning"].includes(
            score.recommended_action
          );
        if (needsDeepResearch) {
          result.deepResearchQueue.push({
            opportunityId: opportunity.id,
            name: opportunity.name,
            totalScore: score.total_score
          });
        }
      } catch (error) {
        logger.error("Scoring failed", {
          opportunity: opportunity.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  // Respect the daily deep-research cap, keeping the highest scores.
  result.deepResearchQueue.sort((a, b) => b.totalScore - a.totalScore);
  result.deepResearchQueue = result.deepResearchQueue.slice(
    0,
    env.SCOUT_MAX_DEEP_RESEARCH_PER_DAY
  );

  return result;
}
