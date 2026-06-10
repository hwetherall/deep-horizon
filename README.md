# Hermes Scout — Innovera AI Opportunity Radar

An always-on, memory-bearing research agent that continuously discovers AI tools, APIs, companies, open-source projects, features, papers, and market developments that Innovera should **build, buy, benchmark, integrate, watch, or ignore**.

See [plan.md](./plan.md) for the full build plan and [CLAUDE.md](./CLAUDE.md) for development rules.

## Architecture

```text
InsForge/Postgres = operational memory and source of truth
Notion            = polished human-readable opportunity library
Daily email       = attention and feedback loop
Trigger.dev       = reliable recurring execution
```

Pipeline: source patrols (Exa, Tavily, Firecrawl, Serper, Jina, GitHub, RSS) → raw items → candidate extraction → entity resolution/dedupe → relevance scoring → deep research → Notion publishing → daily email → feedback → lessons.

## Setup

```bash
pnpm install
cp .env.example .env                  # fill in keys (INSFORGE_URL = oss_host in .insforge/project.json)
npx @insforge/cli link --project-id <id>   # once per machine, if not already linked
pnpm db:migrate                       # apply migrations/ to the linked InsForge project
pnpm typecheck
pnpm test
```

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Unit/integration tests (no real API calls) |
| `pnpm dev` | Trigger.dev local dev server |
| `pnpm scout:dry-run --patrol <name> --limit 20` | Local dry run: fetch + store raw items, classify a few candidates, write digest preview to markdown. No email, no Notion unless `--publish`. |

## Feedback endpoint

Lives in `functions/feedback.ts` (InsForge edge function, deployed with `pnpm functions:deploy`). Email feedback links are HMAC-signed; the endpoint verifies the token, writes a `feedback_events` row, updates opportunity status, and returns a small success page.
