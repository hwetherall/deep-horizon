# Source provider notes

Roles per plan §9. All clients live in `src/providers/`, normalize to `RawItem`, accept an injectable `fetch` for tests, and are logged to `provider_calls`.

## Exa (`exa.ts`)
High-quality semantic discovery: new AI-native tools, papers, product/company pages. POST `https://api.exa.ai/search` with `numResults`, `startPublishedDate`, `category`, `contents: {highlights, summary}`. Cost comes back in `costDollars.total` and is logged. Also used for deep-research evidence gathering.

## Tavily (`tavily.ts`)
Fast/news search: launches, "what changed this week", confirmation of Exa findings. POST `https://api.tavily.com/search` with `search_depth: basic` and `time_range: week` by default.

## Firecrawl (`firecrawl.ts`)
Page extraction + watchlist monitoring. POST `/v1/scrape` returning markdown. **Only called after a URL already passed relevance checks** — never on every raw result. Bounded per candidate (`MAX_SCRAPES_PER_CANDIDATE = 2`).

## Serper (`serper.ts`)
Cheap Google SERP fallback for the competitive patrol and exact-name checks. Not a first-line source.

## Jina (`jina.ts`)
Optional reader fallback (`r.jina.ai`) used by the watchlist monitor when Firecrawl is not configured. Not on the MVP critical path.

## GitHub (`github.ts`)
Repo search via `/search/repositories` with the fixed query list in `src/config/patrols.ts` (`GITHUB_QUERIES`). Normalizes stars/forks/dates/language/topics/license; `githubReadmeExcerpt` fetches a README excerpt for enrichment. Stars land in `provider_score`.

## RSS (`rss.ts`)
Durable high-signal feeds (`RSS_FEEDS` in patrols config). Parses RSS 2.0 and Atom via fast-xml-parser; strips HTML from descriptions. Feed URLs that 404 should be fixed in config — feed list is a maintained asset.

## Failure behavior
Each query failure is logged and recorded in the patrol result, but the patrol continues. A `BudgetExceededError` stops the remaining queries of that patrol. A missing API key fails that provider's patrol loudly (error in scan summary) without sinking the scan.
