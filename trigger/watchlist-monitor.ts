import { schedules } from "@trigger.dev/sdk/v3";
import { createScanRun, finishScanRun } from "../src/db/queries/scanRuns.js";
import { runWatchlistMonitor } from "../src/scout/watchlistMonitor.js";

/** scout.watchlist-monitor — weekdays 9:00 AM America/Denver (plan §16). */
export const watchlistMonitor = schedules.task({
  id: "scout-watchlist-monitor",
  cron: {
    pattern: "0 9 * * 1-5",
    timezone: "America/Denver"
  },
  maxDuration: 1200,
  run: async (payload, { ctx }) => {
    const scanRun = await createScanRun({
      runType: "watchlist",
      triggerRunId: ctx.run.id
    });
    try {
      const result = await runWatchlistMonitor({ scanRunId: scanRun.id });
      await finishScanRun({
        scanRunId: scanRun.id,
        status: result.errors.length ? "partial_failed" : "complete",
        error: result.errors.length ? result.errors.join("\n") : undefined,
        metadata: { checked: result.checked, changed: result.changed.length }
      });
      return result;
    } catch (error) {
      await finishScanRun({
        scanRunId: scanRun.id,
        status: "failed",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
});
