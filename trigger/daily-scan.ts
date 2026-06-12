import { schedules } from "@trigger.dev/sdk/v3";
import { getEnv } from "../src/config/env.js";
import { runDailyScan } from "../src/scout/runDailyScan.js";
import { logger } from "../src/utils/logger.js";

/**
 * scout.daily-scan — weekdays 7:00 AM America/Denver (plan §16).
 * Orchestrates patrols → classification → deep research → digest → email.
 *
 * Gated by SCOUT_ENABLE_SCHEDULE: when off, scheduled invocations no-op so the
 * cron stays dormant during testing. Flip the env flag to true to enable.
 */
export const dailyScan = schedules.task({
  id: "scout-daily-scan",
  cron: {
    pattern: "0 7 * * 1-5",
    timezone: "America/Denver"
  },
  maxDuration: 3600,
  run: async (payload, { ctx }) => {
    if (!getEnv().SCOUT_ENABLE_SCHEDULE) {
      logger.info("Daily scan skipped: SCOUT_ENABLE_SCHEDULE is off");
      return { skipped: true as const };
    }

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
