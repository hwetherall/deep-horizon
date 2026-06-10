/**
 * Model tiers routed through OpenRouter. Override via env without code changes.
 * TODO(plan §29): confirm exact model IDs available in the OpenRouter account.
 */
export function getModels(): {
  triage: string;
  extraction: string;
  brief: string;
  strategy: string;
} {
  return {
    triage: process.env.OPENROUTER_TRIAGE_MODEL ?? "openai/gpt-5.2-mini",
    extraction:
      process.env.OPENROUTER_EXTRACTION_MODEL ?? "anthropic/claude-sonnet-4.6",
    brief: process.env.OPENROUTER_BRIEF_MODEL ?? "openai/gpt-5.2",
    strategy:
      process.env.OPENROUTER_STRATEGY_MODEL ?? "anthropic/claude-opus-4.7"
  };
}
