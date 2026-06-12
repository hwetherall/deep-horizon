import type { OpportunityRow, OpportunityEvidenceRow } from "../db/types.js";

export interface ReportData {
  generatedAt: string;
  opportunities: OpportunityRow[];
  evidenceByOpportunity: Record<string, OpportunityEvidenceRow[]>;
  /** Signed level-1 rating links (seed Q15); omit to render without rating buttons. */
  buildSentimentLink?: (opportunityId: string, sentiment: string) => string;
  /** Latest human rating per opportunity, to highlight what's already rated. */
  sentimentByOpportunity?: Record<string, string>;
}

const SENTIMENT_FACES: [face: string, label: string, sentiment: string][] = [
  ["\u{1F642}", "Good", "good"],
  ["\u{1F610}", "Neutral", "neutral"],
  ["\u{1F641}", "Bad", "bad"]
];

const ACTION_LABELS: Record<string, string> = {
  benchmark: "Benchmark",
  prototype: "Prototype",
  integrate: "Integrate",
  buy: "Buy",
  partner: "Partner",
  watch: "Watch",
  competitive_warning: "Competitive Warning",
  ignore: "Ignore"
};

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function scoreBar(label: string, value: number | null): string {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, (v / 10) * 100));
  return `
    <div class="metric">
      <span class="metric-label">${esc(label)}</span>
      <div class="metric-track"><div class="metric-fill" style="width:${pct}%"></div></div>
      <span class="metric-value">${v.toFixed(1)}</span>
    </div>`;
}

function scoreClass(score: number | null): string {
  const s = score ?? 0;
  if (s >= 7) return "score-high";
  if (s >= 5) return "score-mid";
  return "score-low";
}

function ratingRow(
  o: OpportunityRow,
  buildSentimentLink?: (opportunityId: string, sentiment: string) => string,
  currentSentiment?: string
): string {
  if (!buildSentimentLink) return "";
  const buttons = SENTIMENT_FACES.map(([face, label, sentiment]) => {
    const active = currentSentiment === sentiment;
    return `<a class="rate${active ? " rated" : ""}" href="${esc(
      buildSentimentLink(o.id, sentiment)
    )}" target="_blank" rel="noreferrer" title="${esc(label)} — opens a page where you can add written context">${face}<span>${esc(label)}</span></a>`;
  }).join("");
  return `<div class="rating">
    <span class="rating-label">${currentSentiment ? "Rated:" : "Rate it:"}</span>
    ${buttons}
  </div>`;
}

function opportunityCard(
  o: OpportunityRow,
  evidence: OpportunityEvidenceRow[],
  buildSentimentLink?: (opportunityId: string, sentiment: string) => string,
  currentSentiment?: string
): string {
  const action = o.recommended_action ?? "";
  const actionLabel = ACTION_LABELS[action] ?? action ?? "—";
  const total = o.total_score ?? 0;

  const evidenceHtml =
    evidence.length > 0
      ? `<details class="evidence">
          <summary>${evidence.length} source${evidence.length === 1 ? "" : "s"}</summary>
          <ul>
            ${evidence
              .slice(0, 12)
              .map(
                (e) =>
                  `<li><a href="${esc(e.url)}" target="_blank" rel="noreferrer">${esc(
                    e.title || e.source_domain || e.url
                  )}</a>${e.source_domain ? `<span class="src">${esc(e.source_domain)}</span>` : ""}</li>`
              )
              .join("\n")}
          </ul>
        </details>`
      : "";

  return `
  <article class="card" data-action="${esc(action)}" data-name="${esc(
    o.name.toLowerCase()
  )}" data-score="${total}">
    <header class="card-head">
      <div class="card-title">
        <h2>${esc(o.name)}</h2>
        <div class="tags">
          <span class="tag type">${esc(o.type)}</span>
          ${o.category ? `<span class="tag">${esc(o.category)}</span>` : ""}
          <span class="tag status status-${esc(o.status)}">${esc(o.status)}</span>
        </div>
      </div>
      <div class="score ${scoreClass(o.total_score)}">
        <span class="score-num">${total.toFixed(1)}</span>
        <span class="score-cap">score</span>
      </div>
    </header>

    <div class="action-row">
      <span class="action-badge action-${esc(action)}">${esc(actionLabel)}</span>
      ${
        o.confidence !== null && o.confidence !== undefined
          ? `<span class="confidence">confidence ${(o.confidence * 100).toFixed(0)}%</span>`
          : ""
      }
      <span class="seen">last seen ${esc(o.last_seen_at.slice(0, 10))}</span>
    </div>

    ${o.why_it_matters ? `<p class="why">${esc(o.why_it_matters)}</p>` : ""}
    ${o.summary && !o.why_it_matters ? `<p class="why">${esc(o.summary)}</p>` : ""}

    <div class="metrics">
      ${scoreBar("Strategic relevance", o.strategic_relevance)}
      ${scoreBar("Actionability", o.actionability)}
      ${scoreBar("Integration fit", o.integration_fit)}
      ${scoreBar("Evidence quality", o.evidence_quality)}
      ${scoreBar("Novelty", o.novelty)}
      ${scoreBar("Urgency", o.urgency)}
    </div>

    <footer class="card-foot">
      ${
        o.canonical_url
          ? `<a class="link" href="${esc(o.canonical_url)}" target="_blank" rel="noreferrer">Visit ↗</a>`
          : ""
      }
      ${evidenceHtml}
      ${ratingRow(o, buildSentimentLink, currentSentiment)}
    </footer>
  </article>`;
}

