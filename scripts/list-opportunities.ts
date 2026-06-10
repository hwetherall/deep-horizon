/**
 * Read-only viewer for stored opportunities (no Notion required):
 *   pnpm scout:list [--limit 20] [--min-score 5] [--days 7] [--json]
 *
 * Prints the top opportunities from InsForge, ranked by total_score. Useful for
 * inspecting results from scheduled runs when Notion publishing is disabled.
 */
import { loadEnvFile } from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

try {
  loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), "..", ".env"));
} catch {
  // Optional locally; CI/tests inject env vars directly.
}

import { getEnv } from "../src/config/env.js";
import { getTopOpportunities } from "../src/db/queries/opportunities.js";

function parseArgs(argv: string[]): {
  limit: number;
  minScore?: number;
  days?: number;
  json: boolean;
} {
  const args = { limit: 20, minScore: undefined as number | undefined, days: undefined as number | undefined, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--limit") args.limit = Number(argv[++i] ?? 20);
    else if (arg === "--min-score") args.minScore = Number(argv[++i]);
    else if (arg === "--days") args.days = Number(argv[++i]);
    else if (arg === "--json") args.json = true;
  }
  return args;
}

function fmtScore(n: number | null): string {
  return n === null || n === undefined ? "  -  " : n.toFixed(2).padStart(5);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  getEnv(); // fail fast on bad env

  const sinceIso =
    args.days !== undefined
      ? new Date(Date.now() - args.days * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

  const opportunities = await getTopOpportunities({
    limit: args.limit,
    minScore: args.minScore,
    sinceIso
  });

  if (args.json) {
    console.log(JSON.stringify(opportunities, null, 2));
    return;
  }

  if (opportunities.length === 0) {
    console.log("No opportunities found for the given filters.");
    return;
  }

  const filters = [
    args.minScore !== undefined ? `min-score ${args.minScore}` : null,
    args.days !== undefined ? `last ${args.days}d` : null
  ]
    .filter(Boolean)
    .join(", ");

  console.log(
    `\nTop ${opportunities.length} opportunities${filters ? ` (${filters})` : ""}\n` +
      "=".repeat(72)
  );

  for (const [i, o] of opportunities.entries()) {
    const rank = String(i + 1).padStart(2);
    const action = (o.recommended_action ?? "-").padEnd(20);
    console.log(
      `\n${rank}. ${o.name}  [${o.type}]  score ${fmtScore(o.total_score)}  status:${o.status}`
    );
    console.log(`    action: ${action} last seen: ${o.last_seen_at.slice(0, 10)}`);
    if (o.why_it_matters) console.log(`    why: ${o.why_it_matters}`);
    if (o.canonical_url) console.log(`    url: ${o.canonical_url}`);
  }
  console.log("");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
