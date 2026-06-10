import { Client } from "@notionhq/client";
import { getEnv } from "../config/env.js";

let client: Client | undefined;

export function getNotion(): Client {
  if (client) return client;
  const env = getEnv();
  if (!env.NOTION_API_KEY) throw new Error("NOTION_API_KEY not configured");
  client = new Client({ auth: env.NOTION_API_KEY });
  return client;
}

export function setNotionForTesting(testClient: Client | undefined): void {
  client = testClient;
}
