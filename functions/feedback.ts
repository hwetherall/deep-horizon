// InsForge edge function (Deno Subhosting): GET /functions/feedback (plan §15/§22).
// Verifies the HMAC token, writes a feedback_events row, updates opportunity
// status, and returns a tiny success page.
//
// Deploy:  npx @insforge/cli functions deploy feedback --file functions/feedback.ts
// Secrets: SCOUT_FEEDBACK_SECRET (npx @insforge/cli secrets add SCOUT_FEEDBACK_SECRET <value>)
//          INSFORGE_BASE_URL and API_KEY are platform-provided; the fallbacks
//          below cover environments where they use different names.

import { createAdminClient } from "npm:@insforge/sdk";

const VALID_DECISIONS = new Set([
  "useful",
  "not_useful",
  "already_known",
  "benchmark",
  "watch",
  "reject",
  "adopted",
  "needs_more_research"
]);

const STATUS_FOR_DECISION: Record<string, string | null> = {
  benchmark: "benchmark",
  watch: "watching",
  reject: "rejected",
  not_useful: "rejected",
  adopted: "adopted",
  useful: null,
  already_known: null,
  needs_more_research: null
};

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html><body style="font-family:sans-serif;max-width:480px;margin:48px auto;text-align:center;">${body}</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  const url = new URL(req.url);
  const opportunityId = url.searchParams.get("opportunity_id");
  const digestId = url.searchParams.get("digest_id");
  const decision = url.searchParams.get("decision");
  const reviewerEmail = url.searchParams.get("reviewer_email");
  const token = url.searchParams.get("token");
  const comment = url.searchParams.get("comment");

  if (!opportunityId || !digestId || !decision || !reviewerEmail || !token) {
    return htmlResponse("<h2>Missing parameters</h2>", 400);
  }
  if (!VALID_DECISIONS.has(decision)) {
    return htmlResponse("<h2>Invalid decision</h2>", 400);
  }

  const secret = Deno.env.get("SCOUT_FEEDBACK_SECRET");
  if (!secret) return htmlResponse("<h2>Server not configured</h2>", 500);

  const payload = [opportunityId, digestId, decision, reviewerEmail].join("|");
  const expected = await hmacSha256Hex(secret, payload);
  if (token !== expected) {
    return htmlResponse("<h2>Invalid or expired link</h2>", 403);
  }

  const baseUrl = Deno.env.get("INSFORGE_BASE_URL") ?? Deno.env.get("INSFORGE_URL");
  const apiKey = Deno.env.get("API_KEY") ?? Deno.env.get("INSFORGE_API_KEY");
  if (!baseUrl || !apiKey) {
    return htmlResponse("<h2>Server not configured</h2>", 500);
  }
  const db = createAdminClient({ baseUrl, apiKey }).database;

  const { error: insertError } = await db.from("feedback_events").insert([
    {
      opportunity_id: opportunityId,
      digest_id: digestId,
      decision,
      reviewer_email: reviewerEmail,
      comment: comment ?? null,
      metadata: { source: "email_link" }
    }
  ]);
  if (insertError) {
    console.error("feedback insert failed", insertError.message);
    return htmlResponse("<h2>Failed to record feedback</h2>", 500);
  }

  const newStatus = STATUS_FOR_DECISION[decision];
  if (newStatus) {
    const { error: updateError } = await db
      .from("opportunities")
      .update({ status: newStatus })
      .eq("id", opportunityId);
    if (updateError) console.error("status update failed", updateError.message);
  }

  return htmlResponse(
    `<h2>Feedback recorded ✓</h2><p>Decision: <strong>${decision}</strong></p><p>You can close this tab.</p>`
  );
}
