/**
 * Model tiers routed through OpenRouter. Override via env without code changes.
 * TODO(plan §29): confirm exact model IDs available in the OpenRouter account.
 */
/** Treat empty/whitespace env overrides as unset so defaults apply. */
function modelOrDefault(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function getModels(): {
  triage: string;
  extraction: string;
  brief: string;
  strategy: string;
} {
  return {
    triage: modelOrDefault(process.env.OPENROUTER_TRIAGE_MODEL, "openai/gpt-5.4-mini"),
    extraction: modelOrDefault(
      process.env.OPENROUTER_EXTRACTION_MODEL,
      "anthropic/claude-sonnet-4.6"
    ),
    brief: modelOrDefault(process.env.OPENROUTER_BRIEF_MODEL, "openai/gpt-5.5"),
    strategy: modelOrDefault(
      process.env.OPENROUTER_STRATEGY_MODEL,
      "anthropic/claude-opus-4.7"
    )
  };
}
