import type { FeedbackDecision, FeedbackSentiment, OpportunityStatus } from "../db/types.js";
import { insertFeedbackEvent } from "../db/queries/feedback.js";
import { updateOpportunityStatus } from "../db/queries/opportunities.js";

/** Map a feedback decision to the opportunity status it implies (plan §18). */
export function statusForDecision(decision: FeedbackDecision): OpportunityStatus | null {
  switch (decision) {
    case "benchmark":
      return "benchmark";
    case "watch":
      return "watching";
    case "reject":
    case "not_useful":
      return "rejected";
    case "adopted":
      return "adopted";
    case "useful":
    case "already_known":
    case "needs_more_research":
      return null; // record the event; status unchanged
  }
}

/**
 * Sentiment → status (seed Q15): a bad face means "don't show me this again",
 * so it rejects (feeding the recently-rejected rank penalty and resurfacing
 * suppression). Good and neutral teach the taste profile without forcing a
 * status — the human can still pick an explicit action.
 */
export function statusForSentiment(sentiment: FeedbackSentiment): OpportunityStatus | null {
  return sentiment === "bad" ? "rejected" : null;
}

export async function applyFeedback(params: {
  opportunityId: string;
  digestId?: string;
  decision?: FeedbackDecision;
  sentiment?: FeedbackSentiment;
  reviewerEmail: string;
  comment?: string;
}): Promise<void> {
  await insertFeedbackEvent(params);
  const status =
    (params.decision ? statusForDecision(params.decision) : null) ??
    (params.sentiment ? statusForSentiment(params.sentiment) : null);
  if (status) {
    await updateOpportunityStatus(params.opportunityId, status);
  }
}
