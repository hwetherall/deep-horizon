-- Seed the source patrol definitions (mirrors src/config/patrols.ts).
insert into source_patrols (name, description, priority, config)
values
  ('ai-search-research-tools', 'Find new tools and APIs that improve AI web search, deep research, citation quality, source discovery, crawling, extraction, and synthesis.', 10, '{"providers": ["exa", "tavily", "github"]}'),
  ('agent-infrastructure', 'Find agent frameworks and infrastructure for orchestration, tool use, memory, planning, human-in-loop, and durable execution.', 20, '{"providers": ["exa", "tavily", "github"]}'),
  ('evals-observability', 'Find tools for evaluating, tracing, monitoring, debugging, and improving AI agents.', 30, '{"providers": ["exa", "tavily", "github"]}'),
  ('browser-automation', 'Find tools for browser agents, computer use, web automation, scraping, and task execution.', 40, '{"providers": ["exa", "tavily", "github"]}'),
  ('memory-rag-retrieval', 'Find memory systems, RAG tools, retrieval frameworks, vector search, long-term memory, and knowledge systems useful for Innovera.', 50, '{"providers": ["exa", "tavily", "github"]}'),
  ('model-api-capability-changes', 'Find model and API feature changes that could unlock new Innovera capabilities.', 60, '{"providers": ["exa", "tavily", "rss"]}'),
  ('competitive-agent-companies', 'Find companies building AI agent platforms, AI workflow automation, research agents, and enterprise copilots that may compete with or inspire Innovera.', 70, '{"providers": ["exa", "tavily", "serper"]}')
on conflict (name) do update set
  description = excluded.description,
  priority = excluded.priority,
  config = excluded.config,
  updated_at = now();
