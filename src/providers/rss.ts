import { XMLParser } from "fast-xml-parser";
import type { RawItem } from "../db/types.js";
import { canonicalizeUrl, sourceDomain } from "../utils/hash.js";
import { nowIso, parseDateSafe } from "../utils/dates.js";
import { fetchText, type ProviderContext } from "./shared.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Keep single items as arrays for uniform handling.
  isArray: (name) => name === "item" || name === "entry"
});

interface ParsedFeedItem {
  title?: string | { "#text"?: string };
  link?: string | { "@_href"?: string } | Array<string | { "@_href"?: string; "@_rel"?: string }>;
  description?: string;
  summary?: string | { "#text"?: string };
  content?: string | { "#text"?: string };
  pubDate?: string;
  published?: string;
  updated?: string;
  "dc:date"?: string;
}

function textOf(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (value && typeof value === "object" && "#text" in value) {
    const t = (value as { "#text"?: unknown })["#text"];
    return typeof t === "string" ? t.trim() || undefined : undefined;
  }
  return undefined;
}

function linkOf(item: ParsedFeedItem): string | undefined {
  const link = item.link;
  if (typeof link === "string") return link.trim() || undefined;
  if (Array.isArray(link)) {
    // Atom: prefer rel="alternate" (or unmarked) links.
    for (const l of link) {
      if (typeof l === "string") return l.trim();
      if (l["@_href"] && (!("@_rel" in l) || l["@_rel"] === "alternate")) return l["@_href"];
    }
    const first = link[0];
    if (first && typeof first === "object" && first["@_href"]) return first["@_href"];
    return undefined;
  }
  if (link && typeof link === "object") return link["@_href"];
  return undefined;
}

/** Parse RSS 2.0 or Atom XML into normalized RawItems. */
export function parseFeed(xml: string, feedName: string, patrolName: string): RawItem[] {
  const doc = parser.parse(xml) as Record<string, any>;
  const channel = doc?.rss?.channel ?? doc?.feed;
  if (!channel) return [];
  const rawItems: ParsedFeedItem[] = channel.item ?? channel.entry ?? [];

  const items: RawItem[] = [];
  for (const raw of rawItems) {
    const url = linkOf(raw);
    if (!url) continue;
    const title = textOf(raw.title) ?? url;
    const snippet =
      (typeof raw.description === "string" ? stripHtml(raw.description) : undefined) ??
      textOf(raw.summary) ??
      textOf(raw.content);
    const publishedAt = parseDateSafe(
      raw.pubDate ?? raw.published ?? raw.updated ?? raw["dc:date"]
    );
    items.push({
      provider: "rss",
      patrolName,
      query: feedName,
      title,
      url,
      canonicalUrl: canonicalizeUrl(url),
      sourceDomain: sourceDomain(url),
      snippet: snippet?.slice(0, 2000),
      publishedAt,
      discoveredAt: nowIso(),
      providerPayload: { feedName }
    });
  }
  return items;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchRssFeed(
  params: { feedName: string; feedUrl: string; patrolName: string },
  ctx: ProviderContext = {}
): Promise<{ items: RawItem[]; endpoint: string }> {
  const xml = await fetchText(
    params.feedUrl,
    { method: "GET", headers: { "user-agent": "hermes-scout", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } },
    ctx
  );
  return { items: parseFeed(xml, params.feedName, params.patrolName), endpoint: params.feedUrl };
}
