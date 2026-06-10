# Architecture

```text
Trigger.dev scheduled task (scout-daily-scan, weekdays 7:00 AM America/Denver)
  ↓
runDailyScan (src/scout/runDailyScan.ts)
  ↓
Source patrols: Exa, Tavily, Serper, GitHub, RSS    (src/scout/runPatrol.ts)
  ↓
raw_items table (unique dedupe_key = sha256(canonical URL))
  ↓
Candidate extraction (LLM, batched per patrol)      (src/scout/extractCandidates.ts)
  ↓
Entity resolution / dedupe (slug → heuristic → LLM) (src/scout/resolveEntity.ts)
  ↓
Relevance scoring (LLM rubric, deterministic total) (src/scout/scoreCandidate.ts)
  ↓
Deep research for high-score candidates             (src/scout/deepResearch.ts)
  ↓
opportunities + opportunity_briefs tables
  ↓
Notion publishing (feature-flagged)                 (src/scout/publishNotion.ts)
  ↓
Daily digest + email (feature-flagged)              (src/scout/createDigest.ts, src/email/)
  ↓
HMAC-signed feedback links → Supabase Edge Function (supabase/functions/feedback)
  ↓
feedback_events → status updates → agent_lessons    (src/scout/applyFeedback.ts, weeklyReview.ts)
```

## Source of truth

- **Supabase/Postgres** — operational memory and source of truth. Every run produces durable rows: scan_runs, raw_items, opportunities, scores, evidence, briefs, digests, feedback, lessons.
- **Notion** — polished human library only; never authoritative.
- **Email** — attention/feedback surface only.

## Reliability

- Idempotency: `raw_items unique(dedupe_key)`, `opportunities unique(slug)`, `digests unique(digest_date)`, `opportunity_evidence unique(opportunity_id, url)`.
- Partial failure: errors collect per patrol; scan run is marked `partial_failed` and the digest still ships with a failure summary.
- Budget gates: `assertBudgetAvailable` checks the daily provider/LLM spend (from provider_calls/llm_calls) before each call; deep research stops first.
- Every provider call and LLM call is logged with cost and latency.

## Feature flags

`SCOUT_ENABLE_EMAIL` and `SCOUT_ENABLE_NOTION` default to false; production sets them to true. The dry-run CLI forces both off unless `--publish`.
