import type { OpportunityRow } from "../db/types.js";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  watching: "Watching",
  benchmark: "Benchmark",
  testing: "Testing",
  adopted: "Adopted",
  rejected: "Rejected",
  archived: "Archived"
};

/**
 * Map an opportunity row to Notion page properties (plan §14).
 * Property names must match the "AI Opportunity Radar" data source.
 */
export function mapOpportunityToNotionProperties(
  opportunity: OpportunityRow,
  evidenceCount: number
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    Name: { title: [{ text: { content: opportunity.name.slice(0, 200) } }] },
    Status: { select: { name: STATUS_LABELS[opportunity.status] ?? "New" } },
    Type: { select: { name: opportunity.type } },
    "Supabase ID": { rich_text: [{ text: { content: opportunity.id } }] },
    "First Seen": { date: { start: opportunity.first_seen_at.slice(0, 10) } },
    "Last Seen": { date: { start: opportunity.last_seen_at.slice(0, 10) } },
    "Source Count": { number: evidenceCount }
  };

  if (opportunity.category) {
    props.Category = { select: { name: opportunity.category.slice(0, 100) } };
  }
  if (opportunity.canonical_url) {
    props["Canonical URL"] = { url: opportunity.canonical_url };
  }
  if (opportunity.recommended_action) {
    props["Recommended Action"] = { select: { name: opportunity.recommended_action } };
  }

  const numbers: [string, number | null][] = [
    ["Score", opportunity.total_score],
    ["Strategic Relevance", opportunity.strategic_relevance],
    ["Actionability", opportunity.actionability],
    ["Integration Fit", opportunity.integration_fit],
    ["Evidence Quality", opportunity.evidence_quality],
    ["Novelty", opportunity.novelty],
    ["Urgency", opportunity.urgency],
    ["Confidence", opportunity.confidence]
  ];
  for (const [name, value] of numbers) {
    if (value !== null && value !== undefined) {
      props[name] = { number: Math.round(Number(value) * 100) / 100 };
    }
  }

  return props;
}
