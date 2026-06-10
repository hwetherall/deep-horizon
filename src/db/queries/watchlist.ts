import { getDb } from "../client.js";
import type { WatchlistItemRow } from "../types.js";

export async function getDueWatchlistItems(limit = 50): Promise<WatchlistItemRow[]> {
  const now = new Date().toISOString();
  const { data, error } = await getDb()
    .from("watchlist_items")
    .select()
    .eq("enabled", true)
    .or(`next_check_at.is.null,next_check_at.lte.${now}`)
    .limit(limit);
  if (error) throw new Error(`getDueWatchlistItems failed: ${error.message}`);
  return (data ?? []) as WatchlistItemRow[];
}

export async function markWatchlistChecked(params: {
  watchlistItemId: string;
  nextCheckAt: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const update: Record<string, unknown> = {
    last_checked_at: new Date().toISOString(),
    next_check_at: params.nextCheckAt
  };
  if (params.metadata) update.metadata = params.metadata;
  const { error } = await getDb()
    .from("watchlist_items")
    .update(update)
    .eq("id", params.watchlistItemId);
  if (error) throw new Error(`markWatchlistChecked failed: ${error.message}`);
}
