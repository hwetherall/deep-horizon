import { createHash } from "node:crypto";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "ref",
  "ref_src",
  "mc_cid",
  "mc_eid"
]);

/**
 * Canonicalize a URL for dedupe (plan §13): lowercase host, strip tracking
 * params, drop fragments, remove trailing slash, force https for known hosts.
 * Returns the input unchanged when it is not a parseable absolute URL.
 */
export function canonicalizeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return input.trim();
  }

  url.hostname = url.hostname.toLowerCase();
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
  }
  if (url.protocol === "http:") {
    url.protocol = "https:";
  }
  url.hash = "";

  const params = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    if (!TRACKING_PARAMS.has(key.toLowerCase())) {
      params.append(key, value);
    }
  }
  params.sort();
  url.search = params.toString();

  let result = url.toString();
  if (result.endsWith("/") && url.pathname === "/" && !url.search) {
    result = result.slice(0, -1);
  } else if (url.pathname.length > 1 && url.pathname.endsWith("/") && !url.search) {
    result = result.replace(/\/$/, "");
  }
  return result;
}

export function sourceDomain(input: string): string | undefined {
  try {
    const host = new URL(input.trim()).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return undefined;
  }
}

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Stable dedupe key for a raw item: hash of the canonical URL. */
export function rawItemDedupeKey(url: string): string {
  return sha256(canonicalizeUrl(url));
}

/** Hash of page/content text for change detection. */
export function contentHash(content: string): string {
  return sha256(content.replace(/\s+/g, " ").trim());
}

/** kebab-case slug from arbitrary text. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Deterministic entity slug for candidate-level dedupe (plan §13):
 * name + type + canonical domain. GitHub repos keep their owner/repo path so
 * different repos on github.com stay distinct.
 */
export function opportunitySlug(
  name: string,
  type: string,
  canonicalUrl?: string | null
): string {
  let domainPart = "";
  if (canonicalUrl) {
    const domain = sourceDomain(canonicalUrl);
    if (domain === "github.com") {
      try {
        const path = new URL(canonicalizeUrl(canonicalUrl)).pathname
          .split("/")
          .filter(Boolean)
          .slice(0, 2)
          .join("/");
        domainPart = `github.com/${path}`;
      } catch {
        domainPart = domain;
      }
    } else if (domain) {
      domainPart = domain;
    }
  }
  return [slugify(name), slugify(type), slugify(domainPart)]
    .filter(Boolean)
    .join("--");
}
