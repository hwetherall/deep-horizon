import type { RawItem } from "../db/types.js";
import { canonicalizeUrl, sourceDomain } from "../utils/hash.js";
import { nowIso, parseDateSafe } from "../utils/dates.js";
import { fetchJson, type ProviderContext } from "./shared.js";

interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
      publishedTime?: string;
      [key: string]: unknown;
    };
  };
}

export interface FirecrawlScrapeResult {
  item: RawItem;
  markdown: string;
}

/**
 * Scrape a single URL to clean markdown. Use only after a URL has passed
 * lightweight relevance checks (plan §9) — never on every raw result.
 */
export async function firecrawlScrape(
  apiKey: string,
  params: { url: string; patrolName: string; onlyMainContent?: boolean },
  ctx: ProviderContext = {}
): Promise<FirecrawlScrapeResult> {
  const response = await fetchJson<FirecrawlScrapeResponse>(
    "https://api.firecrawl.dev/v1/scrape",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        url: params.url,
        formats: ["markdown"],
        onlyMainContent: params.onlyMainContent ?? true
      })
    },
    ctx
  );

  if (!response.success || !response.data) {
    throw new Error(`Firecrawl scrape failed for ${params.url}`);
  }
  return normalizeFirecrawlScrape(response.data, params.url, params.patrolName);
}

export function normalizeFirecrawlScrape(
  data: NonNullable<FirecrawlScrapeResponse["data"]>,
  url: string,
  patrolName: string
): FirecrawlScrapeResult {
  const markdown = data.markdown ?? "";
  const meta = data.metadata ?? {};
  const item: RawItem = {
    provider: "firecrawl",
    patrolName,
    title: meta.title ?? url,
    url: meta.sourceURL ?? url,
    canonicalUrl: canonicalizeUrl(meta.sourceURL ?? url),
    sourceDomain: sourceDomain(meta.sourceURL ?? url),
    snippet: meta.description,
    rawContent: markdown,
    publishedAt: parseDateSafe(meta.publishedTime),
    discoveredAt: nowIso(),
    providerPayload: { metadata: meta }
  };
  return { item, markdown };
}
