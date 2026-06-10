import { HttpError, withRetry } from "../utils/retry.js";

export type FetchLike = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

export interface ProviderContext {
  fetch?: FetchLike;
  /** Abort long provider calls; default 30s. */
  timeoutMs?: number;
}

/** JSON HTTP call with retry on 429/5xx. Throws HttpError on non-2xx. */
export async function fetchJson<T>(
  url: string,
  init: RequestInit,
  ctx: ProviderContext = {}
): Promise<T> {
  const doFetch = ctx.fetch ?? fetch;
  const timeoutMs = ctx.timeoutMs ?? 30_000;
  return withRetry(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch(url, { ...init, signal: controller.signal });
      const text = await res.text();
      if (!res.ok) {
        throw new HttpError(res.status, `${init.method ?? "GET"} ${url} -> ${res.status}`, text.slice(0, 2000));
      }
      return JSON.parse(text) as T;
    } finally {
      clearTimeout(timer);
    }
  });
}

export async function fetchText(
  url: string,
  init: RequestInit,
  ctx: ProviderContext = {}
): Promise<string> {
  const doFetch = ctx.fetch ?? fetch;
  const timeoutMs = ctx.timeoutMs ?? 30_000;
  return withRetry(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch(url, { ...init, signal: controller.signal });
      const text = await res.text();
      if (!res.ok) {
        throw new HttpError(res.status, `${init.method ?? "GET"} ${url} -> ${res.status}`, text.slice(0, 2000));
      }
      return text;
    } finally {
      clearTimeout(timer);
    }
  });
}