export function renderReportHtml(data: ReportData): string {
  const { opportunities, evidenceByOpportunity, generatedAt } = data;

  const scores = opportunities.map((o) => o.total_score ?? 0);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const actionCounts = new Map<string, number>();
  for (const o of opportunities) {
    const a = o.recommended_action ?? "unscored";
    actionCounts.set(a, (actionCounts.get(a) ?? 0) + 1);
  }

  const actionFilters = [...actionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(
      ([action, count]) =>
        `<button class="filter" data-filter="${esc(action)}">${esc(
          ACTION_LABELS[action] ?? action
        )} <span>${count}</span></button>`
    )
    .join("\n");

  const cards = opportunities
    .map((o) =>
      opportunityCard(
        o,
        evidenceByOpportunity[o.id] ?? [],
        data.buildSentimentLink,
        data.sentimentByOpportunity?.[o.id]
      )
    )
    .join("\n");

  const dateStr = new Date(generatedAt).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short"
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Hermes Scout — AI Opportunity Radar</title>
<style>
  :root {
    --bg: #0b0f1a;
    --panel: #141b2d;
    --panel-2: #1b2438;
    --border: #26304a;
    --text: #e7ecf5;
    --muted: #97a3bd;
    --accent: #6ea8fe;
    --high: #3ddc97;
    --mid: #f5c451;
    --low: #8a93a8;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: linear-gradient(180deg, #0b0f1a 0%, #0d1322 100%);
    color: var(--text);
    line-height: 1.5;
  }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 40px 24px 80px; }
  header.top { margin-bottom: 8px; }
  .eyebrow { color: var(--accent); font-weight: 600; letter-spacing: .08em; text-transform: uppercase; font-size: 12px; }
  h1 { font-size: 32px; margin: 6px 0 4px; }
  .sub { color: var(--muted); margin: 0 0 24px; }
  .stats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
  .stat { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; min-width: 120px; }
  .stat .n { font-size: 26px; font-weight: 700; }
  .stat .l { color: var(--muted); font-size: 13px; }
  .controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 24px; }
  .search { flex: 1; min-width: 200px; background: var(--panel); border: 1px solid var(--border); color: var(--text); border-radius: 10px; padding: 10px 14px; font-size: 14px; }
  .filter { background: var(--panel); border: 1px solid var(--border); color: var(--muted); border-radius: 999px; padding: 7px 14px; font-size: 13px; cursor: pointer; transition: .15s; }
  .filter:hover { color: var(--text); border-color: var(--accent); }
  .filter.active { background: var(--accent); color: #0b0f1a; border-color: var(--accent); font-weight: 600; }
  .filter span { opacity: .7; }
  .grid { display: grid; gap: 18px; }
  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 22px; }
  .card-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
  .card-title h2 { margin: 0 0 8px; font-size: 20px; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .tag { font-size: 11px; color: var(--muted); background: var(--panel-2); border: 1px solid var(--border); border-radius: 6px; padding: 3px 8px; text-transform: capitalize; }
  .tag.type { color: var(--accent); }
  .status-new { color: var(--high); }
  .score { text-align: center; min-width: 64px; }
  .score-num { display: block; font-size: 30px; font-weight: 800; line-height: 1; }
  .score-cap { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  .score-high .score-num { color: var(--high); }
  .score-mid .score-num { color: var(--mid); }
  .score-low .score-num { color: var(--low); }
  .action-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 14px 0; }
  .action-badge { font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: .04em; }
  .action-benchmark, .action-prototype { background: rgba(61,220,151,.15); color: var(--high); }
  .action-integrate, .action-buy, .action-partner { background: rgba(110,168,254,.15); color: var(--accent); }
  .action-watch { background: rgba(245,196,81,.15); color: var(--mid); }
  .action-competitive_warning { background: rgba(255,107,107,.15); color: #ff8a8a; }
  .action-ignore { background: rgba(138,147,168,.15); color: var(--muted); }
  .confidence, .seen { font-size: 12px; color: var(--muted); }
  .why { color: #c7d0e4; margin: 0 0 16px; }
  .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; }
  .metric { display: flex; align-items: center; gap: 10px; font-size: 12px; }
  .metric-label { color: var(--muted); width: 130px; flex-shrink: 0; }
  .metric-track { flex: 1; height: 6px; background: var(--panel-2); border-radius: 4px; overflow: hidden; }
  .metric-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--high)); border-radius: 4px; }
  .metric-value { width: 26px; text-align: right; color: var(--text); }
  .card-foot { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding-top: 6px; border-top: 1px solid var(--border); }
  .link { color: var(--accent); text-decoration: none; font-size: 14px; font-weight: 600; padding-top: 12px; }
  .link:hover { text-decoration: underline; }
  .evidence { font-size: 13px; padding-top: 12px; }
  .evidence summary { color: var(--muted); cursor: pointer; }
  .evidence ul { margin: 8px 0 0; padding-left: 18px; }
  .evidence li { margin: 4px 0; }
  .evidence a { color: var(--accent); text-decoration: none; }
  .evidence a:hover { text-decoration: underline; }
  .evidence .src { color: var(--muted); font-size: 11px; margin-left: 8px; }
  .rating { margin-left: auto; display: flex; align-items: center; gap: 8px; padding-top: 12px; }
  .rating-label { color: var(--muted); font-size: 12px; }
  .rate { text-decoration: none; font-size: 18px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border); background: var(--panel-2); transition: .15s; }
  .rate span { font-size: 12px; color: var(--muted); margin-left: 5px; }
  .rate:hover { border-color: var(--accent); }
  .rate:hover span { color: var(--text); }
  .rate.rated { border-color: var(--accent); background: rgba(110,168,254,.15); }
  .rate.rated span { color: var(--accent); font-weight: 700; }
  .empty { text-align: center; color: var(--muted); padding: 60px; }
  footer.foot { margin-top: 40px; color: var(--muted); font-size: 12px; text-align: center; }
  @media (max-width: 640px) { .metrics { grid-template-columns: 1fr; } h1 { font-size: 26px; } }
