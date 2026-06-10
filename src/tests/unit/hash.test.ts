import { describe, it, expect } from "vitest";
import {
  canonicalizeUrl,
  rawItemDedupeKey,
  opportunitySlug,
  slugify,
  sourceDomain,
  contentHash
} from "../../utils/hash.js";

describe("canonicalizeUrl", () => {
  it("lowercases host and strips www", () => {
    expect(canonicalizeUrl("https://WWW.Exa.AI/docs")).toBe("https://exa.ai/docs");
  });

  it("removes utm and tracking params", () => {
    expect(
      canonicalizeUrl("https://exa.ai/blog?utm_source=tw&utm_medium=social&id=5")
    ).toBe("https://exa.ai/blog?id=5");
  });

  it("removes trailing slash", () => {
    expect(canonicalizeUrl("https://exa.ai/docs/")).toBe("https://exa.ai/docs");
    expect(canonicalizeUrl("https://exa.ai/")).toBe("https://exa.ai");
  });

  it("drops fragments and upgrades http", () => {
    expect(canonicalizeUrl("http://exa.ai/docs#section")).toBe("https://exa.ai/docs");
  });

  it("sorts query params for stability", () => {
    expect(canonicalizeUrl("https://a.com/x?b=2&a=1")).toBe(
      canonicalizeUrl("https://a.com/x?a=1&b=2")
    );
  });

  it("returns non-URLs unchanged", () => {
    expect(canonicalizeUrl("not a url")).toBe("not a url");
  });
});

describe("rawItemDedupeKey", () => {
  it("is identical for equivalent URLs", () => {
    expect(rawItemDedupeKey("https://www.exa.ai/docs/?utm_source=x")).toBe(
      rawItemDedupeKey("https://exa.ai/docs")
    );
  });

  it("differs for different URLs", () => {
    expect(rawItemDedupeKey("https://exa.ai/docs")).not.toBe(
      rawItemDedupeKey("https://exa.ai/pricing")
    );
  });
});

describe("slugify", () => {
  it("kebab-cases text", () => {
    expect(slugify("GPT Researcher v2!")).toBe("gpt-researcher-v2");
  });
});

describe("opportunitySlug", () => {
  it("combines name, type, and domain (plan §13 examples)", () => {
    expect(opportunitySlug("Exa", "api", "https://exa.ai")).toBe("exa--api--exa-ai");
    expect(opportunitySlug("Tavily", "api", "https://tavily.com")).toBe(
      "tavily--api--tavily-com"
    );
  });

  it("keeps owner/repo for GitHub repos", () => {
    expect(
      opportunitySlug("GPT Researcher", "repo", "https://github.com/assafelovic/gpt-researcher")
    ).toBe("gpt-researcher--repo--github-com-assafelovic-gpt-researcher");
  });

  it("distinguishes different repos on github.com", () => {
    const a = opportunitySlug("Tool", "repo", "https://github.com/org-a/tool");
    const b = opportunitySlug("Tool", "repo", "https://github.com/org-b/tool");
    expect(a).not.toBe(b);
  });

  it("works without a URL", () => {
    expect(opportunitySlug("Mystery Tool", "tool")).toBe("mystery-tool--tool");
  });
});

describe("sourceDomain", () => {
  it("extracts domain without www", () => {
    expect(sourceDomain("https://www.github.com/foo")).toBe("github.com");
  });
  it("returns undefined for invalid URLs", () => {
    expect(sourceDomain("nope")).toBeUndefined();
  });
});

describe("contentHash", () => {
  it("normalizes whitespace", () => {
    expect(contentHash("hello   world\n")).toBe(contentHash("hello world"));
  });
});
