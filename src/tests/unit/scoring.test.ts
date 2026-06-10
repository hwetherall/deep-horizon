import { describe, it, expect } from "vitest";
import { computeTotalScore, computeRankScore, SCORE_WEIGHTS } from "../../config/scoring.js";

describe("computeTotalScore", () => {
  it("weights sum to 1", () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0);
  });

  it("matches plan §12 example", () => {
    expect(
      computeTotalScore({
        strategicRelevance: 8.0,
        actionability: 7.5,
        integrationFit: 8.0,
        evidenceQuality: 7.0,
        novelty: 6.5,
        urgency: 5.0
      })
    ).toBeCloseTo(7.3, 1);
  });

  it("is 10 for perfect scores and 0 for zeros", () => {
    const perfect = {
      strategicRelevance: 10,
      actionability: 10,
      integrationFit: 10,
      evidenceQuality: 10,
      novelty: 10,
      urgency: 10
    };
    expect(computeTotalScore(perfect)).toBe(10);
    expect(
      computeTotalScore({
        strategicRelevance: 0,
        actionability: 0,
        integrationFit: 0,
        evidenceQuality: 0,
        novelty: 0,
        urgency: 0
      })
    ).toBe(0);
  });
});

describe("computeRankScore (plan §17)", () => {
  const base = {
    totalScore: 7.0,
    recommendedAction: null as string | null,
    evidenceCount: 1,
    evidenceQuality: 7,
    wasRecentlyRejected: false,
    isLikelyDuplicate: false
  };

  it("returns total score with no modifiers", () => {
    expect(computeRankScore(base)).toBe(7.0);
  });

  it("adds action bonuses", () => {
    expect(computeRankScore({ ...base, recommendedAction: "benchmark" })).toBe(7.8);
    expect(computeRankScore({ ...base, recommendedAction: "prototype" })).toBe(7.6);
    expect(computeRankScore({ ...base, recommendedAction: "competitive_warning" })).toBe(7.7);
  });

  it("adds evidence bonus at 3+ sources", () => {
    expect(computeRankScore({ ...base, evidenceCount: 3 })).toBe(7.3);
  });

  it("penalizes recent rejection hard", () => {
    expect(computeRankScore({ ...base, wasRecentlyRejected: true })).toBe(4.0);
  });

  it("penalizes likely duplicates", () => {
    expect(computeRankScore({ ...base, isLikelyDuplicate: true })).toBe(5.0);
  });

  it("penalizes low evidence quality", () => {
    expect(computeRankScore({ ...base, evidenceQuality: 4 })).toBe(6.2);
    expect(computeRankScore({ ...base, evidenceQuality: null })).toBe(6.2);
  });

  it("treats null total score as 0", () => {
    expect(computeRankScore({ ...base, totalScore: null })).toBe(-0.8);
  });
});