</style>
</head>
<body>
  <div class="wrap">
    <header class="top">
      <div class="eyebrow">Innovera · Hermes Scout</div>
      <h1>AI Opportunity Radar</h1>
      <p class="sub">Generated ${esc(dateStr)}</p>
    </header>

    <div class="stats">
      <div class="stat"><div class="n">${opportunities.length}</div><div class="l">Opportunities</div></div>
      <div class="stat"><div class="n">${avg.toFixed(1)}</div><div class="l">Avg score</div></div>
      <div class="stat"><div class="n">${
        opportunities.filter((o) => (o.total_score ?? 0) >= 7).length
      }</div><div class="l">High priority (≥7)</div></div>
    </div>

    <div class="controls">
      <input class="search" id="search" type="search" placeholder="Search opportunities…" />
      <button class="filter active" data-filter="all">All</button>
      ${actionFilters}
    </div>

    <div class="grid" id="grid">
      ${cards || '<div class="empty">No opportunities yet. Run a scan to populate the radar.</div>'}
    </div>

    <footer class="foot">Hermes Scout — opportunity radar for Innovera. Data source: InsForge.</footer>
  </div>

<script>
  (function () {
    var search = document.getElementById("search");
    var filters = document.querySelectorAll(".filter");
    var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
    var activeFilter = "all";

    function apply() {
      var q = (search.value || "").toLowerCase().trim();
      cards.forEach(function (c) {
        var matchAction = activeFilter === "all" || c.getAttribute("data-action") === activeFilter;
        var matchSearch = !q || c.getAttribute("data-name").indexOf(q) !== -1;
        c.style.display = matchAction && matchSearch ? "" : "none";
      });
    }

    filters.forEach(function (f) {
      f.addEventListener("click", function () {
        filters.forEach(function (x) { x.classList.remove("active"); });
        f.classList.add("active");
        activeFilter = f.getAttribute("data-filter");
        apply();
      });
    });
    search.addEventListener("input", apply);
  })();
</script>
</body>
</html>`;
}
