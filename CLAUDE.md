# Claude instructions for Innovera AI Opportunity Radar

You are helping build Hermes Scout, an always-on AI opportunity radar for Innovera.

## Product goal

Find AI tools, APIs, repos, companies, features, and research that Innovera should build, buy, benchmark, integrate, watch, or ignore.

## Stack

- TypeScript
- Trigger.dev
- Supabase
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
- Never expose service role keys to the browser.
- Do not build a UI until the core scan -> score -> digest loop works.
- Update plan.md when implementation diverges.

## Commands

- install: `pnpm install`
- typecheck: `pnpm typecheck`
- test: `pnpm test`
- lint: `pnpm lint`
- dev: `pnpm dev`
- trigger dev: `pnpm trigger:dev`
- supabase start: `pnpm supabase:start`
- scout dry run: `pnpm scout:dry-run --patrol ai-search-research-tools --limit 20`
