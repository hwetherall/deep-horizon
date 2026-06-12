-- Reweight patrols around the research-and-strategy engine
-- (deep-horizon-seed.md §1/§5). Mirrors src/config/patrols.ts.

insert into source_patrols (name, description, priority, config)
values
  -- Tier 1 — the research product itself
  ('ai-search-research-tools', 'Tier 1.1 Deep research & multi-source synthesis — this IS Innovera''s product. Find tools, APIs, and patterns that improve source discovery, citation accuracy, freshness, crawling, extraction, and synthesis quality for a deep-research engine.', 10, '{"providers": ["exa", "tavily", "github"]}'),
  ('market-competitive-intelligence', 'Tier 1.2 Market & competitive intelligence — tools and data sources for market sizing, incumbent mapping, and market-entry attractiveness (the ABB/RackPDU-style question). Look for structured market/competitor/funding data with API access.', 20, '{"providers": ["exa", "tavily", "serper"]}'),
  ('deep-tech-feasibility', 'Tier 1.3 Technical feasibility & deep-tech scouting — tools and data to assess whether a frontier build is viable across non-software domains (satellite comms, robotics, sensing, energy/power hardware). The engine cannot be tuned to AI/software alone.', 30, '{"providers": ["exa", "tavily", "serper"]}'),
  ('patent-ip-regulatory', 'Tier 1.4 Patent / IP / regulatory research — deep-tech ventures live and die on freedom-to-operate, prior art, and regulatory feasibility. Find patent/prior-art APIs (Google Patents, PatentsView, Lens.org class), IP analytics, and regulatory-research tooling.', 40, '{"providers": ["exa", "tavily", "github"]}'),
  ('risk-analysis-frameworks', 'Tier 1.5 Risk identification & analysis frameworks — risk is an explicit, named output of Innovera''s product. Find anything that structures or strengthens risk surfacing for new-venture and market-entry decisions: frameworks, tools, structured risk taxonomies.', 50, '{"providers": ["exa", "tavily", "github"]}'),
  -- Tier 2 — plumbing that improves the engine
  ('agent-infrastructure', 'Tier 2.6 Agent infrastructure & orchestration — durable, branching, multi-step research workflows (LangGraph class). Only valuable insofar as it makes Innovera''s research engine deeper, broader, or more reliable; plumbing-only improvements rank low.', 60, '{"providers": ["exa", "tavily", "github"]}'),
  ('memory-rag-retrieval', 'Tier 2.7 Agent memory / RAG / retrieval / knowledge systems — retaining and reusing research context across long multi-week client initiatives.', 70, '{"providers": ["exa", "tavily", "github"]}'),
  ('evals-observability', 'Tier 2.8 Evals / observability / tracing — research reliability and trustable outputs for high-stakes client decisions. Tracing and evaluating long research runs.', 80, '{"providers": ["exa", "tavily", "github"]}'),
  ('model-api-capability-changes', 'Tier 2.9 Model / API capability changes — new capabilities (longer context, better tool use, new modalities, deep-research endpoints) that unlock deeper or broader research. Includes Perplexity/OpenAI/Gemini Deep Research-class product moves as capability bars.', 90, '{"providers": ["exa", "tavily", "rss"]}'),
  ('browser-automation', 'Tier 2.10 Browser automation / computer use — agent access to sources behind interaction: portals, dynamic pages, gated industry data. Valued as research-source access, not as automation for its own sake.', 100, '{"providers": ["exa", "tavily", "github"]}'),
  -- Tier 3 — detection & future
  ('competitor-emergence', 'Tier 3.11 Competitive emergence — no direct competitors are known yet, so detect EMERGENCE: any company beginning to offer research-to-strategy-to-risk or new-venture validation for corporate innovation teams, as a product or a service. Also watch adjacent players (strategy consultancies productizing research, innovation-management platforms, market-intelligence platforms, AI deep-research products) moving toward initiative-in -> researched options + risks out.', 110, '{"providers": ["exa", "tavily", "serper"]}')
on conflict (name) do update set
  description = excluded.description,
  priority = excluded.priority,
  config = excluded.config,
  enabled = true,
  updated_at = now();

-- Superseded by competitor-emergence; keep the row for raw_items audit
-- history but stop scheduling it.
update source_patrols
set enabled = false, updated_at = now()
where name = 'competitive-agent-companies';
