import { task } from "@trigger.dev/sdk/v3";
import { classifyCandidates } from "../src/scout/classifyCandidates.js";

/** scout.classify-candidates (plan §16): raw items → opportunities → scores. */
export const classifyCandidatesTask = task({
  id: "scout-classify-candidates",
  maxDuration: 1800,
  run: async (payload: { scanRunId: string; maxCandidates?: number }) => {
    return classifyCandidates(payload);
  }
});
