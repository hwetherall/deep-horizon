# Deep Horizon — Seed Answers (working draft)

> Repo / plan working name: **Hermes Scout**. Product: Innovera's always-on AI opportunity radar.
>
> **Status:** 9 of 15 seed questions are settled below — Q1, Q5, Q6, Q7, Q9, Q10, Q11, Q13, Q14. The remaining six (Q2, Q3, Q4, Q8, Q12, Q15) need Harry's input and are listed at the end.
>
> **Framing correction vs. the original plan:** the original patrols are AI/agent-infrastructure-centric. Innovera's near-term product is a deep-tech, cross-domain **research-and-strategy engine** for corporate innovation teams. This seed reweights the scout toward improving the *client-facing research product*, treating AI infrastructure as a *means* to a better engine rather than an end in itself.

---

## 1. Innovera direction

Innovera is building toward a full **venture-lifecycle software suite** — ideation → design → launch → growth → maturity — for corporate innovation teams creating new business ventures. That is the **18-month** horizon.

For the **next 6 months** the product is narrower and sharper: a **research-and-strategy engine**. A corporate innovation team brings an initiative, Innovera does the heavy research, returns the strongest options and strategies, and surfaces the risks attached to each.

**Buyer:** corporate innovation teams at large companies. They have capital and ambition and need defensible, well-researched paths into new ventures.

**Initiatives are deep-tech, cross-domain, and span a spectrum:**

- **Frontier build** ("can we build this, and should we"): Samsung exploring a Starlink competitor (LEO satellite comms); LG exploring a chemical-sensing robo-dog (robotics + sensor science).
- **Mature-market entry** ("should we enter this established market, against these incumbents"): ABB evaluating entry into the RackPDU market (data-center power hardware).

The engine therefore has to go deep across unfamiliar technical domains *and* assess competitive/market-entry attractiveness — and it cannot be tuned to AI/software alone.

**Scout implications (the compass):**

- Prioritize anything that makes the *initiative → researched options → risks* loop **deeper, broader, more credible, and faster** — especially across non-software domains.
- Treat AI/agent infrastructure as a **means** to a better research engine, not an end.
- Treat the 18-month lifecycle surfaces (design, launch/GTM, growth tooling) as **watch-but-downrank for now**.

---

## 5. Priority categories (ranked)

Reweighted around the research engine. The top group is the *product*; the middle group is the *plumbing that improves the product*; the bottom group is *future / detection*.

**Tier 1 — the research product itself**

1. **Deep research & multi-source synthesis** — this *is* the product. Better discovery, citation accuracy, freshness, and synthesis quality directly improve what the client pays for.
2. **Market & competitive intelligence** — sizing, incumbent mapping, market-entry attractiveness. Driven directly by ABB/RackPDU and the competitive side of Samsung/Starlink.
3. **Technical feasibility & deep-tech scouting** — tools/data to assess whether a frontier build is viable across domains (satellite, robotics, sensing). Driven by LG and Samsung.
4. **Patent / IP / regulatory research** — deep-tech ventures live and die on freedom-to-operate, prior art, and regulatory feasibility. Currently a blind spot for the scout.
5. **Risk identification & analysis frameworks** — risk is an explicit, named output of the product. Anything that structures or strengthens risk surfacing matters.

**Tier 2 — plumbing that improves the engine**

6. **Agent infrastructure & orchestration** — durable, multi-step research workflows.
7. **Agent memory / RAG / retrieval / knowledge systems** — retaining and reusing research context across long initiatives.
8. **Evals / observability / tracing** — research reliability; trustable outputs for high-stakes client decisions.
9. **Model / API capability changes** — new capabilities (longer context, better tool use, new modalities) that unlock deeper research.
10. **Browser automation / computer use** — access to sources behind interaction (portals, dynamic pages, gated data).

**Tier 3 — detection & future**

11. **Competitive emergence** — detect anyone *starting* to do research→strategy→risk for corporate innovation teams (see Q9).
12. **Open-source repos useful to the engine** — leverage and build-vs-buy signal.
13. **Watch-but-downrank:** design / launch-GTM / growth tooling (the 18-month surfaces). Quiet note only; never a top-3 daily item yet.

---

## 6. Ignore / downrank rules

**Default noise (reject or hard-downrank):**

- Generic AI newsletters and roundups.
- "Top 100 AI tools" listicles (unless a specific tool inside is itself valuable).
- Funding-only announcements with no product/technical detail.
- Thin ChatGPT/LLM wrappers with weak differentiation.
- Consumer AI apps (image/chat/companion) with no API or research relevance.
- Prompt packs, "X best prompts," course/affiliate content.
- Viral demos with no API, repo, or docs.
- Enterprise tools with no self-serve path *and* no clear integration story.
- Academic papers with no practical implementation path.
- Pure social-media hype with no primary source.

**Deep-tech-specific noise (new):**

