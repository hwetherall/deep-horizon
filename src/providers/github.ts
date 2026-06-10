import type { RawItem } from "../db/types.js";
import { canonicalizeUrl } from "../utils/hash.js";
import { nowIso, parseDateSafe } from "../utils/dates.js";
import { fetchJson, type ProviderContext } from "./shared.js";
import type { ProviderSearchResult } from "./exa.js";

export interface GitHubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  topics?: string[];
  license?: { spdx_id?: string | null } | null;
}

interface GitHubSearchResponse {
  total_count: number;
  items?: GitHubRepo[];
}

export async function githubSearchRepos(
  token: string,
  params: { query: string; patrolName: string; perPage?: number },
  ctx: ProviderContext = {}
): Promise<ProviderSearchResult> {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", params.query);
  url.searchParams.set("sort", "updated");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(params.perPage ?? 20));

  const response = await fetchJson<GitHubSearchResponse>(
    url.toString(),
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "hermes-scout"
      }
    },
    ctx
  );

  const items = (response.items ?? []).map((repo) =>
    normalizeGitHubRepo(repo, params.patrolName, params.query)
  );
  return { items, endpoint: "search/repositories" };
}

export function normalizeGitHubRepo(
  repo: GitHubRepo,
  patrolName: string,
  query: string
): RawItem {
  const snippetParts = [
    repo.description ?? "",
    `★ ${repo.stargazers_count} | forks ${repo.forks_count} | ${repo.language ?? "unknown"}`,
    repo.topics?.length ? `topics: ${repo.topics.join(", ")}` : ""
  ].filter(Boolean);

  return {
    provider: "github",
    patrolName,
    query,
    title: repo.full_name,
    url: repo.html_url,
    canonicalUrl: canonicalizeUrl(repo.html_url),
    sourceDomain: "github.com",
    snippet: snippetParts.join("\n"),
    publishedAt: parseDateSafe(repo.pushed_at),
    discoveredAt: nowIso(),
    providerScore: repo.stargazers_count,
    providerPayload: {
      full_name: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      language: repo.language,
      topics: repo.topics ?? [],
      license: repo.license?.spdx_id ?? null
    }
  };
}

/** Fetch a README excerpt for enrichment (plan §9 normalize list). */
export async function githubReadmeExcerpt(
  token: string,
  fullName: string,
  ctx: ProviderContext = {},
  maxChars = 4000
): Promise<string | undefined> {
  try {
    const data = await fetchJson<{ content?: string; encoding?: string }>(
      `https://api.github.com/repos/${fullName}/readme`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
          "user-agent": "hermes-scout"
        }
      },
      ctx
    );
    if (data.content && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf8").slice(0, maxChars);
    }
    return undefined;
  } catch {
    return undefined;
  }
}
