import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env.js";

let client: SupabaseClient | undefined;

/**
 * Server-side Supabase client using the service role key. Never expose this
 * to a browser context.
 */
export function getDb(): SupabaseClient {
  if (client) return client;
  const env = getEnv();
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return client;
}

/** Test helper. */
export function setDbForTesting(testClient: SupabaseClient | undefined): void {
  client = testClient;
}
