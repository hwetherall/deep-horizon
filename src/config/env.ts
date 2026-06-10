import { z } from "zod";

const booleanFlag = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  APP_TIMEZONE: z.string().default("America/Denver"),

  INSFORGE_URL: z.string().url(),
  INSFORGE_API_KEY: z.string().min(1),
  INSFORGE_ANON_KEY: z.string().optional(),

  TRIGGER_SECRET_KEY: z.string().optional(),

  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_APP_TITLE: z.string().default("Innovera AI Opportunity Radar"),
  OPENROUTER_HTTP_REFERER: z.string().optional(),
  OPENROUTER_TRIAGE_MODEL: z.string().optional(),
  OPENROUTER_EXTRACTION_MODEL: z.string().optional(),
  OPENROUTER_BRIEF_MODEL: z.string().optional(),
  OPENROUTER_STRATEGY_MODEL: z.string().optional(),

  EXA_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),
  JINA_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),

  NOTION_API_KEY: z.string().optional(),
  NOTION_OPPORTUNITIES_DATA_SOURCE_ID: z.string().optional(),

  EMAIL_PROVIDER: z.enum(["resend"]).default("resend"),
  RESEND_API_KEY: z.string().optional(),
  DIGEST_FROM_EMAIL: z.string().email().default("scout@innovera.ai"),
  DIGEST_TO_EMAIL: z.string().email().default("harry@innovera.ai"),

  SCOUT_FEEDBACK_SECRET: z.string().min(16).optional(),

  SCOUT_ENABLE_EMAIL: booleanFlag,
  SCOUT_ENABLE_NOTION: booleanFlag,

  SCOUT_MAX_DAILY_PROVIDER_COST_USD: z.coerce.number().default(20),
  SCOUT_MAX_DAILY_LLM_COST_USD: z.coerce.number().default(20),
  SCOUT_MAX_RAW_ITEMS_PER_DAY: z.coerce.number().int().default(500),
  SCOUT_MAX_DEEP_RESEARCH_PER_DAY: z.coerce.number().int().default(10),
  SCOUT_MIN_SCORE_FOR_NOTION: z.coerce.number().default(7.0),
  SCOUT_MIN_SCORE_FOR_DEEP_RESEARCH: z.coerce.number().default(7.5)
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Validate and return process env. Throws with a readable message listing
 * every missing/invalid variable. Call sites should use this instead of
 * touching process.env directly.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: clear the memoized env so tests can mutate process.env. */
export function resetEnvCache(): void {
  cached = undefined;
}
