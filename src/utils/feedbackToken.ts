import { createHmac, timingSafeEqual } from "node:crypto";

export interface FeedbackTokenInput {
  opportunityId: string;
  digestId: string;
  decision: string;
  reviewerEmail: string;
}

/**
 * HMAC-signed feedback link token (plan §15):
 * token = hmac_sha256(secret, opportunity_id + digest_id + decision + reviewer_email)
 */
export function signFeedbackToken(input: FeedbackTokenInput, secret: string): string {
  const payload = [
    input.opportunityId,
    input.digestId,
    input.decision,
    input.reviewerEmail
  ].join("|");
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function verifyFeedbackToken(
  input: FeedbackTokenInput,
  token: string,
  secret: string
): boolean {
  const expected = signFeedbackToken(input, secret);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function buildFeedbackUrl(params: {
  baseUrl: string;
  opportunityId: string;
  digestId: string;
  decision: string;
  reviewerEmail: string;
  secret: string;
}): string {
  const token = signFeedbackToken(
    {
      opportunityId: params.opportunityId,
      digestId: params.digestId,
      decision: params.decision,
      reviewerEmail: params.reviewerEmail
    },
    params.secret
  );
  const url = new URL("/functions/v1/feedback", params.baseUrl);
  url.searchParams.set("opportunity_id", params.opportunityId);
  url.searchParams.set("digest_id", params.digestId);
  url.searchParams.set("decision", params.decision);
  url.searchParams.set("reviewer_email", params.reviewerEmail);
  url.searchParams.set("token", token);
  return url.toString();
}
