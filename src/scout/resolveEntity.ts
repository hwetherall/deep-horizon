import { getDb } from "../db/client.js";
import type { Candidate, OpportunityRow } from "../db/types.js";
import { upsertOpportunity, addEvidence } from "../db/queries/opportunities.js";
import { opportunitySlug, sourceDomain, canonicalizeUrl } from "../utils/hash.js";
import { getModels } from "../config/models.js";
import { callStructured } from "../llm/openrouter.js";
import { dedupeResultSchema, dedupeJsonSchema } from "../llm/schemas.js";
import { SCOUT_SYSTEM_PROMPT } from "../llm/prompts/system.js";
import { buildDedupePrompt, DEDUPE_PROMPT_VERSION } from "../llm/prompts/dedupe-candidate.js";
import { logger } from "../utils/logger.js";

/**
 * Three-level entity resolution (plan §13):
 * 1. deterministic slug match (handled inside upsertOpportunity)
 * 2. same-domain heuristic check against existing opportunities
 * 3. LLM semantic dedupe only when the heuristic is uncertain
 *
 * Returns the resolved opportunity row; merges are recorded in metadata.
 */
export async function resolveEntity(params: {
  scanRunId: string;
  candidate: Candidate;
  rawItemIdsByUrl: Map<string, string>;
}): Promise<OpportunityRow> {
  const { candidate } = params;
  const slug = opportunitySlug(candidate.name, candidate.type, candidate.canonicalUrl);

  // Level 2: a different slug but identical canonical domain + similar name
  // suggests the same entity (rename/rebrand). Only consult the LLM then.
  const possibleMatch = await findPossibleMatch(slug, candidate);
  let opportunity: OpportunityRow;

  if (possibleMatch) {
    const isSame = await semanticSameEntity(params.scanRunId, candidate, possibleMatch);
    if (isSame) {
      opportunity = await touchExisting(possibleMatch, candidate);
    } else {
      opportunity = await upsertOpportunity(candidate);
    }
  } else {
    opportunity = await upsertOpportunity(candidate);
  }

  for (const url of candidate.evidenceUrls) {
    await addEvidence({
      opportunityId: opportunity.id,
      rawItemId: params.rawItemIdsByUrl.get(canonicalizeUrl(url)),
      url,
      summary: candidate.summary
    });
  }

  return opportunity;
}

async function findPossibleMatch(
  slug: string,
  candidate: Candidate
): Promise<OpportunityRow | null> {
  const domain = candidate.canonicalUrl ? sourceDomain(candidate.canonicalUrl) : undefined;
  if (!domain || domain === "github.com") return null;

  const { data, error } = await getDb()
    .from("opportunities")
    .select()
    .neq("slug", slug)
    .ilike("canonical_url", `%${domain}%`)
    .limit(1);
  if (error) {
    logger.warn("findPossibleMatch query failed", { error: error.message });
    return null;
  }
  return (data?.[0] as OpportunityRow | undefined) ?? null;
}

async function semanticSameEntity(
  scanRunId: string,
  candidate: Candidate,
  existing: OpportunityRow
): Promise<boolean> {
  try {
    const result = await callStructured({
      task: "dedupe-candidate",
      model: getModels().triage,
      promptVersion: DEDUPE_PROMPT_VERSION,
      system: SCOUT_SYSTEM_PROMPT,
      user: buildDedupePrompt({
        a: {
          name: candidate.name,
          type: candidate.type,
          canonicalUrl: candidate.canonicalUrl,
          summary: candidate.summary
        },
        b: {
          name: existing.name,
          type: existing.type,
          canonicalUrl: existing.canonical_url,
          summary: existing.summary
        }
      }),
      schema: dedupeResultSchema,
      jsonSchema: dedupeJsonSchema as unknown as Record<string, unknown>,
      scanRunId,
      maxTokens: 500
    });
    return result.same_entity;
  } catch (error) {
    logger.warn("Semantic dedupe failed; treating as distinct", {
      candidate: candidate.name,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

async function touchExisting(
  existing: OpportunityRow,
  candidate: Candidate
): Promise<OpportunityRow> {
  const merges = Array.isArray(existing.metadata?.merged_candidates)
    ? (existing.metadata.merged_candidates as unknown[])
    : [];
  const { data, error } = await getDb()
    .from("opportunities")
    .update({
      last_seen_at: new Date().toISOString(),
      summary: existing.summary ?? candidate.summary,
      metadata: {
        ...existing.metadata,
        merged_candidates: [
          ...merges,
          { name: candidate.name, canonical_url: candidate.canonicalUrl ?? null }
        ]
      }
    })
    .eq("id", existing.id)
    .select()
    .single();
  if (error) throw new Error(`touchExisting failed: ${error.message}`);
  return data as OpportunityRow;
}
