# Runbook

## First-time setup

1. `pnpm install`
2. Link the InsForge project (already done on this machine): `npx @insforge/cli link --project-id 4e15024f-6d89-44b5-955f-20b7c6c61c9e`. This writes `.insforge/project.json` (gitignored — contains the admin API key).
3. `cp .env.example .env` and fill in: `INSFORGE_URL` (= `oss_host` in `.insforge/project.json`), `INSFORGE_API_KEY` (= `api_key` there), OpenRouter, Exa, Tavily, Firecrawl, GitHub token, Resend, `SCOUT_FEEDBACK_SECRET` (random ≥16 chars).
4. Apply the schema + seed: `pnpm db:migrate` (runs `insforge db migrations up --all` over `migrations/`).
5. Create the Notion data source "AI Opportunity Radar" with the properties in plan §14 (note: the row-id property is named **Scout ID**); copy its ID into `NOTION_OPPORTUNITIES_DATA_SOURCE_ID`.
6. `npx trigger.dev@latest init` to link a Trigger.dev project; replace the `project` ref in `trigger.config.ts`.
7. Deploy the feedback function and its secret:
   `npx @insforge/cli secrets add SCOUT_FEEDBACK_SECRET <value>` then `pnpm functions:deploy`. Verify with `npx @insforge/cli functions list` (status must be `active`).

## Verify

```bash
pnpm typecheck && pnpm test
pnpm scout:dry-run --patrol ai-search-research-tools --limit 10
```

The dry run writes a digest preview to `out/dry-run-*.md`, stores raw items in InsForge, classifies ≤5 candidates, and never sends email or touches Notion (unless `--publish`).

Use `--no-llm` for an ingest-only run (no OpenRouter calls).

## Manual full run

To exercise the complete pipeline (all patrols → classify → deep research → digest) on demand — the same `runDailyScan` code path as the scheduled task:

```bash
pnpm scout:run                       # all patrols, deep research on, no email/Notion
pnpm scout:run --no-deep-research    # faster scan + score only
pnpm scout:run --patrol ai-search-research-tools --patrol agent-infrastructure
pnpm scout:run --email --publish     # also send the digest email and publish to Notion
```

Flags: `--patrol <name>` (repeatable; omit for all), `--limit <n>` (default 20), `--max-candidates <n>` (default unlimited), `--no-deep-research`, `--email`, `--publish`. Writes a preview to `out/run-*.md`; view accumulated results with `pnpm scout:report --open`.

The scheduled daily scan is gated by `SCOUT_ENABLE_SCHEDULE`: while it is `false` (the default), the cron stays dormant and any scheduled invocation no-ops, so you can test manually with `pnpm scout:run` first. Set `SCOUT_ENABLE_SCHEDULE=true` to enable the automatic weekday run.

## Production enablement

Set in the Trigger.dev environment:

```
SCOUT_ENABLE_EMAIL=true
SCOUT_ENABLE_NOTION=true
SCOUT_ENABLE_SCHEDULE=true
```

Schedules (all America/Denver): daily scan weekdays 07:00, watchlist weekdays 09:00, weekly review Fridays 10:00. The daily email lands ~08:00 depending on scan duration; if stricter timing is needed, split `publish-digest` onto its own 08:00 schedule.

## Common issues

- **Budget exceeded**: scan continues low-cost steps, skips deep research, digest includes a warning. Raise `SCOUT_MAX_DAILY_*_COST_USD` or investigate `provider_calls`/`llm_calls` for runaway spend.
- **Partial failure**: `scan_runs.status = 'partial_failed'`, error details in `scan_runs.error`; the digest still sends with a "Run warnings" section.
- **Duplicate digest day**: digests are unique by `digest_date`; re-runs update in place (idempotent).
- **Feedback link "Invalid"**: token mismatch — check `SCOUT_FEEDBACK_SECRET` matches between the Trigger.dev env (signing) and the InsForge function secret (verification, set via `npx @insforge/cli secrets add`).

## Cost monitoring

```sql
select date(created_at), sum(cost_usd) from provider_calls group by 1 order by 1 desc;
select date(created_at), task, sum(cost_usd) from llm_calls group by 1, 2 order by 1 desc;
```