- Narrow single-vertical software tools with no cross-domain research value.
- "AI agent" tooling that only improves plumbing with no plausible path to deeper or broader research output.
- Generic horizontal SaaS unrelated to research, strategy, or risk.

**Exceptions (do NOT auto-reject when):**

- A **funding** announcement names a company that is *directly competitive* (emerging research→strategy→risk for innovation teams) or that funds an imminent product launch in a Tier-1 category.
- A **consumer app** demonstrates a genuinely novel research/synthesis capability pattern worth studying even if not directly adoptable.
- A **paper** ships with a working repo, benchmark, or API — then it is implementation-ready, not noise.

---

## 7. Positive examples (discoveries the scout should catch)

Format per item: **Name** (category) — why it mattered / what to notice / action / urgency.

1. **Exa** (AI search / deep research API) — neural search + a deep-research endpoint; raises source-discovery quality, the core of the product. Notice: structured contents, deep search modes, domain filters. Action: benchmark. Urgency: high.
2. **Tavily** (research API) — fast, agent-friendly search and "what changed this week" calls. Notice: search depth + time-range params. Action: benchmark. Urgency: medium.
3. **Firecrawl** (extraction / crawl / monitoring) — clean markdown from primary sources (docs, pricing, filings), plus change monitoring of known pages. Notice: scrape/crawl/monitor split. Action: integrate. Urgency: high.
4. **GPT Researcher** (open-source deep-research agent) — a reference pattern for multi-step research-and-report generation. Notice: planner→search→synthesize loop. Action: study / benchmark. Urgency: medium.
5. **Perplexity / OpenAI Deep Research / Gemini Deep Research** (research-product patterns) — the closest public analogues to Innovera's research surface; benchmark targets and capability bars. Notice: citation quality, depth, controllability. Action: benchmark + watch. Urgency: high.
6. **A patent / prior-art API** (e.g. Google Patents, PatentsView, Lens.org) (IP research) — exactly the kind of source the scout currently *would not* catch but should, given deep-tech IP/freedom-to-operate questions. Notice: coverage, structured claims, API access. Action: prototype. Urgency: medium-high.
7. **A market-intelligence data source** (e.g. AlphaSense, CB Insights — *to confirm*) (market intelligence) — structured market/competitor/funding data for entry questions like RackPDU. Notice: data freshness, API, licensing. Action: evaluate / partner. Urgency: medium.
8. **LangGraph** (agent orchestration) — durable, branching, human-in-the-loop research workflows. Notice: persistence + control-flow primitives. Action: benchmark. Urgency: medium.
9. **LangSmith** (evals / observability / tracing) — trace and evaluate long research runs; reliability for high-stakes outputs. Notice: dataset evals + tracing. Action: integrate. Urgency: medium.
10. **Browserbase / Browser Use** (browser automation) — agent access to interactive and gated sources. Notice: hosted browsers, reliability, cost. Action: watch / prototype. Urgency: low-medium.
11. **Composio / Arcade / MCP servers** (tool connectivity) — connect the engine to external data/tools cleanly. Notice: auth handling, breadth of integrations. Action: watch. Urgency: low.

> Items 5 and 7 name external products as *candidates to study* — confirm or replace based on Innovera's actual stack and relationships.

---

## 9. Competitors / comparables / watchlist

**Direct competitors:** none identified yet. Because the list is empty, competitor detection is reframed from "monitor a known list" to **emergence detection**: flag when any company begins offering research-to-strategy-to-risk / new-venture validation *for corporate innovation teams* as a product or service. That keeps the `competitive_warning` action meaningful with an empty list.

**Adjacent / patterns to study (candidates — confirm or reject):**

- **Strategy & innovation consultancies productizing their work** (the "AI strategy analyst" pattern) — service-model comparable.
- **Innovation-management platforms** (idea pipelines, stage-gate tools) — adjacent buyer, different job; study for buyer overlap, not capability.
- **Market-intelligence platforms** (AlphaSense, CB Insights style) — technical/data patterns for the market-intelligence category.
- **AI deep-research products** (Perplexity, OpenAI/Gemini Deep Research) — product patterns for the research surface and the bar to beat.

**What kind of change matters:** any of the above moving toward *initiative-in → researched options + risks out*, especially aimed at enterprise innovation teams.

**Watch targets (per company/source):** launch posts, product pages, pricing pages, docs, changelogs, and job postings (hiring signals reveal direction).

---

## 10. Trusted sources

Format: **Source** — trust level / why / common failure mode / how the scout should use it.

