export const WEEKLY_REVIEW_PROMPT_VERSION = "weekly-review-v2";

export interface WeeklyReviewInput {
  windowStart: string;
  windowEnd: string;
  stats: {
    rawItems: number;
    candidates: number;
    opportunitiesScored: number;
    digestsSent: number;
    providerCostUsd: number;
    llmCostUsd: number;
  };
  sourcePerformance: { provider: string; rawItems: number; promoted: number }[];
  /** signal is a sentiment (good/neutral/bad) or a decision (benchmark/reject/...). */
  feedbackSummary: { signal: string; count: number }[];
  feedbackDetails: { opportunityName: string; signal: string; comment: string | null }[];
  activeLessons: string[];
}

export function buildWeeklyReviewPrompt(input: WeeklyReviewInput): string {
  return `Run Hermes Scout's weekly self-review for ${input.windowStart} → ${input.windowEnd}.

## Volume stats

- Raw items collected: ${input.stats.rawItems}
- Candidates extracted: ${input.stats.candidates}
- Opportunities scored: ${input.stats.opportunitiesScored}
- Digests sent: ${input.stats.digestsSent}
- Provider cost: $${input.stats.providerCostUsd.toFixed(2)}
- LLM cost: $${input.stats.llmCostUsd.toFixed(2)}

## Source performance (raw items → promoted to digest)

${input.sourcePerformance.map((s) => `- ${s.provider}: ${s.rawItems} raw → ${s.promoted} promoted`).join("\n") || "(no data)"}

## Feedback this week

Human ratings are good/neutral/bad ("more like this" / "less like this") plus explicit actions (benchmark, watch, reject, ...). Written comments are the strongest signal of what Innovera finds interesting.

${input.feedbackSummary.map((f) => `- ${f.signal}: ${f.count}`).join("\n") || "(no feedback)"}

Details:
${input.feedbackDetails.map((f) => `- ${f.opportunityName}: ${f.signal}${f.comment ? ` — "${f.comment}"` : ""}`).join("\n") || "(none)"}

## Currently active lessons

${input.activeLessons.map((l) => `- ${l}`).join("\n") || "(none)"}

## Task

1. Write summary_markdown: what worked, what failed, repeated false positives, source quality observations, and cost efficiency. Be concrete and reference the data above.
2. Propose lessons: short imperative steering rules derived from feedback patterns (e.g. "Downrank funding-only announcements unless there is a product/API change"). Only propose lessons supported by actual feedback; do not duplicate active lessons. strength is 0-1.
3. Propose patrol_changes: specific query/provider adjustments per patrol, if any.

Return JSON matching the required schema.`;
}
