import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_sxxidusmrrcqbcevomic",
  dirs: ["./trigger"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30_000,
      factor: 2,
      randomize: true
    }
  },
  maxDuration: 3600
});
