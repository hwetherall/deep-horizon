/**
 * Generate a self-contained HTML opportunity report from InsForge (no Notion):
 *   pnpm scout:report [--limit 50] [--min-score 4] [--days 30] [--out <path>] [--open]
 *
 * Writes a single shareable HTML file (inline CSS/JS, no dependencies) to out/.
 */
import { loadEnvFile } from "node:process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

try {
  loadEnvFile(join(repoRoot, ".env"));
} catch {
  // Optional locally; CI/tests inject env vars directly.
}

import { getEnv } from "../src/config/env.js";
import {
  getTopOpportunities,
  getEvidenceForOpportunities
} from "../src/db/queries/opportunities.js";
import { renderReportHtml } from "../src/report/renderReport.js";

function parseArgs(argv: string[]): {
  limit: number;
  minScore?: number;
  days?: number;
  out?: string;
  open: boolean;
} {
  const args = {
    limit: 50,
    minScore: undefined as number | undefined,
    days: undefined as number | undefined,
    out: undefined as string | undefined,
    open: false
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--limit") args.limit = Number(argv[++i] ?? 50);
    else if (arg === "--min-score") args.minScore = Number(argv[++i]);
    else if (arg === "--days") args.days = Number(argv[++i]);
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--open") args.open = true;
  }
  return args;
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

  const evidenceByOpportunity = await getEvidenceForOpportunities(
    opportunities.map((o) => o.id)
  );

  const html = renderReportHtml({
    generatedAt: new Date().toISOString(),
    opportunities,
    evidenceByOpportunity
  });

  const outDir = join(repoRoot, "out");
  mkdirSync(outDir, { recursive: true });
  const outFile = args.out
    ? args.out
    : join(outDir, `report-${new Date().toISOString().slice(0, 10)}.html`);
  writeFileSync(outFile, html, "utf8");

  console.log(`Report written to ${outFile} (${opportunities.length} opportunities)`);

  if (args.open) {
    const opener =
      process.platform === "win32" ? "explorer" : process.platform === "darwin" ? "open" : "xdg-open";
    spawn(opener, [outFile], { detached: true, stdio: "ignore" }).unref();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
