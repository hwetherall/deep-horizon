import type { RawItem } from "../db/types.js";
import { canonicalizeUrl, sourceDomain } from "../utils/hash.js";
import { nowIso } from "../utils/dates.js";
import { fetchText, type ProviderContext } from "./shared.js";

/**
 * Jina Reader: URL-to-markdown fallback (plan §9, optional utility).
 * Returns markdown via r.jina.ai.
 */
export async function jinaRead(
  apiKey: string | undefined,
  params: { url: string; patrolName: string },
  ctx: ProviderContext = {}
): Promise<{ item: RawItem; markdown: string }> {
  const headers: Record<string, string> = { accept: "text/plain" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const markdown = await fetchText(
    `https://r.jina.ai/${params.url}`,
    { method: "GET", headers },
    ctx
  );

  const item: RawItem = {
    provider: "jina",
    patrolName: params.patrolName,
    title: extractTitleFromMarkdown(markdown) ?? params.url,
    url: params.url,
    canonicalUrl: canonicalizeUrl(params.url),
    sourceDomain: sourceDomain(params.url),
    rawContent: markdown,
    discoveredAt: nowIso(),
    providerPayload: {}
  };
  return { item, markdown };
}

export function extractTitleFromMarkdown(markdown: string): string | undefined {
  const titleLine = markdown.split("\n").find((l) => l.startsWith("Title:"));
  if (titleLine) return titleLine.slice("Title:".length).trim();
  const h1 = markdown.split("\n").find((l) => l.startsWith("# "));
  return h1 ? h1.slice(2).trim() : undefined;
}
