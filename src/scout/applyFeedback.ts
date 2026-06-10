import type { FeedbackDecision, OpportunityStatus } from "../db/types.js";
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

export async function applyFeedback(params: {
  opportunityId: string;
  digestId?: string;
  decision: FeedbackDecision;
  reviewerEmail: string;
  comment?: string;
}): Promise<void> {
  await insertFeedbackEvent(params);
  const status = statusForDecision(params.decision);
  if (status) {
    await updateOpportunityStatus(params.opportunityId, status);
  }
}
