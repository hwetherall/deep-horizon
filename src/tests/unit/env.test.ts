import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getEnv, resetEnvCache } from "../../config/env.js";

const REQUIRED = {
  SUPABASE_URL: "https://proj.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  OPENROUTER_API_KEY: "or-key"
};

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
  resetEnvCache();
  for (const key of Object.keys(process.env)) {
    if (/^(SUPABASE|OPENROUTER|SCOUT|EXA|TAVILY|FIRECRAWL|SERPER|JINA|GITHUB|NOTION|RESEND|DIGEST|EMAIL|APP_)/.test(key)) {
      delete process.env[key];
    }
  }
});

afterEach(() => {
  process.env = savedEnv;
  resetEnvCache();
});

describe("getEnv", () => {
  it("throws a readable error listing missing variables", () => {
    expect(() => getEnv()).toThrowError(/SUPABASE_URL/);
  });

  it("parses valid env with defaults", () => {
    Object.assign(process.env, REQUIRED);
    const env = getEnv();
    expect(env.APP_TIMEZONE).toBe("America/Denver");
    expect(env.SCOUT_MAX_DAILY_PROVIDER_COST_USD).toBe(20);
    expect(env.SCOUT_MIN_SCORE_FOR_NOTION).toBe(7);
    expect(env.SCOUT_ENABLE_EMAIL).toBe(false);
    expect(env.DIGEST_TO_EMAIL).toBe("harry@innovera.ai");
  });

  it("coerces numbers and boolean flags", () => {
    Object.assign(process.env, REQUIRED, {
      SCOUT_MAX_RAW_ITEMS_PER_DAY: "250",
      SCOUT_ENABLE_EMAIL: "true",
      SCOUT_MIN_SCORE_FOR_DEEP_RESEARCH: "8.2"
    });
    const env = getEnv();
    expect(env.SCOUT_MAX_RAW_ITEMS_PER_DAY).toBe(250);
    expect(env.SCOUT_ENABLE_EMAIL).toBe(true);
    expect(env.SCOUT_MIN_SCORE_FOR_DEEP_RESEARCH).toBe(8.2);
  });

  it("rejects invalid URL", () => {
    Object.assign(process.env, REQUIRED, { SUPABASE_URL: "not-a-url" });
    expect(() => getEnv()).toThrowError(/SUPABASE_URL/);
  });
});
