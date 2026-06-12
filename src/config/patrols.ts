import type { SourceProvider } from "../db/types.js";

export interface PatrolConfig {
  name: string;
  priority: number;
  description: string;
  queries: readonly string[];
  providers: readonly SourceProvider[];
  minScoreForDeepResearch?: number;
}

/**
 * Patrols are ordered by the seed-answer tiers (deep-horizon-seed.md §5):
 * Tier 1 (priority 10–50) is the research product itself, Tier 2 (60–100)
 * is plumbing that improves the engine, Tier 3 (110+) is detection/future.
 */
export const PATROLS: readonly PatrolConfig[] = [
  // ---- Tier 1 — the research product itself -------------------------------
  {
    name: "ai-search-research-tools",
    priority: 10,
    description:
      "Tier 1.1 Deep research & multi-source synthesis — this IS Innovera's product. Find tools, APIs, and patterns that improve source discovery, citation accuracy, freshness, crawling, extraction, and synthesis quality for a deep-research engine.",
    queries: [
      "new AI search API deep research agent launched",
      "deep research agent open source multi-source synthesis citations",
      "AI research report generation tool citation accuracy",
      "web-scale search API for LLM research agents Exa Tavily alternatives",
      "document extraction crawling API for AI research primary sources"
    ],
    providers: ["exa", "tavily", "github"],
    minScoreForDeepResearch: 7.5
  },
  {
    name: "market-competitive-intelligence",
    priority: 20,
    description:
      "Tier 1.2 Market & competitive intelligence — tools and data sources for market sizing, incumbent mapping, and market-entry attractiveness (the ABB/RackPDU-style question). Look for structured market/competitor/funding data with API access.",
    queries: [
      "market intelligence API competitor data market sizing",
      "competitive intelligence platform API market entry analysis",
      "company data API funding incumbents market research",
      "AI market analysis tool TAM sizing competitor mapping",
      "industry analysis data source API market reports"
    ],
    providers: ["exa", "tavily", "serper"]
  },
  {
    name: "deep-tech-feasibility",
    priority: 30,
    description:
      "Tier 1.3 Technical feasibility & deep-tech scouting — tools and data to assess whether a frontier build is viable across non-software domains (satellite comms, robotics, sensing, energy/power hardware). The engine cannot be tuned to AI/software alone.",
    queries: [
      "technology scouting platform deep tech assessment API",
      "technical feasibility analysis tool engineering data source",
      "deep tech research database hardware robotics satellite",
      "scientific literature search API engineering domains",
      "emerging technology landscape mapping tool API"
    ],
    providers: ["exa", "tavily", "serper"]
  },
  {
    name: "patent-ip-regulatory",
    priority: 40,
    description:
      "Tier 1.4 Patent / IP / regulatory research — deep-tech ventures live and die on freedom-to-operate, prior art, and regulatory feasibility. Find patent/prior-art APIs (Google Patents, PatentsView, Lens.org class), IP analytics, and regulatory-research tooling.",
    queries: [
      "patent search API prior art freedom to operate",
      "patent analytics platform API claims data",
      "regulatory research tool compliance database API",
      "IP intelligence prior art search AI tool",
      "patent landscape analysis API open data"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "risk-analysis-frameworks",
    priority: 50,
    description:
      "Tier 1.5 Risk identification & analysis frameworks — risk is an explicit, named output of Innovera's product. Find anything that structures or strengthens risk surfacing for new-venture and market-entry decisions: frameworks, tools, structured risk taxonomies.",
    queries: [
      "risk assessment framework new venture market entry",
      "AI risk analysis tool strategic decision making",
      "venture risk identification framework corporate innovation",
      "structured risk taxonomy technology assessment tool",
      "scenario analysis tool strategic risk software"
    ],
    providers: ["exa", "tavily", "github"]
  },

  // ---- Tier 2 — plumbing that improves the engine -------------------------
  {
    name: "agent-infrastructure",
    priority: 60,
    description:
      "Tier 2.6 Agent infrastructure & orchestration — durable, branching, multi-step research workflows (LangGraph class). Only valuable insofar as it makes Innovera's research engine deeper, broader, or more reliable; plumbing-only improvements rank low.",
    queries: [
      "durable AI agent orchestration framework long running research workflows",
      "agent workflow framework human in the loop persistence",
      "multi-step research agent orchestration TypeScript",
      "agent planning framework branching control flow LLM",
      "MCP agent framework tool connectivity new"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "memory-rag-retrieval",
    priority: 70,
    description:
      "Tier 2.7 Agent memory / RAG / retrieval / knowledge systems — retaining and reusing research context across long multi-week client initiatives.",
    queries: [
      "AI agent memory system long research projects open source",
      "RAG retrieval framework research corpus citations",
      "knowledge graph memory LLM agents research",
      "long term memory AI agents context reuse",
      "retrieval evaluation framework RAG quality"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "evals-observability",
    priority: 80,
    description:
      "Tier 2.8 Evals / observability / tracing — research reliability and trustable outputs for high-stakes client decisions. Tracing and evaluating long research runs.",
    queries: [
      "LLM eval framework research quality citation accuracy",
      "AI agent tracing observability long running workflows",
      "LLM output reliability evaluation high stakes",
      "research agent benchmark eval dataset tool",
      "LLM regression testing evals platform new"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "model-api-capability-changes",
    priority: 90,
    description:
      "Tier 2.9 Model / API capability changes — new capabilities (longer context, better tool use, new modalities, deep-research endpoints) that unlock deeper or broader research. Includes Perplexity/OpenAI/Gemini Deep Research-class product moves as capability bars.",
    queries: [
      "new LLM API deep research capability launched",
      "model API longer context tool use update research agents",
      "LLM provider changelog structured outputs research",
      "new multimodal model API document analysis",
      "deep research product launch Perplexity OpenAI Gemini update"
    ],
    providers: ["exa", "tavily", "rss"]
  },
  {
    name: "browser-automation",
    priority: 100,
    description:
      "Tier 2.10 Browser automation / computer use — agent access to sources behind interaction: portals, dynamic pages, gated industry data. Valued as research-source access, not as automation for its own sake.",
    queries: [
      "browser agent framework access gated data sources",
      "computer use agent web research automation",
      "hosted browser API for AI agents reliability",
      "AI web automation extract data behind login portal",
      "headless browser agent framework new"
    ],
    providers: ["exa", "tavily", "github"]
  },

  // ---- Tier 3 — detection & future ----------------------------------------
  {
    name: "competitor-emergence",
    priority: 110,
    description:
      "Tier 3.11 Competitive emergence — no direct competitors are known yet, so detect EMERGENCE: any company beginning to offer research-to-strategy-to-risk or new-venture validation for corporate innovation teams, as a product or a service. Also watch adjacent players (strategy consultancies productizing research, innovation-management platforms, market-intelligence platforms, AI deep-research products) moving toward initiative-in → researched options + risks out.",
    queries: [
      "AI research strategy platform corporate innovation teams launched",
      "new venture validation software corporate innovation",
      "AI strategy analyst startup enterprise innovation",
      "consulting firm AI research product corporate ventures",
      "innovation intelligence platform venture research risk launched"
    ],
    providers: ["exa", "tavily", "serper"]
  }
] as const;

export function getPatrol(name: string): PatrolConfig | undefined {
  return PATROLS.find((p) => p.name === name);
}

/** GitHub search queries for the open-source leverage patrol (Tier 3.12). */
export const GITHUB_QUERIES: readonly string[] = [
  '"deep research" pushed:>2026-01-01',
  'topic:ai-agent stars:>100 pushed:>2026-01-01',
  '"research agent" pushed:>2026-01-01',
  '"market research" llm pushed:>2026-01-01',
  '"patent search" pushed:>2026-01-01',
  '"risk assessment" llm pushed:>2026-01-01',
  '"rag evaluation" pushed:>2026-01-01',
  '"mcp server" research pushed:>2026-01-01'
];

/** Durable high-signal RSS feeds (plan §9). Extend freely. */
export const RSS_FEEDS: readonly { name: string; url: string }[] = [
  { name: "OpenAI News", url: "https://openai.com/news/rss.xml" },
  { name: "Anthropic News", url: "https://www.anthropic.com/rss.xml" },
  { name: "Google DeepMind Blog", url: "https://deepmind.google/blog/rss.xml" },
  { name: "Meta AI Blog", url: "https://ai.meta.com/blog/rss/" },
  { name: "Mistral AI News", url: "https://mistral.ai/feed.xml" },
  { name: "LangChain Blog", url: "https://blog.langchain.dev/rss/" },
  { name: "Hacker News Front Page", url: "https://hnrss.org/frontpage" },
  { name: "Hacker News Show HN", url: "https://hnrss.org/show" }
];
