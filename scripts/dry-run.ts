/**
 * E2E dry run (plan §23):
 *   pnpm scout:dry-run --patrol ai-search-research-tools --limit 20 [--publish] [--no-llm]
 *
 * Runs providers, stores raw_items in the configured (dev) InsForge database,
 * classifies up to 5 candidates, writes a digest preview to local markdown.
 * Never sends email; never touches Notion unless --publish is passed.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getEnv } from "../src/config/env.js";
import { PATROLS } from "../src/config/patrols.js";
import { runDailyScan } from "../src/scout/runDailyScan.js";
import { logger } from "../src/utils/logger.js";

function parseArgs(argv: string[]): {
  patrol?: string;
  limit: number;
  publish: boolean;
  noLlm: boolean;
} {
  const args = { patrol: undefined as string | undefined, limit: 20, publish: false, noLlm: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--patrol") args.patrol = argv[++i];
    else if (arg === "--limit") args.limit = Number(argv[++i] ?? 20);
    else if (arg === "--publish") args.publish = true;
    else if (arg === "--no-llm") args.noLlm = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  getEnv(); // fail fast on bad env

  if (args.patrol && !PATROLS.some((p) => p.name === args.patrol)) {
    console.error(
      `Unknown patrol "${args.patrol}". Available: ${PATROLS.map((p) => p.name).join(", ")}`
    );
    process.exit(1);
  }

  logger.info("Starting dry run", { ...args });

  const result = await runDailyScan({
    runType: "dry_run",
    patrols: args.patrol ? [args.patrol] : undefined,
    maxResultsPerQuery: Math.min(args.limit, 20),
    maxCandidates: 5,
    skipClassification: args.noLlm,
    skipDeepResearch: true,
    skipNotion: !args.publish,
    skipEmail: true
  });

  const outDir = join(process.cwd(), "out");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `dry-run-${result.scanRunId.slice(0, 8)}.md`);

  const summary = [
    `# Dry run ${result.scanRunId}`,
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
    "",
    result.digest ? "## Digest preview\n\n" + result.digest.markdown : "(no digest generated)",
    "",
    result.errors.length ? "## Errors\n\n" + result.errors.map((e) => `- ${e}`).join("\n") : ""
  ].join("\n");

  writeFileSync(outFile, summary, "utf8");
  logger.info("Dry run complete", { outFile, status: result.status });
  console.log(`\nDigest preview written to ${outFile}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
