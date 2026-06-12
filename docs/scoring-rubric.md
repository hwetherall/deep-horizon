# Scoring rubric (v2)

v2 re-anchors the dimensions to Innovera's research-and-strategy engine (see `deep-horizon-seed.md`): weights are unchanged from v1, but `strategic_relevance` is now tier-aware, so v1 and v2 scores are not directly comparable.

Dimensions, each 0–10 (plan §12):

| Dimension | Weight | Question |
| --- | --- | --- |
| strategic_relevance | 0.25 | Does this make the research engine (initiative → researched options + risks) deeper, broader, more credible, or faster? Tier 1 (research product) highest; Tier 2 (plumbing) mid only with a path to better research output; Tier 3 lifecycle tooling capped low; competitive emergence always high. |
| actionability | 0.20 | Concrete next step backed by real evidence; can Innovera act within weeks (benchmark, prototype, integrate)? |
| integration_fit | 0.20 | Fits the stack (TypeScript, agents, search/research APIs, InsForge/Postgres, Trigger.dev) — or, for data sources, API access and workable licensing? |
| evidence_quality | 0.15 | Official docs/repos/changelogs/patent & market databases vs thin secondhand claims? |
| novelty | 0.10 | Genuinely new to Innovera? |
| urgency | 0.10 | Timing reason to act now (launch window, competitive emergence, capability bar moving)? |

`total_score` is recomputed deterministically in `computeTotalScore` — the LLM's arithmetic is never trusted. `confidence` is 0–1.

## Recommended actions

benchmark · prototype · integrate · buy · partner · watch · competitive_warning · ignore

## Rank score (digest ordering, plan §17)

```
rank = total_score
     + 0.8 if benchmark | 0.6 if prototype | 0.7 if competitive_warning
     + 0.3 if evidence_count >= 3
     - 3.0 if recently rejected (last 30 days)
     - 2.0 if likely duplicate
     - 0.8 if evidence_quality < 5
```

## Thresholds

- Notion publish: `total_score >= SCOUT_MIN_SCORE_FOR_NOTION` (default 7.0) or action in {benchmark, prototype, competitive_warning}.
- Deep research: `total_score >= SCOUT_MIN_SCORE_FOR_DEEP_RESEARCH` (default 7.5) or same action set, capped at `SCOUT_MAX_DEEP_RESEARCH_PER_DAY`.

Changes to weights or prompts must bump `SCORING_VERSION` / prompt version constants so score history stays comparable.
