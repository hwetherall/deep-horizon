import { schedules } from "@trigger.dev/sdk/v3";
import { runDailyScan } from "../src/scout/runDailyScan.js";

/**
 * scout.daily-scan — weekdays 7:00 AM America/Denver (plan §16).
 * Orchestrates patrols → classification → deep research → digest → email.
 */
export const dailyScan = schedules.task({
  id: "scout-daily-scan",
  cron: {
    pattern: "0 7 * * 1-5",
    timezone: "America/Denver"
  },
  maxDuration: 3600,
  run: async (payload, { ctx }) => {
    const result = await runDailyScan({
      runType: "daily",
      triggerRunId: ctx.run.id
    });
    return {
      scanRunId: result.scanRunId,
      status: result.status,
      rawItemsInserted: result.patrolResults.reduce((s, r) => s + r.inserted, 0),
      candidatesAccepted: result.classification?.candidatesAccepted ?? 0,
      opportunitiesScored: result.classification?.opportunitiesScored ?? 0,
      emailSent: result.emailSent,
      errors: result.errors
    };
  }
});
