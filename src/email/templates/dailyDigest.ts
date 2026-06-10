import type { RankedOpportunity } from "../../scout/createDigest.js";

export interface DigestEmailParams {
  digestDate: string;
  digestId: string;
  top: RankedOpportunity[];
  benchmarkWorthy: RankedOpportunity[];
  quietDay: boolean;
  costSummary?: { providerUsd: number; llmUsd: number };
  failureSummary?: string;
  buildFeedbackLink: (opportunityId: string, decision: string) => string;
}

const FEEDBACK_DECISIONS: [label: string, decision: string][] = [
  ["Useful", "useful"],
  ["Benchmark", "benchmark"],
  ["Watch", "watch"],
  ["Reject", "reject"]
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Render the daily digest email HTML (plan §15). */
export function renderDigestEmailHtml(params: DigestEmailParams): string {
  const sections: string[] = [];

  sections.push(`<h1 style="font-size:20px;">Innovera AI Opportunity Radar</h1>
<p style="color:#666;">${escapeHtml(params.digestDate)}</p>`);

  if (params.quietDay) {
    sections.push(
      `<h2 style="font-size:16px;">Quiet day</h2><p>Nothing crossed the quality bar today. No action needed.</p>`
    );
  } else {
    const items = params.top
      .map((r, i) => {
        const o = r.opportunity;
        const feedbackLinks = FEEDBACK_DECISIONS.map(
          ([label, decision]) =>
            `<a href="${escapeHtml(params.buildFeedbackLink(o.id, decision))}" style="margin-right:8px;">${label}</a>`
        ).join(" | ");
        const link = o.notion_url
          ? `<a href="${escapeHtml(o.notion_url)}">Notion page</a>`
          : o.canonical_url
            ? `<a href="${escapeHtml(o.canonical_url)}">${escapeHtml(o.canonical_url)}</a>`
            : "";
        return `<li style="margin-bottom:16px;">
  <strong>${escapeHtml(o.name)}</strong><br/>
  Score: ${o.total_score?.toFixed(2) ?? "n/a"} &nbsp; Action: ${escapeHtml(o.recommended_action ?? "n/a")}<br/>
  ${escapeHtml(o.why_it_matters ?? "")}<br/>
  ${link}<br/>
  <span style="font-size:12px;">Feedback: ${feedbackLinks}</span>
</li>`;
      })
      .join("\n");
    sections.push(`<h2 style="font-size:16px;">Top opportunities today</h2><ol>${items}</ol>`);

    const bench = params.benchmarkWorthy.length
      ? `<ul>${params.benchmarkWorthy
          .map(
            (r) =>
              `<li>${escapeHtml(r.opportunity.name)} (${r.opportunity.total_score?.toFixed(2) ?? "n/a"})</li>`
          )
          .join("")}</ul>`
      : `<p>(none today)</p>`;
    sections.push(`<h2 style="font-size:16px;">Worth benchmarking</h2>${bench}`);
  }

  if (params.failureSummary) {
    sections.push(
      `<h2 style="font-size:16px;">Run warnings</h2><p style="color:#b45309;">${escapeHtml(params.failureSummary)}</p>`
    );
  }

  if (params.costSummary) {
    sections.push(`<h2 style="font-size:16px;">Cost summary</h2>
<p>Provider calls: $${params.costSummary.providerUsd.toFixed(2)} &nbsp; LLM calls: $${params.costSummary.llmUsd.toFixed(2)}</p>`);
  }

  return `<!doctype html>
<html>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;padding:16px;color:#111;">
${sections.join("\n<hr style='border:none;border-top:1px solid #eee;margin:16px 0;'/>\n")}
</body>
</html>`;
}
