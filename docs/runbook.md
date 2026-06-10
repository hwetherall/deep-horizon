# Runbook

## First-time setup

1. `pnpm install`
2. `cp .env.example .env` and fill in: Supabase (URL + keys), OpenRouter, Exa, Tavily, Firecrawl, GitHub token, Resend, `SCOUT_FEEDBACK_SECRET` (random ≥16 chars).
3. Create a Supabase project (or `supabase init && supabase start` locally) and apply `supabase/migrations/`, then `supabase/seed.sql`.
4. Create the Notion data source "AI Opportunity Radar" with the properties in plan §14; copy its ID into `NOTION_OPPORTUNITIES_DATA_SOURCE_ID`.
5. `npx trigger.dev@latest init` to link a Trigger.dev project; replace the `project` ref in `trigger.config.ts`.
6. Deploy the feedback function: `supabase functions deploy feedback --no-verify-jwt` and set the `SCOUT_FEEDBACK_SECRET` secret: `supabase secrets set SCOUT_FEEDBACK_SECRET=...`.

## Verify

```bash
pnpm typecheck && pnpm test
pnpm scout:dry-run --patrol ai-search-research-tools --limit 10
```

The dry run writes a digest preview to `out/dry-run-*.md`, stores raw items in Supabase, classifies ≤5 candidates, and never sends email or touches Notion (unless `--publish`).

Use `--no-llm` for an ingest-only run (no OpenRouter calls).

## Production enablement

Set in the Trigger.dev environment:

```
SCOUT_ENABLE_EMAIL=true
SCOUT_ENABLE_NOTION=true
```

Schedules (all America/Denver): daily scan weekdays 07:00, watchlist weekdays 09:00, weekly review Fridays 10:00. The daily email lands ~08:00 depending on scan duration; if stricter timing is needed, split `publish-digest` onto its own 08:00 schedule.

## Common issues

- **Budget exceeded**: scan continues low-cost steps, skips deep research, digest includes a warning. Raise `SCOUT_MAX_DAILY_*_COST_USD` or investigate `provider_calls`/`llm_calls` for runaway spend.
- **Partial failure**: `scan_runs.status = 'partial_failed'`, error details in `scan_runs.error`; the digest still sends with a "Run warnings" section.
- **Duplicate digest day**: digests are unique by `digest_date`; re-runs update in place (idempotent).
- **Feedback link "Invalid"**: token mismatch — check `SCOUT_FEEDBACK_SECRET` matches between the Trigger.dev env (signing) and the Edge Function secret (verification).

## Cost monitoring

```sql
select date(created_at), sum(cost_usd) from provider_calls group by 1 order by 1 desc;
select date(created_at), task, sum(cost_usd) from llm_calls group by 1, 2 order by 1 desc;
```
