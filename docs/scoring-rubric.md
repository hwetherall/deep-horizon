# Scoring rubric (v1)

Dimensions, each 0–10 (plan §12):

| Dimension | Weight | Question |
| --- | --- | --- |
| strategic_relevance | 0.25 | Does this directly help Innovera's AI products, agents, research, or competitive position? |
| actionability | 0.20 | Can Innovera act within weeks (benchmark, prototype, integrate)? |
| integration_fit | 0.20 | Fits the stack (TypeScript, agents, search/research APIs, Supabase, Trigger.dev)? |
| evidence_quality | 0.15 | Official docs/repos/changelogs vs thin secondhand claims? |
| novelty | 0.10 | Genuinely new to Innovera? |
| urgency | 0.10 | Timing reason to act now? |

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
