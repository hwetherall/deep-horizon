import { getDb } from "../db/client.js";
import { getEnv } from "../config/env.js";
import type { OpportunityRow } from "../db/types.js";
import { getTopOpportunities, getEvidenceCount, wasRecentlyRejected } from "../db/queries/opportunities.js";
import { upsertDigest, setDigestItems } from "../db/queries/digests.js";
import { computeRankScore } from "../config/scoring.js";
import { localDateString } from "../utils/dates.js";

export interface RankedOpportunity {
  opportunity: OpportunityRow;
  rankScore: number;
}

export interface DigestData {
  digestId: string;
  digestDate: string;
  title: string;
  emailSubject: string;
  markdown: string;
  top: RankedOpportunity[];
  benchmarkWorthy: RankedOpportunity[];
  quietDay: boolean;
}

const TOP_N = 5;

/** Rank scored opportunities (plan §17) and store the daily digest row. */
export async function createDigest(params: {
  scanRunId: string | null;
  digestDate?: string;
  costSummary?: { providerUsd: number; llmUsd: number };
  failureSummary?: string;
}): Promise<DigestData> {
  const env = getEnv();
  const digestDate = params.digestDate ?? localDateString();

  // Candidates seen in the last 36h with a score.
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const candidates = await getTopOpportunities({ sinceIso: since, limit: 40 });

  const ranked: RankedOpportunity[] = [];
  for (const opp of candidates) {
    if (opp.total_score === null) continue;
    const [evidenceCount, recentlyRejected] = await Promise.all([
      getEvidenceCount(opp.id),
      wasRecentlyRejected(opp.id)
    ]);
    ranked.push({
      opportunity: opp,
      rankScore: computeRankScore({
        totalScore: opp.total_score,
        recommendedAction: opp.recommended_action,
        evidenceCount,
        evidenceQuality: opp.evidence_quality,
        wasRecentlyRejected: recentlyRejected,
        isLikelyDuplicate: false
      })
    });
  }
  ranked.sort((a, b) => b.rankScore - a.rankScore);

  const top = ranked.slice(0, TOP_N).filter((r) => r.rankScore > 0);
  const benchmarkWorthy = ranked.filter(
    (r) => r.opportunity.recommended_action === "benchmark"
  );
  const quietDay = top.length === 0;

  const subjectCount = top.length;
  const benchCount = benchmarkWorthy.length;
  const emailSubject = quietDay
    ? `[Innovera Scout] Quiet day — nothing above the bar — ${digestDate}`
    : `[Innovera Scout] ${subjectCount} opportunities — ${benchCount} benchmark-worthy — ${digestDate}`;

  const markdown = renderDigestMarkdown({
    digestDate,
    top,
    benchmarkWorthy,
    quietDay,
    costSummary: params.costSummary,
    failureSummary: params.failureSummary,
    minScoreForNotion: env.SCOUT_MIN_SCORE_FOR_NOTION
  });

  const digest = await upsertDigest({
    scanRunId: params.scanRunId,
    digestDate,
    title: `Innovera AI Opportunity Radar — ${digestDate}`,
    markdown,
    emailSubject,
    metadata: {
      top_count: top.length,
      benchmark_count: benchCount,
      quiet_day: quietDay
    }
  });

  await setDigestItems(
    digest.id,
    top.map((r, i) => ({
      opportunityId: r.opportunity.id,
      rank: i + 1,
      reason: r.opportunity.why_it_matters ?? undefined
    }))
  );

  return {
    digestId: digest.id,
    digestDate,
    title: digest.title,
    emailSubject,
    markdown,
    top,
    benchmarkWorthy,
    quietDay
  };
}

export function renderDigestMarkdown(params: {
  digestDate: string;
  top: RankedOpportunity[];
  benchmarkWorthy: RankedOpportunity[];
  quietDay: boolean;
  costSummary?: { providerUsd: number; llmUsd: number };
  failureSummary?: string;
  minScoreForNotion: number;
}): string {
  const lines: string[] = [`# Innovera AI Opportunity Radar`, "", `Date: ${params.digestDate}`, ""];

  if (params.quietDay) {
    lines.push(
      "## Quiet day",
      "",
      "Nothing crossed the quality bar today. No action needed."
    );
  } else {
    lines.push("## Top opportunities today", "");
    params.top.forEach((r, i) => {
      const o = r.opportunity;
      lines.push(
        `${i + 1}. **${o.name}**`,
        `   Score: ${o.total_score?.toFixed(2)} (rank ${r.rankScore.toFixed(2)})`,
        `   Action: ${o.recommended_action ?? "n/a"}`,
        `   Why it matters: ${firstSentence(o.why_it_matters)}`,
        o.notion_url ? `   Notion: ${o.notion_url}` : `   URL: ${o.canonical_url ?? "n/a"}`,
        ""
      );
    });

    lines.push("## Worth benchmarking", "");
    if (params.benchmarkWorthy.length) {
      for (const r of params.benchmarkWorthy) {
        lines.push(`- ${r.opportunity.name} (${r.opportunity.total_score?.toFixed(2)})`);
      }
    } else {
      lines.push("(none today)");
    }
    lines.push("");
  }

  if (params.failureSummary) {
    lines.push("## Run warnings", "", params.failureSummary, "");
  }

  if (params.costSummary) {
    lines.push(
      "## Cost summary",
      "",
      `- Provider calls: $${params.costSummary.providerUsd.toFixed(2)}`,
      `- LLM calls: $${params.costSummary.llmUsd.toFixed(2)}`,
      ""
    );
  }

  return lines.join("\n");
}

function firstSentence(text: string | null): string {
  if (!text) return "(no summary)";
  const idx = text.indexOf(". ");
  return idx > 0 ? text.slice(0, idx + 1) : text;
}

/** Today's spend, for the digest cost section. */
export async function getTodayCostSummary(): Promise<{ providerUsd: number; llmUsd: number }> {
  const db = getDb();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  const [providers, llms] = await Promise.all([
    db.from("provider_calls").select("cost_usd").gte("created_at", since.toISOString()),
    db.from("llm_calls").select("cost_usd").gte("created_at", since.toISOString())
  ]);

  const sum = (rows: { cost_usd: unknown }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (Number(r.cost_usd) || 0), 0);

  return { providerUsd: sum(providers.data), llmUsd: sum(llms.data) };
}
