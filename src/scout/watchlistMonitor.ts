import { getEnv } from "../config/env.js";
import { getDb } from "../db/client.js";
import { getDueWatchlistItems, markWatchlistChecked } from "../db/queries/watchlist.js";
import { addEvidence } from "../db/queries/opportunities.js";
import { logProviderCall } from "../db/queries/calls.js";
import { firecrawlScrape } from "../providers/firecrawl.js";
import { jinaRead } from "../providers/jina.js";
import { contentHash, sha256 } from "../utils/hash.js";
import { logger } from "../utils/logger.js";

export interface WatchlistCheckResult {
  checked: number;
  changed: { name: string; url: string }[];
  errors: string[];
}

const NEXT_CHECK_HOURS = 24;

/**
 * Check watchlist URLs for meaningful change (plan §16 scout.watchlist-monitor).
 * Uses Firecrawl (Jina as fallback) and compares content hashes stored in
 * watchlist metadata. On change: store evidence and bump last_seen.
 */
export async function runWatchlistMonitor(params: {
  scanRunId: string;
}): Promise<WatchlistCheckResult> {
  const env = getEnv();
  const db = getDb();
  const items = await getDueWatchlistItems();
  const result: WatchlistCheckResult = { checked: 0, changed: [], errors: [] };

  for (const item of items) {
    if (!item.url) continue;
    result.checked++;
    const started = Date.now();
    const nextCheckAt = new Date(Date.now() + NEXT_CHECK_HOURS * 60 * 60 * 1000).toISOString();

    try {
      const markdown = await fetchPageMarkdown(item.url);
      const newHash = contentHash(markdown);
      const oldHash = typeof item.metadata?.content_hash === "string"
        ? (item.metadata.content_hash as string)
        : undefined;

      await logProviderCall({
        scanRunId: params.scanRunId,
        provider: env.FIRECRAWL_API_KEY ? "firecrawl" : "jina",
        endpoint: "watchlist-check",
        requestHash: sha256(item.url),
        status: "ok",
        latencyMs: Date.now() - started,
        metadata: { url: item.url, changed: oldHash !== undefined && oldHash !== newHash }
      });

      const meaningfulChange = oldHash !== undefined && oldHash !== newHash;
      if (meaningfulChange && item.opportunity_id) {
        await addEvidence({
          opportunityId: item.opportunity_id,
          url: item.url,
          title: `Watchlist change detected: ${item.name}`,
          summary: markdown.slice(0, 1000),
          evidenceType: "watchlist_change"
        });
        await db
          .from("opportunities")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", item.opportunity_id);
        result.changed.push({ name: item.name, url: item.url });
      }

      await markWatchlistChecked({
        watchlistItemId: item.id,
        nextCheckAt,
        metadata: { ...item.metadata, content_hash: newHash }
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.errors.push(`${item.name}: ${msg}`);
      logger.warn("Watchlist check failed", { item: item.name, url: item.url, error: msg });
      await markWatchlistChecked({ watchlistItemId: item.id, nextCheckAt });
    }
  }

  return result;
}

async function fetchPageMarkdown(url: string): Promise<string> {
  const env = getEnv();
  if (env.FIRECRAWL_API_KEY) {
    const { markdown } = await firecrawlScrape(env.FIRECRAWL_API_KEY, {
      url,
      patrolName: "watchlist"
    });
    return markdown;
  }
  const { markdown } = await jinaRead(env.JINA_API_KEY, { url, patrolName: "watchlist" });
  return markdown;
}
