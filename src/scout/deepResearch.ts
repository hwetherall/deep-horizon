import { getDb } from "../db/client.js";
import { getEnv } from "../config/env.js";
import type { OpportunityRow, OpportunityEvidenceRow } from "../db/types.js";
import { addEvidence } from "../db/queries/opportunities.js";
import { logProviderCall } from "../db/queries/calls.js";
import { getModels } from "../config/models.js";
import { callStructured } from "../llm/openrouter.js";
import { briefResultSchema, briefJsonSchema } from "../llm/schemas.js";
import { SCOUT_SYSTEM_PROMPT } from "../llm/prompts/system.js";
import { buildBriefPrompt, BRIEF_PROMPT_VERSION } from "../llm/prompts/write-brief.js";
import { firecrawlScrape } from "../providers/firecrawl.js";
import { exaSearch } from "../providers/exa.js";
import { insertRawItems } from "../db/queries/rawItems.js";
import { sha256 } from "../utils/hash.js";
import { logger } from "../utils/logger.js";

const MAX_SCRAPES_PER_CANDIDATE = 2;

/**
 * Deep research for one high-score opportunity (plan §16): gather more
 * evidence (Exa deep search + Firecrawl scrape of the canonical page), then
 * write the structured brief and store it.
 */
export async function deepResearchOpportunity(params: {
  scanRunId: string;
  opportunityId: string;
}): Promise<{ briefId: string; title: string }> {
  const env = getEnv();
  const db = getDb();

  const { data: opp, error } = await db
    .from("opportunities")
    .select()
    .eq("id", params.opportunityId)
    .single();
  if (error || !opp) throw new Error(`Opportunity not found: ${params.opportunityId}`);
  const opportunity = opp as OpportunityRow;

  let extraContext = "";

  // 1. Exa deep search for additional evidence.
  if (env.EXA_API_KEY) {
    const started = Date.now();
    try {
      const { items, costUsd } = await exaSearch(env.EXA_API_KEY, {
        query: `${opportunity.name} ${opportunity.category ?? ""} documentation API capabilities review`,
        patrolName: "deep-research",
        numResults: 5
      });
      await insertRawItems(params.scanRunId, items);
      for (const item of items.slice(0, 5)) {
        await addEvidence({
          opportunityId: opportunity.id,
          url: item.url,
          title: item.title,
          summary: item.snippet,
          evidenceType: "deep_research",
          publishedAt: item.publishedAt
        });
      }
      await logProviderCall({
        scanRunId: params.scanRunId,
        provider: "exa",
        endpoint: "search(deep-research)",
        requestHash: sha256(`deep:${opportunity.id}`),
        status: "ok",
        costUsd,
        latencyMs: Date.now() - started
      });
    } catch (e) {
      logger.warn("Deep research Exa search failed", {
        opportunity: opportunity.name,
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }

  // 2. Firecrawl scrape of the canonical page (bounded per candidate).
  if (env.FIRECRAWL_API_KEY && opportunity.canonical_url) {
    const started = Date.now();
    try {
      const { markdown } = await firecrawlScrape(env.FIRECRAWL_API_KEY, {
        url: opportunity.canonical_url,
        patrolName: "deep-research"
      });
      extraContext = markdown.slice(0, 12_000);
      await logProviderCall({
        scanRunId: params.scanRunId,
        provider: "firecrawl",
        endpoint: "scrape(deep-research)",
        requestHash: sha256(`scrape:${opportunity.canonical_url}`),
        status: "ok",
        latencyMs: Date.now() - started,
        metadata: { url: opportunity.canonical_url, scrapes: MAX_SCRAPES_PER_CANDIDATE }
      });
    } catch (e) {
      logger.warn("Deep research scrape failed", {
        url: opportunity.canonical_url,
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }

  // 3. Write the brief.
  const { data: evidence } = await db
    .from("opportunity_evidence")
    .select("url, title, summary, quote")
    .eq("opportunity_id", opportunity.id)
    .limit(15);

  const brief = await callStructured({
    task: "write-brief",
    model: getModels().brief,
    promptVersion: BRIEF_PROMPT_VERSION,
    system: SCOUT_SYSTEM_PROMPT,
    user: buildBriefPrompt({
      opportunity,
      evidence: (evidence ?? []) as Pick<
        OpportunityEvidenceRow,
        "url" | "title" | "summary" | "quote"
      >[],
      extraContext
    }),
    schema: briefResultSchema,
    jsonSchema: briefJsonSchema as unknown as Record<string, unknown>,
    scanRunId: params.scanRunId,
    maxTokens: 6000,
    estimatedCostUsd: 0.1
  });

  const { data: briefRow, error: briefError } = await db
    .from("opportunity_briefs")
    .insert({
      opportunity_id: opportunity.id,
      scan_run_id: params.scanRunId,
      title: brief.title,
      markdown: brief.markdown,
      model: getModels().brief,
      prompt_version: BRIEF_PROMPT_VERSION
    })
    .select("id")
    .single();
  if (briefError) throw new Error(`Brief insert failed: ${briefError.message}`);

  await db
    .from("opportunities")
    .update({ description: brief.markdown.slice(0, 5000) })
    .eq("id", opportunity.id);

  return { briefId: briefRow.id as string, title: brief.title };
}
