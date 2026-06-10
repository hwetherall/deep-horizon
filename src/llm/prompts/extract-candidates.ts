import type { RawItemRow, AgentLessonRow } from "../../db/types.js";
import type { PatrolConfig } from "../../config/patrols.js";

export const EXTRACT_PROMPT_VERSION = "extract-v1";

export function buildExtractionPrompt(params: {
  patrol: PatrolConfig;
  rawItems: RawItemRow[];
  recentEntityNames: string[];
  lessons: AgentLessonRow[];
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

## Recently seen entities (do not re-extract unless there is genuinely new information)

${seenBlock}

## Raw search results

${itemsBlock}

## Task

Extract concrete opportunity candidates from the raw results above.

Rules:
- Extract only concrete candidates (a specific tool, company, API, repo, paper, feature, or competitor).
- Do not extract generic news narratives.
- Do not extract listicles unless a specific tool/company/repo inside the list is valuable — extract that specific thing instead.
- Prefer official pages, docs, repos, changelogs, and technical posts as canonical_url.
- For low-value items, set reject=true with a short reject_reason instead of omitting them.
- evidence_urls must come from the raw results above; never invent URLs.

Return JSON matching the required schema with a "candidates" array.`;
}
