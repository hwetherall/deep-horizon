import type { SourceProvider } from "../db/types.js";

export interface PatrolConfig {
  name: string;
  priority: number;
  description: string;
  queries: readonly string[];
  providers: readonly SourceProvider[];
  minScoreForDeepResearch?: number;
}

export const PATROLS: readonly PatrolConfig[] = [
  {
    name: "ai-search-research-tools",
    priority: 10,
    description:
      "Find new tools and APIs that improve AI web search, deep research, citation quality, source discovery, crawling, extraction, and synthesis.",
    queries: [
      "new AI search API for agents deep research launched",
      "LLM web research API agent search tool",
      "deep research agent open source web search citations",
      "new tools for AI agents web browsing search extraction",
      "AI-native search API Exa Tavily alternatives"
    ],
    providers: ["exa", "tavily", "github"],
    minScoreForDeepResearch: 7.5
  },
  {
    name: "agent-infrastructure",
    priority: 20,
    description:
      "Find agent frameworks and infrastructure for orchestration, tool use, memory, planning, human-in-loop, and durable execution.",
    queries: [
      "new AI agent framework durable execution memory tools",
      "agent orchestration framework TypeScript LLM",
      "long running AI agent framework memory",
      "human in the loop AI agent workflow framework",
      "MCP agent framework new"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "evals-observability",
    priority: 30,
    description:
      "Find tools for evaluating, tracing, monitoring, debugging, and improving AI agents.",
    queries: [
      "new AI agent eval framework open source",
      "LLM observability tracing agent evaluation tool",
      "AI agent monitoring debugging framework",
      "prompt evals LLM regression testing new tool",
      "LLM tracing platform agent observability"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "browser-automation",
    priority: 40,
    description:
      "Find tools for browser agents, computer use, web automation, scraping, and task execution.",
    queries: [
      "browser agent framework AI automation new",
      "computer use agent browser automation open source",
      "AI web automation tool for agents",
      "browser-use alternatives agent automation",
      "headless browser AI agent framework"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "memory-rag-retrieval",
    priority: 50,
    description:
      "Find memory systems, RAG tools, retrieval frameworks, vector search, long-term memory, and knowledge systems useful for Innovera.",
    queries: [
      "AI agent memory system open source",
      "long term memory for AI agents",
      "RAG evaluation retrieval framework new",
      "knowledge graph memory LLM agents",
      "vector database agent memory new feature"
    ],
    providers: ["exa", "tavily", "github"]
  },
  {
    name: "model-api-capability-changes",
    priority: 60,
    description:
      "Find model and API feature changes that could unlock new Innovera capabilities.",
    queries: [
      "new LLM API feature tool calling structured output agents",
      "new model API computer use browser agent",
      "LLM provider changelog structured outputs agents",
      "new multimodal model API agent tools",
      "AI model pricing context window tool use update"
    ],
    providers: ["exa", "tavily", "rss"]
  },
  {
    name: "competitive-agent-companies",
    priority: 70,
    description:
      "Find companies building AI agent platforms, AI workflow automation, research agents, and enterprise copilots that may compete with or inspire Innovera.",
    queries: [
      "new AI agent platform startup enterprise workflows",
      "AI workflow automation company agents launched",
      "enterprise AI agents company research automation",
      "AI copilot agent platform vertical SaaS launched",
      "autonomous business process AI agent company"
    ],
    providers: ["exa", "tavily", "serper"]
  }
] as const;

export function getPatrol(name: string): PatrolConfig | undefined {
  return PATROLS.find((p) => p.name === name);
}

/** GitHub search queries for the open-source leverage patrol (plan §9). */
export const GITHUB_QUERIES: readonly string[] = [
  "topic:ai-agent stars:>100 pushed:>2026-01-01",
  "topic:llm stars:>100 pushed:>2026-01-01",
  '"agent eval" pushed:>2026-01-01',
  '"browser agent" pushed:>2026-01-01',
  '"deep research" pushed:>2026-01-01',
  '"mcp server" pushed:>2026-01-01',
  '"rag evaluation" pushed:>2026-01-01'
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
