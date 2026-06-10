import type { RawItem } from "../db/types.js";
import { canonicalizeUrl, sourceDomain } from "../utils/hash.js";
import { parseDateSafe, nowIso } from "../utils/dates.js";
import { fetchJson, type ProviderContext } from "./shared.js";

export interface ExaSearchParams {
  query: string;
  patrolName: string;
  numResults?: number;
  startPublishedDate?: string;
  startCrawlDate?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  category?: "company" | "research paper" | "news";
  type?: "auto" | "deep-lite" | "deep";
}

interface ExaResult {
  id?: string;
  title?: string | null;
  url: string;
  publishedDate?: string | null;
  author?: string | null;
  score?: number;
  text?: string;
  summary?: string;
  highlights?: string[];
}

interface ExaResponse {
  results?: ExaResult[];
  costDollars?: { total?: number };
}

export interface ProviderSearchResult {
  items: RawItem[];
  costUsd?: number;
  endpoint: string;
}

export async function exaSearch(
  apiKey: string,
  params: ExaSearchParams,
  ctx: ProviderContext = {}
): Promise<ProviderSearchResult> {
  const body: Record<string, unknown> = {
    query: params.query,
    numResults: params.numResults ?? 10,
    type: params.type ?? "auto",
    contents: { highlights: true, summary: true }
  };
  if (params.startPublishedDate) body.startPublishedDate = params.startPublishedDate;
  if (params.startCrawlDate) body.startCrawlDate = params.startCrawlDate;
  if (params.includeDomains?.length) body.includeDomains = params.includeDomains;
  if (params.excludeDomains?.length) body.excludeDomains = params.excludeDomains;
  if (params.category) body.category = params.category;

  const response = await fetchJson<ExaResponse>(
    "https://api.exa.ai/search",
    {
      method: "POST",
      headers: { "x-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify(body)
    },
    ctx
  );

  const items = (response.results ?? []).map((r) =>
    normalizeExaResult(r, params.patrolName, params.query)
  );
  return { items, costUsd: response.costDollars?.total, endpoint: "search" };
}

export function normalizeExaResult(
  result: ExaResult,
  patrolName: string,
  query: string
): RawItem {
  const snippet =
    result.summary ??
    (result.highlights?.length ? result.highlights.join(" … ") : undefined);
  return {
    provider: "exa",
    patrolName,
    query,
    title: result.title ?? result.url,
    url: result.url,
    canonicalUrl: canonicalizeUrl(result.url),
    sourceDomain: sourceDomain(result.url),
    snippet,
    rawContent: result.text,
    publishedAt: parseDateSafe(result.publishedDate),
    discoveredAt: nowIso(),
    providerScore: result.score,
    providerPayload: result
  };
}
