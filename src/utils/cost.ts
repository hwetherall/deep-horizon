import { getEnv } from "../config/env.js";
import { getDb } from "../db/client.js";
import { logger } from "./logger.js";

export class BudgetExceededError extends Error {
  constructor(
    public readonly kind: "provider" | "llm",
    public readonly spentUsd: number,
    public readonly limitUsd: number
  ) {
    super(
      `Daily ${kind} budget exceeded: spent $${spentUsd.toFixed(2)} of $${limitUsd.toFixed(2)}`
    );
    this.name = "BudgetExceededError";
  }
}

async function spentTodayUsd(table: "provider_calls" | "llm_calls"): Promise<number> {
  const db = getDb();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { data, error } = await db
    .from(table)
    .select("cost_usd")
    .gte("created_at", since.toISOString());
  if (error) throw new Error(`Failed to read ${table} costs: ${error.message}`);
  return (data ?? []).reduce((sum, row) => sum + (Number(row.cost_usd) || 0), 0);
}

/**
 * Hard budget gate (plan §20). Throws BudgetExceededError when the estimated
 * call would push today's spend past the configured daily cap.
 */
export async function assertBudgetAvailable(params: {
  kind: "provider" | "llm";
  estimatedCostUsd: number;
}): Promise<void> {
  const env = getEnv();
  const limit =
    params.kind === "provider"
      ? env.SCOUT_MAX_DAILY_PROVIDER_COST_USD
      : env.SCOUT_MAX_DAILY_LLM_COST_USD;
  const spent = await spentTodayUsd(
    params.kind === "provider" ? "provider_calls" : "llm_calls"
  );
  if (spent + params.estimatedCostUsd > limit) {
    throw new BudgetExceededError(params.kind, spent, limit);
  }
  if (spent > limit * 0.8) {
    logger.warn("Budget above 80% of daily cap", {
      kind: params.kind,
      spent,
      limit
    });
  }
}
