import type { OpportunityRow, OpportunityEvidenceRow, AgentLessonRow } from "../../db/types.js";

export const SCORE_PROMPT_VERSION = "score-v1";

export const SCORING_RUBRIC = `Score the candidate on these dimensions, each 0-10:

- strategic_relevance (weight 0.25): How directly does this help Innovera's AI products, agent capabilities, research quality, or competitive position?
- actionability (weight 0.20): Can Innovera act on this within weeks (benchmark, prototype, integrate)?
- integration_fit (weight 0.20): How well does this fit Innovera's stack (TypeScript, agents, search/research APIs, InsForge/Postgres, Trigger.dev)?
- evidence_quality (weight 0.15): Are sources official docs, repos, changelogs, technical posts — or thin secondhand claims?
- novelty (weight 0.10): Is this genuinely new to Innovera, not a re-announcement of something already known?
- urgency (weight 0.10): Is there a timing reason to act now (launch window, competitive movement, pricing change)?

total_score must equal the weighted sum: 0.25*strategic_relevance + 0.20*actionability + 0.20*integration_fit + 0.15*evidence_quality + 0.10*novelty + 0.10*urgency.

confidence is 0-1: how confident you are in this assessment given the available evidence.

Source quality rules:
- Boost: official docs, changelogs, GitHub repos, technical blog posts, API docs, benchmark pages, pricing pages, papers.
- Downrank: listicles, generic AI newsletters, funding-only announcements, SEO directories, thin LLM wrappers, products with no docs/API/repo, viral demos with no implementation path.
- Reject (score very low, recommended_action=ignore): pure thought leadership, opinion threads, unverifiable claims, no clear Innovera relevance.`;

export function buildScoringPrompt(params: {
  opportunity: Pick<
    OpportunityRow,
    "name" | "type" | "category" | "summary" | "canonical_url" | "metadata"
  >;
  evidence: Pick<OpportunityEvidenceRow, "url" | "title" | "summary" | "quote">[];
  lessons: AgentLessonRow[];
}): string {
  const evidenceBlock = params.evidence.length
    ? params.evidence
        .map(
          (e, i) =>
            `${i + 1}. ${e.title ?? e.url}\n   URL: ${e.url}${e.summary ? `\n   Summary: ${e.summary}` : ""}${e.quote ? `\n   Quote: ${e.quote}` : ""}`
        )
        .join("\n")
    : "(no evidence collected)";

  const lessonsBlock = params.lessons.length
    ? params.lessons.map((l) => `- ${l.lesson}`).join("\n")
    : "(none)";

  return `## Candidate

Name: ${params.opportunity.name}
Type: ${params.opportunity.type}
Category: ${params.opportunity.category ?? "unknown"}
Canonical URL: ${params.opportunity.canonical_url ?? "unknown"}
Summary: ${params.opportunity.summary ?? "(none)"}

## Evidence

${evidenceBlock}

## Active lessons

${lessonsBlock}

## Rubric

${SCORING_RUBRIC}

Return JSON matching the required schema.`;
}
