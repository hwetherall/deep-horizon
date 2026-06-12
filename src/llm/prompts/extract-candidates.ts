import type { RawItemRow, AgentLessonRow } from "../../db/types.js";
import type { PatrolConfig } from "../../config/patrols.js";

export const EXTRACT_PROMPT_VERSION = "extract-v3";

export function buildExtractionPrompt(params: {
  patrol: PatrolConfig;
  rawItems: RawItemRow[];
  recentEntityNames: string[];
  lessons: AgentLessonRow[];
  /** Rendered by buildTasteProfileBlock; null until humans have rated findings. */
  tasteProfile?: string | null;
}): string {
  const itemsBlock = params.rawItems
    .map((item, i) => {
      const lines = [
        `### Item ${i + 1}`,
        `Title: ${item.title ?? "(none)"}`,
        `URL: ${item.url}`,
        `Source: ${item.source_domain ?? "unknown"} (provider: ${item.provider})`,
        item.published_at ? `Published: ${item.published_at}` : null,
        item.snippet ? `Snippet: ${item.snippet.slice(0, 800)}` : null
      ];
      return lines.filter(Boolean).join("\n");
    })
    .join("\n\n");

  const lessonsBlock = params.lessons.length
    ? params.lessons.map((l) => `- ${l.lesson}`).join("\n")
    : "(none)";

  const seenBlock = params.recentEntityNames.length
    ? params.recentEntityNames.join(", ")
    : "(none)";

  return `## Patrol

Name: ${params.patrol.name}
Goal: ${params.patrol.description}

## Active lessons (steering preferences learned from feedback)

${lessonsBlock}

${params.tasteProfile ? `## Human feedback taste profile\n\n${params.tasteProfile}\n` : ""}
## Recently seen entities (do not re-extract unless there is genuinely new information)

${seenBlock}

## Raw search results

${itemsBlock}

## Task

Extract concrete opportunity candidates from the raw results above.

Rules:
- Extract only concrete candidates (a specific tool, company, API, repo, paper, feature, data source, or competitor) that could plausibly make Innovera's research-and-strategy engine deeper, broader, more credible, or faster — or that signals competitive emergence (anyone starting to offer research→strategy→risk for corporate innovation teams).
- Do not extract generic news narratives.
- Do not extract listicles unless a specific tool/company/repo inside the list is valuable — extract that specific thing instead.
- Prefer official pages, docs, repos, changelogs, and technical posts as canonical_url.
- For low-value items, set reject=true with a short reject_reason instead of omitting them.
- Reject as noise: funding-only announcements with no product/technical detail (UNLESS the company is directly competitive or funding an imminent Tier-1 launch), thin LLM wrappers, consumer AI apps with no research relevance (UNLESS demonstrating a novel research/synthesis pattern), prompt packs and course/affiliate content, viral demos with no API/repo/docs, papers with no implementation path (UNLESS shipping a repo/benchmark/API), narrow single-vertical software with no cross-domain research value, generic horizontal SaaS unrelated to research/strategy/risk.
- Non-software deep-tech sources count: patent/prior-art databases, market-intelligence data, analyst/trade data sources, and feasibility-assessment tooling are first-class candidates, not noise.
- evidence_urls must come from the raw results above; never invent URLs.

Return JSON matching the required schema with a "candidates" array.`;
}
