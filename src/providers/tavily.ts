import type { RawItem } from "../db/types.js";
import { canonicalizeUrl, sourceDomain } from "../utils/hash.js";
import { parseDateSafe, nowIso } from "../utils/dates.js";
import { fetchJson, type ProviderContext } from "./shared.js";
import type { ProviderSearchResult } from "./exa.js";

export interface TavilySearchParams {
  query: string;
  patrolName: string;
  searchDepth?: "fast" | "basic" | "advanced";
  topic?: "general" | "news";
  timeRange?: "day" | "week" | "month";
  maxResults?: number;
  includeRawContent?: boolean;
}

interface TavilyResult {
  title?: string;
  url: string;
  content?: string;
  raw_content?: string | null;
  score?: number;
  published_date?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
  response_time?: number;
}

export async function tavilySearch(
  apiKey: string,
  params: TavilySearchParams,
  ctx: ProviderContext = {}
): Promise<ProviderSearchResult> {
  const body: Record<string, unknown> = {
    query: params.query,
    search_depth: params.searchDepth ?? "basic",
    topic: params.topic ?? "general",
    max_results: params.maxResults ?? 10,
    include_raw_content: params.includeRawContent ?? false
  };
  if (params.timeRange) body.time_range = params.timeRange;

  const response = await fetchJson<TavilyResponse>(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    },
    ctx
  );

  const items = (response.results ?? []).map((r) =>
    normalizeTavilyResult(r, params.patrolName, params.query)
  );
  return { items, endpoint: "search" };
}

export function normalizeTavilyResult(
  result: TavilyResult,
  patrolName: string,
  query: string
): RawItem {
  return {
    provider: "tavily",
    patrolName,
    query,
    title: result.title ?? result.url,
    url: result.url,
    canonicalUrl: canonicalizeUrl(result.url),
    sourceDomain: sourceDomain(result.url),
    snippet: result.content,
    rawContent: result.raw_content ?? undefined,
    publishedAt: parseDateSafe(result.published_date),
    discoveredAt: nowIso(),
    providerScore: result.score,
    providerPayload: result
  };
}
