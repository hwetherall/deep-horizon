import { createAdminClient } from "@insforge/sdk";
import { getEnv } from "../config/env.js";

type InsForgeAdminClient = ReturnType<typeof createAdminClient>;
export type Db = InsForgeAdminClient["database"];

let client: Db | undefined;

/**
 * Server-side InsForge database client using the admin API key (full access,
 * equivalent to a service role key). Never expose this to a browser context.
 *
 * Returns the `database` module directly — it is postgrest-js under the hood,
 * so call sites keep the familiar .from().select()/insert()/upsert() surface.
 */
export function getDb(): Db {
  if (client) return client;
  const env = getEnv();
  client = createAdminClient({
    baseUrl: env.INSFORGE_URL,
    apiKey: env.INSFORGE_API_KEY
  }).database;
  return client;
}

/** Test helper. */
export function setDbForTesting(testClient: Db | undefined): void {
  client = testClient;
}
