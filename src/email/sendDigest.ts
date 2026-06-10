import { Resend } from "resend";
import { getEnv } from "../config/env.js";
import { markDigestEmailSent } from "../db/queries/digests.js";
import { buildFeedbackUrl } from "../utils/feedbackToken.js";
import { renderDigestEmailHtml } from "./templates/dailyDigest.js";
import type { DigestData } from "../scout/createDigest.js";
import { logger } from "../utils/logger.js";

/**
 * Send the daily digest via Resend. Disabled unless SCOUT_ENABLE_EMAIL=true
 * (plan §16: feature-flagged for development).
 */
export async function sendDigestEmail(
  digest: DigestData,
  options: {
    costSummary?: { providerUsd: number; llmUsd: number };
    failureSummary?: string;
  } = {}
): Promise<{ sent: boolean; messageId?: string }> {
  const env = getEnv();

  if (!env.SCOUT_ENABLE_EMAIL) {
    logger.info("Email disabled (SCOUT_ENABLE_EMAIL != true); skipping send", {
      digestDate: digest.digestDate
    });
    return { sent: false };
  }
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  if (!env.SCOUT_FEEDBACK_SECRET) throw new Error("SCOUT_FEEDBACK_SECRET not configured");

  const html = renderDigestEmailHtml({
    digestDate: digest.digestDate,
    digestId: digest.digestId,
    top: digest.top,
    benchmarkWorthy: digest.benchmarkWorthy,
    quietDay: digest.quietDay,
    costSummary: options.costSummary,
    failureSummary: options.failureSummary,
    buildFeedbackLink: (opportunityId, decision) =>
      buildFeedbackUrl({
        baseUrl: env.INSFORGE_URL,
        opportunityId,
        digestId: digest.digestId,
        decision,
        reviewerEmail: env.DIGEST_TO_EMAIL,
        secret: env.SCOUT_FEEDBACK_SECRET!
      })
  });

  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: env.DIGEST_FROM_EMAIL,
    to: env.DIGEST_TO_EMAIL,
    subject: digest.emailSubject,
    html,
    text: digest.markdown
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);

  const messageId = data?.id ?? "unknown";
  await markDigestEmailSent(digest.digestId, messageId);
  return { sent: true, messageId };
}
