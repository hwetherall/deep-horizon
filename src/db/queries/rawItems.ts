import { getDb } from "../client.js";
import type { RawItem, RawItemRow } from "../types.js";
import { canonicalizeUrl, rawItemDedupeKey, sourceDomain, contentHash } from "../../utils/hash.js";

export interface InsertRawItemsResult {
  inserted: RawItemRow[];
  duplicates: number;
}

/**
 * Insert normalized raw items. Duplicate dedupe_keys (already-seen URLs) are
 * skipped via upsert ignoreDuplicates, which keeps the task idempotent.
 */
export async function insertRawItems(
  scanRunId: string | null,
  items: RawItem[]
): Promise<InsertRawItemsResult> {
  if (items.length === 0) return { inserted: [], duplicates: 0 };

  // Dedupe within the batch first; the unique constraint handles the rest.
  const byKey = new Map<string, RawItem>();
  for (const item of items) {
    const key = rawItemDedupeKey(item.url);
    if (!byKey.has(key)) byKey.set(key, item);
  }

  const rows = [...byKey.entries()].map(([dedupeKey, item]) => ({
    scan_run_id: scanRunId,
    provider: item.provider,
    patrol_name: item.patrolName,
    query: item.query ?? null,
    title: item.title || null,
    url: item.url,
    canonical_url: item.canonicalUrl ?? canonicalizeUrl(item.url),
    source_domain: item.sourceDomain ?? sourceDomain(item.url) ?? null,
    snippet: item.snippet ?? null,
    raw_content: item.rawContent ?? null,
    published_at: item.publishedAt ?? null,
    discovered_at: item.discoveredAt,
    provider_score: item.providerScore ?? null,
    provider_payload: item.providerPayload ?? {},
    content_hash: item.rawContent ? contentHash(item.rawContent) : null,
    dedupe_key: dedupeKey
  }));

  const { data, error } = await getDb()
    .from("raw_items")
    .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select();
  if (error) throw new Error(`insertRawItems failed: ${error.message}`);
  const inserted = (data ?? []) as RawItemRow[];
  return { inserted, duplicates: items.length - inserted.length };
}

export async function getRawItemsForScanRun(scanRunId: string): Promise<RawItemRow[]> {
  const { data, error } = await getDb()
    .from("raw_items")
    .select()
    .eq("scan_run_id", scanRunId)
    .eq("is_duplicate", false)
    .order("discovered_at", { ascending: true });
  if (error) throw new Error(`getRawItemsForScanRun failed: ${error.message}`);
  return (data ?? []) as RawItemRow[];
}

export async function countRawItemsToday(): Promise<number> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count, error } = await getDb()
    .from("raw_items")
    .select("id", { count: "exact", head: true })
    .gte("discovered_at", since.toISOString());
  if (error) throw new Error(`countRawItemsToday failed: ${error.message}`);
  return count ?? 0;
}
