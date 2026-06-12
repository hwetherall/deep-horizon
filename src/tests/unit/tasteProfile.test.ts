import { describe, it, expect } from "vitest";
import { buildTasteProfileBlock } from "../../llm/prompts/taste-profile.js";
import type { FeedbackSignal } from "../../db/queries/feedback.js";

function signal(overrides: Partial<FeedbackSignal> = {}): FeedbackSignal {
  return {
    opportunityName: "PatSnap Eureka",
    category: "patent-ip-regulatory",
    type: "company",
    recommendedAction: "partner",
    sentiment: "good",
    decision: null,
    comment: null,
    createdAt: "2026-06-11T10:00:00.000Z",
    ...overrides
  };
}

describe("buildTasteProfileBlock (seed Q15)", () => {
  it("returns null when there is no feedback", () => {
    expect(buildTasteProfileBlock([])).toBeNull();
  });

  it("aggregates sentiment by category", () => {
    const block = buildTasteProfileBlock([
      signal(),
      signal({ opportunityName: "GreyB" }),
      signal({
        opportunityName: "Generic Agent SaaS",
        category: "agent-infrastructure",
        sentiment: "bad"
      })
    ]);
    expect(block).toContain("patent-ip-regulatory: 2 good, 0 neutral, 0 bad");
    expect(block).toContain("agent-infrastructure: 0 good, 0 neutral, 1 bad");
  });

  it("lists reactions with comments first", () => {
    const block = buildTasteProfileBlock([
      signal({ opportunityName: "No Comment Item", createdAt: "2026-06-11T12:00:00.000Z" }),
      signal({
        opportunityName: "Commented Item",
        sentiment: "bad",
        comment: "wrong buyer entirely",
        createdAt: "2026-06-10T09:00:00.000Z"
      })
    ])!;
    const commented = block.indexOf("Commented Item");
    const plain = block.indexOf("No Comment Item");
    expect(commented).toBeGreaterThan(-1);
    expect(plain).toBeGreaterThan(-1);
    expect(commented).toBeLessThan(plain);
    expect(block).toContain('"wrong buyer entirely"');
    expect(block).toContain("BAD: Commented Item");
  });

  it("falls back to the decision when there is no sentiment", () => {
    const block = buildTasteProfileBlock([
      signal({ sentiment: null, decision: "benchmark" })
    ])!;
    expect(block).toContain("benchmark: PatSnap Eureka");
  });
});
