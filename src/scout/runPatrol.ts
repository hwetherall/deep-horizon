import { getEnv } from "../config/env.js";
import { getPatrol, RSS_FEEDS, GITHUB_QUERIES } from "../config/patrols.js";
import type { RawItem, SourceProvider } from "../db/types.js";
import { insertRawItems, countRawItemsToday } from "../db/queries/rawItems.js";
import { logProviderCall } from "../db/queries/calls.js";
import { assertBudgetAvailable, BudgetExceededError } from "../utils/cost.js";
import { sha256 } from "../utils/hash.js";
import { logger } from "../utils/logger.js";
import { exaSearch } from "../providers/exa.js";
import { tavilySearch } from "../providers/tavily.js";
import { serperSearch } from "../providers/serper.js";
import { githubSearchRepos } from "../providers/github.js";
import { fetchRssFeed } from "../providers/rss.js";

export interface PatrolRunResult {
  patrolName: string;
  provider: SourceProvider;
  fetched: number;
  inserted: number;
  duplicates: number;
  errors: string[];
}

// Rough per-call estimates used only for budget gating (plan §20).
const ESTIMATED_CALL_COST: Partial<Record<SourceProvider, number>> = {
  exa: 0.01,
  tavily: 0.01,
  serper: 0.003,
  github: 0,
  rss: 0
};

/**
 * Run one patrol against one provider: execute queries, normalize, insert
 * raw items with dedupe, log every provider call.
 */
export async function runPatrol(params: {
  scanRunId: string;
  patrolName: string;
  provider: SourceProvider;
  dateWindowStart: string;
  maxResultsPerQuery?: number;
}): Promise<PatrolRunResult> {
  const env = getEnv();
  const patrol = getPatrol(params.patrolName);
  if (!patrol) throw new Error(`Unknown patrol: ${params.patrolName}`);

  const result: PatrolRunResult = {
    patrolName: params.patrolName,
    provider: params.provider,
    fetched: 0,
    inserted: 0,
    duplicates: 0,
    errors: []
  };

  const queries = buildQueries(params.provider, patrol.queries);
  const maxResults = params.maxResultsPerQuery ?? 10;

  for (const query of queries) {
    // Stop if today's raw-item cap is reached.
    const todayCount = await countRawItemsToday();
    if (todayCount >= env.SCOUT_MAX_RAW_ITEMS_PER_DAY) {
      logger.warn("Daily raw item cap reached; stopping patrol", {
        patrol: params.patrolName,
        provider: params.provider,
        todayCount
      });
      break;
    }

    const started = Date.now();
    try {
      await assertBudgetAvailable({
        kind: "provider",
        estimatedCostUsd: ESTIMATED_CALL_COST[params.provider] ?? 0.01
      });

      const { items, costUsd, endpoint } = await executeQuery({
        provider: params.provider,
        query,
        patrolName: params.patrolName,
        dateWindowStart: params.dateWindowStart,
        maxResults
      });

      result.fetched += items.length;
      const insertResult = await insertRawItems(params.scanRunId, items);
      result.inserted += insertResult.inserted.length;
      result.duplicates += insertResult.duplicates;

      await logProviderCall({
        scanRunId: params.scanRunId,
        provider: params.provider,
        endpoint,
        requestHash: sha256(`${params.provider}:${query}`),
        status: "ok",
        costUsd: costUsd ?? ESTIMATED_CALL_COST[params.provider],
        latencyMs: Date.now() - started,
        metadata: { query, fetched: items.length }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`${query}: ${message}`);
      await logProviderCall({
        scanRunId: params.scanRunId,
        provider: params.provider,
        endpoint: "search",
        requestHash: sha256(`${params.provider}:${query}`),
        status: "error",
        latencyMs: Date.now() - started,
        metadata: { query },
        error: message
      });
      if (error instanceof BudgetExceededError) {
        logger.warn("Provider budget exceeded; stopping patrol", {
          patrol: params.patrolName,
          provider: params.provider
        });
        break;
      }
    }
  }

  return result;
}

function buildQueries(
  provider: SourceProvider,
  patrolQueries: readonly string[]
): readonly string[] {
  if (provider === "github") return GITHUB_QUERIES;
  if (provider === "rss") return RSS_FEEDS.map((f) => f.url);
  return patrolQueries;
}

async function executeQuery(params: {
  provider: SourceProvider;
  query: string;
  patrolName: string;
  dateWindowStart: string;
  maxResults: number;
}): Promise<{ items: RawItem[]; costUsd?: number; endpoint: string }> {
  const env = getEnv();

  switch (params.provider) {
    case "exa": {
      if (!env.EXA_API_KEY) throw new Error("EXA_API_KEY not configured");
      return exaSearch(env.EXA_API_KEY, {
        query: params.query,
        patrolName: params.patrolName,
        numResults: params.maxResults,
        startPublishedDate: params.dateWindowStart
      });
    }
    case "tavily": {
      if (!env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY not configured");
      return tavilySearch(env.TAVILY_API_KEY, {
        query: params.query,
        patrolName: params.patrolName,
        maxResults: params.maxResults,
        searchDepth: "basic",
        timeRange: "week"
      });
    }
    case "serper": {
      if (!env.SERPER_API_KEY) throw new Error("SERPER_API_KEY not configured");
      return serperSearch(env.SERPER_API_KEY, {
        query: params.query,
        patrolName: params.patrolName,
        num: params.maxResults
      });
    }
    case "github": {
      if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN not configured");
      return githubSearchRepos(env.GITHUB_TOKEN, {
        query: params.query,
        patrolName: params.patrolName,
        perPage: params.maxResults
      });
    }
    case "rss": {
      const feed = RSS_FEEDS.find((f) => f.url === params.query);
      return fetchRssFeed({
        feedName: feed?.name ?? params.query,
        feedUrl: params.query,
        patrolName: params.patrolName
      });
    }
    default:
      throw new Error(`Provider ${params.provider} not supported in patrols`);
  }
}
