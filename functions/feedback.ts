// InsForge edge function (Deno Subhosting): /functions/feedback (plan §15/§22, seed Q15).
//
// Two-level human feedback:
//   Level 1 (GET):  a signed link carrying either `sentiment` (good|neutral|bad,
//                   the "faces") or `decision` (benchmark|watch|reject|...).
//                   Records a feedback_events row immediately, updates the
//                   opportunity status where implied, and returns a page with
//                   an optional comment box.
//   Level 2 (POST): the comment form submits back here with the same signed
//                   params plus the event id; the comment is attached to the
//                   event just recorded.
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

const VALID_SENTIMENTS = new Set(["good", "neutral", "bad"]);

const SENTIMENT_FACES: Record<string, string> = {
  good: "&#128578;", // 🙂
  neutral: "&#128528;", // 😐
  bad: "&#128577;" // 🙁
};

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

// A bad face means "don't show me this again" → rejected (rank penalty +
// resurfacing suppression). Good/neutral teach the taste profile only.
const STATUS_FOR_SENTIMENT: Record<string, string | null> = {
  good: null,
  neutral: null,
  bad: "rejected"
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:48px auto;padding:0 16px;text-align:center;color:#111;">${body}</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

interface VerifiedParams {
  opportunityId: string;
  digestId: string; // "none" when the link came from outside a digest
  value: string; // the signed sentiment or decision
  reviewerEmail: string;
}

async function verifyToken(
  params: VerifiedParams,
  token: string,
  secret: string
): Promise<boolean> {
  const payload = [
    params.opportunityId,
    params.digestId,
    params.value,
    params.reviewerEmail
  ].join("|");
  return token === (await hmacSha256Hex(secret, payload));
}

function getDbOrNull() {
  const baseUrl = Deno.env.get("INSFORGE_BASE_URL") ?? Deno.env.get("INSFORGE_URL");
  const apiKey = Deno.env.get("API_KEY") ?? Deno.env.get("INSFORGE_API_KEY");
  if (!baseUrl || !apiKey) return null;
  return createAdminClient({ baseUrl, apiKey }).database;
}

function commentFormHtml(params: {
  verified: VerifiedParams;
  token: string;
  eventId: string;
  sentimentParam: string | null;
  decisionParam: string | null;
}): string {
  const hidden = (name: string, value: string) =>
    `<input type="hidden" name="${name}" value="${escapeHtml(value)}"/>`;
  return `<form method="POST" style="margin-top:24px;text-align:left;">
  ${hidden("opportunity_id", params.verified.opportunityId)}
  ${hidden("digest_id", params.verified.digestId)}
  ${params.sentimentParam ? hidden("sentiment", params.sentimentParam) : ""}
  ${params.decisionParam ? hidden("decision", params.decisionParam) : ""}
  ${hidden("reviewer_email", params.verified.reviewerEmail)}
  ${hidden("token", params.token)}
  ${hidden("event_id", params.eventId)}
  <label for="comment" style="display:block;font-size:14px;color:#555;margin-bottom:6px;">Optional: tell the scout <em>why</em> — this is the strongest learning signal.</label>
  <textarea id="comment" name="comment" rows="4" maxlength="2000" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;font:inherit;" placeholder="e.g. We already use something better / exactly the kind of patent source we need / wrong buyer"></textarea>
  <button type="submit" style="margin-top:10px;padding:10px 20px;border:none;border-radius:8px;background:#111;color:#fff;font:inherit;cursor:pointer;">Add context</button>
</form>`;
}

async function handleLevelOne(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const opportunityId = url.searchParams.get("opportunity_id");
  const digestId = url.searchParams.get("digest_id");
  const sentiment = url.searchParams.get("sentiment");
  const decision = url.searchParams.get("decision");
  const reviewerEmail = url.searchParams.get("reviewer_email");
  const token = url.searchParams.get("token");

  const value = sentiment ?? decision;
  if (!opportunityId || !digestId || !value || !reviewerEmail || !token) {
    return htmlResponse("<h2>Missing parameters</h2>", 400);
  }
  if (sentiment && !VALID_SENTIMENTS.has(sentiment)) {
    return htmlResponse("<h2>Invalid rating</h2>", 400);
  }
  if (!sentiment && decision && !VALID_DECISIONS.has(decision)) {
    return htmlResponse("<h2>Invalid decision</h2>", 400);
  }

  const secret = Deno.env.get("SCOUT_FEEDBACK_SECRET");
  if (!secret) return htmlResponse("<h2>Server not configured</h2>", 500);

  const verified: VerifiedParams = { opportunityId, digestId, value, reviewerEmail };
  if (!(await verifyToken(verified, token, secret))) {
    return htmlResponse("<h2>Invalid or expired link</h2>", 403);
  }

  const db = getDbOrNull();
  if (!db) return htmlResponse("<h2>Server not configured</h2>", 500);

  const { data: event, error: insertError } = await db
    .from("feedback_events")
    .insert([
      {
        opportunity_id: opportunityId,
        digest_id: digestId === "none" ? null : digestId,
        decision: sentiment ? null : decision,
        sentiment: sentiment ?? null,
        reviewer_email: reviewerEmail,
        comment: null,
        metadata: { source: sentiment ? "sentiment_link" : "email_link" }
      }
    ])
    .select()
    .single();
  if (insertError || !event) {
    console.error("feedback insert failed", insertError?.message);
    return htmlResponse("<h2>Failed to record feedback</h2>", 500);
  }

  const newStatus = sentiment
    ? STATUS_FOR_SENTIMENT[sentiment]
    : STATUS_FOR_DECISION[decision ?? ""];
  if (newStatus) {
    const { error: updateError } = await db
      .from("opportunities")
      .update({ status: newStatus })
      .eq("id", opportunityId);
    if (updateError) console.error("status update failed", updateError.message);
  }

  const headline = sentiment
    ? `<div style="font-size:48px;">${SENTIMENT_FACES[sentiment]}</div><h2>Rated <strong>${escapeHtml(sentiment)}</strong> &#10003;</h2>`
    : `<h2>Feedback recorded &#10003;</h2><p>Decision: <strong>${escapeHtml(decision ?? "")}</strong></p>`;

  return htmlResponse(
    `${headline}
<p style="color:#555;">The scout learns from every rating.</p>
${commentFormHtml({
  verified,
  token,
  eventId: String((event as { id: string }).id),
  sentimentParam: sentiment,
  decisionParam: sentiment ? null : decision
})}
<p style="color:#999;font-size:12px;margin-top:24px;">Or just close this tab — your rating is already saved.</p>`
  );
}

async function handleLevelTwo(req: Request): Promise<Response> {
  // The functions gateway may deliver the form body as urlencoded text or
  // re-encoded JSON; accept both.
  const raw = await req.text();
  let get: (k: string) => string | null;
  if (raw.trimStart().startsWith("{")) {
    let obj: Record<string, unknown> = {};
    try {
      obj = JSON.parse(raw);
    } catch {
      // fall through with empty obj
    }
    get = (k) => (typeof obj[k] === "string" ? (obj[k] as string) : null);
  } else {
    const form = new URLSearchParams(raw);
    get = (k) => form.get(k);
  }

  const opportunityId = get("opportunity_id");
  const digestId = get("digest_id");
  const sentiment = get("sentiment");
  const decision = get("decision");
  const reviewerEmail = get("reviewer_email");
  const token = get("token");
  const eventId = get("event_id");
  const comment = (get("comment") ?? "").trim().slice(0, 2000);

  const value = sentiment ?? decision;
  if (!opportunityId || !digestId || !value || !reviewerEmail || !token || !eventId) {
    const contentType = req.headers.get("content-type") ?? "(none)";
    return htmlResponse(
      `<h2>Missing parameters</h2><p style="color:#999;font-size:11px;">debug: content-type=${escapeHtml(contentType)}, body-length=${raw.length}</p>`,
      400
    );
  }

  const secret = Deno.env.get("SCOUT_FEEDBACK_SECRET");
  if (!secret) return htmlResponse("<h2>Server not configured</h2>", 500);

  const verified: VerifiedParams = { opportunityId, digestId, value, reviewerEmail };
  if (!(await verifyToken(verified, token, secret))) {
    return htmlResponse("<h2>Invalid or expired link</h2>", 403);
  }

  if (!comment) {
    return htmlResponse("<h2>Nothing to add &#10003;</h2><p>Your rating is already saved. You can close this tab.</p>");
  }

  const db = getDbOrNull();
  if (!db) return htmlResponse("<h2>Server not configured</h2>", 500);

  // Scope the update to the event created for this verified (opportunity, reviewer).
  const { error } = await db
    .from("feedback_events")
    .update({ comment })
    .eq("id", eventId)
    .eq("opportunity_id", opportunityId)
    .eq("reviewer_email", reviewerEmail);
  if (error) {
    console.error("comment update failed", error.message);
    return htmlResponse("<h2>Failed to save comment</h2>", 500);
  }

  return htmlResponse(
    `<h2>Context saved &#10003;</h2><p style="color:#555;">"${escapeHtml(comment)}"</p><p>This feeds directly into how the scout scores future findings. You can close this tab.</p>`
  );
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  if (req.method === "POST") return handleLevelTwo(req);
  return handleLevelOne(req);
}
