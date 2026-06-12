import { getModels } from "../config/models.js";
import { getPatrol } from "../config/patrols.js";
import type { Candidate, RawItemRow } from "../db/types.js";
import { getActiveLessons, getRecentFeedbackSignals } from "../db/queries/feedback.js";
import { getRecentEntityNames } from "../db/queries/opportunities.js";
import { buildTasteProfileBlock } from "../llm/prompts/taste-profile.js";
import { callStructured } from "../llm/openrouter.js";
import {
  extractionResultSchema,
  extractionJsonSchema,
  type ExtractedCandidate
} from "../llm/schemas.js";
import { SCOUT_SYSTEM_PROMPT } from "../llm/prompts/system.js";
import {
  buildExtractionPrompt,
  EXTRACT_PROMPT_VERSION
} from "../llm/prompts/extract-candidates.js";
import { logger } from "../utils/logger.js";

const BATCH_SIZE = 25;

export interface ExtractionOutcome {
  accepted: Candidate[];
  rejected: { name: string; reason: string }[];
}

/** Batch raw items per patrol through the extraction model (plan §12). */
export async function extractCandidatesForPatrol(params: {
  scanRunId: string;
  patrolName: string;
  rawItems: RawItemRow[];
}): Promise<ExtractionOutcome> {
  const patrol = getPatrol(params.patrolName);
  if (!patrol) throw new Error(`Unknown patrol: ${params.patrolName}`);

  const [lessons, recentEntityNames, feedbackSignals] = await Promise.all([
    getActiveLessons(),
    getRecentEntityNames(),
    getRecentFeedbackSignals()
  ]);
  const tasteProfile = buildTasteProfileBlock(feedbackSignals);

  const outcome: ExtractionOutcome = { accepted: [], rejected: [] };

  for (let i = 0; i < params.rawItems.length; i += BATCH_SIZE) {
    const batch = params.rawItems.slice(i, i + BATCH_SIZE);
    try {
      const result = await callStructured({
        task: "extract-candidates",
        model: getModels().extraction,
        promptVersion: EXTRACT_PROMPT_VERSION,
        system: SCOUT_SYSTEM_PROMPT,
        user: buildExtractionPrompt({
          patrol,
          rawItems: batch,
          recentEntityNames,
          lessons,
          tasteProfile
        }),
        schema: extractionResultSchema,
        jsonSchema: extractionJsonSchema as unknown as Record<string, unknown>,
        scanRunId: params.scanRunId,
        maxTokens: 8000
      });

      for (const c of result.candidates) {
        if (c.reject) {
          outcome.rejected.push({ name: c.name, reason: c.reject_reason ?? "rejected" });
        } else {
          outcome.accepted.push(toCandidate(c));
        }
      }
    } catch (error) {
      logger.error("Candidate extraction batch failed", {
        patrol: params.patrolName,
        batchStart: i,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return outcome;
}

function toCandidate(c: ExtractedCandidate): Candidate {
  return {
    name: c.name,
    type: c.type,
    category: c.category,
    canonicalUrl: c.canonical_url ?? undefined,
    summary: c.summary,
    evidenceUrls: c.evidence_urls,
    possibleUseCases: c.possible_use_cases,
    risks: c.risks
  };
}
