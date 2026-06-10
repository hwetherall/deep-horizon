import { getDb } from "../client.js";
import { logger } from "../../utils/logger.js";

/**
 * Log a provider call (plan §11/§20: mandatory). Logging failures are
 * swallowed with a warn — observability must not break the pipeline.
 */
export async function logProviderCall(params: {
  scanRunId: string | null;
  provider: string;
  endpoint: string;
  requestHash?: string;
  status: "ok" | "error";
  costUsd?: number;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}): Promise<void> {
  const { error } = await getDb().from("provider_calls").insert({
    scan_run_id: params.scanRunId,
    provider: params.provider,
    endpoint: params.endpoint,
    request_hash: params.requestHash ?? null,
    status: params.status,
    cost_usd: params.costUsd ?? null,
    latency_ms: params.latencyMs ?? null,
    metadata: params.metadata ?? {},
    error: params.error ?? null
  });
  if (error) logger.warn("logProviderCall insert failed", { error: error.message });
}

export async function logLlmCall(params: {
  scanRunId: string | null;
  task: string;
  model: string;
  promptVersion?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  latencyMs?: number;
  status: "ok" | "error";
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  error?: string;
}): Promise<void> {
  const { error } = await getDb().from("llm_calls").insert({
    scan_run_id: params.scanRunId,
    task: params.task,
    model: params.model,
    prompt_version: params.promptVersion ?? null,
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
    cost_usd: params.costUsd ?? null,
    latency_ms: params.latencyMs ?? null,
    status: params.status,
    request: params.request ?? null,
    response: params.response ?? null,
    error: params.error ?? null
  });
  if (error) logger.warn("logLlmCall insert failed", { error: error.message });
}
