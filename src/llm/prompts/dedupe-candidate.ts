export const DEDUPE_PROMPT_VERSION = "dedupe-v1";

export function buildDedupePrompt(params: {
  a: { name: string; type: string; canonicalUrl?: string | null; summary?: string | null };
  b: { name: string; type: string; canonicalUrl?: string | null; summary?: string | null };
}): string {
  const describe = (c: typeof params.a) =>
    `Name: ${c.name}\nType: ${c.type}\nURL: ${c.canonicalUrl ?? "unknown"}\nSummary: ${c.summary ?? "(none)"}`;

  return `Are these two candidates the same product/company/repo/feature?

## Candidate A
${describe(params.a)}

## Candidate B
${describe(params.b)}

Consider renames, rebrands, the same repo under a different URL, and a company vs its main product (treat a company and its single flagship product as the same entity; treat distinct products from one company as different entities).

Return JSON: { "same_entity": true/false, "rationale": "..." }`;
}
