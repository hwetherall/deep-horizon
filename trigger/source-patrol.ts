import { task } from "@trigger.dev/sdk/v3";
import type { SourceProvider } from "../src/db/types.js";
import { runPatrol } from "../src/scout/runPatrol.js";

/**
 * scout.source-patrol — one patrol × one provider (plan §16). Idempotent:
 * raw_items dedupe on dedupe_key, so re-runs insert nothing new.
 */
export const sourcePatrol = task({
  id: "scout-source-patrol",
  maxDuration: 900,
  run: async (payload: {
    scanRunId: string;
    patrolName: string;
    provider: SourceProvider;
    dateWindowStart: string;
    dateWindowEnd: string;
    maxResultsPerQuery?: number;
  }) => {
    return runPatrol({
      scanRunId: payload.scanRunId,
      patrolName: payload.patrolName,
      provider: payload.provider,
      dateWindowStart: payload.dateWindowStart,
      maxResultsPerQuery: payload.maxResultsPerQuery
    });
  }
});
