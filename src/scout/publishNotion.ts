import { getDb } from "../db/client.js";
import { getEnv } from "../config/env.js";
import type { OpportunityRow } from "../db/types.js";
import { getEvidenceCount } from "../db/queries/opportunities.js";
import { getNotion } from "../notion/client.js";
import { mapOpportunityToNotionProperties } from "../notion/mapOpportunityToNotion.js";
import { markdownToNotionBlocks } from "../notion/blocks.js";
import { logger } from "../utils/logger.js";

export function shouldPublishToNotion(
  opportunity: Pick<OpportunityRow, "total_score" | "recommended_action">,
  minScore: number
): boolean {
  if ((opportunity.total_score ?? 0) >= minScore) return true;
  return ["benchmark", "prototype", "competitive_warning"].includes(
    opportunity.recommended_action ?? ""
  );
}

/**
 * Create or update the Notion page for an opportunity (plan §14). Updates the
 * existing page when notion_page_id is set — never creates duplicates.
 */
export async function publishOpportunityToNotion(
  opportunity: OpportunityRow
): Promise<{ pageId: string; url: string | null }> {
  const env = getEnv();
  if (!env.NOTION_OPPORTUNITIES_DATA_SOURCE_ID) {
    throw new Error("NOTION_OPPORTUNITIES_DATA_SOURCE_ID not configured");
  }
  const notion = getNotion();
  const db = getDb();

  const evidenceCount = await getEvidenceCount(opportunity.id);
  const properties = mapOpportunityToNotionProperties(opportunity, evidenceCount);

  // Latest brief markdown becomes the page body.
  const { data: briefs } = await db
    .from("opportunity_briefs")
    .select("markdown")
    .eq("opportunity_id", opportunity.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const bodyMarkdown =
    briefs?.[0]?.markdown ??
    `# Opportunity brief\n\n## Summary\n\n${opportunity.summary ?? "(pending deep research)"}\n\n## Why it matters for Innovera\n\n${opportunity.why_it_matters ?? "(pending)"}\n`;

  if (opportunity.notion_page_id) {
    await notion.pages.update({
      page_id: opportunity.notion_page_id,
      properties: properties as never
    });
    return { pageId: opportunity.notion_page_id, url: opportunity.notion_url };
  }

  const page = (await notion.pages.create({
    parent: { database_id: env.NOTION_OPPORTUNITIES_DATA_SOURCE_ID },
    properties: properties as never,
    children: markdownToNotionBlocks(bodyMarkdown) as never
  })) as { id: string; url?: string };

  const { error } = await db
    .from("opportunities")
    .update({ notion_page_id: page.id, notion_url: page.url ?? null })
    .eq("id", opportunity.id);
  if (error) {
    logger.warn("Failed to store notion page id", { error: error.message });
  }

  return { pageId: page.id, url: page.url ?? null };
}
