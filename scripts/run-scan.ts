/**
 * Manual full scan run (plan §16 scout.daily-scan, on demand):
 *   pnpm scout:run [--patrol <name> ...] [--limit 20] [--max-candidates <n>]
 *                  [--no-deep-research] [--email] [--publish]
 *
 * Runs the full pipeline — all patrols → classify → deep research → digest —
 * via the same `runDailyScan` code path as the scheduled task. Deep research is
 * ON by default; email and Notion are OFF unless explicitly enabled. Writes a
 * digest preview to local markdown in out/.
 */
import { loadEnvFile } from "node:process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

try {
  loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), "..", ".env"));
} catch {
  // Optional locally; CI/tests inject env vars directly.
}

import { getEnv } from "../src/config/env.js";
import { PATROLS } from "../src/config/patrols.js";
import { runDailyScan } from "../src/scout/runDailyScan.js";
import { logger } from "../src/utils/logger.js";

function parseArgs(argv: string[]): {
  patrols: string[];
  limit: number;
  maxCandidates?: number;
  noDeepResearch: boolean;
  email: boolean;
  publish: boolean;
} {
  const args = {
    patrols: [] as string[],
    limit: 20,
    maxCandidates: undefined as number | undefined,
    noDeepResearch: false,
    email: false,
    publish: false
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--patrol") {
      const name = argv[++i];
      if (name) args.patrols.push(name);
    }
    else if (arg === "--limit") args.limit = Number(argv[++i] ?? 20);
    else if (arg === "--max-candidates") args.maxCandidates = Number(argv[++i]);
    else if (arg === "--no-deep-research") args.noDeepResearch = true;
    else if (arg === "--email") args.email = true;
    else if (arg === "--publish") args.publish = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  getEnv(); // fail fast on bad env

  const unknown = args.patrols.filter((name) => !PATROLS.some((p) => p.name === name));
  if (unknown.length) {
    console.error(
      `Unknown patrol(s) "${unknown.join(", ")}". Available: ${PATROLS.map((p) => p.name).join(", ")}`
    );
    process.exit(1);
  }

  logger.info("Starting manual scan", { ...args });

  const result = await runDailyScan({
    runType: "manual",
    patrols: args.patrols.length ? args.patrols : undefined,
    maxResultsPerQuery: Math.min(args.limit, 20),
    maxCandidates: args.maxCandidates,
    skipClassification: false,
    skipDeepResearch: args.noDeepResearch,
    skipNotion: !args.publish,
    skipEmail: !args.email
  });

  const outDir = join(process.cwd(), "out");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `run-${result.scanRunId.slice(0, 8)}.md`);

  const summary = [
    `# Manual scan ${result.scanRunId}`,
    "",
    `Status: ${result.status}`,
    "",
    "## Patrol results",
    "",
    ...result.patrolResults.map(
      (r) =>
        `- ${r.patrolName} / ${r.provider}: fetched ${r.fetched}, inserted ${r.inserted}, duplicates ${r.duplicates}${r.errors.length ? `, errors ${r.errors.length}` : ""}`
    ),
    "",
    `Candidates accepted: ${result.classification?.candidatesAccepted ?? "(skipped)"}`,
    `Opportunities scored: ${result.classification?.opportunitiesScored ?? "(skipped)"}`,
    `Notion published: ${result.notionPublished}`,
    `Email sent: ${result.emailSent}`,
    "",
    result.digest ? "## Digest preview\n\n" + result.digest.markdown : "(no digest generated)",
    "",
    result.errors.length ? "## Errors\n\n" + result.errors.map((e) => `- ${e}`).join("\n") : ""
  ].join("\n");

  writeFileSync(outFile, summary, "utf8");
  logger.info("Manual scan complete", { outFile, status: result.status });
  console.log(`\nDigest preview written to ${outFile}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
