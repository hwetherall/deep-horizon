import { describe, it, expect } from "vitest";
import { renderDigestEmailHtml } from "../../email/templates/dailyDigest.js";
import { renderDigestMarkdown, type RankedOpportunity } from "../../scout/createDigest.js";
import { statusForDecision, statusForSentiment } from "../../scout/applyFeedback.js";
import type { OpportunityRow } from "../../db/types.js";

function makeOpportunity(overrides: Partial<OpportunityRow> = {}): OpportunityRow {
  return {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Tavily Advanced",
    slug: "tavily-advanced--api--tavily-com",
    type: "api",
    category: "ai-search",
    status: "new",
    canonical_url: "https://tavily.com",
    description: null,
    summary: "Fast search API",
    why_it_matters: "Cheaper news-style discovery. More detail here.",
    recommended_action: "benchmark",
    strategic_relevance: 8,
    actionability: 8,
    integration_fit: 8,
    evidence_quality: 7,
    novelty: 6,
    urgency: 5,
    total_score: 7.25,
    confidence: 0.8,
    first_seen_at: "2026-06-09T13:00:00.000Z",
    last_seen_at: "2026-06-09T13:00:00.000Z",
    notion_page_id: null,
    notion_url: "https://notion.so/page",
    embedding: null,
    metadata: {},
    ...overrides
  };
}

const ranked: RankedOpportunity[] = [
  { opportunity: makeOpportunity(), rankScore: 8.05 }
];

describe("renderDigestEmailHtml", () => {
  it("renders top opportunities with feedback links", () => {
    const html = renderDigestEmailHtml({
      digestDate: "2026-06-09",
      digestId: "d1",
      top: ranked,
      benchmarkWorthy: ranked,
      quietDay: false,
      costSummary: { providerUsd: 1.23, llmUsd: 2.34 },
      buildFeedbackLink: (id, decision) => `https://x.test/fb?o=${id}&d=${decision}`,
      buildSentimentLink: (id, sentiment) => `https://x.test/fb?o=${id}&s=${sentiment}`
    });
    expect(html).toContain("Tavily Advanced");
    expect(html).toContain("https://x.test/fb?o=44444444-4444-4444-4444-444444444444&amp;d=benchmark");
    expect(html).toContain("https://x.test/fb?o=44444444-4444-4444-4444-444444444444&amp;s=good");
    expect(html).toContain("https://x.test/fb?o=44444444-4444-4444-4444-444444444444&amp;s=bad");
    expect(html).toContain("Rate it:");
    expect(html).toContain("\u{1F642}");
    expect(html).toContain("Reject");
    expect(html).toContain("$1.23");
    expect(html).toContain("https://notion.so/page");
  });

  it("renders without sentiment links when no builder is provided", () => {
    const html = renderDigestEmailHtml({
      digestDate: "2026-06-09",
      digestId: "d1",
      top: ranked,
      benchmarkWorthy: [],
      quietDay: false,
      buildFeedbackLink: () => "https://x.test"
    });
    expect(html).not.toContain("Rate it:");
    expect(html).toContain("Set action:");
  });

  it("renders quiet day", () => {
    const html = renderDigestEmailHtml({
      digestDate: "2026-06-09",
      digestId: "d1",
      top: [],
      benchmarkWorthy: [],
      quietDay: true,
      buildFeedbackLink: () => "https://x.test"
    });
    expect(html).toContain("Quiet day");
    expect(html).not.toContain("Top opportunities");
  });

  it("escapes HTML in names", () => {
    const html = renderDigestEmailHtml({
      digestDate: "2026-06-09",
      digestId: "d1",
      top: [{ opportunity: makeOpportunity({ name: "<script>alert(1)</script>" }), rankScore: 7 }],
      benchmarkWorthy: [],
      quietDay: false,
      buildFeedbackLink: () => "https://x.test"
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderDigestMarkdown", () => {
  it("includes warnings and cost summary", () => {
    const md = renderDigestMarkdown({
      digestDate: "2026-06-09",
      top: ranked,
      benchmarkWorthy: ranked,
      quietDay: false,
      costSummary: { providerUsd: 1, llmUsd: 2 },
      failureSummary: "1 error(s) during scan",
      minScoreForNotion: 7
    });
    expect(md).toContain("Top opportunities today");
    expect(md).toContain("Worth benchmarking");
    expect(md).toContain("Run warnings");
    expect(md).toContain("Cost summary");
    expect(md).toContain("Why it matters: Cheaper news-style discovery.");
  });
});

describe("statusForDecision (plan §18)", () => {
  it("maps decisions to statuses", () => {
    expect(statusForDecision("benchmark")).toBe("benchmark");
    expect(statusForDecision("watch")).toBe("watching");
    expect(statusForDecision("reject")).toBe("rejected");
    expect(statusForDecision("not_useful")).toBe("rejected");
    expect(statusForDecision("adopted")).toBe("adopted");
    expect(statusForDecision("useful")).toBeNull();
    expect(statusForDecision("already_known")).toBeNull();
    expect(statusForDecision("needs_more_research")).toBeNull();
  });
});

describe("statusForSentiment (seed Q15)", () => {
  it("only a bad rating changes status", () => {
    expect(statusForSentiment("bad")).toBe("rejected");
    expect(statusForSentiment("good")).toBeNull();
    expect(statusForSentiment("neutral")).toBeNull();
  });
});
