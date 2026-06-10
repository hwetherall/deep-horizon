import { describe, it, expect } from "vitest";
import {
  signFeedbackToken,
  verifyFeedbackToken,
  buildFeedbackUrl
} from "../../utils/feedbackToken.js";

const input = {
  opportunityId: "11111111-1111-1111-1111-111111111111",
  digestId: "22222222-2222-2222-2222-222222222222",
  decision: "benchmark",
  reviewerEmail: "harry@innovera.ai"
};
const secret = "test-secret-at-least-16-chars";

describe("feedback token", () => {
  it("signs deterministically", () => {
    expect(signFeedbackToken(input, secret)).toBe(signFeedbackToken(input, secret));
  });

  it("verifies a valid token", () => {
    const token = signFeedbackToken(input, secret);
    expect(verifyFeedbackToken(input, token, secret)).toBe(true);
  });

  it("rejects a tampered decision", () => {
    const token = signFeedbackToken(input, secret);
    expect(verifyFeedbackToken({ ...input, decision: "useful" }, token, secret)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const token = signFeedbackToken(input, secret);
    expect(verifyFeedbackToken(input, token, "another-secret-16-chars")).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyFeedbackToken(input, "zz", secret)).toBe(false);
    expect(verifyFeedbackToken(input, "", secret)).toBe(false);
  });

  it("builds a URL whose token verifies", () => {
    const url = new URL(
      buildFeedbackUrl({ baseUrl: "https://g65fd5ni.us-west.insforge.app", ...input, secret })
    );
    expect(url.pathname).toBe("/functions/feedback");
    expect(url.searchParams.get("opportunity_id")).toBe(input.opportunityId);
    const token = url.searchParams.get("token")!;
    expect(verifyFeedbackToken(input, token, secret)).toBe(true);
  });
});
