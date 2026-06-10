import { task } from "@trigger.dev/sdk/v3";
import { createDigest, getTodayCostSummary } from "../src/scout/createDigest.js";
import { sendDigestEmail } from "../src/email/sendDigest.js";

/** scout.publish-digest (plan §16): rank, store digest, send email. */
export const publishDigest = task({
  id: "scout-publish-digest",
  maxDuration: 600,
  run: async (payload: { scanRunId: string | null; failureSummary?: string }) => {
    const costSummary = await getTodayCostSummary();
    const digest = await createDigest({
      scanRunId: payload.scanRunId,
      costSummary,
      failureSummary: payload.failureSummary
    });
    const email = await sendDigestEmail(digest, {
      costSummary,
      failureSummary: payload.failureSummary
    });
    return { digestId: digest.digestId, quietDay: digest.quietDay, emailSent: email.sent };
  }
});
