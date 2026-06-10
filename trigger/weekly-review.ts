import { schedules } from "@trigger.dev/sdk/v3";
import { createScanRun, finishScanRun } from "../src/db/queries/scanRuns.js";
import { runWeeklyReview } from "../src/scout/weeklyReview.js";

/** scout.weekly-review — Fridays 10:00 AM America/Denver (plan §2/§16). */
export const weeklyReview = schedules.task({
  id: "scout-weekly-review",
  cron: {
    pattern: "0 10 * * 5",
    timezone: "America/Denver"
  },
  maxDuration: 1200,
  run: async (payload, { ctx }) => {
    const scanRun = await createScanRun({
      runType: "weekly_review",
      triggerRunId: ctx.run.id
    });
    try {
      const review = await runWeeklyReview({ scanRunId: scanRun.id });
      await finishScanRun({ scanRunId: scanRun.id, status: "complete" });
      return {
        scanRunId: scanRun.id,
        lessons: review.lessons.length,
        patrolChanges: review.patrol_changes.length
      };
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
