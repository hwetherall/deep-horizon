# Claude instructions for Innovera AI Opportunity Radar

You are helping build Hermes Scout, an always-on AI opportunity radar for Innovera.

## Product goal

Find AI tools, APIs, repos, companies, features, and research that Innovera should build, buy, benchmark, integrate, watch, or ignore.

## Stack

- TypeScript
- Trigger.dev
- InsForge (Postgres backend; SDK is postgrest-js compatible)
- OpenRouter
- Exa
- Tavily
- Firecrawl
- Notion
- Email digest

## Rules

- Prefer small, testable increments.
- Do not invent undocumented APIs.
- Add types before complex logic.
- Use strict JSON schemas for LLM calls.
- Every scheduled task must be idempotent.
- Every provider call must be logged.
- Every LLM call must be logged.
- Never expose the InsForge admin API key to the browser.
- Do not build a UI until the core scan -> score -> digest loop works.
- Update plan.md when implementation diverges.

## Commands

- install: `pnpm install`
- typecheck: `pnpm typecheck`
- test: `pnpm test`
- lint: `pnpm lint`
- dev: `pnpm dev`
- trigger dev: `pnpm trigger:dev`
- db migrate: `pnpm db:migrate` (InsForge CLI; project must be linked via `npx @insforge/cli link`)
- deploy feedback function: `pnpm functions:deploy`
- scout dry run: `pnpm scout:dry-run --patrol ai-search-research-tools --limit 20`
- scout full run (manual, all patrols + deep research): `pnpm scout:run` (email/Notion off by default; `--email`/`--publish` to enable). The scheduled daily scan is gated by `SCOUT_ENABLE_SCHEDULE` (default off).
