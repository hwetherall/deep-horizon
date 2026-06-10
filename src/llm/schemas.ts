import { z } from "zod";

// ---------------------------------------------------------------------------
// Candidate extraction (plan §12)
// ---------------------------------------------------------------------------

export const candidateSchema = z.object({
  name: z.string(),
  type: z.enum([
    "tool",
    "company",
    "api",
    "repo",
    "paper",
    "feature",
    "trend",
    "competitor",
    "workflow",
    "other"
  ]),
  category: z.string(),
  canonical_url: z.string().nullable(),
  summary: z.string(),
  evidence_urls: z.array(z.string()),
  possible_use_cases: z.array(z.string()),
  risks: z.array(z.string()),
  reject: z.boolean(),
  reject_reason: z.string().nullable()
});

export const extractionResultSchema = z.object({
  candidates: z.array(candidateSchema)
});

export type ExtractedCandidate = z.infer<typeof candidateSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["candidates"],
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "type",
          "category",
          "canonical_url",
          "summary",
          "evidence_urls",
          "possible_use_cases",
          "risks",
          "reject",
          "reject_reason"
        ],
        properties: {
          name: { type: "string" },
          type: {
            type: "string",
            enum: [
              "tool",
              "company",
              "api",
              "repo",
              "paper",
              "feature",
              "trend",
              "competitor",
              "workflow",
              "other"
            ]
          },
          category: { type: "string" },
          canonical_url: { type: ["string", "null"] },
          summary: { type: "string" },
          evidence_urls: { type: "array", items: { type: "string" } },
          possible_use_cases: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
          reject: { type: "boolean" },
          reject_reason: { type: ["string", "null"] }
        }
      }
    }
  }
} as const;

// ---------------------------------------------------------------------------
// Scoring (plan §12)
// ---------------------------------------------------------------------------

export const scoreResultSchema = z.object({
  strategic_relevance: z.number().min(0).max(10),
  actionability: z.number().min(0).max(10),
  integration_fit: z.number().min(0).max(10),
  evidence_quality: z.number().min(0).max(10),
  novelty: z.number().min(0).max(10),
  urgency: z.number().min(0).max(10),
  total_score: z.number().min(0).max(10),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  recommended_action: z.enum([
    "benchmark",
    "prototype",
    "integrate",
    "buy",
    "partner",
    "watch",
    "competitive_warning",
    "ignore"
  ]),
  why_it_matters: z.string()
});

export type ScoreResult = z.infer<typeof scoreResultSchema>;

export const scoreJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "strategic_relevance",
    "actionability",
    "integration_fit",
    "evidence_quality",
    "novelty",
    "urgency",
    "total_score",
    "confidence",
    "rationale",
    "recommended_action",
    "why_it_matters"
  ],
  properties: {
    strategic_relevance: { type: "number" },
    actionability: { type: "number" },
    integration_fit: { type: "number" },
    evidence_quality: { type: "number" },
    novelty: { type: "number" },
    urgency: { type: "number" },
    total_score: { type: "number" },
    confidence: { type: "number" },
    rationale: { type: "string" },
    recommended_action: {
      type: "string",
      enum: [
        "benchmark",
        "prototype",
        "integrate",
        "buy",
        "partner",
        "watch",
        "competitive_warning",
        "ignore"
      ]
    },
    why_it_matters: { type: "string" }
  }
} as const;

// ---------------------------------------------------------------------------
// Semantic dedupe (plan §13)
// ---------------------------------------------------------------------------

export const dedupeResultSchema = z.object({
  same_entity: z.boolean(),
  rationale: z.string()
});

export type DedupeResult = z.infer<typeof dedupeResultSchema>;

export const dedupeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["same_entity", "rationale"],
  properties: {
    same_entity: { type: "boolean" },
    rationale: { type: "string" }
  }
} as const;

// ---------------------------------------------------------------------------
// Deep research brief (plan §12)
// ---------------------------------------------------------------------------

export const briefResultSchema = z.object({
  title: z.string(),
  markdown: z.string()
});

export type BriefResult = z.infer<typeof briefResultSchema>;

export const briefJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "markdown"],
  properties: {
    title: { type: "string" },
    markdown: { type: "string" }
  }
} as const;

// ---------------------------------------------------------------------------
// Weekly self-review (plan §18)
// ---------------------------------------------------------------------------

export const weeklyReviewSchema = z.object({
  summary_markdown: z.string(),
  lessons: z.array(
    z.object({
      lesson: z.string(),
      source: z.string(),
      strength: z.number().min(0).max(1)
    })
  ),
  patrol_changes: z.array(
    z.object({
      patrol: z.string(),
      change: z.string()
    })
  )
});

export type WeeklyReviewResult = z.infer<typeof weeklyReviewSchema>;

export const weeklyReviewJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary_markdown", "lessons", "patrol_changes"],
  properties: {
    summary_markdown: { type: "string" },
    lessons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["lesson", "source", "strength"],
        properties: {
          lesson: { type: "string" },
          source: { type: "string" },
          strength: { type: "number" }
        }
      }
    },
    patrol_changes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["patrol", "change"],
        properties: {
          patrol: { type: "string" },
          change: { type: "string" }
        }
      }
    }
  }
} as const;
