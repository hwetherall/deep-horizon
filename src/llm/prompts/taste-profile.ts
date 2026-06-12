import type { FeedbackSignal } from "../../db/queries/feedback.js";

const SENTIMENT_LABEL: Record<string, string> = {
  good: "GOOD",
  neutral: "NEUTRAL",
  bad: "BAD"
};

const MAX_DETAIL_LINES = 15;

/**
 * Render recent human feedback as a "taste profile" block for the extraction
 * and scoring prompts (seed Q15). Pure function so it is unit-testable; returns
 * null when there is no feedback yet so prompts can omit the section.
 */
export function buildTasteProfileBlock(signals: FeedbackSignal[]): string | null {
  if (signals.length === 0) return null;

  // Per-category sentiment tallies.
  const byCategory = new Map<string, { good: number; neutral: number; bad: number }>();
  for (const s of signals) {
    if (!s.sentiment) continue;
    const key = s.category ?? "(uncategorized)";
    const tally = byCategory.get(key) ?? { good: 0, neutral: 0, bad: 0 };
    tally[s.sentiment]++;
    byCategory.set(key, tally);
  }

  const categoryLines = [...byCategory.entries()]
    .sort((a, b) => b[1].good + b[1].bad - (a[1].good + a[1].bad))
    .map(
      ([category, t]) =>
        `- ${category}: ${t.good} good, ${t.neutral} neutral, ${t.bad} bad`
    );

  // Most recent individual reactions, comments first (they carry the most signal).
  const detailLines = [...signals]
    .sort((a, b) => {
      const aHasComment = a.comment ? 0 : 1;
      const bHasComment = b.comment ? 0 : 1;
      if (aHasComment !== bHasComment) return aHasComment - bHasComment;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, MAX_DETAIL_LINES)
    .map((s) => {
      const rating = s.sentiment
        ? SENTIMENT_LABEL[s.sentiment]
        : (s.decision ?? "feedback");
      const context = [s.category, s.recommendedAction && `action: ${s.recommendedAction}`]
        .filter(Boolean)
        .join(", ");
      const comment = s.comment ? ` — "${s.comment}"` : "";
      return `- ${rating}: ${s.opportunityName}${context ? ` (${context})` : ""}${comment}`;
    });

  return [
    "These are recent human ratings of past findings (GOOD = more like this, BAD = less like this; written comments are the strongest signal). Weight new candidates accordingly: favor what resembles GOOD-rated findings, downrank what resembles BAD-rated ones, and never re-surface something equivalent to a BAD rating without genuinely new information.",
    "",
    ...(categoryLines.length ? ["Sentiment by category:", ...categoryLines, ""] : []),
    "Recent reactions:",
    ...detailLines
  ].join("\n");
}
