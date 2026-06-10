import { getDb } from "../client.js";
import type { ScanRunRow } from "../types.js";

export async function createScanRun(params: {
  runType: string;
  triggerRunId?: string;
  dateWindowStart?: string;
  dateWindowEnd?: string;
  metadata?: Record<string, unknown>;
}): Promise<ScanRunRow> {
  const { data, error } = await getDb()
    .from("scan_runs")
    .insert({
      run_type: params.runType,
      trigger_run_id: params.triggerRunId ?? null,
      date_window_start: params.dateWindowStart ?? null,
      date_window_end: params.dateWindowEnd ?? null,
      metadata: params.metadata ?? {}
    })
    .select()
    .single();
  if (error) throw new Error(`createScanRun failed: ${error.message}`);
  return data as ScanRunRow;
}

export async function finishScanRun(params: {
  scanRunId: string;
  status: "complete" | "failed" | "partial_failed";
  error?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const update: Record<string, unknown> = {
    status: params.status,
    finished_at: new Date().toISOString(),
    error: params.error ?? null
  };
  if (params.metadata) update.metadata = params.metadata;
  const { error } = await getDb()
    .from("scan_runs")
    .update(update)
    .eq("id", params.scanRunId);
  if (error) throw new Error(`finishScanRun failed: ${error.message}`);
}

export async function getLastScanRun(runType?: string): Promise<ScanRunRow | null> {
  let query = getDb()
    .from("scan_runs")
    .select()
    .order("started_at", { ascending: false })
    .limit(1);
  if (runType) query = query.eq("run_type", runType);
  const { data, error } = await query;
  if (error) throw new Error(`getLastScanRun failed: ${error.message}`);
  return (data?.[0] as ScanRunRow | undefined) ?? null;
}
