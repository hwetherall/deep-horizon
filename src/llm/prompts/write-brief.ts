import type { OpportunityRow, OpportunityEvidenceRow } from "../../db/types.js";

export const BRIEF_PROMPT_VERSION = "brief-v1";

export function buildBriefPrompt(params: {
  opportunity: OpportunityRow;
  evidence: Pick<OpportunityEvidenceRow, "url" | "title" | "summary" | "quote">[];
  extraContext?: string;
}): string {
  const evidenceBlock = params.evidence
    .map(
      (e, i) =>
        `${i + 1}. ${e.title ?? e.url}\n   URL: ${e.url}${e.summary ? `\n   ${e.summary}` : ""}`
    )
    .join("\n");

  return `Write a deep-research opportunity brief for Innovera about the candidate below.

## Candidate

Name: ${params.opportunity.name}
Type: ${params.opportunity.type}
Category: ${params.opportunity.category ?? "unknown"}
Canonical URL: ${params.opportunity.canonical_url ?? "unknown"}
Summary: ${params.opportunity.summary ?? "(none)"}
Score: ${params.opportunity.total_score ?? "unscored"} (recommended action: ${params.opportunity.recommended_action ?? "n/a"})

## Evidence

${evidenceBlock || "(none)"}

${params.extraContext ? `## Additional research context\n\n${params.extraContext}\n` : ""}

## Required structure

The markdown brief must answer, in this order, using these exact section headers:

# Opportunity brief

## Summary
## Why it matters for Innovera
## What changed / why now
## Evidence
## Potential use cases
## Integration path
## Risks
## Alternatives / competitors
## Suggested experiment
## Score breakdown
## Recommendation

Rules:
- Cite evidence URLs inline.
- "Suggested experiment" must describe the smallest useful experiment.
- Be specific and decision-oriented; no hype.
- If evidence is thin, say so explicitly in the relevant sections.

Return JSON: { "title": "...", "markdown": "..." }`;
}
