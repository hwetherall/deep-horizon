import { describe, it, expect } from "vitest";
import { mapOpportunityToNotionProperties } from "../../notion/mapOpportunityToNotion.js";
import { markdownToNotionBlocks } from "../../notion/blocks.js";
import { shouldPublishToNotion } from "../../scout/publishNotion.js";
import type { OpportunityRow } from "../../db/types.js";

const opportunity: OpportunityRow = {
  id: "33333333-3333-3333-3333-333333333333",
  name: "Exa Deep Search",
  slug: "exa-deep-search--api--exa-ai",
  type: "api",
  category: "ai-search",
  status: "new",
  canonical_url: "https://exa.ai/deep-search",
  description: null,
  summary: "Deep multi-hop search API",
  why_it_matters: "Could improve research agent quality.",
  recommended_action: "benchmark",
  strategic_relevance: 8,
  actionability: 7.5,
  integration_fit: 8,
  evidence_quality: 7,
  novelty: 6.5,
  urgency: 5,
  total_score: 7.3,
  confidence: 0.8,
  first_seen_at: "2026-06-09T13:00:00.000Z",
  last_seen_at: "2026-06-09T13:00:00.000Z",
  notion_page_id: null,
  notion_url: null,
  embedding: null,
  metadata: {}
};

describe("mapOpportunityToNotionProperties", () => {
  it("maps core properties", () => {
    const props = mapOpportunityToNotionProperties(opportunity, 4) as Record<string, any>;
    expect(props.Name.title[0].text.content).toBe("Exa Deep Search");
    expect(props.Status.select.name).toBe("New");
    expect(props.Type.select.name).toBe("api");
    expect(props.Score.number).toBe(7.3);
    expect(props["Canonical URL"].url).toBe("https://exa.ai/deep-search");
    expect(props["Recommended Action"].select.name).toBe("benchmark");
    expect(props["Source Count"].number).toBe(4);
    expect(props["Supabase ID"].rich_text[0].text.content).toBe(opportunity.id);
    expect(props["First Seen"].date.start).toBe("2026-06-09");
  });

  it("omits unscored numbers", () => {
    const props = mapOpportunityToNotionProperties(
      { ...opportunity, total_score: null, confidence: null },
      0
    ) as Record<string, any>;
    expect(props.Score).toBeUndefined();
    expect(props.Confidence).toBeUndefined();
  });
});

describe("markdownToNotionBlocks", () => {
  it("maps headings, bullets, and paragraphs", () => {
    const blocks = markdownToNotionBlocks(
      "# Title\n\nSome paragraph text.\n\n## Section\n\n- bullet one\n- bullet two\n\n1. first\n"
    ) as any[];
    expect(blocks[0].type).toBe("heading_1");
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[2].type).toBe("heading_2");
    expect(blocks[3].type).toBe("bulleted_list_item");
    expect(blocks[5].type).toBe("numbered_list_item");
  });

  it("splits long paragraphs at 2000 chars", () => {
    const blocks = markdownToNotionBlocks("x".repeat(4500)) as any[];
    expect(blocks.length).toBe(3);
  });

  it("caps at 100 blocks", () => {
    const md = Array.from({ length: 150 }, (_, i) => `- item ${i}`).join("\n");
    expect(markdownToNotionBlocks(md).length).toBe(100);
  });
});

describe("shouldPublishToNotion (plan §14)", () => {
  it("publishes at/above min score", () => {
    expect(shouldPublishToNotion({ total_score: 7.0, recommended_action: "watch" }, 7.0)).toBe(true);
  });
  it("publishes benchmark/prototype/competitive_warning regardless of score", () => {
    expect(shouldPublishToNotion({ total_score: 5, recommended_action: "benchmark" }, 7.0)).toBe(true);
    expect(shouldPublishToNotion({ total_score: 5, recommended_action: "prototype" }, 7.0)).toBe(true);
    expect(
      shouldPublishToNotion({ total_score: 5, recommended_action: "competitive_warning" }, 7.0)
    ).toBe(true);
  });
  it("skips low-score watch/ignore", () => {
    expect(shouldPublishToNotion({ total_score: 6.9, recommended_action: "watch" }, 7.0)).toBe(false);
    expect(shouldPublishToNotion({ total_score: null, recommended_action: null }, 7.0)).toBe(false);
  });
});
