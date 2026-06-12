import type { OpportunityRow, OpportunityEvidenceRow, AgentLessonRow } from "../../db/types.js";

export const SCORE_PROMPT_VERSION = "score-v3";

export const SCORING_RUBRIC = `Score the candidate on these dimensions, each 0-10:

- strategic_relevance (weight 0.25): How directly does this make Innovera's research-and-strategy engine (initiative in → researched options + risks out) deeper, broader, more credible, or faster? Tier 1 (deep research/synthesis, market & competitive intelligence, deep-tech feasibility, patent/IP/regulatory, risk frameworks) scores highest. Tier 2 plumbing (agent infra, memory/RAG, evals, model capabilities, browser automation) scores mid ONLY with a plausible path to better research output. Tier 3 venture-lifecycle tooling (design/launch-GTM/growth) caps low for now (watch-but-downrank). Competitive emergence (research→strategy→risk for innovation teams) scores high regardless of tier.
- actionability (weight 0.20): Is there a concrete next step a person could take, with enough evidence (working API/repo/docs, credible primary source) that the step is real rather than aspirational? Can Innovera act within weeks?
- integration_fit (weight 0.20): How well does this fit Innovera's stack (TypeScript, agents, search/research APIs, InsForge/Postgres, Trigger.dev) — or, for data sources, does it have API access and workable licensing?
- evidence_quality (weight 0.15): Are sources official docs, repos, changelogs, technical posts, patent/market databases — or thin secondhand claims?
- novelty (weight 0.10): Is this genuinely new to Innovera, not a re-announcement of something already known?
- urgency (weight 0.10): Is there a timing reason to act now (launch window, competitive emergence, pricing change, capability bar moving)?

total_score must equal the weighted sum: 0.25*strategic_relevance + 0.20*actionability + 0.20*integration_fit + 0.15*evidence_quality + 0.10*novelty + 0.10*urgency.

confidence is 0-1: how confident you are in this assessment given the available evidence.

Source quality rules:
- Boost: official docs, changelogs, GitHub repos, technical blog posts, API docs, benchmark pages, pricing pages, papers with repos, patent databases, analyst/trade publications (for market-entry questions).
- Downrank: listicles, generic AI newsletters, funding-only announcements, SEO directories, thin LLM wrappers, products with no docs/API/repo, viral demos with no implementation path, narrow single-vertical software with no cross-domain research value, generic horizontal SaaS unrelated to research/strategy/risk.
- Reject (score very low, recommended_action=ignore): pure thought leadership, opinion threads, unverifiable claims, no clear path to improving the research engine or detecting competition.

Exceptions — do NOT auto-reject:
- A funding announcement naming a company directly competitive (emerging research→strategy→risk for innovation teams) or funding an imminent Tier-1 launch → score it and consider competitive_warning.
- A consumer app demonstrating a genuinely novel research/synthesis capability pattern → score as a pattern to study (watch).
- A paper shipping with a working repo, benchmark, or API → implementation-ready, score on its merits.

Action guidance: benchmark = working API/repo/docs with a 1-2 day test path improving a Tier-1/Tier-2 capability; prototype = promising but needs a small build to judge fit; integrate = already validated and fits the stack; buy = mature commercial option clearly better than building; partner = a data source/company more valuable as a relationship than a build (e.g. market-intelligence data); watch = relevant but not yet actionable (note a trigger condition); competitive_warning = emergence of a research→strategy→risk competitor OR a tool/model that would let someone build Innovera's product cheaply — always surface it.`;

export function buildScoringPrompt(params: {
  opportunity: Pick<
    OpportunityRow,
    "name" | "type" | "category" | "summary" | "canonical_url" | "metadata"
  >;
  evidence: Pick<OpportunityEvidenceRow, "url" | "title" | "summary" | "quote">[];
  lessons: AgentLessonRow[];
  /** Rendered by buildTasteProfileBlock; null until humans have rated findings. */
  tasteProfile?: string | null;
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

${params.tasteProfile ? `## Human feedback taste profile\n\n${params.tasteProfile}\n` : ""}
## Rubric

${SCORING_RUBRIC}

Return JSON matching the required schema.`;
}