- **GitHub** — high for open-source infra / leverage; ground truth on what exists. Failure mode: stars and hype mislead on real usefulness. Use for repo discovery and build-vs-buy, weight recency + maintenance over stars.
- **Official docs & API changelogs** — high for *capability* truth. Failure mode: says nothing about market importance. Use to verify what a tool actually does and to detect capability changes.
- **Company blogs / launch posts** — medium-high for what shipped. Failure mode: marketing gloss. Use for "what changed / why now," corroborate with docs.
- **arXiv / Papers With Code** — high for capability research. Failure mode: no market signal; many papers never ship. Use only when there is a repo/benchmark/implementation path.
- **Hacker News** — medium for early signal and credible discussion. Failure mode: noisy, hype cycles. Use to surface candidates, not to judge importance.
- **Product Hunt** — medium for launches. Failure mode: many shallow products. Use for discovery, downrank thin wrappers.
- **Industry analyst reports / trade publications** (new) — medium-high for *market-entry* questions (incumbents, sizing, e.g. data-center power for RackPDU). Failure mode: slow, sometimes paywalled/biased. Use for Tier-2 market intelligence.
- **Patent databases** (new) — high for feasibility / IP / prior art. Failure mode: dense, lagging. Use for deep-tech feasibility and freedom-to-operate.
- **VC blogs / newsletters** — low-medium for market framing and emergence signal. Failure mode: narrative-driven, talks-its-book. Use for trend context, not decisions.
- **X / Twitter, Reddit, forums** — low; occasional early gems. Failure mode: hype and noise. Use only to corroborate a primary source.

---

## 11. Actionability

The minimum bar to recommend an action: there is a **concrete next step a person could take**, with enough evidence (working API/repo/docs, or a credible primary source) that the step is real rather than aspirational.

Action types and when each fires:

- **Benchmark** — there is a working API/repo/docs and a clear test path within ~1–2 days, *and* it plausibly improves a Tier-1/Tier-2 capability.
- **Prototype** — promising but needs a small build to judge fit; scope it to the smallest useful experiment.
- **Integrate** — already validated (by us or strong evidence) and fits the stack; recommend wiring it in.
- **Buy** — mature commercial option clearly better than building; note cost/licensing.
- **Partner** — a data source or company more valuable as a relationship than a build (e.g. market-intelligence data).
- **Watch** — relevant but not yet actionable; add to watchlist with a trigger condition.
- **Competitive warning** — emergence of a research→strategy→risk competitor, *or* a model/API/tool that would let someone build Innovera's product cheaply. Always surfaced.
- **Ignore (with reason)** — record why, so the same item is not resurfaced.

Supporting actions the email/feedback layer can also trigger: read-the-paper, create a Linear ticket, contact founder/company, share with team.

---

## 13. Daily email

**Subject:** `[Innovera Scout] {N} opportunities — {B} benchmark-worthy — {date}`

**Structure:**

1. **Top opportunities** — 3 (up to 5 on a strong day). Each: name, score, recommended action, one-line "why it matters," one-line "why now," Notion link, feedback buttons.
2. **Worth benchmarking** — short list.
3. **Watchlist changes** — promotions/demotions and why.
4. **Competitor / emergence signal** — 1 if present.
5. **Rejected-but-notable** — 1, with the reason (teaches taste, builds trust).
6. **Source performance** — which patrols/sources produced value.
7. **Cost summary** — provider + LLM spend for the run.

**Preferences:** decision-oriented tone, no hype; ~3–4 sentences per top item; always include recommended action and "why now"; always include feedback buttons and Notion links; send a short "quiet day" email when nothing clears the bar (silence looks like breakage).

---

## 14. Notion publishing rules

**Bias:** Supabase gets *everything* (full audit trail and source of truth). Notion gets *polished, high-signal opportunities only*. The daily email is the *decision layer*.

- **Publish to Notion when:** `total_score >= SCOUT_MIN_SCORE_FOR_NOTION` **or** recommended action ∈ {benchmark, prototype, competitive_warning} **or** a human manually promotes it.
- **Rejected / low-score findings:** stay in Supabase only — they are the audit trail, not the library.
- **Updates:** if an opportunity already has a Notion page, **update** it rather than create a duplicate.
- **Organization:** by category and status (with score and date as properties), so the library reads as a curated set, not a feed.
- **Audience:** Harry today; the wider Innovera team as it grows — so pages should be readable by someone without the full context.

---

## Still needed — next round (the six "need some more" questions)

These need your input; I can stub sensible defaults if you'd rather edit than write.

- **Q2 — Top 5 priorities:** rank them, and for each give *current limitation* and *what a better version looks like*. (I can pre-fill candidates from Tier-1 above.)
- **Q3 — Weaknesses:** be blunt — where is the research/strategy/risk engine weak today? (Research depth? Cross-domain coverage? Risk rigor? Speed?)
- **Q4 — Urgent "stop everything" triggers:** which roadmap-specific events should interrupt your day, and what should the scout recommend for each.
- **Q8 — Negative examples:** 10 things that *look* relevant but are bad fits — now definable since we know the buyer (e.g. tools built for the wrong buyer, AI-only tools that ignore deep-tech domains).
- **Q12 — Scoring philosophy:** weights are set; you decide the tradeoffs — boring-but-integrable vs. frontier; fast-integrate vs. strategy-changing; open-source vs. commercial; proven vs. early.
- **Q15 — Feedback learning semantics:** what each button does to scoring/status and whether it writes an agent lesson.
