import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exaSearch } from "../../providers/exa.js";
import { tavilySearch } from "../../providers/tavily.js";
import { serperSearch } from "../../providers/serper.js";
import { githubSearchRepos } from "../../providers/github.js";
import { normalizeFirecrawlScrape } from "../../providers/firecrawl.js";
import { parseFeed } from "../../providers/rss.js";
import type { FetchLike } from "../../providers/shared.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const fixture = (name: string) => readFileSync(join(fixturesDir, name), "utf8");

function mockFetch(body: string, status = 200): FetchLike {
  return async () =>
    new Response(body, { status, headers: { "content-type": "application/json" } });
}

describe("exa provider", () => {
  it("normalizes results to RawItem", async () => {
    const { items, costUsd } = await exaSearch(
      "test-key",
      { query: "deep research", patrolName: "ai-search-research-tools" },
      { fetch: mockFetch(fixture("exa-response.json")) }
    );
    expect(items).toHaveLength(2);
    const first = items[0]!;
    expect(first.provider).toBe("exa");
    expect(first.patrolName).toBe("ai-search-research-tools");
    expect(first.title).toBe("Introducing Deep Search");
    expect(first.canonicalUrl).toBe("https://exa.ai/blog/deep-search");
    expect(first.sourceDomain).toBe("exa.ai");
    expect(first.snippet).toContain("deep search mode");
    expect(first.publishedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(first.providerScore).toBe(0.92);
    expect(costUsd).toBe(0.0125);
  });
});

describe("tavily provider", () => {
  it("normalizes results to RawItem", async () => {
    const { items } = await tavilySearch(
      "test-key",
      { query: "agent evals", patrolName: "evals-observability" },
      { fetch: mockFetch(fixture("tavily-response.json")) }
    );
    expect(items).toHaveLength(2);
    expect(items[0]!.provider).toBe("tavily");
    expect(items[0]!.title).toBe("AgentBench 2.0 released");
    expect(items[0]!.publishedAt).toBeDefined();
    expect(items[1]!.canonicalUrl).toBe("https://seo-listicle.com/top-100-ai-tools");
  });
});

describe("serper provider", () => {
  it("normalizes organic results", async () => {
    const { items } = await serperSearch(
      "test-key",
      { query: "browser agents", patrolName: "browser-automation" },
      { fetch: mockFetch(fixture("serper-response.json")) }
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.provider).toBe("serper");
    expect(items[0]!.sourceDomain).toBe("browserbase.com");
    expect(items[0]!.providerScore).toBe(0.5);
  });
});

describe("github provider", () => {
  it("normalizes repos with stats in snippet and payload", async () => {
    const { items } = await githubSearchRepos(
      "test-token",
      { query: '"deep research"', patrolName: "ai-search-research-tools" },
      { fetch: mockFetch(fixture("github-response.json")) }
    );
    expect(items).toHaveLength(1);
    const repo = items[0]!;
    expect(repo.provider).toBe("github");
    expect(repo.title).toBe("assafelovic/gpt-researcher");
    expect(repo.snippet).toContain("★ 23000");
    expect(repo.providerScore).toBe(23000);
    const payload = repo.providerPayload as Record<string, unknown>;
    expect(payload.license).toBe("Apache-2.0");
    expect(payload.topics).toEqual(["ai-agent", "deep-research", "llm"]);
  });
});

describe("firecrawl provider", () => {
  it("normalizes scrape data", () => {
    const data = JSON.parse(fixture("firecrawl-response.json")).data;
    const { item, markdown } = normalizeFirecrawlScrape(data, "https://exa.ai/pricing", "deep-research");
    expect(item.provider).toBe("firecrawl");
    expect(item.title).toBe("Pricing — Exa");
    expect(item.sourceDomain).toBe("exa.ai");
    expect(markdown).toContain("Pay-as-you-go");
    expect(item.rawContent).toContain("Deep search");
  });
});

describe("rss provider", () => {
  it("parses RSS 2.0 feeds", () => {
    const items = parseFeed(fixture("rss-feed.xml"), "Anthropic News", "model-api-capability-changes");
    expect(items).toHaveLength(2);
    const first = items[0]!;
    expect(first.provider).toBe("rss");
    expect(first.title).toBe("Claude adds new tool-use capabilities");
    expect(first.canonicalUrl).toBe("https://anthropic.com/news/tool-use-update");
    expect(first.snippet).toContain("structured output");
    expect(first.snippet).not.toContain("<strong>");
    expect(first.publishedAt).toBe("2026-06-08T12:00:00.000Z");
  });

  it("parses Atom feeds", () => {
    const items = parseFeed(fixture("atom-feed.xml"), "Vendor Changelog", "model-api-capability-changes");
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe("v2.4: deep search API");
    expect(items[0]!.url).toBe("https://vendor.example.com/changelog/v2-4");
    expect(items[0]!.publishedAt).toBe("2026-06-07T08:00:00.000Z");
  });

  it("returns empty for non-feed XML", () => {
    expect(parseFeed("<html></html>", "x", "y")).toEqual([]);
  });
});
