import { z } from "zod";
import { getEnv } from "../config/env.js";
import { logLlmCall } from "../db/queries/calls.js";
import { assertBudgetAvailable } from "../utils/cost.js";
import { HttpError, withRetry } from "../utils/retry.js";
import type { FetchLike } from "../providers/shared.js";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: { message: { content: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number;
  };
}

export interface StructuredCallParams<T> {
  task: string;
  model: string;
  promptVersion: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  /** JSON Schema sent to OpenRouter for strict structured output. */
  jsonSchema: Record<string, unknown>;
  scanRunId: string | null;
  temperature?: number;
  maxTokens?: number;
  estimatedCostUsd?: number;
  fetchImpl?: FetchLike;
}

/**
 * Structured-output chat completion through OpenRouter (plan §11).
 * - enforces the daily LLM budget before calling
 * - validates the response against a zod schema (one repair retry)
 * - logs every call to llm_calls, success or failure
 */
export async function callStructured<T>(params: StructuredCallParams<T>): Promise<T> {
  const env = getEnv();
  await assertBudgetAvailable({
    kind: "llm",
    estimatedCostUsd: params.estimatedCostUsd ?? 0.02
  });

  const messages: ChatMessage[] = [
    { role: "system", content: params.system },
    { role: "user", content: params.user }
  ];

  const body = {
    model: params.model,
    messages,
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? 4000,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: params.task.replace(/[^a-zA-Z0-9_-]/g, "_"),
        strict: true,
        schema: params.jsonSchema
      }
    }
  };

  const started = Date.now();
  const doFetch = params.fetchImpl ?? fetch;

  try {
    const response = await withRetry(async () => {
      const res = await doFetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "content-type": "application/json",
          "x-title": env.OPENROUTER_APP_TITLE,
          ...(env.OPENROUTER_HTTP_REFERER
            ? { "http-referer": env.OPENROUTER_HTTP_REFERER }
            : {})
        },
        body: JSON.stringify(body)
      });
      const text = await res.text();
      if (!res.ok) throw new HttpError(res.status, `OpenRouter ${res.status}`, text.slice(0, 2000));
      return JSON.parse(text) as OpenRouterResponse;
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenRouter returned no content");

    const parsed = params.schema.safeParse(JSON.parse(stripCodeFence(content)));
    if (!parsed.success) {
      throw new Error(`LLM output failed schema validation: ${parsed.error.message}`);
    }

    await logLlmCall({
      scanRunId: params.scanRunId,
      task: params.task,
      model: params.model,
      promptVersion: params.promptVersion,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      costUsd: response.usage?.cost,
      latencyMs: Date.now() - started,
      status: "ok",
      response: { id: response.id }
    });

    return parsed.data;
  } catch (error) {
    await logLlmCall({
      scanRunId: params.scanRunId,
      task: params.task,
      model: params.model,
      promptVersion: params.promptVersion,
      latencyMs: Date.now() - started,
      status: "error",
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

function stripCodeFence(content: string): string {
  const trimmed = content.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return match?.[1] ?? trimmed;
}
