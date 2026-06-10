import { getEnv } from "../config/env.js";
import { PATROLS } from "../config/patrols.js";
import { createScanRun, finishScanRun } from "../db/queries/scanRuns.js";
import { runPatrol, type PatrolRunResult } from "./runPatrol.js";
import { classifyCandidates, type ClassificationResult } from "./classifyCandidates.js";
import { deepResearchOpportunity } from "./deepResearch.js";
import { createDigest, getTodayCostSummary, type DigestData } from "./createDigest.js";
import { publishOpportunityToNotion, shouldPublishToNotion } from "./publishNotion.js";
import { sendDigestEmail } from "../email/sendDigest.js";
import { getDb } from "../db/client.js";
import type { OpportunityRow } from "../db/types.js";
import { scanWindow } from "../utils/dates.js";
import { logger } from "../utils/logger.js";

export interface DailyScanOptions {
  runType?: string;
  triggerRunId?: string;
  /** Restrict to specific patrol names (manual/dry runs). */
  patrols?: string[];
  maxResultsPerQuery?: number;
  maxCandidates?: number;
  /** Skip LLM classification entirely (phase-3 style ingest-only run). */
  skipClassification?: boolean;
  skipDeepResearch?: boolean;
  skipNotion?: boolean;
  skipEmail?: boolean;
}

export interface DailyScanResult {
  scanRunId: string;
  status: "complete" | "partial_failed";
  patrolResults: PatrolRunResult[];
  classification?: ClassificationResult;
  digest?: DigestData;
  notionPublished: number;
  emailSent: boolean;
  errors: string[];
}

/**
 * Full daily scan pipeline (plan §16 scout.daily-scan). Also reused by the
 * dry-run CLI with most side effects disabled.
 */
export async function runDailyScan(options: DailyScanOptions = {}): Promise<DailyScanResult> {
  const env = getEnv();
  const window = scanWindow();
  const scanRun = await createScanRun({
    runType: options.runType ?? "daily",
    triggerRunId: options.triggerRunId,
    dateWindowStart: window.start,
    dateWindowEnd: window.end,
    metadata: { options: { ...options } }
  });

  const errors: string[] = [];
  const patrolResults: PatrolRunResult[] = [];
  let classification: ClassificationResult | undefined;
  let digest: DigestData | undefined;
  let notionPublished = 0;
  let emailSent = false;

  try {
    // 1. Source patrols.
    const activePatrols = PATROLS.filter(
      (p) => !options.patrols || options.patrols.includes(p.name)
    );
    for (const patrol of activePatrols) {
      for (const provider of patrol.providers) {
        try {
          const result = await runPatrol({
            scanRunId: scanRun.id,
            patrolName: patrol.name,
            provider,
            dateWindowStart: window.start,
            maxResultsPerQuery: options.maxResultsPerQuery
          });
          patrolResults.push(result);
          errors.push(...result.errors.map((e) => `[${patrol.name}/${provider}] ${e}`));
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          errors.push(`[${patrol.name}/${provider}] patrol failed: ${msg}`);
          logger.error("Patrol failed", { patrol: patrol.name, provider, error: msg });
        }
      }
    }

    // 2. Classification: extract → resolve → score.
    if (!options.skipClassification) {
      classification = await classifyCandidates({
        scanRunId: scanRun.id,
        maxCandidates: options.maxCandidates
      });

      // 3. Deep research for the high-score queue.
      if (!options.skipDeepResearch) {
        for (const queued of classification.deepResearchQueue) {
          try {
            await deepResearchOpportunity({
              scanRunId: scanRun.id,
              opportunityId: queued.opportunityId
            });
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            errors.push(`[deep-research] ${queued.name}: ${msg}`);
          }
        }
      }

      // 4. Notion publishing for qualifying opportunities.
      if (!options.skipNotion && env.SCOUT_ENABLE_NOTION) {
        notionPublished = await publishQualifying(scanRun.id, errors);
      }

      // 5. Digest + email.
      const costSummary = await getTodayCostSummary();
      const failureSummary = errors.length
        ? `${errors.length} error(s) during scan: ${errors.slice(0, 5).join("; ")}`
        : undefined;
      digest = await createDigest({
        scanRunId: scanRun.id,
        costSummary,
        failureSummary
      });

      if (!options.skipEmail) {
        try {
          const sendResult = await sendDigestEmail(digest, { costSummary, failureSummary });
          emailSent = sendResult.sent;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          errors.push(`[email] ${msg}`);
        }
      }
    }

    const status = errors.length > 0 ? "partial_failed" : "complete";
    await finishScanRun({
      scanRunId: scanRun.id,
      status,
      error: errors.length ? errors.join("\n").slice(0, 5000) : undefined,
      metadata: {
        patrol_results: patrolResults.map((r) => ({
          patrol: r.patrolName,
          provider: r.provider,
          fetched: r.fetched,
          inserted: r.inserted,
          duplicates: r.duplicates
        })),
        candidates_accepted: classification?.candidatesAccepted ?? 0,
        opportunities_scored: classification?.opportunitiesScored ?? 0,
        notion_published: notionPublished,
        email_sent: emailSent
      }
    });

    return {
      scanRunId: scanRun.id,
      status,
      patrolResults,
      classification,
      digest,
      notionPublished,
      emailSent,
      errors
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await finishScanRun({ scanRunId: scanRun.id, status: "failed", error: msg });
    throw error;
  }
}

async function publishQualifying(scanRunId: string, errors: string[]): Promise<number> {
  const env = getEnv();
  const db = getDb();
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("opportunities")
    .select()
    .gte("last_seen_at", since)
    .not("total_score", "is", null);
  if (error) {
    errors.push(`[notion] query failed: ${error.message}`);
    return 0;
  }

  let published = 0;
  for (const opp of (data ?? []) as OpportunityRow[]) {
    if (!shouldPublishToNotion(opp, env.SCOUT_MIN_SCORE_FOR_NOTION)) continue;
    try {
      await publishOpportunityToNotion(opp);
      published++;
    } catch (e) {
      errors.push(`[notion] ${opp.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return published;
}
