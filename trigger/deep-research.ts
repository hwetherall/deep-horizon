import { task } from "@trigger.dev/sdk/v3";
import { deepResearchOpportunity } from "../src/scout/deepResearch.js";

/** scout.deep-research (plan §16): one high-score opportunity → brief. */
export const deepResearch = task({
  id: "scout-deep-research",
  maxDuration: 900,
  run: async (payload: { scanRunId: string; opportunityId: string }) => {
    return deepResearchOpportunity(payload);
  }
});
