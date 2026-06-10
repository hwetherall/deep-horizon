import type { RawItem } from "../db/types.js";
import { canonicalizeUrl, sourceDomain } from "../utils/hash.js";
import { nowIso, parseDateSafe } from "../utils/dates.js";
import { fetchJson, type ProviderContext } from "./shared.js";
import type { ProviderSearchResult } from "./exa.js";

interface SerperOrganicResult {
  title?: string;
  link: string;
  snippet?: string;
  date?: string;
  position?: number;
}

interface SerperResponse {
  organic?: SerperOrganicResult[];
  news?: SerperOrganicResult[];
}

/** Cheap Google SERP fallback (plan §9). Not a first-line source. */
export async function serperSearch(
  apiKey: string,
  params: { query: string; patrolName: string; num?: number; type?: "search" | "news" },
  ctx: ProviderContext = {}
): Promise<ProviderSearchResult> {
  const endpoint = params.type === "news" ? "news" : "search";
  const response = await fetchJson<SerperResponse>(
    `https://google.serper.dev/${endpoint}`,
    {
      method: "POST",
      headers: { "x-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({ q: params.query, num: params.num ?? 10 })
    },
    ctx
  );

  const results = [...(response.organic ?? []), ...(response.news ?? [])];
  const items = results.map((r) => normalizeSerperResult(r, params.patrolName, params.query));
  return { items, endpoint };
}

export function normalizeSerperResult(
  result: SerperOrganicResult,
  patrolName: string,
  query: string
): RawItem {
  return {
    provider: "serper",
    patrolName,
    query,
    title: result.title ?? result.link,
    url: result.link,
    canonicalUrl: canonicalizeUrl(result.link),
    sourceDomain: sourceDomain(result.link),
    snippet: result.snippet,
    publishedAt: parseDateSafe(result.date),
    discoveredAt: nowIso(),
    providerScore: result.position !== undefined ? 1 / (1 + result.position) : undefined,
    providerPayload: result
  };
}
